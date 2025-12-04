"""
Bug Report API - sends bug reports to Discord webhook
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from api.auth import get_current_active_user
from models import User
from database import get_db
from sqlalchemy.orm import Session
from api.activity_logger import log_activity
import os
from datetime import datetime
import requests

router = APIRouter(prefix="/bug-reports", tags=["Bug Reports"])

class BugReportRequest(BaseModel):
    subject: str
    description: str

@router.post("/submit")
def submit_bug_report(
    report: BugReportRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Submit a bug report that gets sent to Discord"""
    
    # Log activity
    try:
        log_activity(
            db=db,
            user_id=current_user.id,
            activity_type="create_bug_report",
            description=f"{current_user.username} submitted a bug report: {report.subject}",
            metadata={
                "subject": report.subject,
                "description": report.description[:200]  # Truncate for metadata
            }
        )
    except Exception as log_err:
        print(f"⚠️ Failed to log bug report activity: {log_err}")
    
    # Check for Bug Reporter achievement
    try:
        from api.achievements.services.achievements_service import AchievementsService
        achievements_service = AchievementsService()
        awarded = achievements_service.award_achievement(db, current_user.id, "bug_reporter")
        if awarded:
            print(f"🏆 Awarded Bug Reporter achievement to user {current_user.id}")
        else:
            print(f"🏆 Bug Reporter achievement already earned by user {current_user.id}")
    except Exception as achievement_err:
        print(f"⚠️ Failed to check Bug Reporter achievement: {achievement_err}")
        # Don't fail the bug report if achievement checking fails
    
    DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL", "")
    
    # If no Discord webhook, just log and return success (for dev)
    if not DISCORD_WEBHOOK_URL:
        print(f"⚠️  Bug report from {current_user.username}:")
        print(f"Subject: {report.subject}")
        print(f"Description: {report.description}")
        print(f"(Discord webhook not configured)")
        return {
            "message": "Bug report received (Discord not configured in dev mode)",
            "status": "logged"
        }
    
    try:
        # Create Discord embed
        embed = {
            "title": f"🐛 Bug Report: {report.subject}",
            "description": report.description,
            "color": 15158332,  # Red color
            "fields": [
                {
                    "name": "👤 User",
                    "value": f"{current_user.username} (ID: {current_user.id})",
                    "inline": True
                },
                {
                    "name": "📧 Email",
                    "value": current_user.email or "N/A",
                    "inline": True
                },
                {
                    "name": "🕐 Time",
                    "value": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
                    "inline": False
                }
            ],
            "footer": {
                "text": "TrackFlow Bug Report System"
            }
        }
        
        # Send to Discord
        payload = {
            "embeds": [embed]
        }
        
        response = requests.post(DISCORD_WEBHOOK_URL, json=payload, timeout=5)
        response.raise_for_status()
        
        print(f"✅ Bug report sent to Discord from {current_user.username}: {report.subject}")
        
        return {
            "message": "Bug report sent successfully! We'll look into it soon.",
            "status": "sent"
        }
        
    except Exception as e:
        print(f"❌ Failed to send bug report to Discord: {e}")
        # Still log it to console
        print(f"Bug report from {current_user.username}:")
        print(f"Subject: {report.subject}")
        print(f"Description: {report.description}")
        
        # Still return success to user, but log the error
        return {
            "message": "Bug report received! We'll look into it soon.",
            "status": "logged"
        }

