import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from config import settings
import logging

logger = logging.getLogger(__name__)

class EmailService:
    """Service for sending emails via SMTP"""
    
    @staticmethod
    def send_email(
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """
        Send an email using SMTP
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            html_content: HTML content of the email
            text_content: Plain text content (optional)
        
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        try:
            # Validate SMTP configuration
            if not settings.SMTP_HOST or not settings.SMTP_USER or not settings.SMTP_PASSWORD:
                error_msg = "SMTP configuration is missing. Please set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD in .env file"
                logger.error(error_msg)
                print(f"❌ {error_msg}")  # Console output for debugging
                return False
            
            print(f"📧 Attempting to send email to {to_email} via {settings.SMTP_HOST}")  # Console output for debugging
            
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
            msg['To'] = to_email
            
            # Add text and HTML parts
            if text_content:
                text_part = MIMEText(text_content, 'plain')
                msg.attach(text_part)
            
            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)
            
            # Connect to SMTP server
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
            server.set_debuglevel(0)  # Set to 1 for debugging
            
            if settings.SMTP_TLS:
                server.starttls()
            
            # Login and send
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
            server.quit()
            
            logger.info(f"✅ Email sent successfully to {to_email}")
            print(f"✅ Email sent successfully to {to_email}")  # Console output for debugging
            return True
            
        except smtplib.SMTPAuthenticationError as e:
            error_msg = f"SMTP Authentication failed. Please check SMTP_USER and SMTP_PASSWORD in .env file. Error: {str(e)}"
            logger.error(error_msg)
            print(f"❌ {error_msg}")  # Console output for debugging
            return False
        except smtplib.SMTPException as e:
            error_msg = f"SMTP error while sending email to {to_email}: {str(e)}"
            logger.error(error_msg)
            print(f"❌ {error_msg}")  # Console output for debugging
            return False
        except Exception as e:
            error_msg = f"Failed to send email to {to_email}: {str(e)}"
            logger.error(error_msg)
            print(f"❌ {error_msg}")  # Console output for debugging
            import traceback
            traceback.print_exc()  # Print full traceback for debugging
            return False
    
    @staticmethod
    def send_password_reset_email(to_email: str, verification_code: str) -> bool:
        """
        Send password reset email with verification code
        
        Args:
            to_email: Recipient email address
            verification_code: 6-digit verification code
        
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        subject = "Password Reset Verification Code"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f5f5f5;
                }}
                .container {{
                    background-color: #ffffff;
                    border-radius: 8px;
                    padding: 30px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }}
                .header {{
                    text-align: center;
                    margin-bottom: 30px;
                }}
                .logo {{
                    font-size: 24px;
                    font-weight: bold;
                    color: #7c3aed;
                    margin-bottom: 10px;
                }}
                .code-container {{
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 12px;
                    padding: 30px;
                    text-align: center;
                    margin: 30px 0;
                }}
                .verification-code {{
                    font-size: 48px;
                    font-weight: bold;
                    color: #ffffff;
                    letter-spacing: 8px;
                    font-family: 'Courier New', monospace;
                    margin: 20px 0;
                }}
                .message {{
                    color: #666;
                    font-size: 14px;
                    line-height: 1.8;
                    margin: 20px 0;
                }}
                .footer {{
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #e5e5e5;
                    text-align: center;
                    color: #999;
                    font-size: 12px;
                }}
                .warning {{
                    background-color: #fff3cd;
                    border-left: 4px solid #ffc107;
                    padding: 15px;
                    margin: 20px 0;
                    border-radius: 4px;
                    font-size: 13px;
                    color: #856404;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">Inkingi Smart School</div>
                </div>
                
                <h2 style="color: #333; margin-bottom: 20px;">Password Reset Request</h2>
                
                <p class="message">
                    We received a request to reset your password. Use the verification code below to proceed with resetting your password.
                </p>
                
                <div class="code-container">
                    <div style="color: #ffffff; font-size: 16px; margin-bottom: 10px;">Your Verification Code</div>
                    <div class="verification-code">{verification_code}</div>
                    <div style="color: #ffffff; font-size: 14px; opacity: 0.9;">This code expires in 15 minutes</div>
                </div>
                
                <div class="warning">
                    <strong>⚠️ Security Notice:</strong> If you didn't request this password reset, please ignore this email. Your account remains secure.
                </div>
                
                <p class="message">
                    Enter this code on the password reset page to create a new password. The code is valid for 15 minutes only.
                </p>
                
                <div class="footer">
                    <p>This is an automated message. Please do not reply to this email.</p>
                    <p>&copy; {settings.EMAILS_FROM_NAME}. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
Inkingi Smart School - Password Reset

We received a request to reset your password.

Your Verification Code: {verification_code}

This code expires in 15 minutes.

If you didn't request this password reset, please ignore this email.

This is an automated message. Please do not reply to this email.
        """
        
        return EmailService.send_email(to_email, subject, html_content, text_content)

