/**
 * ChangeIt4Me — Serverless Cloud Database Sync Endpoint (/api/sync)
 * Synchronizes Registered Accounts, Member Listings, 1:1 Swap Proposals & Watchlist
 * across all devices and browsers into a central store.
 *
 * Supported storage backends (auto-detected):
 * 1. Vercel KV / Upstash Redis (KV_REST_API_URL + KV_REST_API_TOKEN)
 * 2. Supabase REST KV table (SUPABASE_URL + SUPABASE_KEY or headers x-supabase-url / x-supabase-key)
 * 3. Server-side JSON store (/tmp/ci4m_cloud_db_v1.json)
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const TMP_DB_PATH = path.join("/tmp", "ci4m_cloud_db_v1.json");
const KV_KEY = "ci4m_cloud_state_v1";
const SECRET_GW_KEYS = ["brevoApiKey", "resendApiKey", "textbeeKey", "smsAdvertToken", "twilioToken", "stripeSecretKey"];
const ADMIN_PASS_HASH = "4106b4f2be492e957124b0687c3cb0781df5505e82f5946794d200201c3b63d4";

function sha256Hex(str) {
  return crypto.createHash("sha256").update(String(str || ""), "utf8").digest("hex");
}

function hashUserPasswordServer(emailKey, rawPass) {
  const s = String(rawPass || "");
  if (!s) return "";
  if (s.startsWith("sha256$")) return s;
  const cleanEmail = String(emailKey || "").trim().toLowerCase();
  return "sha256$" + sha256Hex(`ci4m_usr_v1:${cleanEmail}:${s}`);
}

function verifyUserPasswordServer(emailKey, enteredPass, storedPass) {
  if (!enteredPass || !storedPass) return false;
  if (String(storedPass).startsWith("sha256$")) {
    return hashUserPasswordServer(emailKey, enteredPass) === storedPass;
  }
  return storedPass === enteredPass;
}

function escapeHtml(raw) {
  if (raw === null || raw === undefined) return "";
  return String(raw)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isValidSupabaseUrl(rawUrl) {
  if (!rawUrl) return false;
  try {
    const u = new URL(String(rawUrl).trim());
    return u.protocol === "https:" && (u.hostname.endsWith(".supabase.co") || u.hostname.endsWith(".supabase.in"));
  } catch (e) {
    return false;
  }
}

function isMaskedSecret(val) {
  const s = String(val || "").trim();
  return !s || s.startsWith("•••") || /^\*+$/.test(s);
}

function sanitizeStateForClient(state) {
  const safeAccounts = {};
  Object.entries(state.accounts || {}).forEach(([k, acc]) => {
    if (!acc || typeof acc !== "object") return;
    const { password, ...rest } = acc;
    safeAccounts[k] = rest;
  });
  const safeGateways = {};
  Object.entries(state.authGateways || {}).forEach(([gk, gv]) => {
    const s = String(gv || "").trim();
    if (!s) return;
    safeGateways[gk] = SECRET_GW_KEYS.includes(gk) ? "••••••••" : s;
  });
  return {
    version: state.version || 1,
    updatedAt: state.updatedAt || new Date().toISOString(),
    accounts: safeAccounts,
    userOffers: Array.isArray(state.userOffers) ? state.userOffers : [],
    proposals: Array.isArray(state.proposals) ? state.proposals : [],
    watchlist: Array.isArray(state.watchlist) ? state.watchlist : [],
    deletedOfferIds: Array.isArray(state.deletedOfferIds) ? state.deletedOfferIds : [],
    deletedAccountEmails: Array.isArray(state.deletedAccountEmails) ? state.deletedAccountEmails : [],
    authGateways: safeGateways
  };
}

function getEmptyState() {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    accounts: {},
    userOffers: [],
    proposals: [],
    watchlist: [],
    deletedOfferIds: [],
    deletedAccountEmails: [],
    otpStore: {},
    authGateways: {}
  };
}

function readLocalTmpState() {
  try {
    if (fs.existsSync(TMP_DB_PATH)) {
      const raw = fs.readFileSync(TMP_DB_PATH, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return { ...getEmptyState(), ...parsed };
      }
    }
  } catch (e) {
    // Ignore read errors
  }
  return getEmptyState();
}

function writeLocalTmpState(state) {
  try {
    fs.writeFileSync(TMP_DB_PATH, JSON.stringify(state, null, 2), "utf8");
  } catch (e) {
    // Ignore write errors
  }
}

async function readKvState(req) {
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  if (kvUrl && kvToken && typeof fetch === "function") {
    try {
      const resp = await fetch(`${kvUrl.replace(/\/$/, "")}/get/${KV_KEY}`, {
        headers: { Authorization: `Bearer ${kvToken}` }
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.result) {
          const parsed = typeof data.result === "string" ? JSON.parse(data.result) : data.result;
          return { state: { ...getEmptyState(), ...parsed }, backend: "vercel-kv" };
        }
      }
    } catch (e) {
      // Fall through
    }
  }

  const sbUrl = (req.headers && req.headers["x-supabase-url"]) || process.env.SUPABASE_URL;
  const sbKey = (req.headers && req.headers["x-supabase-key"]) || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (isValidSupabaseUrl(sbUrl) && sbKey && typeof fetch === "function") {
    try {
      const resp = await fetch(`${String(sbUrl).replace(/\/$/, "")}/rest/v1/ci4m_state?id=eq.main&select=payload`, {
        headers: {
          apikey: String(sbKey),
          Authorization: `Bearer ${String(sbKey)}`
        }
      });
      if (resp.ok) {
        const rows = await resp.json();
        if (Array.isArray(rows) && rows[0] && rows[0].payload) {
          return { state: { ...getEmptyState(), ...rows[0].payload }, backend: "supabase" };
        }
      }
    } catch (e) {
      // Fall through
    }
  }

  return { state: readLocalTmpState(), backend: "cloud-server" };
}

async function writeKvState(req, state) {
  writeLocalTmpState(state);

  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  if (kvUrl && kvToken && typeof fetch === "function") {
    try {
      await fetch(`${kvUrl.replace(/\/$/, "")}/set/${KV_KEY}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${kvToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(state)
      });
    } catch (e) {
      // Ignore
    }
  }

  const sbUrl = (req.headers && req.headers["x-supabase-url"]) || process.env.SUPABASE_URL;
  const sbKey = (req.headers && req.headers["x-supabase-key"]) || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (isValidSupabaseUrl(sbUrl) && sbKey && typeof fetch === "function") {
    try {
      await fetch(`${String(sbUrl).replace(/\/$/, "")}/rest/v1/ci4m_state`, {
        method: "POST",
        headers: {
          apikey: String(sbKey),
          Authorization: `Bearer ${String(sbKey)}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates"
        },
        body: JSON.stringify({
          id: "main",
          payload: state,
          updated_at: state.updatedAt
        })
      });
    } catch (e) {
      // Ignore
    }
  }
}

function mergeIncomingState(current, incoming) {
  const next = {
    ...getEmptyState(),
    ...current,
    accounts: { ...(current.accounts || {}) },
    userOffers: Array.isArray(current.userOffers) ? [...current.userOffers] : [],
    proposals: Array.isArray(current.proposals) ? [...current.proposals] : [],
    watchlist: Array.isArray(current.watchlist) ? [...current.watchlist] : [],
    deletedOfferIds: Array.isArray(current.deletedOfferIds) ? [...current.deletedOfferIds] : [],
    deletedAccountEmails: Array.isArray(current.deletedAccountEmails) ? [...current.deletedAccountEmails] : []
  };

  if (Array.isArray(incoming.deletedAccountEmails)) {
    incoming.deletedAccountEmails.forEach(em => {
      const k = String(em || "").trim().toLowerCase();
      if (!k || ["__proto__", "constructor", "prototype"].includes(k)) return;
      if (!next.deletedAccountEmails.includes(k)) next.deletedAccountEmails.push(k);
      delete next.accounts[k];
      if (next.otpStore && typeof next.otpStore === "object") {
        delete next.otpStore[k];
      }
      next.userOffers.forEach(o => {
        if (o && o.id && String(o.ownerEmail || "").trim().toLowerCase() === k) {
          const oid = Number(o.id);
          if (Number.isFinite(oid) && !next.deletedOfferIds.includes(oid)) {
            next.deletedOfferIds.push(oid);
          }
        }
      });
      next.watchlist = next.watchlist.filter(w => String(w?.email || "").trim().toLowerCase() !== k);
    });
  }

  if (incoming.accounts && typeof incoming.accounts === "object") {
    Object.entries(incoming.accounts).forEach(([rawKey, acc]) => {
      if (!acc || typeof acc !== "object") return;
      const k = String(acc.email || rawKey || "").trim().toLowerCase();
      if (!k || ["__proto__", "constructor", "prototype"].includes(k)) return;
      if (next.deletedAccountEmails.includes(k) && !incoming.forceRestoreAccount) return;
      if (incoming.forceRestoreAccount && next.deletedAccountEmails.includes(k)) {
        next.deletedAccountEmails = next.deletedAccountEmails.filter(x => x !== k);
      }
      const prevAcc = next.accounts[k] || {};
      const rawPwd = acc.password || prevAcc.password || "";
      next.accounts[k] = {
        ...prevAcc,
        ...acc,
        password: rawPwd ? hashUserPasswordServer(k, rawPwd) : ""
      };
    });
  }

  if (Array.isArray(incoming.deletedOfferIds)) {
    incoming.deletedOfferIds.forEach(id => {
      const numId = Number(id);
      if (Number.isFinite(numId) && !next.deletedOfferIds.includes(numId)) {
        next.deletedOfferIds.push(numId);
      }
    });
  }

  if (incoming.clearDeletedOffers === true) {
    next.deletedOfferIds = [];
  }

  const deletedSet = new Set(next.deletedOfferIds.map(Number));
  const offerMap = new Map();
  next.userOffers.forEach(o => {
    if (o && o.id && !deletedSet.has(Number(o.id))) {
      offerMap.set(Number(o.id), o);
    }
  });

  if (Array.isArray(incoming.userOffers)) {
    incoming.userOffers.forEach(o => {
      if (!o || !o.id) return;
      const numId = Number(o.id);
      if (deletedSet.has(numId)) return;
      offerMap.set(numId, { ...(offerMap.get(numId) || {}), ...o });
    });
  }

  next.userOffers = Array.from(offerMap.values()).sort((a, b) => Number(b.id) - Number(a.id));

  if (Array.isArray(incoming.proposals)) {
    const propMap = new Map();
    next.proposals.forEach(p => { if (p && p.id) propMap.set(Number(p.id), p); });
    incoming.proposals.forEach(p => {
      if (p && p.id) {
        propMap.set(Number(p.id), { ...(propMap.get(Number(p.id)) || {}), ...p });
      }
    });
    next.proposals = Array.from(propMap.values()).sort((a, b) => Number(b.id) - Number(a.id)).slice(0, 200);
  }

  if (Array.isArray(incoming.watchlist)) {
    const wlMap = new Map();
    next.watchlist.forEach(w => { if (w && w.id) wlMap.set(Number(w.id), w); });
    incoming.watchlist.forEach(w => {
      if (w && w.id) wlMap.set(Number(w.id), w);
    });
    next.watchlist = Array.from(wlMap.values()).sort((a, b) => Number(b.id) - Number(a.id)).slice(0, 200);
  }

  if (incoming.authGateways && typeof incoming.authGateways === "object") {
    const cleanGw = { ...(current.authGateways || {}) };
    Object.entries(incoming.authGateways).forEach(([gk, gv]) => {
      if (["__proto__", "constructor", "prototype"].includes(gk)) return;
      if (SECRET_GW_KEYS.includes(gk) && isMaskedSecret(gv)) return;
      cleanGw[gk] = String(gv ?? "").trim();
    });
    next.authGateways = cleanGw;
  }

  next.updatedAt = new Date().toISOString();
  return next;
}

function resolveBrevoKey(req, savedGw) {
  const gw = savedGw || {};
  const hdrBrevo = req.headers && req.headers["x-brevo-api-key"];
  const hdrResend = req.headers && req.headers["x-resend-api-key"];
  const candidates = [
    !isMaskedSecret(hdrBrevo) ? hdrBrevo : "",
    !isMaskedSecret(gw.brevoApiKey) ? gw.brevoApiKey : "",
    process.env.BREVO_API_KEY || "",
    (!isMaskedSecret(hdrResend) && String(hdrResend || "").trim().startsWith("xkeysib-")) ? hdrResend : "",
    (!isMaskedSecret(gw.resendApiKey) && String(gw.resendApiKey || "").trim().startsWith("xkeysib-")) ? gw.resendApiKey : ""
  ];
  return String(candidates.find(k => k && String(k).trim()) || "").trim();
}

async function sendEmailViaBrevo(req, savedGw, toEmail, toName, subject, htmlContent) {
  const gw = savedGw || {};
  const apiKey = resolveBrevoKey(req, gw);
  if (!apiKey || !toEmail || typeof fetch !== "function") return false;
  const senderEmail = String(
    (req.headers && req.headers["x-brevo-sender-email"])
    || gw.brevoSenderEmail
    || process.env.BREVO_SENDER_EMAIL
    || "jeka7ro@gmail.com"
  ).trim();
  try {
    const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "accept": "application/json",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        sender: { name: "ChangeIt4Me Security", email: senderEmail },
        to: [{ email: String(toEmail).trim(), name: String(toName || "Member").trim() }],
        subject,
        htmlContent
      })
    });
    return resp.ok;
  } catch (e) {
    return false;
  }
}

async function sendSmsViaBrevo(req, savedGw, phone, textMsg) {
  const gw = savedGw || {};
  const apiKey = resolveBrevoKey(req, gw);
  if (!apiKey || !phone || typeof fetch !== "function") return false;
  try {
    const cleanTo = String(phone).replace(/[^\d+]/g, "");
    const recipient = cleanTo.startsWith("+") ? cleanTo : `+${cleanTo}`;
    const resp = await fetch("https://api.brevo.com/v3/transactionalSMS/sms", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "accept": "application/json",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        sender: "ChangeIt4Me",
        recipient,
        content: String(textMsg || "").slice(0, 160),
        type: "transactional"
      })
    });
    return resp.ok;
  } catch (e) {
    return false;
  }
}

async function sendEmailOtpViaResend(req, savedGw, email, name, code) {
  const safeName = escapeHtml(name || "Member");
  const safeCode = escapeHtml(code);
  const subject = `${safeCode} is your ChangeIt4Me Verification Code`;
  const htmlBody = `<div style="font-family:Inter,system-ui,sans-serif;max-width:480px;margin:0 auto;padding:28px;background:#072227;color:#ecfff5;border-radius:18px;border:1px solid rgba(169,255,202,0.28);">
          <h2 style="margin:0 0 12px;color:#a9ffca;font-size:22px;">ChangeIt4Me · Email Verification</h2>
          <p style="margin:0 0 18px;color:rgba(236,255,245,0.84);font-size:14px;line-height:1.5;">Hello ${safeName}, use the 6-digit verification code below to confirm your email address:</p>
          <div style="background:rgba(169,255,202,0.14);border:1px solid rgba(169,255,202,0.45);border-radius:12px;padding:16px;text-align:center;font-size:28px;font-weight:900;letter-spacing:0.22em;color:#a9ffca;">${safeCode}</div>
          <p style="margin:18px 0 0;color:rgba(236,255,245,0.6);font-size:12px;">Valid for 10 minutes. If you did not request this code, please ignore this message.</p>
        </div>`;

  if (await sendEmailViaBrevo(req, savedGw, email, name, subject, htmlBody)) {
    return true;
  }

  const gw = savedGw || {};
  const hdrKey = req.headers && req.headers["x-resend-api-key"];
  const apiKey = (!isMaskedSecret(hdrKey) ? hdrKey : "") || (!isMaskedSecret(gw.resendApiKey) ? gw.resendApiKey : "") || process.env.RESEND_API_KEY;
  if (!apiKey || String(apiKey).trim().startsWith("xkeysib-") || !email || typeof fetch !== "function") return false;
  const fromAddr = process.env.RESEND_FROM_EMAIL || "ChangeIt4Me Security <onboarding@resend.dev>";
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${String(apiKey).trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: fromAddr,
        to: [String(email).trim()],
        subject,
        html: htmlBody
      })
    });
    return resp.ok;
  } catch (e) {
    return false;
  }
}

async function sendSmsOtpViaTextBee(req, savedGw, phone, code) {
  const gw = savedGw || {};
  const hdrKey = req.headers && req.headers["x-textbee-key"];
  const apiKey = (!isMaskedSecret(hdrKey) ? hdrKey : "") || (!isMaskedSecret(gw.textbeeKey) ? gw.textbeeKey : "") || process.env.TEXTBEE_API_KEY;
  const deviceId = (req.headers && req.headers["x-textbee-device"]) || gw.textbeeDevice || process.env.TEXTBEE_DEVICE_ID;
  if (!apiKey || !deviceId || !phone || typeof fetch !== "function") return false;
  try {
    const cleanTo = String(phone).replace(/[^\d+]/g, "");
    const formattedTo = cleanTo.startsWith("+") ? cleanTo : `+${cleanTo}`;
    const resp = await fetch(`https://api.textbee.dev/api/v1/gateway/devices/${encodeURIComponent(String(deviceId).trim())}/send-sms`, {
      method: "POST",
      headers: {
        "x-api-key": String(apiKey).trim(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        recipients: [formattedTo],
        message: `ChangeIt4Me: Codul tau de verificare este ${code}. Verification code: ${code}.`
      })
    });
    return resp.ok;
  } catch (e) {
    return false;
  }
}

async function sendSmsOtpViaSmsAdvert(req, savedGw, phone, code) {
  const gw = savedGw || {};
  const hdrTok = req.headers && req.headers["x-smsadvert-token"];
  const token = (!isMaskedSecret(hdrTok) ? hdrTok : "") || (!isMaskedSecret(gw.smsAdvertToken) ? gw.smsAdvertToken : "") || process.env.SMSADVERT_API_TOKEN;
  if (!token || !phone || typeof fetch !== "function") return false;
  try {
    const cleanTo = String(phone).replace(/[^\d+]/g, "");
    const resp = await fetch("https://www.smsadvert.ro/api/sms/", {
      method: "POST",
      headers: {
        Authorization: String(token).trim(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        phone: cleanTo,
        shortTextMessage: `ChangeIt4Me: Codul tau de verificare este ${code}.`
      })
    });
    return resp.ok;
  } catch (e) {
    return false;
  }
}

async function sendSmsOtpViaTwilio(req, savedGw, phone, code) {
  const gw = savedGw || {};
  const sid = (req.headers && req.headers["x-twilio-sid"]) || gw.twilioSid || process.env.TWILIO_ACCOUNT_SID;
  const hdrTok = req.headers && req.headers["x-twilio-token"];
  const token = (!isMaskedSecret(hdrTok) ? hdrTok : "") || (!isMaskedSecret(gw.twilioToken) ? gw.twilioToken : "") || process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = (req.headers && req.headers["x-twilio-from"]) || gw.twilioFrom || process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !fromPhone || !phone || typeof fetch !== "function") return false;
  try {
    const cleanTo = String(phone).replace(/[^\d+]/g, "");
    const authB64 = Buffer.from(`${String(sid).trim()}:${String(token).trim()}`).toString("base64");
    const params = new URLSearchParams();
    params.append("To", cleanTo.startsWith("+") ? cleanTo : `+${cleanTo}`);
    params.append("From", String(fromPhone).trim());
    params.append("Body", `ChangeIt4Me: Your verification code is ${code}. Do not share this code.`);
    const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(String(sid).trim())}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authB64}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    });
    return resp.ok;
  } catch (e) {
    return false;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, x-supabase-url, x-supabase-key, x-brevo-api-key, x-brevo-sender-email, x-resend-api-key, x-textbee-key, x-textbee-device, x-smsadvert-token, x-twilio-sid, x-twilio-token, x-twilio-from"
  );
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    return res.end();
  }

  const { state: currentState, backend } = await readKvState(req);

  if (req.method === "GET") {
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.end(JSON.stringify({
      ok: true,
      backend,
      ...sanitizeStateForClient(currentState)
    }));
  }

  if (req.method === "POST") {
    let bodyObj = {};
    try {
      if (req.body && typeof req.body === "object") {
        bodyObj = req.body;
      } else if (typeof req.body === "string" && req.body.trim()) {
        if (Buffer.byteLength(req.body, "utf8") > 2 * 1024 * 1024) {
          res.statusCode = 413;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          return res.end(JSON.stringify({ ok: false, error: "Payload too large" }));
        }
        bodyObj = JSON.parse(req.body);
      } else {
        const chunks = [];
        let totalBytes = 0;
        for await (const chunk of req) {
          totalBytes += chunk.length || 0;
          if (totalBytes > 2 * 1024 * 1024) {
            res.statusCode = 413;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            return res.end(JSON.stringify({ ok: false, error: "Payload too large" }));
          }
          chunks.push(chunk);
        }
        const raw = Buffer.concat(chunks).toString("utf8");
        if (raw.trim()) bodyObj = JSON.parse(raw);
      }
    } catch (e) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.end(JSON.stringify({ ok: false, error: "Invalid JSON payload" }));
    }

    if (bodyObj && bodyObj.action === "send_otp") {
      const emailKey = String(bodyObj.email || "").trim().toLowerCase();
      const phoneStr = String(bodyObj.phone || "").trim();
      const nameStr = String(bodyObj.name || "Member").trim().slice(0, 80);
      const rawCode = String(bodyObj.code || "").trim();
      const codeStr = /^\d{6}$/.test(rawCode) ? rawCode : String(Math.floor(100000 + Math.random() * 900000));

      currentState.otpStore = currentState.otpStore || {};
      const nowMs = Date.now();
      Object.keys(currentState.otpStore).forEach(k => {
        if (!currentState.otpStore[k] || Number(currentState.otpStore[k].expiresAt || 0) <= nowMs) {
          delete currentState.otpStore[k];
        }
      });

      const savedGw = currentState.authGateways || {};
      const emailSent = await sendEmailOtpViaResend(req, savedGw, emailKey, nameStr, codeStr);
      const smsSent = false;

      if (emailKey && !["__proto__", "constructor", "prototype"].includes(emailKey)) {
        currentState.otpStore[emailKey] = {
          code: codeStr,
          phone: phoneStr,
          attempts: 0,
          sentAt: nowMs,
          expiresAt: nowMs + 10 * 60 * 1000
        };
        await writeKvState(req, currentState);
      }

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.end(JSON.stringify({
        ok: true,
        action: "send_otp",
        emailSent,
        smsSent,
        deliveryMode: (emailSent || smsSent) ? "live" : "sandbox"
      }));
    }

    if (bodyObj && bodyObj.action === "send_notification") {
      const toEmail = String(bodyObj.toEmail || "").trim().toLowerCase();
      const toPhone = String(bodyObj.toPhone || "").trim();
      const subject = String(bodyObj.subject || "ChangeIt4Me · New 1:1 Swap Notification").trim().slice(0, 140);
      const message = String(bodyObj.message || "").trim().slice(0, 600);
      const savedGw = currentState.authGateways || {};
      let emailSent = false;
      let smsSent = false;

      const notifHtml = `<div style="font-family:Inter,system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#072227;color:#ecfff5;border-radius:18px;border:1px solid rgba(169,255,202,0.28);">
                <h2 style="margin:0 0 10px;color:#a9ffca;font-size:20px;">${escapeHtml(subject)}</h2>
                <p style="margin:0 0 16px;color:rgba(236,255,245,0.9);font-size:14px;line-height:1.55;">${escapeHtml(message)}</p>
                <p style="margin:0;color:rgba(236,255,245,0.6);font-size:12px;">Open your ChangeIt4Me Personal Swap Dashboard to reply directly 1-on-1 with 0% commission.</p>
              </div>`;
      if (toEmail) {
        emailSent = await sendEmailViaBrevo(req, savedGw, toEmail, "Swap Partner", subject, notifHtml);
      }
      const hdrKey = req.headers && req.headers["x-resend-api-key"];
      const resendKey = (!isMaskedSecret(hdrKey) ? hdrKey : "") || (!isMaskedSecret(savedGw.resendApiKey) ? savedGw.resendApiKey : "") || process.env.RESEND_API_KEY;
      const fromAddr = process.env.RESEND_FROM_EMAIL || "ChangeIt4Me Notifications <onboarding@resend.dev>";
      if (!emailSent && resendKey && !String(resendKey).trim().startsWith("xkeysib-") && toEmail && typeof fetch === "function") {
        try {
          const resp = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${String(resendKey).trim()}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              from: fromAddr,
              to: [toEmail],
              subject,
              html: notifHtml
            })
          });
          emailSent = resp.ok;
        } catch (e) { }
      }

      if (toPhone) {
        smsSent = (await sendSmsOtpViaTextBee(req, savedGw, toPhone, message))
          || (await sendSmsViaBrevo(req, savedGw, toPhone, message))
          || (await sendSmsOtpViaSmsAdvert(req, savedGw, toPhone, message))
          || (await sendSmsOtpViaTwilio(req, savedGw, toPhone, message));
      }

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.end(JSON.stringify({
        ok: true,
        action: "send_notification",
        emailSent,
        smsSent,
        deliveryMode: (emailSent || smsSent) ? "live" : "cloud-inbox"
      }));
    }

    if (bodyObj && bodyObj.action === "admin_login") {
      const emailKey = String(bodyObj.email || "").trim().toLowerCase();
      const pass = String(bodyObj.password || "").trim();
      const expectedEnv = process.env.ADMIN_PASSWORD ? sha256Hex("ci4m_admin_v1:" + process.env.ADMIN_PASSWORD) : ADMIN_PASS_HASH;
      const valid = (emailKey === "jeka7ro@mail.com" || emailKey === "jeka7ro@gmail.com")
        && sha256Hex("ci4m_admin_v1:" + pass) === expectedEnv;
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.end(JSON.stringify({
        ok: true,
        action: "admin_login",
        authenticated: valid
      }));
    }

    if (bodyObj && bodyObj.action === "user_login") {
      const emailKey = String(bodyObj.email || "").trim().toLowerCase();
      const pass = String(bodyObj.password || "");
      const acc = currentState.accounts && currentState.accounts[emailKey];
      const valid = Boolean(acc && verifyUserPasswordServer(emailKey, pass, acc.password));
      let safeAcc = null;
      if (valid && acc) {
        const { password, ...rest } = acc;
        safeAcc = rest;
      }
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.end(JSON.stringify({
        ok: true,
        action: "user_login",
        authenticated: valid,
        account: safeAcc
      }));
    }

    if (bodyObj && bodyObj.action === "create_checkout_session") {
      const tier = String(bodyObj.tier || "pro_monthly");
      const customerEmail = String(bodyObj.email || "").trim();
      const originUrl = String(bodyObj.origin || "https://swapit-chi.vercel.app").replace(/\/$/, "");
      const savedGw = currentState.authGateways || {};
      const stripeKey = (!isMaskedSecret(savedGw.stripeSecretKey) ? savedGw.stripeSecretKey : "") || process.env.STRIPE_SECRET_KEY || "";

      if (stripeKey && typeof fetch === "function") {
        try {
          const isSub = tier !== "pack15";
          const amountCents = tier === "pack15" ? 900 : tier === "pro_yearly" ? 14900 : 1900;
          const productName = tier === "pack15"
            ? "ChangeIt4Me · +15 Swaps Pack"
            : tier === "pro_yearly"
              ? "ChangeIt4Me · PRO Unlimited Yearly"
              : "ChangeIt4Me · PRO Unlimited Monthly";
          const params = new URLSearchParams();
          params.append("mode", isSub ? "subscription" : "payment");
          params.append("success_url", `${originUrl}/?stripe_success=${encodeURIComponent(tier)}`);
          params.append("cancel_url", `${originUrl}/?page=pricing`);
          if (customerEmail) params.append("customer_email", customerEmail);
          params.append("line_items[0][price_data][currency]", "eur");
          params.append("line_items[0][price_data][product_data][name]", productName);
          params.append("line_items[0][price_data][unit_amount]", String(amountCents));
          if (isSub) {
            params.append("line_items[0][price_data][recurring][interval]", tier === "pro_yearly" ? "year" : "month");
          }
          params.append("line_items[0][quantity]", "1");

          const resp = await fetch("https://api.stripe.com/v1/checkout/sessions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${String(stripeKey).trim()}`,
              "Content-Type": "application/x-www-form-urlencoded"
            },
            body: params.toString()
          });
          if (resp.ok) {
            const session = await resp.json();
            if (session && session.url) {
              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json; charset=utf-8");
              return res.end(JSON.stringify({ ok: true, checkoutUrl: session.url }));
            }
          }
        } catch (err) { }
      }
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.end(JSON.stringify({ ok: true, checkoutUrl: "" }));
    }

    if (bodyObj && bodyObj.action === "upload_image") {
      const dataUrl = String(bodyObj.dataUrl || "").trim();
      if (!/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(dataUrl)) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        return res.end(JSON.stringify({ ok: false, error: "Invalid image format" }));
      }
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
      if (cloudName && uploadPreset && typeof fetch === "function") {
        try {
          const resp = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ file: dataUrl, upload_preset: uploadPreset })
          });
          if (resp.ok) {
            const cData = await resp.json();
            if (cData && cData.secure_url) {
              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json; charset=utf-8");
              return res.end(JSON.stringify({ ok: true, url: cData.secure_url }));
            }
          }
        } catch (err) { }
      }
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.end(JSON.stringify({ ok: true, url: dataUrl }));
    }

    if (bodyObj && bodyObj.action === "verify_otp") {
      const emailKey = String(bodyObj.email || "").trim().toLowerCase();
      const enteredCode = String(bodyObj.code || "").trim();
      const record = currentState.otpStore && currentState.otpStore[emailKey];
      const notExpired = Boolean(record && Number(record.expiresAt || 0) > Date.now());
      const valid = Boolean(notExpired && /^\d{6}$/.test(enteredCode) && record.code === enteredCode);
      if (currentState.otpStore && record) {
        if (valid || !notExpired) {
          delete currentState.otpStore[emailKey];
        } else {
          record.attempts = (Number(record.attempts) || 0) + 1;
          if (record.attempts >= 5) {
            delete currentState.otpStore[emailKey];
          }
        }
        await writeKvState(req, currentState);
      }
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.end(JSON.stringify({
        ok: true,
        action: "verify_otp",
        verified: valid
      }));
    }

    const updatedState = mergeIncomingState(currentState, bodyObj || {});
    await writeKvState(req, updatedState);

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.end(JSON.stringify({
      ok: true,
      backend,
      ...sanitizeStateForClient(updatedState)
    }));
  }

  res.statusCode = 405;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.end(JSON.stringify({ ok: false, error: "Method not allowed" }));
};

