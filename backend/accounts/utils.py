"""
Email utility functions for verification, password reset, and account deletion.
"""
import random
import secrets
import string
import threading
import logging
from django.utils import timezone
from django.conf import settings
from django.core.mail import send_mail
from django.contrib.auth import get_user_model
from .email_service import send_email_via_resend

logger = logging.getLogger(__name__)
User = get_user_model()


def generate_otp():
    """Generate a 6-digit OTP."""
    return ''.join(random.choices(string.digits, k=6))


def generate_password_reset_token():
    """Generate a secure random token."""
    return secrets.token_urlsafe(32)


def _send_email_async(func, *args, **kwargs):
    """Send email in a background thread."""
    thread = threading.Thread(target=func, args=args, kwargs=kwargs, daemon=True)
    thread.start()


def _send_email(subject, message, to_emails, html_message=None):
    """
    Send email via configured backend (Resend API or SMTP).
    """
    try:
        if getattr(settings, 'USE_RESEND_API', False):
            send_email_via_resend(subject, message, to_emails, html_message=html_message)
        else:
            send_mail(
                subject=subject,
                message=message,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', settings.EMAIL_HOST_USER),
                recipient_list=to_emails if isinstance(to_emails, list) else [to_emails],
                html_message=html_message,
                fail_silently=False,
            )
        logger.info(f"Email sent to {to_emails}")
    except Exception as e:
        logger.error(f"Failed to send email to {to_emails}: {str(e)}")
        # Don't raise - let user creation proceed even if email fails


def send_verification_email(user, async_send=True):
    """
    Send email verification OTP to user.
    """
    otp = generate_otp()
    user.email_verification_token = otp
    user.email_verification_sent_at = timezone.now()
    user.save(update_fields=['email_verification_token', 'email_verification_sent_at'])
    
    subject = "Your Cadence verification code"
    message = (
        f"Use this verification code to finish setting up your Cadence account:\n\n"
        f"{otp}\n\n"
        f"This code expires in 10 minutes."
    )
    html_message = f"""
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
      <h2 style="margin: 0 0 12px; font-size: 20px; font-weight: 700;">Verify your email</h2>
      <p style="margin: 0 0 18px; font-size: 14px;">Use the code below to verify your Cadence account.</p>
      <div style="display: inline-block; padding: 14px 20px; border: 1px solid #d1d5db; border-radius: 10px; background: #f9fafb; font-size: 28px; font-weight: 800; letter-spacing: 0.3em; margin-bottom: 18px;">
        {otp}
      </div>
      <p style="margin: 0; font-size: 13px; color: #4b5563;">This code expires in 10 minutes.</p>
    </div>
    """
    
    if async_send:
        _send_email_async(_send_email, subject, message, [user.email], html_message=html_message)
    else:
        _send_email(subject, message, [user.email], html_message=html_message)


def send_password_reset_email(user, reset_token, async_send=True):
    """
    Send password reset link to user.
    """
    reset_url = f"{settings.FRONTEND_URL}/auth/password-reset-confirm?token={reset_token}"
    
    subject = "Reset your Cadence password"
    message = (
        "We received a request to reset your Cadence password. "
        f"Use the link below to continue:\n\n{reset_url}\n\n"
        "If you did not request this, you can safely ignore this email."
    )
    html_message = f"""
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
      <h2 style="margin: 0 0 12px; font-size: 20px; font-weight: 700;">Reset your password</h2>
      <p style="margin: 0 0 18px; font-size: 14px;">We received a request to reset your Cadence password.</p>
      <a href="{reset_url}" style="display: inline-block; padding: 12px 18px; background: #111827; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 700;">Reset Password</a>
      <p style="margin: 18px 0 0; font-size: 13px; color: #4b5563;">This link expires in 1 hour. If you did not request this, you can ignore this email.</p>
    </div>
    """
    
    if async_send:
        _send_email_async(_send_email, subject, message, [user.email], html_message=html_message)
    else:
        _send_email(subject, message, [user.email], html_message=html_message)


def send_account_deletion_email(user, deletion_token, deletion_reasons=None, async_send=True):
    """
    Send account deletion confirmation link to user.
    """
    deletion_url = f"{settings.FRONTEND_URL}/auth/delete-account-confirm?token={deletion_token}"
    
    subject = "Confirm Cadence account deletion"
    message = (
                "We received a request to delete your Cadence account. "
                f"Open the confirmation page below to continue:\n\n{deletion_url}\n\n"
                "This link expires in 24 hours."
    )
    html_message = f"""
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
      <h2 style="margin: 0 0 12px; font-size: 20px; font-weight: 700;">Confirm account deletion</h2>
            <p style="margin: 0 0 18px; font-size: 14px;">Open the Cadence confirmation page to complete account deletion.</p>
            <a href="{deletion_url}" style="display: inline-block; padding: 12px 18px; background: #111827; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 700;">Open Confirmation Page</a>
            <p style="margin: 18px 0 0; font-size: 13px; color: #4b5563;">This link expires in 24 hours.</p>
    </div>
    """
    
    if async_send:
        _send_email_async(_send_email, subject, message, [user.email], html_message=html_message)
    else:
        _send_email(subject, message, [user.email], html_message=html_message)
