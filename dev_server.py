#!/usr/bin/env python3
"""
ChangeIt4Me — Local SPA & Cloud Sync Server (port 8090)
Provides:
1. Static asset serving + SPA fallback (/admin, /start, /offers -> index.html)
2. GET /api/sync and POST /api/sync backed by .data/cloud_db.json
"""

import json
import os
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT_DIR = Path(__file__).resolve().parent
DATA_DIR = ROOT_DIR / ".data"
DB_FILE = DATA_DIR / "cloud_db.json"


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
            merged_acc = dict(next_st["accounts"].get(k) or {})
            merged_acc.update(acc)
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

    next_st["updatedAt"] = datetime.now(timezone.utc).isoformat()
    return next_st


class ChangeIt4MeHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT_DIR), **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, x-supabase-url, x-supabase-key")
        self.send_header("Cache-Control", "no-store, max-age=0")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/sync":
            st = read_db()
            payload = {"ok": True, "backend": "local-cloud-db", **st}
            body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
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
            raw = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
            try:
                incoming = json.loads(raw) if raw.strip() else {}
            except Exception:
                incoming = {}
            current = read_db()
            updated = merge_state(current, incoming)
            write_db(updated)
            payload = {"ok": True, "backend": "local-cloud-db", **updated}
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

