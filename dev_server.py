#!/usr/bin/env python3
"""
ChangeIt4Me — Local SPA & Cloud Sync Server (port 8090)
Provides:
1. Static asset serving + SPA fallback (/admin, /start, /offers -> index.html)
2. GET /api/sync and POST /api/sync backed by .data/cloud_db.json
"""

import base64
import hashlib
import html
import json
import os
import re
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT_DIR = Path(__file__).resolve().parent
DATA_DIR = ROOT_DIR / ".data"
UPLOADS_DIR = DATA_DIR / "uploads"
DB_FILE = DATA_DIR / "cloud_db.json"
SECRET_GW_KEYS = {"brevoApiKey", "resendApiKey", "textbeeKey", "smsAdvertToken", "twilioToken", "stripeSecretKey"}
ADMIN_PASS_HASH = "4106b4f2be492e957124b0687c3cb0781df5505e82f5946794d200201c3b63d4"


def sha256_hex(val):
    return hashlib.sha256(str(val or "").encode("utf-8")).hexdigest()


def hash_user_password_server(email_key, raw_pass):
    s = str(raw_pass or "")
    if not s:
        return ""
    if s.startswith("sha256$"):
        return s
    clean_em = str(email_key or "").strip().lower()
    return f"sha256${sha256_hex(f'ci4m_usr_v1:{clean_em}:{s}')}"


def verify_user_password_server(email_key, entered_pass, stored_pass):
    if not entered_pass or not stored_pass:
        return False
    if str(stored_pass).startswith("sha256$"):
        return hash_user_password_server(email_key, entered_pass) == stored_pass
    return stored_pass == entered_pass


def is_masked_secret(val):
    s = str(val or "").strip()
    return not s or s.startswith("•••") or set(s) == {"*"}


def resolve_brevo_key(headers, saved_gw):
    gw = saved_gw or {}
    hdr_brevo = headers.get("x-brevo-api-key") or ""
    hdr_resend = headers.get("x-resend-api-key") or ""
    candidates = [
        hdr_brevo if not is_masked_secret(hdr_brevo) else "",
        gw.get("brevoApiKey") if not is_masked_secret(gw.get("brevoApiKey")) else "",
        os.environ.get("BREVO_API_KEY", ""),
        hdr_resend if (not is_masked_secret(hdr_resend) and str(hdr_resend).strip().startswith("xkeysib-")) else "",
        gw.get("resendApiKey") if (not is_masked_secret(gw.get("resendApiKey")) and str(gw.get("resendApiKey") or "").strip().startswith("xkeysib-")) else "",
    ]
    for c in candidates:
        if c and str(c).strip():
            return str(c).strip()
    return ""


