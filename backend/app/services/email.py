import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY", "")
SENDGRID_FROM = os.getenv("SENDGRID_FROM_EMAIL", "")


def send_email(to: str, subject: str, html_body: str) -> None:
    message = Mail(
        from_email=SENDGRID_FROM,
        to_emails=to,
        subject=subject,
        html_content=html_body,
    )
    client = SendGridAPIClient(SENDGRID_API_KEY)
    client.send(message)