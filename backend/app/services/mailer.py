from app.core.config import settings
import smtplib
from email.message import EmailMessage
import logging


logger = logging.getLogger(__name__)


def _send_via_smtp(to: str, subject: str, body: str) -> None:
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.MAIL_FROM or (settings.SMTP_USER or "no-reply@example.com")
    msg["To"] = to
    msg.set_content(body)

    # Guard and narrow Optional settings for type checkers
    if settings.SMTP_HOST is None or settings.SMTP_PORT is None:
        raise RuntimeError("SMTP is not configured: set SMTP_HOST and SMTP_PORT")
    host: str = settings.SMTP_HOST
    port: int = settings.SMTP_PORT

    if settings.SMTP_USE_SSL:
        with smtplib.SMTP_SSL(host, port) as server:
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
    else:
        with smtplib.SMTP(host, port) as server:
            if settings.SMTP_USE_TLS:
                server.starttls()
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)


def send_email(to: str, subject: str, body: str) -> None:
    """Send email using SMTP if configured, otherwise log to stdout."""
    if settings.SMTP_HOST and settings.SMTP_PORT:
        try:
            _send_via_smtp(to, subject, body)
            return
        except Exception as exc:
            logger.warning("SMTP send failed, falling back to console output: %s", exc)

    # Fallback: log to console
    print("=== EMAIL (DRY-RUN) ===")
    print(f"To: {to}")
    print(f"Subject: {subject}")
    print("Body:\n" + body)
    print("=======================")
