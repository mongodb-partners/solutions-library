"""
Email service for sending emails via SMTP.
"""

import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

from config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending emails via SMTP."""

    @classmethod
    def _get_smtp_connection(cls) -> smtplib.SMTP:
        """Create and return an SMTP connection."""
        smtp = smtplib.SMTP(settings.smtp_host, settings.smtp_port)
        smtp.starttls()
        if settings.smtp_username and settings.smtp_password:
            smtp.login(settings.smtp_username, settings.smtp_password)
        return smtp

    @classmethod
    def send_email(
        cls,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
    ) -> bool:
        """
        Send an email via SMTP.

        Args:
            to_email: Recipient email address
            subject: Email subject
            html_content: HTML body content
            text_content: Plain text content (optional fallback)

        Returns:
            True if email was sent successfully, False otherwise
        """
        if not settings.smtp_username or not settings.smtp_password:
            logger.warning("SMTP credentials not configured - email not sent")
            return False

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
            msg["To"] = to_email

            # Add plain text version
            if text_content:
                text_part = MIMEText(text_content, "plain")
                msg.attach(text_part)

            # Add HTML version
            html_part = MIMEText(html_content, "html")
            msg.attach(html_part)

            with cls._get_smtp_connection() as smtp:
                smtp.sendmail(settings.smtp_from_email, to_email, msg.as_string())

            logger.info(f"Email sent successfully to {to_email}")
            return True

        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"SMTP authentication failed: {e}")
            return False
        except smtplib.SMTPException as e:
            logger.error(f"SMTP error sending email: {e}")
            return False
        except Exception as e:
            logger.error(f"Error sending email: {e}")
            return False

    @classmethod
    def send_password_reset_email(
        cls,
        to_email: str,
        username: str,
        reset_token: str,
    ) -> bool:
        """
        Send a password reset email.

        Args:
            to_email: Recipient email address
            username: Admin username
            reset_token: Password reset token

        Returns:
            True if email was sent successfully, False otherwise
        """
        reset_url = f"{settings.base_url}/admin/reset-password?token={reset_token}"

        subject = "Password Reset Request - MongoDB Solutions Library"

        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #001E2B;
            margin: 0;
            padding: 0;
            background-color: #F9FAFB;
        }}
        .container {{
            max-width: 600px;
            margin: 0 auto;
            padding: 40px 20px;
        }}
        .card {{
            background-color: #FFFFFF;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }}
        .logo {{
            text-align: center;
            margin-bottom: 32px;
        }}
        .logo img {{
            height: 40px;
        }}
        h1 {{
            color: #001E2B;
            font-size: 24px;
            font-weight: 600;
            margin: 0 0 16px;
        }}
        p {{
            color: #5C6C75;
            margin: 0 0 16px;
        }}
        .button {{
            display: inline-block;
            background-color: #00684A;
            color: #FFFFFF !important;
            text-decoration: none;
            padding: 14px 28px;
            border-radius: 8px;
            font-weight: 500;
            margin: 24px 0;
        }}
        .warning {{
            background-color: #FEF3C7;
            border-radius: 8px;
            padding: 12px 16px;
            font-size: 14px;
            color: #92400E;
            margin-top: 24px;
        }}
        .footer {{
            text-align: center;
            margin-top: 32px;
            font-size: 12px;
            color: #9CA3AF;
        }}
        .link {{
            word-break: break-all;
            font-size: 12px;
            color: #6B7280;
            margin-top: 16px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="logo">
                <strong style="font-size: 18px; color: #001E2B;">MongoDB Solutions Library</strong>
            </div>

            <h1>Password Reset Request</h1>

            <p>Hi {username},</p>

            <p>We received a request to reset your password for your admin account. Click the button below to create a new password:</p>

            <div style="text-align: center;">
                <a href="{reset_url}" class="button">Reset Password</a>
            </div>

            <div class="link">
                <p style="margin: 0; color: #6B7280;">Or copy and paste this link into your browser:</p>
                <p style="margin: 4px 0 0; color: #00684A;">{reset_url}</p>
            </div>

            <div class="warning">
                <strong>This link will expire in 1 hour.</strong><br>
                If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
            </div>
        </div>

        <div class="footer">
            <p>This email was sent by MongoDB Solutions Library Admin Dashboard.</p>
            <p>If you have any questions, please contact your system administrator.</p>
        </div>
    </div>
</body>
</html>
"""

        text_content = f"""
Password Reset Request - MongoDB Solutions Library

Hi {username},

We received a request to reset your password for your admin account.

Click the link below to reset your password:
{reset_url}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

---
MongoDB Solutions Library Admin Dashboard
"""

        return cls.send_email(to_email, subject, html_content, text_content)

    @classmethod
    def send_password_changed_email(
        cls,
        to_email: str,
        username: str,
    ) -> bool:
        """
        Send a password changed confirmation email.

        Args:
            to_email: Recipient email address
            username: Admin username

        Returns:
            True if email was sent successfully, False otherwise
        """
        subject = "Password Changed - MongoDB Solutions Library"

        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #001E2B;
            margin: 0;
            padding: 0;
            background-color: #F9FAFB;
        }}
        .container {{
            max-width: 600px;
            margin: 0 auto;
            padding: 40px 20px;
        }}
        .card {{
            background-color: #FFFFFF;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }}
        h1 {{
            color: #001E2B;
            font-size: 24px;
            font-weight: 600;
            margin: 0 0 16px;
        }}
        p {{
            color: #5C6C75;
            margin: 0 0 16px;
        }}
        .success {{
            background-color: #E3FCF7;
            border-radius: 8px;
            padding: 16px;
            color: #00684A;
            margin: 16px 0;
        }}
        .warning {{
            background-color: #FEE2E2;
            border-radius: 8px;
            padding: 12px 16px;
            font-size: 14px;
            color: #DC2626;
            margin-top: 24px;
        }}
        .footer {{
            text-align: center;
            margin-top: 32px;
            font-size: 12px;
            color: #9CA3AF;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <h1>Password Changed Successfully</h1>

            <p>Hi {username},</p>

            <div class="success">
                Your password has been successfully changed.
            </div>

            <p>You can now log in to the admin dashboard using your new password.</p>

            <div class="warning">
                <strong>Didn't make this change?</strong><br>
                If you didn't change your password, please contact your system administrator immediately as your account may have been compromised.
            </div>
        </div>

        <div class="footer">
            <p>This email was sent by MongoDB Solutions Library Admin Dashboard.</p>
        </div>
    </div>
</body>
</html>
"""

        text_content = f"""
Password Changed Successfully - MongoDB Solutions Library

Hi {username},

Your password has been successfully changed.

You can now log in to the admin dashboard using your new password.

If you didn't make this change, please contact your system administrator immediately as your account may have been compromised.

---
MongoDB Solutions Library Admin Dashboard
"""

        return cls.send_email(to_email, subject, html_content, text_content)
