"""
Email service module with Resend HTTP API and SMTP support.
"""
import requests
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


def _get_resend_api_key():
    """Get Resend API key from settings or fallback to EMAIL_HOST_PASSWORD."""
    return settings.RESEND_API_KEY or getattr(settings, 'EMAIL_HOST_PASSWORD', '')


def send_email_via_resend(subject, message, to_emails, html_message=None):
    """
    Send email via Resend HTTP API.
    
    Args:
        subject: Email subject
        message: Plain text email body
        to_emails: List of recipient email addresses or single email string
        html_message: Optional HTML email body
        
    Raises:
        ValueError: If API key or sender email is missing
        requests.RequestException: If HTTP request fails
    """
    api_key = _get_resend_api_key()
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', '')
    
    if not api_key:
        raise ValueError("Resend API key is not configured.")
    if not from_email:
        raise ValueError("DEFAULT_FROM_EMAIL is not configured.")
    
    # Normalize to_emails to list
    if isinstance(to_emails, str):
        to_emails = [to_emails]
    
    # Build request
    headers = {
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json',
    }
    
    payload = {
        'from': from_email,
        'to': to_emails,
        'subject': subject,
        'text': message,
    }
    
    if html_message:
        payload['html'] = html_message
    
    # Send request
    response = requests.post(
        'https://api.resend.com/emails',
        json=payload,
        headers=headers,
        timeout=10
    )
    
    response.raise_for_status()
    
    return response.json()
