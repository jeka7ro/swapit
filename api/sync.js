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

const TMP_DB_PATH = path.join("/tmp", "ci4m_cloud_db_v1.json");
const KV_KEY = "ci4m_cloud_state_v1";

function getEmptyState() {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    accounts: {},
    userOffers: [],
    proposals: [],
    watchlist: [],
    deletedOfferIds: [],
    deletedAccountEmails: []
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
  if (sbUrl && sbKey && typeof fetch === "function") {
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
  if (sbUrl && sbKey && typeof fetch === "function") {
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
      if (!k) return;
      if (!next.deletedAccountEmails.includes(k)) next.deletedAccountEmails.push(k);
      delete next.accounts[k];
    });
  }

  if (incoming.accounts && typeof incoming.accounts === "object") {
    Object.entries(incoming.accounts).forEach(([rawKey, acc]) => {
      if (!acc || typeof acc !== "object") return;
      const k = String(acc.email || rawKey || "").trim().toLowerCase();
      if (!k) return;
      if (next.deletedAccountEmails.includes(k) && !incoming.forceRestoreAccount) return;
      next.accounts[k] = {
        ...(next.accounts[k] || {}),
        ...acc
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

  next.updatedAt = new Date().toISOString();
  return next;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-supabase-url, x-supabase-key");
  res.setHeader("Cache-Control", "no-store, max-age=0");

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
      ...currentState
    }));
  }

  if (req.method === "POST") {
    let bodyObj = {};
    try {
      if (req.body && typeof req.body === "object") {
        bodyObj = req.body;
      } else if (typeof req.body === "string" && req.body.trim()) {
        bodyObj = JSON.parse(req.body);
      } else {
        const chunks = [];
        for await (const chunk of req) {
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

    const updatedState = mergeIncomingState(currentState, bodyObj || {});
    await writeKvState(req, updatedState);

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.end(JSON.stringify({
      ok: true,
      backend,
      ...updatedState
    }));
  }

  res.statusCode = 405;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.end(JSON.stringify({ ok: false, error: "Method not allowed" }));
};