def send_email_via_resend(headers, saved_gw, to_email, subject, html_body):
    gw = saved_gw or {}
    if not to_email:
        return False

    # 1. Brevo Transactional Email API (https://api.brevo.com/v3/smtp/email)
    brevo_key = resolve_brevo_key(headers, gw)
    if brevo_key:
        sender_email = (
            headers.get("x-brevo-sender-email")
            or gw.get("brevoSenderEmail")
            or os.environ.get("BREVO_SENDER_EMAIL")
            or "jeka7ro@gmail.com"
        ).strip()
        try:
            req_data = json.dumps({
                "sender": {"name": "ChangeIt4Me Security", "email": sender_email},
                "to": [{"email": to_email.strip()}],
                "subject": subject,
                "htmlContent": html_body,
            }).encode("utf-8")
            req = urllib.request.Request(
                "https://api.brevo.com/v3/smtp/email",
                data=req_data,
                headers={
                    "api-key": brevo_key,
                    "accept": "application/json",
                    "content-type": "application/json",
                    "User-Agent": "ChangeIt4Me/1.0",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=6) as resp:
                if 200 <= resp.status < 300:
                    return True
        except Exception:
            pass

    # 2. Resend Email API
    hdr_key = headers.get("x-resend-api-key") or ""
    api_key = (
        (hdr_key if not is_masked_secret(hdr_key) else "")
        or (gw.get("resendApiKey") if not is_masked_secret(gw.get("resendApiKey")) else "")
        or os.environ.get("RESEND_API_KEY", "")
    ).strip()
    if not api_key or api_key.startswith("xkeysib-"):
        return False
    from_addr = os.environ.get("RESEND_FROM_EMAIL", "ChangeIt4Me Security <onboarding@resend.dev>")
    try:
        req_data = json.dumps({
            "from": from_addr,
            "to": [to_email.strip()],
            "subject": subject,
            "html": html_body,
        }).encode("utf-8")
        req = urllib.request.Request(
            "https://api.resend.com/emails",
            data=req_data,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "ChangeIt4Me/1.0",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=6) as resp:
            return 200 <= resp.status < 300
    except Exception:
        return False


def send_sms_via_gateways(headers, saved_gw, phone, text_msg):
    gw = saved_gw or {}
    if not phone:
        return False
    clean_digits = "".join(ch for ch in str(phone) if ch.isdigit() or ch == "+")
    if not clean_digits:
        return False
    formatted_to = clean_digits if clean_digits.startswith("+") else f"+{clean_digits}"

    # 1. TextBee.dev (100% Free Android SIM Gateway)
    hdr_tb_key = headers.get("x-textbee-key") or ""
    tb_key = (
        (hdr_tb_key if not is_masked_secret(hdr_tb_key) else "")
        or (gw.get("textbeeKey") if not is_masked_secret(gw.get("textbeeKey")) else "")
        or os.environ.get("TEXTBEE_API_KEY", "")
    ).strip()
    tb_dev = (headers.get("x-textbee-device") or gw.get("textbeeDevice") or os.environ.get("TEXTBEE_DEVICE_ID", "")).strip()
    if tb_key and tb_dev:
        try:
            url = f"https://api.textbee.dev/api/v1/gateway/devices/{urllib.parse.quote(tb_dev)}/send-sms"
            data = json.dumps({"recipients": [formatted_to], "message": text_msg}).encode("utf-8")
            req = urllib.request.Request(
                url,
                data=data,
                headers={"x-api-key": tb_key, "Content-Type": "application/json", "User-Agent": "ChangeIt4Me/1.0"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=6) as resp:
                if 200 <= resp.status < 300:
                    return True
        except Exception:
            pass

    # 1b. Brevo Transactional SMS API
    brevo_key = resolve_brevo_key(headers, gw)
    if brevo_key:
        try:
            data = json.dumps({
                "sender": "ChangeIt4Me",
                "recipient": formatted_to,
                "content": str(text_msg)[:160],
                "type": "transactional",
            }).encode("utf-8")
            req = urllib.request.Request(
                "https://api.brevo.com/v3/transactionalSMS/sms",
                data=data,
                headers={"api-key": brevo_key, "accept": "application/json", "content-type": "application/json", "User-Agent": "ChangeIt4Me/1.0"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=6) as resp:
                if 200 <= resp.status < 300:
                    return True
        except Exception:
            pass

    # 2. SMSAdvert.ro
    hdr_sa = headers.get("x-smsadvert-token") or ""
    sa_tok = (
        (hdr_sa if not is_masked_secret(hdr_sa) else "")
        or (gw.get("smsAdvertToken") if not is_masked_secret(gw.get("smsAdvertToken")) else "")
        or os.environ.get("SMSADVERT_API_TOKEN", "")
    ).strip()
    if sa_tok:
        try:
            data = json.dumps({"phone": clean_digits, "shortTextMessage": text_msg}).encode("utf-8")
            req = urllib.request.Request(
                "https://www.smsadvert.ro/api/sms/",
                data=data,
                headers={"Authorization": sa_tok, "Content-Type": "application/json", "User-Agent": "ChangeIt4Me/1.0"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=6) as resp:
                if 200 <= resp.status < 300:
                    return True
        except Exception:
            pass

    # 3. Twilio
    tw_sid = (headers.get("x-twilio-sid") or gw.get("twilioSid") or os.environ.get("TWILIO_ACCOUNT_SID", "")).strip()
    hdr_tw_tok = headers.get("x-twilio-token") or ""
    tw_tok = (
        (hdr_tw_tok if not is_masked_secret(hdr_tw_tok) else "")
        or (gw.get("twilioToken") if not is_masked_secret(gw.get("twilioToken")) else "")
        or os.environ.get("TWILIO_AUTH_TOKEN", "")
    ).strip()
    tw_from = (headers.get("x-twilio-from") or gw.get("twilioFrom") or os.environ.get("TWILIO_PHONE_NUMBER", "")).strip()
    if tw_sid and tw_tok and tw_from:
        try:
            auth_b64 = base64.b64encode(f"{tw_sid}:{tw_tok}".encode("utf-8")).decode("ascii")
            form_data = urllib.parse.urlencode({"To": formatted_to, "From": tw_from, "Body": text_msg}).encode("utf-8")
            url = f"https://api.twilio.com/2010-04-01/Accounts/{urllib.parse.quote(tw_sid)}/Messages.json"
            req = urllib.request.Request(
                url,
                data=form_data,
                headers={"Authorization": f"Basic {auth_b64}", "Content-Type": "application/x-www-form-urlencoded"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=6) as resp:
                if 200 <= resp.status < 300:
                    return True
        except Exception:
            pass

    return False


def sanitize_state_for_client(state):
    safe_accounts = {}
    for k, acc in (state.get("accounts") or {}).items():
        if isinstance(acc, dict):
            safe_accounts[k] = {ak: av for ak, av in acc.items() if ak != "password"}
    safe_gw = {}
    for gk, gv in (state.get("authGateways") or {}).items():
        s = str(gv or "").strip()
        if not s:
            continue
        safe_gw[gk] = "••••••••" if gk in SECRET_GW_KEYS else s
    return {
        "version": state.get("version", 1),
        "updatedAt": state.get("updatedAt", datetime.now(timezone.utc).isoformat()),
        "accounts": safe_accounts,
        "userOffers": list(state.get("userOffers") or []),
        "proposals": list(state.get("proposals") or []),
        "watchlist": list(state.get("watchlist") or []),
        "deletedOfferIds": list(state.get("deletedOfferIds") or []),
        "deletedAccountEmails": list(state.get("deletedAccountEmails") or []),
        "authGateways": safe_gw,
    }


def get_empty_state():
    return {
        "version": 1,
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "accounts": {},
        "userOffers": [],
        "proposals": [],
        "watchlist": [],
        "deletedOfferIds": [],
        "deletedAccountEmails": [],
    }


def read_db():
    try:
        if DB_FILE.exists():
            data = json.loads(DB_FILE.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                base = get_empty_state()
                base.update(data)
                return base
    except Exception:
        pass
    return get_empty_state()


def write_db(state):
    try:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        DB_FILE.write_text(json.dumps(state, indent=2, ensure_ascii=False), encoding="utf-8")
    except Exception:
        pass


def merge_state(current, incoming):
    next_st = get_empty_state()
    next_st.update(current)
    next_st["accounts"] = dict(current.get("accounts") or {})
    next_st["userOffers"] = list(current.get("userOffers") or [])
    next_st["proposals"] = list(current.get("proposals") or [])
    next_st["watchlist"] = list(current.get("watchlist") or [])
    next_st["deletedOfferIds"] = list(current.get("deletedOfferIds") or [])
    next_st["deletedAccountEmails"] = list(current.get("deletedAccountEmails") or [])

    for em in incoming.get("deletedAccountEmails") or []:
        k = str(em or "").strip().lower()
        if k:
            if k not in next_st["deletedAccountEmails"]:
                next_st["deletedAccountEmails"].append(k)
            next_st["accounts"].pop(k, None)
            if isinstance(next_st.get("otpStore"), dict):
                next_st["otpStore"].pop(k, None)
            for o in next_st["userOffers"]:
                if isinstance(o, dict) and o.get("id") is not None and str(o.get("ownerEmail") or "").strip().lower() == k:
                    oid = int(o["id"])
                    if oid not in next_st["deletedOfferIds"]:
                        next_st["deletedOfferIds"].append(oid)
            next_st["watchlist"] = [
                w for w in next_st["watchlist"]
                if not (isinstance(w, dict) and str(w.get("email") or "").strip().lower() == k)
            ]

    inc_accounts = incoming.get("accounts")
    if isinstance(inc_accounts, dict):
        for raw_k, acc in inc_accounts.items():
            if not isinstance(acc, dict):
                continue
            k = str(acc.get("email") or raw_k or "").strip().lower()
            if not k:
                continue
            if k in next_st["deletedAccountEmails"] and not incoming.get("forceRestoreAccount"):
                continue
            if incoming.get("forceRestoreAccount") and k in next_st["deletedAccountEmails"]:
                next_st["deletedAccountEmails"] = [x for x in next_st["deletedAccountEmails"] if x != k]
            prev_acc = dict(next_st["accounts"].get(k) or {})
            merged_acc = dict(prev_acc)
            merged_acc.update(acc)
            raw_pwd = acc.get("password") or prev_acc.get("password") or ""
            merged_acc["password"] = hash_user_password_server(k, raw_pwd) if raw_pwd else ""
            next_st["accounts"][k] = merged_acc

    for oid in incoming.get("deletedOfferIds") or []:
        try:
            num_id = int(oid)
            if num_id not in next_st["deletedOfferIds"]:
                next_st["deletedOfferIds"].append(num_id)
        except Exception:
            pass

    if incoming.get("clearDeletedOffers") is True:
        next_st["deletedOfferIds"] = []

    deleted_set = set(next_st["deletedOfferIds"])
    offer_map = {}
    for o in next_st["userOffers"]:
        if isinstance(o, dict) and o.get("id") is not None:
            oid = int(o["id"])
            if oid not in deleted_set:
                offer_map[oid] = o

    for o in incoming.get("userOffers") or []:
        if isinstance(o, dict) and o.get("id") is not None:
            oid = int(o["id"])
            if oid not in deleted_set:
                merged_off = dict(offer_map.get(oid) or {})
                merged_off.update(o)
                offer_map[oid] = merged_off

    next_st["userOffers"] = sorted(offer_map.values(), key=lambda x: int(x.get("id", 0)), reverse=True)

    if isinstance(incoming.get("proposals"), list):
        prop_map = {int(p["id"]): p for p in next_st["proposals"] if isinstance(p, dict) and p.get("id")}
        for p in incoming["proposals"]:
            if isinstance(p, dict) and p.get("id"):
                pid = int(p["id"])
                merged_p = dict(prop_map.get(pid) or {})
                merged_p.update(p)
                prop_map[pid] = merged_p
        next_st["proposals"] = sorted(prop_map.values(), key=lambda x: int(x.get("id", 0)), reverse=True)[:200]

    if isinstance(incoming.get("watchlist"), list):
        wl_map = {int(w["id"]): w for w in next_st["watchlist"] if isinstance(w, dict) and w.get("id")}
        for w in incoming["watchlist"]:
            if isinstance(w, dict) and w.get("id"):
                wl_map[int(w["id"])] = w
        next_st["watchlist"] = sorted(wl_map.values(), key=lambda x: int(x.get("id", 0)), reverse=True)[:200]

    if isinstance(incoming.get("authGateways"), dict):
        merged_gw = dict(current.get("authGateways") or {})
        for gk, gv in incoming["authGateways"].items():
            if gk in SECRET_GW_KEYS and is_masked_secret(gv):
                continue
            merged_gw[gk] = str(gv or "").strip()
        next_st["authGateways"] = merged_gw

    next_st["updatedAt"] = datetime.now(timezone.utc).isoformat()
    return next_st


class ChangeIt4MeHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT_DIR), **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header(
            "Access-Control-Allow-Headers",
            "Content-Type, x-supabase-url, x-supabase-key, x-brevo-api-key, x-brevo-sender-email, x-resend-api-key, x-textbee-key, x-textbee-device, x-smsadvert-token, x-twilio-sid, x-twilio-token, x-twilio-from",
        )
        self.send_header("Cache-Control", "no-store, max-age=0")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/sync":
            st = read_db()
            payload = {"ok": True, "backend": "local-cloud-db", **sanitize_state_for_client(st)}
            body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        if parsed.path.startswith("/uploads/"):
            fname = Path(parsed.path).name
            target = (UPLOADS_DIR / fname).resolve()
            if UPLOADS_DIR.resolve() in target.parents and target.is_file():
                ext = target.suffix.lower()
                ctype = "image/png" if ext == ".png" else "image/webp" if ext == ".webp" else "image/jpeg"
                raw_bytes = target.read_bytes()
                self.send_response(200)
                self.send_header("Content-Type", ctype)
                self.send_header("Content-Length", str(len(raw_bytes)))
                self.end_headers()
                self.wfile.write(raw_bytes)
                return
            self.send_response(404)
            self.end_headers()
            return

        rel_parts = [p for p in parsed.path.split("/") if p]
        if any(p.startswith(".") for p in rel_parts) or parsed.path.startswith("/api/") or parsed.path.endswith(".py"):
            self.send_response(403)
            self.end_headers()
            return

        # SPA routing fallback for paths like /admin, /start, /offers, etc.
        req_file = ROOT_DIR / parsed.path.lstrip("/")
        if parsed.path != "/" and not req_file.exists():
            self.path = "/index.html"
        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/sync":
            length = int(self.headers.get("Content-Length", "0") or "0")
            if length > 2 * 1024 * 1024:
                self.send_response(413)
                self.end_headers()
                return
            raw = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
            try:
                incoming = json.loads(raw) if raw.strip() else {}
            except Exception:
                err_body = json.dumps({"ok": False, "error": "Invalid JSON payload"}).encode("utf-8")
                self.send_response(400)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(err_body)))
                self.end_headers()
                self.wfile.write(err_body)
                return
            current = read_db()

            if isinstance(incoming, dict) and incoming.get("action") == "send_otp":
                email_key = str(incoming.get("email") or "").strip().lower()
                phone_str = str(incoming.get("phone") or "").strip()
                name_str = html.escape(str(incoming.get("name") or "Member").strip()[:80])
                raw_code = str(incoming.get("code") or "").strip()
                code_str = raw_code if (len(raw_code) == 6 and raw_code.isdigit()) else "482910"
                now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
                otp_store = {
                    k: v for k, v in (current.get("otpStore") or {}).items()
                    if isinstance(v, dict) and int(v.get("expiresAt", 0)) > now_ms
                }
                if email_key:
                    otp_store[email_key] = {
                        "code": code_str,
                        "phone": phone_str,
                        "attempts": 0,
                        "sentAt": now_ms,
                        "expiresAt": now_ms + 600000,
                    }
                    current["otpStore"] = otp_store
                    write_db(current)

                saved_gw = current.get("authGateways") or {}
                email_html = (
                    '<div style="font-family:Inter,system-ui,sans-serif;max-width:480px;margin:0 auto;padding:28px;'
                    'background:#072227;color:#ecfff5;border-radius:18px;border:1px solid rgba(169,255,202,0.28);">'
                    '<h2 style="margin:0 0 12px;color:#a9ffca;font-size:22px;">ChangeIt4Me · Email Verification</h2>'
                    f'<p style="margin:0 0 18px;color:rgba(236,255,245,0.84);font-size:14px;line-height:1.5;">Hello {name_str}, '
                    'use the 6-digit verification code below to confirm your email address:</p>'
                    '<div style="background:rgba(169,255,202,0.14);border:1px solid rgba(169,255,202,0.45);border-radius:12px;'
                    f'padding:16px;text-align:center;font-size:28px;font-weight:900;letter-spacing:0.22em;color:#a9ffca;">{code_str}</div>'
                    '</div>'
                )
                email_sent = send_email_via_resend(
                    self.headers, saved_gw, email_key, f"{code_str} is your ChangeIt4Me Verification Code", email_html
                )
                sms_sent = False
                payload = {
                    "ok": True,
                    "action": "send_otp",
                    "emailSent": email_sent,
                    "smsSent": sms_sent,
                    "deliveryMode": "live" if (email_sent or sms_sent) else "sandbox",
                }
                body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return

            if isinstance(incoming, dict) and incoming.get("action") == "send_notification":
                to_email = str(incoming.get("toEmail") or "").strip().lower()
                to_phone = str(incoming.get("toPhone") or "").strip()
                subject = str(incoming.get("subject") or "ChangeIt4Me · New 1:1 Swap Notification").strip()[:140]
                msg_text = str(incoming.get("message") or "").strip()[:600]
                saved_gw = current.get("authGateways") or {}
                email_html = (
                    '<div style="font-family:Inter,system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px;'
                    'background:#072227;color:#ecfff5;border-radius:18px;border:1px solid rgba(169,255,202,0.28);">'
                    f'<h2 style="margin:0 0 10px;color:#a9ffca;font-size:20px;">{html.escape(subject)}</h2>'
                    f'<p style="margin:0 0 16px;color:rgba(236,255,245,0.9);font-size:14px;line-height:1.55;">{html.escape(msg_text)}</p>'
                    '<p style="margin:0;color:rgba(236,255,245,0.6);font-size:12px;">Open your ChangeIt4Me Personal Swap Dashboard to reply directly 1-on-1.</p>'
                    '</div>'
                )
                email_sent = send_email_via_resend(self.headers, saved_gw, to_email, subject, email_html)
                sms_sent = send_sms_via_gateways(self.headers, saved_gw, to_phone, msg_text)
                payload = {
                    "ok": True,
                    "action": "send_notification",
                    "emailSent": email_sent,
                    "smsSent": sms_sent,
                    "deliveryMode": "live" if (email_sent or sms_sent) else "cloud-inbox",
                }
                body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return

            if isinstance(incoming, dict) and incoming.get("action") == "admin_login":
                email_key = str(incoming.get("email") or "").strip().lower()
                pwd = str(incoming.get("password") or "").strip()
                valid = email_key in ("jeka7ro@mail.com", "jeka7ro@gmail.com") and sha256_hex(f"ci4m_admin_v1:{pwd}") == ADMIN_PASS_HASH
                body = json.dumps({"ok": True, "action": "admin_login", "authenticated": valid}).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return

            if isinstance(incoming, dict) and incoming.get("action") == "user_login":
                email_key = str(incoming.get("email") or "").strip().lower()
                pwd = str(incoming.get("password") or "")
                acc = (current.get("accounts") or {}).get(email_key)
                valid = bool(isinstance(acc, dict) and verify_user_password_server(email_key, pwd, acc.get("password")))
                safe_acc = {k: v for k, v in acc.items() if k != "password"} if (valid and isinstance(acc, dict)) else None
                body = json.dumps({"ok": True, "action": "user_login", "authenticated": valid, "account": safe_acc}).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return

            if isinstance(incoming, dict) and incoming.get("action") == "create_checkout_session":
                tier = str(incoming.get("tier") or "pro_monthly")
                customer_email = str(incoming.get("email") or "").strip()
                origin_url = str(incoming.get("origin") or "http://localhost:8090").rstrip("/")
                saved_gw = current.get("authGateways") or {}
                stripe_key = (
                    (saved_gw.get("stripeSecretKey") if not is_masked_secret(saved_gw.get("stripeSecretKey")) else "")
                    or os.environ.get("STRIPE_SECRET_KEY", "")
                ).strip()
                checkout_url = ""
                if stripe_key:
                    try:
                        is_sub = tier != "pack15"
                        amount_cents = 900 if tier == "pack15" else (14900 if tier == "pro_yearly" else 1900)
                        product_name = (
                            "ChangeIt4Me · +15 Swaps Pack"
                            if tier == "pack15"
                            else ("ChangeIt4Me · PRO Unlimited Yearly" if tier == "pro_yearly" else "ChangeIt4Me · PRO Unlimited Monthly")
                        )
                        form_fields = {
                            "mode": "subscription" if is_sub else "payment",
                            "success_url": f"{origin_url}/?stripe_success={urllib.parse.quote(tier)}",
                            "cancel_url": f"{origin_url}/?page=pricing",
                            "line_items[0][price_data][currency]": "eur",
                            "line_items[0][price_data][product_data][name]": product_name,
                            "line_items[0][price_data][unit_amount]": str(amount_cents),
                            "line_items[0][quantity]": "1",
                        }
                        if customer_email:
                            form_fields["customer_email"] = customer_email
                        if is_sub:
                            form_fields["line_items[0][price_data][recurring][interval]"] = "year" if tier == "pro_yearly" else "month"
                        form_data = urllib.parse.urlencode(form_fields).encode("utf-8")
                        req = urllib.request.Request(
                            "https://api.stripe.com/v1/checkout/sessions",
                            data=form_data,
                            headers={"Authorization": f"Bearer {stripe_key}", "Content-Type": "application/x-www-form-urlencoded"},
                            method="POST",
                        )
                        with urllib.request.urlopen(req, timeout=8) as resp:
                            if 200 <= resp.status < 300:
                                s_data = json.loads(resp.read().decode("utf-8"))
                                checkout_url = str(s_data.get("url") or "")
                    except Exception:
                        pass
                body = json.dumps({"ok": True, "checkoutUrl": checkout_url}).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return

            if isinstance(incoming, dict) and incoming.get("action") == "upload_image":
                data_url = str(incoming.get("dataUrl") or "").strip()
                m = re.match(r"^data:image/(jpeg|jpg|png|webp);base64,(.+)$", data_url, re.IGNORECASE)
                if not m:
                    body = json.dumps({"ok": False, "error": "Invalid image format"}).encode("utf-8")
                    self.send_response(400)
                    self.send_header("Content-Type", "application/json; charset=utf-8")
                    self.send_header("Content-Length", str(len(body)))
                    self.end_headers()
                    self.wfile.write(body)
                    return
                ext = "jpg" if m.group(1).lower() in ("jpeg", "jpg") else m.group(1).lower()
                raw_img = base64.b64decode(m.group(2))
                UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
                img_hash = hashlib.sha256(raw_img).hexdigest()[:12]
                ts_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
                fname = f"img_{ts_ms}_{img_hash}.{ext}"
                (UPLOADS_DIR / fname).write_bytes(raw_img)
                body = json.dumps({"ok": True, "url": f"/uploads/{fname}"}).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return

            if isinstance(incoming, dict) and incoming.get("action") == "verify_otp":
                email_key = str(incoming.get("email") or "").strip().lower()
                entered_code = str(incoming.get("code") or "").strip()
                otp_store = dict(current.get("otpStore") or {})
                rec = otp_store.get(email_key)
                now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
                not_expired = bool(rec and int(rec.get("expiresAt", 0)) > now_ms)
                verified = bool(not_expired and len(entered_code) == 6 and entered_code.isdigit() and rec.get("code") == entered_code)
                if rec:
                    if verified or not not_expired:
                        otp_store.pop(email_key, None)
                    else:
                        rec["attempts"] = int(rec.get("attempts", 0)) + 1
                        if rec["attempts"] >= 5:
                            otp_store.pop(email_key, None)
                    current["otpStore"] = otp_store
                    write_db(current)
                payload = {"ok": True, "action": "verify_otp", "verified": verified}
                body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return

            updated = merge_state(current, incoming)
            write_db(updated)
            payload = {"ok": True, "backend": "local-cloud-db", **sanitize_state_for_client(updated)}
            body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        self.send_response(404)
        self.end_headers()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8090"))
    server = ThreadingHTTPServer(("0.0.0.0", port), ChangeIt4MeHandler)
    print(f"ChangeIt4Me SPA + Cloud Sync API listening on http://localhost:{port}")
    server.serve_forever()

