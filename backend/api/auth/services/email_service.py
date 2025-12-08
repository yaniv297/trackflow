"""Email service for password reset functionality."""

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


class EmailService:
    """Service for sending emails."""
    
    def __init__(self):
        self.email_username = os.getenv("EMAIL_USERNAME", "")
        self.email_password = os.getenv("EMAIL_PASSWORD", "")
        self.email_from = os.getenv("EMAIL_FROM", self.email_username)
        self.email_from_name = os.getenv("EMAIL_FROM_NAME", "TrackFlow")
        self.email_server = os.getenv("EMAIL_SERVER", "smtp.gmail.com")
        self.email_port = int(os.getenv("EMAIL_PORT", "587"))
        self.email_starttls = os.getenv("EMAIL_STARTTLS", "True").lower() == "true"
        self.frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    
    def is_configured(self) -> bool:
        """Check if email is properly configured."""
        return bool(self.email_username and self.email_password and self.email_server)
    
    def send_password_reset_email(self, email: str, token: str, username: str) -> bool:
        """Send password reset email to user."""
        if not self.is_configured():
            return False
        
        reset_url = f"{self.frontend_url}/reset-password?token={token}"
        
        try:
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = "Password Reset Request - TrackFlow"
            message["From"] = f"{self.email_from_name} <{self.email_from}>"
            message["To"] = email
            
            # Email content
            text = f"""
Hi {username},

We received a request to reset your password for your TrackFlow account.

Click the link below to reset your password:
{reset_url}

This link will expire in 1 hour. If you didn't request this reset, please ignore this email.

Best regards,
The TrackFlow Team
"""
            
            html = f"""
<html>
<body>
    <h2>Password Reset Request</h2>
    <p>Hi {username},</p>
    <p>We received a request to reset your password for your TrackFlow account.</p>
    <p><a href="{reset_url}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Your Password</a></p>
    <p>This link will expire in 1 hour. If you didn't request this reset, please ignore this email.</p>
    <p>Best regards,<br>The TrackFlow Team</p>
</body>
</html>
"""
            
            # Create text and HTML parts
            text_part = MIMEText(text, "plain")
            html_part = MIMEText(html, "html")
            
            # Add parts to message
            message.attach(text_part)
            message.attach(html_part)
            
            # Send email
            with smtplib.SMTP(self.email_server, self.email_port) as server:
                if self.email_starttls:
                    server.starttls()
                server.login(self.email_username, self.email_password)
                text = message.as_string()
                server.sendmail(self.email_from, email, text)
            
            return True
            
        except Exception as e:
            print(f"Failed to send email: {e}")
            return False