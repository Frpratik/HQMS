import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional, Dict, Any
import httpx

from app.core.config import settings

logger = logging.getLogger("hqms.email")


class EmailService:
    """
    Enterprise Email Dispatch Service for Hospital Onboarding & Staff Invitations.
    Supports Resend API (Free tier: 3,000 emails/mo), SMTP, and Console mock logging.
    """

    @classmethod
    async def send_email(
        cls,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
    ) -> bool:
        """Dispatches an email via Resend, SMTP, or Console Mock."""
        if not to_email:
            logger.warning("Empty recipient email address; skipping email dispatch.")
            return False

        # 1. SMTP Dispatch (e.g. Gmail SMTP, AWS SES, Custom SMTP)
        if settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD:
            try:
                msg = MIMEMultipart("alternative")
                msg["Subject"] = subject
                msg["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>"
                msg["To"] = to_email

                if text_content:
                    msg.attach(MIMEText(text_content, "plain"))
                msg.attach(MIMEText(html_content, "html"))

                with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                    if settings.SMTP_TLS:
                        server.starttls()
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                    server.sendmail(settings.EMAILS_FROM_EMAIL, to_email, msg.as_string())

                logger.info(f"[Gmail SMTP] Successfully dispatched email to {to_email}: {subject}")
                return True
            except Exception as e:
                logger.error(f"[Gmail SMTP] Exception during dispatch: {e}")

        # 2. Resend API Dispatch
        if settings.RESEND_API_KEY:
            try:
                url = "https://api.resend.com/emails"
                headers = {
                    "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                    "Content-Type": "application/json",
                }
                payload = {
                    "from": f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL}>",
                    "to": [to_email],
                    "subject": subject,
                    "html": html_content,
                    "text": text_content or html_content,
                }
                async with httpx.AsyncClient(timeout=10.0) as client:
                    res = await client.post(url, headers=headers, json=payload)
                    if res.status_code in (200, 201):
                        logger.info(f"[Resend Email] Successfully dispatched to {to_email}: {subject}")
                        return True
                    else:
                        logger.error(f"[Resend Email] API Error: {res.text}")
            except Exception as e:
                logger.error(f"[Resend Email] Exception during dispatch: {e}")

        # 3. Fallback: Console Mock Logger
        logger.info(f"\n{'='*60}\n[MOCK EMAIL DISPATCH]\nTo: {to_email}\nSubject: {subject}\n\n{text_content or html_content}\n{'='*60}")
        return True

    @classmethod
    async def send_hospital_admin_welcome(
        cls,
        admin_email: str,
        admin_name: str,
        hospital_name: str,
        temp_password: str,
        login_url: Optional[str] = None,
    ) -> bool:
        """Dispatches official welcome email to newly provisioned Hospital Administrator."""
        portal_url = login_url or f"{settings.FRONTEND_URL}/login"
        subject = f"Welcome to HQMS — {hospital_name} Provisioning Details & Credentials"

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; }}
            .card {{ max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }}
            .badge {{ display: inline-block; background: #ecfdf5; color: #047857; font-weight: 700; font-size: 11px; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; }}
            .title {{ font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 12px; }}
            .text {{ font-size: 14px; color: #475569; line-height: 1.6; margin: 16px 0; }}
            .creds-box {{ background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 12px; padding: 18px; margin: 20px 0; font-family: monospace; font-size: 13px; color: #0f172a; }}
            .btn {{ display: inline-block; background: #047857; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 10px; margin-top: 12px; }}
            .footer {{ font-size: 11px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px; }}
          </style>
        </head>
        <body>
          <div class="card">
            <span class="badge">Facility Provisioned</span>
            <h1 class="title">Welcome to HQMS Clinical OS</h1>
            <p class="text">
              Dear <strong>{admin_name}</strong>,<br><br>
              Your medical facility <strong>{hospital_name}</strong> has been successfully provisioned on the Hospital Queue Management System.
            </p>
            <div class="creds-box">
              <div><strong>Hospital:</strong> {hospital_name}</div>
              <div><strong>Admin Email:</strong> {admin_email}</div>
              <div><strong>Temporary Password:</strong> {temp_password}</div>
              <div><strong>Portal URL:</strong> <a href="{portal_url}">{portal_url}</a></div>
            </div>
            <p class="text">
              Please sign in using your portal URL and navigate to the <strong>Hospital Operations Console</strong> to deploy departments, rooms, doctors, and receptionist stations.
            </p>
            <a href="{portal_url}" class="btn" style="color: #ffffff;">Access Hospital Console &rarr;</a>
            <div class="footer">
              This is an automated administrative dispatch from HQMS Healthcare Network. For security, please update your password after your initial login.
            </div>
          </div>
        </body>
        </html>
        """

        text_body = f"""
Welcome to HQMS — {hospital_name}

Dear {admin_name},

Your medical facility {hospital_name} has been provisioned on HQMS.

Portal URL: {portal_url}
Admin Email: {admin_email}
Temporary Password: {temp_password}

Please sign in and set up your departments, doctors, and receptionist desks.
        """

        return await cls.send_email(
            to_email=admin_email,
            subject=subject,
            html_content=html_body,
            text_content=text_body,
        )

    @classmethod
    async def send_staff_invitation(
        cls,
        staff_email: str,
        staff_name: str,
        role: str,
        hospital_name: str,
        temp_password: str,
        login_url: Optional[str] = None,
    ) -> bool:
        """Dispatches specialized credentials email to newly invited Doctor or Receptionist."""
        portal_url = login_url or f"{settings.FRONTEND_URL}/login"
        is_doctor = "DOCTOR" in role.upper()
        is_receptionist = "RECEPTIONIST" in role.upper()

        if is_doctor:
            subject = f"Your Doctor Workstation Credentials — {hospital_name}"
            role_label = "Doctor / Physician Station"
            role_badge_bg = "#ecfdf5"
            role_badge_color = "#047857"
            role_intro = f"Your Doctor workstation account has been provisioned at <strong>{hospital_name}</strong>. You can now sign in to manage patient consultations, call OPD tokens, and view live clinical queues."
        elif is_receptionist:
            subject = f"Your Reception Desk Credentials — {hospital_name}"
            role_label = "Front Desk Receptionist Station"
            role_badge_bg = "#eff6ff"
            role_badge_color = "#1d4ed8"
            role_intro = f"Your Front Desk Receptionist account has been provisioned at <strong>{hospital_name}</strong>. You can now sign in to register walk-in patients, print QR tracking token slips, and coordinate queue admissions."
        else:
            subject = f"Your Staff Account Credentials — {hospital_name}"
            role_label = role
            role_badge_bg = "#f3e8ff"
            role_badge_color = "#7e22ce"
            role_intro = f"Your staff workstation account has been provisioned at <strong>{hospital_name}</strong>."

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; }}
            .card {{ max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }}
            .badge {{ display: inline-block; background: {role_badge_bg}; color: {role_badge_color}; font-weight: 700; font-size: 11px; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; }}
            .title {{ font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 12px; }}
            .text {{ font-size: 14px; color: #475569; line-height: 1.6; margin: 16px 0; }}
            .creds-box {{ background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 12px; padding: 18px; margin: 20px 0; font-family: monospace; font-size: 13px; color: #0f172a; }}
            .btn {{ display: inline-block; background: #047857; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 10px; margin-top: 12px; }}
            .footer {{ font-size: 11px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px; }}
          </style>
        </head>
        <body>
          <div class="card">
            <span class="badge">{role_label}</span>
            <h1 class="title">Your {role_label} is Ready</h1>
            <p class="text">
              Hello <strong>{staff_name}</strong>,<br><br>
              {role_intro}
            </p>
            <div class="creds-box">
              <div><strong>Hospital:</strong> {hospital_name}</div>
              <div><strong>Designated Role:</strong> {role_label}</div>
              <div><strong>Login Email:</strong> {staff_email}</div>
              <div><strong>Temporary Password:</strong> {temp_password}</div>
              <div><strong>Portal URL:</strong> <a href="{portal_url}">{portal_url}</a></div>
            </div>
            <a href="{portal_url}" class="btn" style="color: #ffffff;">Launch {role_label} &rarr;</a>
            <div class="footer">
              HQMS Clinical Station Access · {hospital_name}
            </div>
          </div>
        </body>
        </html>
        """

        text_body = f"""
HQMS {role_label} Credentials — {hospital_name}

Hello {staff_name},

{role_intro}

Portal URL: {portal_url}
Login Email: {staff_email}
Password: {temp_password}
Role: {role_label}
        """

        return await cls.send_email(
            to_email=staff_email,
            subject=subject,
            html_content=html_body,
            text_content=text_body,
        )
