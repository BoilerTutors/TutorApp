import smtplib
from email.message import EmailMessage

from app.config import settings


def send_otp_email(to_email: str, otp_code: str) -> None:
    """Send a 6-digit OTP code to the user's email via Gmail SMTP."""
    if not settings.smtp_host or not settings.smtp_user:
        raise RuntimeError(
            "SMTP is not configured. Set SMTP_HOST, SMTP_USER, "
            "SMTP_PASSWORD, and SMTP_FROM_EMAIL in .env."
        )

    msg = EmailMessage()
    msg["Subject"] = "BoilerTutors – Your verification code"
    msg["From"] = settings.smtp_from_email or settings.smtp_user
    msg["To"] = to_email
    msg.set_content(
        f"Your BoilerTutors verification code is: {otp_code}\n\n"
        f"This code expires in {settings.mfa_code_expire_minutes} minutes.\n"
        "If you did not request this, you can safely ignore this email."
    )

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
        server.starttls()
        server.login(settings.smtp_user, settings.smtp_password.get_secret_value())
        server.send_message(msg)
