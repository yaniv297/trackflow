"""
Email service for TrackFlow
Supports sending password reset emails using smtplib (built-in Python)
"""

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Email configuration from environment variables
EMAIL_USERNAME = os.getenv("EMAIL_USERNAME", "")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD", "")
EMAIL_FROM = os.getenv("EMAIL_FROM", EMAIL_USERNAME)
EMAIL_FROM_NAME = os.getenv("EMAIL_FROM_NAME", "TrackFlow")
EMAIL_SERVER = os.getenv("EMAIL_SERVER", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_STARTTLS = os.getenv("EMAIL_STARTTLS", "True").lower() == "true"

# Frontend URL for reset links
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

def is_email_configured() -> bool:
    """Check if email is properly configured"""
    return bool(EMAIL_USERNAME and EMAIL_PASSWORD and EMAIL_SERVER)

def send_password_reset_email(email: str, token: str, username: str) -> bool:
    """
    Send password reset email to user
    
    Args:
        email: User's email address
        token: Password reset token
        username: User's username
        
    Returns:
        bool: True if email was sent successfully, False otherwise
    """
    if not is_email_configured():
        # Email not configured
        return False
    
    # Create reset URL
    reset_url = f"{FRONTEND_URL}/reset-password?token={token}"
    
    # Email content
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Password Reset - TrackFlow</title>
        <style>
            body {{ font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }}
            .container {{ max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
            .header {{ text-align: center; margin-bottom: 30px; }}
            .logo {{ font-size: 28px; font-weight: bold; color: #2563eb; margin-bottom: 10px; }}
            .title {{ font-size: 24px; color: #1f2937; margin-bottom: 20px; }}
            .content {{ color: #374151; line-height: 1.6; margin-bottom: 30px; }}
            .warning {{ background-color: #fef3cd; border: 1px solid #faebcd; padding: 15px; border-radius: 5px; color: #856404; margin: 20px 0; }}
            .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🎵 TrackFlow</div>
                <div class="title">Password Reset Request</div>
            </div>
            
            <div class="content">
                <p>Hi <strong>{username}</strong>,</p>
                
                <p>We received a request to reset your password for your TrackFlow account. If you made this request, click the button below to reset your password:</p>
                
                <div style="text-align: center;">
                    <table cellpadding="0" cellspacing="0" style="margin: 20px auto;">
                        <tr>
                            <td style="background-color: #28a745; padding: 12px 30px; border-radius: 5px; border: 2px solid #28a745;">
                                <a href="{reset_url}" style="color: #ffffff !important; text-decoration: none; font-weight: bold; font-family: Arial, sans-serif; font-size: 16px; display: block;">Reset Your Password</a>
                            </td>
                        </tr>
                    </table>
                </div>
                
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #2563eb; font-size: 14px;">{reset_url}</p>
                
                <div class="warning">
                    <strong>⚠️ Security Notice:</strong><br>
                    • This link will expire in 1 hour for your security<br>
                    • If you didn't request this reset, you can safely ignore this email<br>
                    • Your password won't change until you create a new one using the link above
                </div>
                
                <p>If you're having trouble with the button above, copy and paste the URL below into your web browser:</p>
            </div>
            
            <div class="footer">
                <p>This email was sent from TrackFlow. If you have any questions, please contact your administrator.</p>
                <p style="font-size: 12px; color: #9ca3af;">This is an automated email. Please do not reply to this message.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    plain_body = f"""
    Password Reset Request - TrackFlow

    Hi {username},

    We received a request to reset your password for your TrackFlow account. 
    If you made this request, use the link below to reset your password:

    {reset_url}

    Security Notice:
    - This link will expire in 1 hour for your security
    - If you didn't request this reset, you can safely ignore this email
    - Your password won't change until you create a new one using the link above

    This email was sent from TrackFlow. If you have any questions, please contact your administrator.
    
    This is an automated email. Please do not reply to this message.
    """
    
    try:
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = "Reset Your TrackFlow Password"
        msg['From'] = f"{EMAIL_FROM_NAME} <{EMAIL_FROM}>"
        msg['To'] = email
        
        # Add text and HTML parts
        text_part = MIMEText(plain_body, 'plain')
        html_part = MIMEText(html_body, 'html')
        msg.attach(text_part)
        msg.attach(html_part)
        
        # Send email via SMTP
        with smtplib.SMTP(EMAIL_SERVER, EMAIL_PORT) as server:
            if EMAIL_STARTTLS:
                server.starttls()
            server.login(EMAIL_USERNAME, EMAIL_PASSWORD)
            text = msg.as_string()
            server.sendmail(EMAIL_FROM, email, text)
        
        # Email sent successfully
        return True
        
    except Exception as e:
        # Failed to send email
        return False

def send_test_email(email: str) -> bool:
    """
    Send a test email to verify email configuration
    
    Args:
        email: Email address to send test to
        
    Returns:
        bool: True if email was sent successfully, False otherwise
    """
    if not is_email_configured():
        # Email not configured
        return False
    
    try:
        # Create message
        msg = MIMEText("This is a test email from TrackFlow. Email configuration is working correctly!")
        msg['Subject'] = "TrackFlow Email Test"
        msg['From'] = f"{EMAIL_FROM_NAME} <{EMAIL_FROM}>"
        msg['To'] = email
        
        # Send email via SMTP
        with smtplib.SMTP(EMAIL_SERVER, EMAIL_PORT) as server:
            if EMAIL_STARTTLS:
                server.starttls()
            server.login(EMAIL_USERNAME, EMAIL_PASSWORD)
            text = msg.as_string()
            server.sendmail(EMAIL_FROM, email, text)
        
        # Test email sent
        return True
        
    except Exception as e:
        # Failed to send test email
        return False