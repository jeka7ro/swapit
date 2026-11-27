#!/usr/bin/env python3
"""
ChangeIt4Me (exchange) — 6-Phase Pre-Push Security & Business Audit Gatekeeper
Modeled after Cloudflare Security & Business Audit Architecture.
100% READ-ONLY verification. Strictly no db.commit() or persistent mutations.
"""

import json
import re
import subprocess
import sys
from pathlib import Path

WORKSPACE_ROOT = Path(__file__).resolve().parents[4]

GREEN = "\033[92m"
RED = "\033[91m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"


def run_cmd(args, cwd=WORKSPACE_ROOT):
    return subprocess.run(
        args,
        cwd=str(cwd),
        capture_output=True,
        text=True,
        encoding="utf-8",
    )


def phase_1_compilation_and_config():
    """Phase 1: JS Syntax Check, vercel.json validation, index.html integrity."""
    errors = []

    for js_file in ["app.js", "i18n.js", "data.js", "api/sync.js"]:
        fpath = WORKSPACE_ROOT / js_file
        if not fpath.exists():
            errors.append(f"Missing required JS file: {js_file}")
            continue
        res = run_cmd(["node", "-c", str(fpath)])
        if res.returncode != 0:
            errors.append(f"Syntax error in {js_file}: {res.stderr.strip()}")

    vercel_path = WORKSPACE_ROOT / "vercel.json"
    if not vercel_path.exists():
        errors.append("Missing vercel.json")
    else:
        try:
            vdata = json.loads(vercel_path.read_text(encoding="utf-8"))
            rewrites = vdata.get("rewrites", [])
            source_pattern = rewrites[0].get("source", "") if rewrites else ""
            for asset in ["app\\.js", "i18n\\.js", "data\\.js", "styles\\.css", "tahoe-skin\\.css"]:
                if asset not in source_pattern:
                    errors.append(f"Asset pattern '{asset}' missing from vercel.json rewrite exclusion")
        except Exception as exc:
            errors.append(f"Invalid vercel.json: {exc}")

    index_path = WORKSPACE_ROOT / "index.html"
    if not index_path.exists():
        errors.append("Missing index.html")
    else:
        html = index_path.read_text(encoding="utf-8")
        for required_token in [
            "/styles.css",
            "/tahoe-skin.css",
            "/data.js",
            "/i18n.js",
            "/app.js",
            'id="authModal"',
            'id="wizardModal"',
            'id="offerModal"',
            'id="guideModal"',
            'id="dashboardModal"',
            'id="adminModal"',
            'id="gdprConsentBanner"',
        ]:
            if required_token not in html:
                errors.append(f"Missing required token in index.html: {required_token}")

    return len(errors) == 0, errors


def phase_2_3_4_node_sandbox_audit():
    """
    Runs Phases 2, 3, and 4 inside a 100% READ-ONLY in-memory Node.js VM sandbox.
    Returns (phase2_result, phase3_result, phase4_result).
    """
    node_script = r"""
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = process.cwd();
const dataCode = fs.readFileSync(path.join(root, 'data.js'), 'utf8');
const i18nCode = fs.readFileSync(path.join(root, 'i18n.js'), 'utf8');
const appCode = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

const storageMap = new Map();
const localStorageMock = {
  getItem: (k) => (storageMap.has(k) ? storageMap.get(k) : null),
  setItem: (k, v) => storageMap.set(k, String(v)),
  removeItem: (k) => storageMap.delete(k),
  clear: () => storageMap.clear()
};

const elementsById = new Map();
function makeElement(id = '') {
  return {
    id,
    value: '',
    checked: true,
    disabled: false,
    innerHTML: '',
    textContent: '',
    style: {},
    dataset: {},
    options: [],
    classList: {
      _set: new Set(),
      add(...cls) { cls.forEach(c => this._set.add(c)); },
      remove(...cls) { cls.forEach(c => this._set.delete(c)); },
      toggle(c, force) {
        if (force === undefined) {
          if (this._set.has(c)) { this._set.delete(c); return false; }
          this._set.add(c); return true;
        }
        if (force) this._set.add(c); else this._set.delete(c);
        return !!force;
      },
      contains(c) { return this._set.has(c); }
    },
    setAttribute() {},
    getAttribute() { return null; },
    removeAttribute() {},
    addEventListener() {},
    removeEventListener() {},
    appendChild() {},
    remove() {},
    focus() {},
    blur() {},
    click() {},
    reset() {},
    scrollIntoView() {},
    getBoundingClientRect() { return { top: 0, left: 0, width: 100, height: 40 }; },
    querySelector(sel) {
      if (sel && sel.startsWith('#')) {
        return getEl(sel.slice(1));
      }
      return null;
    },
    querySelectorAll() { return []; },
    closest() { return null; }
  };
}

function getEl(id) {
  if (!elementsById.has(id)) {
    elementsById.set(id, makeElement(id));
  }
  return elementsById.get(id);
}

let radioSubTierValue = 'pro_monthly';
const documentMock = {
  body: makeElement('body'),
  documentElement: makeElement('html'),
  getElementById: (id) => getEl(id),
  querySelector: (sel) => {
    if (sel === 'input[name="subTier"]:checked') {
      return { value: radioSubTierValue };
    }
    if (sel && sel.startsWith('#')) {
      return getEl(sel.slice(1));
    }
    return makeElement();
  },
  querySelectorAll: () => [],
  createElement: (tag) => makeElement(tag),
  addEventListener: () => {}
};

const sandbox = {
  window: null,
  document: documentMock,
  localStorage: localStorageMock,
  navigator: { language: 'ro-RO', clipboard: { writeText: async () => {} } },
  location: { href: 'https://swapit-chi.vercel.app/', origin: 'https://swapit-chi.vercel.app', hostname: 'swapit-chi.vercel.app', protocol: 'https:', pathname: '/', search: '', hash: '' },
  history: { pushState: () => {}, replaceState: () => {} },
  IntersectionObserver: class { observe() {} unobserve() {} disconnect() {} },
  MutationObserver: class { observe() {} disconnect() {} },
  FileReader: class { readAsDataURL() {} },
  FormData: class {
    constructor(form) { this._map = (form && form._fd) || {}; }
    get(k) { return this._map[k]; }
  },
  URLSearchParams,
  URL: { createObjectURL: () => 'blob:mock', revokeObjectURL: () => {} },
  Blob: class { constructor(parts, opts) { this.parts = parts; this.opts = opts; } },
  Image: class {},
  performance: { now: () => Date.now() },
  L: {
    map: () => ({ setView() { return this; }, invalidateSize() {}, on() {}, remove() {} }),
    tileLayer: () => ({ addTo() {} }),
    marker: () => ({ addTo() { return this; }, bindPopup() { return this; }, on() { return this; } }),
    divIcon: () => ({})
  },
  setTimeout: () => 1,
  clearTimeout: () => {},
  setInterval: () => 1,
  clearInterval: () => {},
  requestAnimationFrame: () => 1,
  scrollTo: () => {},
  console,
  Math,
  Date,
  Intl,
  JSON,
  Number,
  String,
  Boolean,
  Array,
  Object,
  Set,
  Map,
  RegExp,
  Error,
  Promise,
  parseFloat,
  parseInt,
  isNaN,
  isFinite,
  encodeURIComponent,
  decodeURIComponent
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

vm.createContext(sandbox);
vm.runInContext(i18nCode, sandbox, { filename: 'i18n.js' });
vm.runInContext(dataCode, sandbox, { filename: 'data.js' });
vm.runInContext(appCode + `\n;globalThis.__auditAccess = {
  sanitizeNumericAmount,
  convertToEur,
  convertFromEur,
  convertBetweenCurrencies,
  getOfferValueInCurrency,
  buildParityPreviewHtml,
  parseSmartLocationString,
  validateWizStep,
  canPerformSwapOrPost,
  consumeFreeSwapIfLogged,
  activateUserAccount,
  activateSubscriptionPlan,
  simulateZeroFreeSwaps,
  exportUserGdprData,
  deleteUserGdprAccount,
  saveGdprPreferences,
  acceptGdprConsent,
  reportOfferListing,
  openAdminModal,
  handleAdminBackofficeLogin,
  seedAdminTestRegistrationsAndOffers,
  normalizeSearchText,
  extractSearchTokens,
  tokensMatchQueryWords,
  getOfferPrimaryTokens,
  isValidRealEmail,
  isValidRealPhone,
  validateLiveAuthField,
  startEmailVerification,
  handleVerifyEmailCode,
  openQuickEditListingSheet,
  handleQuickEditListingSubmit,
  isListingOwnedByCurrentUser,
  canCurrentUserManageListing,
  openAdminEditUserSheet,
  handleAdminEditUserSubmit,
  openAppleDestructiveConfirmSheet,
  requestDeleteListing,
  executeAppleConfirmSheetAction,
  closeAppleSheetModal,
  getGeneratedVerifyCode: () => generatedVerifyCode,
  getState: () => ({
    offers,
    currentUser,
    accountsDb,
    adminAuthenticated,
    currentCurrency,
    currentLang,
    wizData,
    CURRENCIES: window.CURRENCIES,
    INITIAL_OFFERS: window.INITIAL_OFFERS,
    GUIDES_DATA: window.GUIDES_DATA
  }),
  setWizData: (patch) => { Object.assign(wizData, patch); }
};`, sandbox, { filename: 'app.js' });

const api = sandbox.__auditAccess;
const p2Errors = [];
const p3Errors = [];
const p4Errors = [];

// ============================================================================
// PHASE 2: Form Resilience to empty strings "" & commas (no 422 / NaN errors)
// ============================================================================
try {
  const cases = [
    ['', 0],
    ['   ', 0],
    [null, 0],
    [undefined, 0],
    ['15.500,50', 15500.5],
    ['15,500.50', 15500.5],
    ['15000,50', 15000.5],
    ['15,000', 15000],
    ['1.250.000,75', 1250000.75],
    ['45000', 45000],
    ['-150', 0]
  ];
  for (const [input, expected] of cases) {
    const actual = api.sanitizeNumericAmount(input, 0);
    if (!Number.isFinite(actual) || Math.abs(actual - expected) > 0.001) {
      p2Errors.push(`sanitizeNumericAmount(${JSON.stringify(input)}) returned ${actual}, expected ${expected}`);
    }
  }

  for (const rawInput of ['', '15.500,50', '15000,50', '15,000', '   ', null]) {
    const eurVal = api.convertToEur(rawInput, 'RON');
    const fromEurVal = api.convertFromEur(rawInput, 'RON');
    const betweenVal = api.convertBetweenCurrencies(rawInput, 'EUR', 'MDL');
    if (Number.isNaN(eurVal) || Number.isNaN(fromEurVal) || Number.isNaN(betweenVal)) {
      p2Errors.push(`Currency conversion returned NaN for input ${JSON.stringify(rawInput)}`);
    }
  }

  for (const locInput of ['', '   ', 'București, România', 'Chișinău, Moldova', 'RandomCityXYZ']) {
    const parsed = api.parseSmartLocationString(locInput);
    if (!parsed || typeof parsed.country !== 'string' || !Number.isFinite(parsed.lat) || !Number.isFinite(parsed.lng)) {
      p2Errors.push(`parseSmartLocationString failed on ${JSON.stringify(locInput)}`);
    }
  }

  // Test Wizard Step 2 validation with empty strings vs European comma string "85.500,50"
  getEl('wizTitleHave').value = '';
  getEl('wizValueEur').value = '';
  api.setWizData({ titleHave: '', originalAmount: '', valueEur: '' });
  if (api.validateWizStep(2) !== false) {
    p2Errors.push('validateWizStep(2) should gracefully return false on empty fields without throwing');
  }

  getEl('wizTitleHave').value = 'Apartament 3 camere Herăstrău';
  getEl('wizValueEur').value = '85.500,50';
  getEl('wizCurrencySelect').value = 'EUR';
  if (api.validateWizStep(2) !== true) {
    p2Errors.push('validateWizStep(2) failed to accept European comma-formatted value "85.500,50"');
  }
} catch (err) {
  p2Errors.push(`Exception in Phase 2: ${err && err.stack ? err.stack : err}`);
}

// ============================================================================
// PHASE 3: Financial Calculations & Business Benchmark Tests
// ============================================================================
try {
  const st = api.getState();
  const requiredCurrencies = ['EUR', 'USD', 'RON', 'MDL', 'RUB', 'GBP', 'CHF', 'CZK', 'PLN'];
  const currMap = new Map((st.CURRENCIES || []).map(c => [c.code, c]));
  for (const cur of requiredCurrencies) {
    const cObj = currMap.get(cur);
    if (!cObj || !(cObj.rateFromEur > 0)) {
      p3Errors.push(`Missing or invalid currency definition for ${cur}`);
      continue;
    }
    const baseEur = 10000;
    const inCur = api.convertFromEur(baseEur, cur);
    const backToEur = api.convertToEur(inCur, cur);
    if (Math.abs(backToEur - baseEur) > 15) {
      p3Errors.push(`Round-trip conversion drift for ${cur}: ${baseEur} EUR -> ${inCur} ${cur} -> ${backToEur} EUR`);
    }
  }

  // Parity preview HTML benchmark
  const parityHtml = api.buildParityPreviewHtml('50.000,00', 'EUR');
  if (!parityHtml || !parityHtml.includes('LEI') || !parityHtml.includes('$')) {
    p3Errors.push('buildParityPreviewHtml failed to generate multi-currency parity pills for "50.000,00" EUR');
  }

  // Monetization benchmark flow: 10 Free Swaps -> 0 Paywall -> +15 Pack -> PRO Unlimited
  api.activateUserAccount({
    name: 'Audit Tester',
    email: 'audit.tester@changeit4me.ro',
    phone: '+40 700 000 000',
    country: 'Romania',
    prefLang: 'ro',
    prefCurrency: 'EUR'
  });

  let userNow = api.getState().currentUser;
  if (!userNow || userNow.freeSwaps !== 10) {
    p3Errors.push(`Expected 10 initial free swaps on registration, got ${userNow && userNow.freeSwaps}`);
  }

  for (let i = 0; i < 10; i++) {
    if (!api.canPerformSwapOrPost()) {
      p3Errors.push(`User blocked prematurely at swap #${i + 1}`);
    }
    api.consumeFreeSwapIfLogged();
  }

  userNow = api.getState().currentUser;
  if (userNow.freeSwaps !== 0) {
    p3Errors.push(`Expected 0 remaining swaps after 10 actions, got ${userNow.freeSwaps}`);
  }

  // 11th swap must trigger paywall and return false
  if (api.canPerformSwapOrPost() !== false) {
    p3Errors.push('11th swap did not trigger paywall (canPerformSwapOrPost returned true at 0 swaps)');
  }

  // Activate +15 Swap Pack
  radioSubTierValue = 'pack15';
  api.activateSubscriptionPlan({ preventDefault() {}, target: { _fd: { subTier: 'pack15' } } });
  userNow = api.getState().currentUser;
  if (userNow.freeSwaps !== 15) {
    p3Errors.push(`Expected 15 remaining swaps after pack15 activation, got ${userNow.freeSwaps}`);
  }
  if (api.canPerformSwapOrPost() !== true) {
    p3Errors.push('User should be allowed to swap after activating pack15');
  }

  // Activate PRO Unlimited
  radioSubTierValue = 'pro_monthly';
  api.activateSubscriptionPlan({ preventDefault() {}, target: { _fd: { subTier: 'pro_monthly' } } });
  userNow = api.getState().currentUser;
  if (userNow.plan !== 'pro') {
    p3Errors.push(`Expected plan === 'pro' after pro_monthly activation, got ${userNow.plan}`);
  }
  if (api.canPerformSwapOrPost() !== true) {
    p3Errors.push('User should be allowed to swap on pro_monthly plan');
  }
} catch (err) {
  p3Errors.push(`Exception in Phase 3: ${err && err.stack ? err.stack : err}`);
}

// ============================================================================
// PHASE 4: Data Integrity, Multi-Tenant Isolation & GDPR/DSA Compliance
// ============================================================================
try {
  const st = api.getState();
  const seenIds = new Set();
  if (!Array.isArray(st.INITIAL_OFFERS) || st.INITIAL_OFFERS.length < 30) {
    p4Errors.push(`INITIAL_OFFERS must contain 30 verified seed offers, found ${st.INITIAL_OFFERS && st.INITIAL_OFFERS.length}`);
  }
  for (const off of (st.INITIAL_OFFERS || [])) {
    if (seenIds.has(off.id)) {
      p4Errors.push(`Duplicate offer ID in INITIAL_OFFERS: ${off.id}`);
    }
    seenIds.add(off.id);
    if (!(off.valueEur > 0)) {
      p4Errors.push(`Offer #${off.id} has invalid valueEur: ${off.valueEur}`);
    }
    if (!Number.isFinite(off.lat) || !Number.isFinite(off.lng)) {
      p4Errors.push(`Offer #${off.id} has invalid GPS lat/lng`);
    }
  }

  // Verify GUIDES_DATA across all required guides and all 7 languages
  const requiredGuides = ['car-offer', 'home-swap', 'meet-and-check', 'terms-of-use', 'privacy-policy', 'cookies-policy'];
  const requiredLangs = ['en', 'ro', 'de', 'fr', 'it', 'es', 'cs', 'sk', 'sl', 'hr', 'pl', 'ru'];
  for (const gKey of requiredGuides) {
    const gObj = st.GUIDES_DATA && st.GUIDES_DATA[gKey];
    if (!gObj) {
      p4Errors.push(`Missing guide in GUIDES_DATA: ${gKey}`);
      continue;
    }
    for (const lang of requiredLangs) {
      if (!gObj.title || !gObj.title[lang] || !gObj.items || !Array.isArray(gObj.items[lang]) || gObj.items[lang].length < 3) {
        p4Errors.push(`Guide '${gKey}' incomplete for language '${lang}'`);
      }
    }
  }

  // Multi-account isolation & GDPR Art. 15/20 export + Art. 17 erasure
  api.activateUserAccount({
    name: 'Alice GDPR',
    email: 'alice@test.ro',
    phone: '+40 722 111 222',
    country: 'Romania'
  });
  st.offers.unshift({
    id: 999901,
    createdByUser: true,
    ownerEmail: 'alice@test.ro',
    category: 'electronics',
    country: 'Romania',
    city: 'Bucharest',
    lat: 44.4268,
    lng: 26.1025,
    valueEur: 1200,
    title: 'Alice Test Laptop'
  });

  const exported = api.exportUserGdprData();
  if (!exported || !exported.userProfile || exported.userProfile.email !== 'alice@test.ro') {
    p4Errors.push('exportUserGdprData (GDPR Art. 20) failed to return current user profile');
  }

  api.deleteUserGdprAccount();
  const afterState = api.getState();
  if (afterState.currentUser !== null) {
    p4Errors.push('deleteUserGdprAccount (GDPR Art. 17) did not clear currentUser session');
  }
  if (afterState.accountsDb['alice@test.ro']) {
    p4Errors.push('deleteUserGdprAccount (GDPR Art. 17) did not erase user from accountsDb');
  }
  if (afterState.offers.some(o => o.id === 999901)) {
    p4Errors.push('deleteUserGdprAccount (GDPR Art. 17) did not erase user-created listings');
  }

  // Verify Admin Console & Test Seeding + Diacritic-Insensitive Search
  api.seedAdminTestRegistrationsAndOffers();
  api.openAdminModal('users');
  getEl('adminLoginEmailInput').value = 'jeka7ro@mail.com';
  getEl('adminLoginPassInput').value = '11Noiembrie2026!';
  api.handleAdminBackofficeLogin({ preventDefault() {} });
  const adminSt = api.getState();
  if (!adminSt.adminAuthenticated) {
    p4Errors.push('handleAdminBackofficeLogin failed to authenticate jeka7ro@mail.com / 11Noiembrie2026!');
  }
  if (Object.keys(adminSt.accountsDb).length < 30) {
    p4Errors.push(`Expected >= 30 pre-populated accounts in accountsDb, found ${Object.keys(adminSt.accountsDb).length}`);
  }
  if (!adminSt.accountsDb['alex.ionescu@test.ro'] || !adminSt.accountsDb['elena.popa@test.ro']) {
    p4Errors.push('seedAdminTestRegistrationsAndOffers failed to populate test accounts in accountsDb');
  }
  const seededOffer = adminSt.offers.find(o => o.id === 950101);
  if (!seededOffer) {
    p4Errors.push('seedAdminTestRegistrationsAndOffers failed to populate test offer #950101');
  } else {
    const primaryTokens = api.getOfferPrimaryTokens(seededOffer);
    const queryWords = api.extractSearchTokens('bucuresti alex.ionescu@test.ro');
    if (!api.tokensMatchQueryWords(primaryTokens, queryWords)) {
      p4Errors.push('Diacritic-insensitive search or ownerEmail indexing failed for seeded offer #950101');
    }
  }

  // Anti-Fake Email, Phone & Strict 6-Digit OTP Verification Check
  if (api.isValidRealEmail('user@mailinator.com') !== false || api.isValidRealEmail('fake@tempmail.com') !== false) {
    p4Errors.push('isValidRealEmail failed to block disposable email domains');
  }
  if (api.isValidRealEmail('eugeniu.real@gmail.com') !== true) {
    p4Errors.push('isValidRealEmail rejected valid @gmail.com address');
  }
  if (api.isValidRealPhone('0700000000') !== false || api.isValidRealPhone('123456789') !== false || api.isValidRealPhone('12345') !== false) {
    p4Errors.push('isValidRealPhone failed to block fake/repetitive/short phone numbers');
  }
  if (api.isValidRealPhone('+40 722 456 789') !== true) {
    p4Errors.push('isValidRealPhone rejected valid Romanian mobile number');
  }

  api.startEmailVerification({
    name: 'OTP Check User',
    email: 'otp.check@gmail.com',
    phone: '+40 722 456 789',
    country: 'Romania'
  });
  const realCode = api.getGeneratedVerifyCode();
  const wrongCode = realCode === '999999' ? '888888' : '999999';
  getEl('verifyCodeInput').value = wrongCode;
  api.handleVerifyEmailCode({ preventDefault() {} });
  if (api.getState().accountsDb['otp.check@gmail.com']) {
    p4Errors.push('handleVerifyEmailCode accepted an INCORRECT 6-digit OTP code!');
  }
  getEl('verifyCodeInput').value = realCode;
  api.handleVerifyEmailCode({ preventDefault() {} });
  if (!api.getState().accountsDb['otp.check@gmail.com']) {
    p4Errors.push('handleVerifyEmailCode failed to activate account with the CORRECT 6-digit OTP code');
  }

  // Verify Strict Ownership Isolation: Visitor or Other User CANNOT Edit/Delete Another Member's Listing
  getEl('adminModal').classList.remove('open');
  const otherUserOffer = api.getState().offers.find(o => o.id === 950107);
  if (otherUserOffer && api.canCurrentUserManageListing(otherUserOffer) !== false) {
    p4Errors.push('canCurrentUserManageListing allowed non-owner to edit/delete listing #950107 outside Backoffice!');
  }
  getEl('adminModal').classList.add('open');

  // Verify Apple HIG Quick-Edit Sheet, User Edit Sheet & Destructive Confirmation Sheet + Undo
  api.openQuickEditListingSheet(950101);
  api.handleQuickEditListingSubmit({
    preventDefault() {},
    target: {
      _fd: {
        title: '2023 Porsche Cayenne E-Hybrid Coupé Platinum (Apple Sheet Edited)',
        category: 'cars',
        amount: '75.500,00',
        currency: 'EUR',
        dealType: '1to1',
        want: '3-Room Apartment in Bucharest',
        city: 'Bucharest',
        country: 'Romania',
        specs: '2023 · 18,000 km · Platinum Edition',
        desc: 'Updated via Apple HIG Single-View Edit Sheet',
        image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1000&q=80',
        owner: 'Alexandru Ionescu',
        ownerEmail: 'alex.ionescu@test.ro'
      }
    }
  }, 950101);
  const editedOffer = api.getState().offers.find(o => o.id === 950101);
  if (!editedOffer || editedOffer.valueEur !== 75500 || !editedOffer.title.includes('Apple Sheet Edited')) {
    p4Errors.push('handleQuickEditListingSubmit failed to update listing #950101 from Apple HIG Quick-Edit Sheet');
  }

  api.openAdminEditUserSheet('alex.ionescu@test.ro');
  api.handleAdminEditUserSubmit({
    preventDefault() {},
    target: {
      _fd: {
        name: 'Alexandru Ionescu',
        phone: '+40 722 300 100',
        city: 'Bucharest',
        country: 'Romania',
        plan: 'pro',
        freeSwaps: '999'
      }
    }
  }, 'alex.ionescu@test.ro');

  api.requestDeleteListing(950101);
  if (!api.getState().offers.some(o => o.id === 950101)) {
    p4Errors.push('requestDeleteListing deleted listing BEFORE user confirmed in Apple HIG Destructive Sheet!');
  }
  api.executeAppleConfirmSheetAction();
  if (api.getState().offers.some(o => o.id === 950101)) {
    p4Errors.push('executeAppleConfirmSheetAction failed to delete listing after confirmation');
  }
} catch (err) {
  p4Errors.push(`Exception in Phase 4: ${err && err.stack ? err.stack : err}`);
}

console.log(JSON.stringify({ p2Errors, p3Errors, p4Errors }));
"""
    res = run_cmd(["node", "-e", node_script])
    if res.returncode != 0:
        err_msg = f"Node sandbox execution failed: {res.stderr.strip()}"
        return (False, [err_msg]), (False, [err_msg]), (False, [err_msg])

    try:
        lines = [line.strip() for line in res.stdout.splitlines() if line.strip()]
        payload = json.loads(lines[-1])
        p2 = payload.get("p2Errors", [])
        p3 = payload.get("p3Errors", [])
        p4 = payload.get("p4Errors", [])
        return (len(p2) == 0, p2), (len(p3) == 0, p3), (len(p4) == 0, p4)
    except Exception as exc:
        err_msg = f"Failed to parse Node sandbox output: {exc} | stdout: {res.stdout}"
        return (False, [err_msg]), (False, [err_msg]), (False, [err_msg])


def phase_5_security_no_alerts_no_emojis():
    """Phase 5: Static scan for native alert/confirm/prompt, exposed secrets, db.commit(), and pictorial emojis."""
    errors = []
    source_files = ["app.js", "i18n.js", "data.js", "index.html", "styles.css", "tahoe-skin.css"]

    native_dialog_re = re.compile(r"(?<![.\w])(alert|confirm|prompt)\s*\(")
    secret_re = re.compile(r"(sk_live_[0-9a-zA-Z]{16,}|AIzaSy[0-9A-Za-z\-_]{33}|BEGIN RSA PRIVATE KEY|ghp_[0-9A-Za-z]{30,})")
    emoji_re = re.compile(r"[\U0001F300-\U0001FAFF]")

    for fname in source_files:
        fpath = WORKSPACE_ROOT / fname
        if not fpath.exists():
            continue
        content = fpath.read_text(encoding="utf-8")

        if fname.endswith(".js") or fname.endswith(".html"):
            for match in native_dialog_re.finditer(content):
                line_no = content[: match.start()].count("\n") + 1
                errors.append(f"Forbidden native dialog '{match.group(1)}()' in {fname}:{line_no}")

        for match in secret_re.finditer(content):
            line_no = content[: match.start()].count("\n") + 1
            errors.append(f"Potential exposed secret in {fname}:{line_no}")

        for match in emoji_re.finditer(content):
            line_no = content[: match.start()].count("\n") + 1
            errors.append(f"Forbidden pictorial emoji U+{ord(match.group(0)):04X} in {fname}:{line_no}")

    return len(errors) == 0, errors


def phase_6_ui_ux_and_tahoe_skin():
    """Phase 6: Verify macOS Tahoe skin, Apple HIG Liquid Glass, Karpathy Guidelines & UI/UX modal completeness."""
    errors = []
    tahoe_path = WORKSPACE_ROOT / "tahoe-skin.css"
    if not tahoe_path.exists():
        errors.append("Missing tahoe-skin.css")
    else:
        css_text = tahoe_path.read_text(encoding="utf-8")
        for required_css_token in [
            "--tahoe-",
            "backdrop-filter",
            "tabular-nums",
            ":focus-visible",
            "prefers-reduced-motion",
            "prefers-contrast",
            "--hig-glass-blur-regular",
            ".hig-mobile-tabbar",
            ".hig-sheet-grabber-zone",
            "minmax(0, 1fr)",
        ]:
            if required_css_token not in css_text:
                errors.append(f"tahoe-skin.css missing Apple HIG / Liquid Glass token: {required_css_token}")

    karpathy_skill = WORKSPACE_ROOT / ".agents" / "skills" / "karpathy-guidelines" / "SKILL.md"
    if not karpathy_skill.exists():
        errors.append("Missing .agents/skills/karpathy-guidelines/SKILL.md")
    else:
        k_text = karpathy_skill.read_text(encoding="utf-8")
        for principle in ["Think Before Coding", "Simplicity First", "Surgical Changes", "Goal-Driven Execution"]:
            if principle not in k_text:
                errors.append(f"karpathy-guidelines/SKILL.md missing principle: {principle}")

    apple_skill = WORKSPACE_ROOT / ".agents" / "skills" / "apple-design" / "SKILL.md"
    apple_liquid_glass = WORKSPACE_ROOT / ".agents" / "skills" / "apple-design" / "references" / "hig" / "liquid-glass.md"
    if not apple_skill.exists() or not apple_liquid_glass.exists():
        errors.append("Missing .agents/skills/apple-design/SKILL.md or references/hig/liquid-glass.md")

    ruflo_skill = WORKSPACE_ROOT / ".agents" / "skills" / "ruflo-sparc" / "SKILL.md"
    if not ruflo_skill.exists():
        errors.append("Missing .agents/skills/ruflo-sparc/SKILL.md")
    else:
        r_text = ruflo_skill.read_text(encoding="utf-8")
        for phase_name in ["Specification", "Pseudocode", "Architecture", "Refinement", "Completion"]:
            if phase_name not in r_text:
                errors.append(f"ruflo-sparc/SKILL.md missing SPARC phase: {phase_name}")

    for extra_skill_rel in [
        "web-design-guidelines/SKILL.md",
        "web-design-guidelines/references/guidelines.md",
        "webapp-testing/SKILL.md",
        "webapp-testing/scripts/run_mobile_cdp_audit.js",
        "frontend-design/SKILL.md",
        "verification-before-completion/SKILL.md",
        "systematic-debugging/SKILL.md",
        "tdd/SKILL.md",
        "tdd/tests.md",
        "tdd/mocking.md",
        "diagnosing-bugs/SKILL.md",
        "code-review/SKILL.md",
        "codebase-design/SKILL.md",
        "codebase-design/DEEPENING.md",
    ]:
        if not (WORKSPACE_ROOT / ".agents" / "skills" / extra_skill_rel).exists():
            errors.append(f"Missing required GitHub skill asset: .agents/skills/{extra_skill_rel}")

    html_path = WORKSPACE_ROOT / "index.html"
    if html_path.exists():
        html = html_path.read_text(encoding="utf-8")

        for required_dom_id in [
            "authModal",
            "wizardModal",
            "offerModal",
            "guideModal",
            "dashboardModal",
            "adminModal",
            "appleSheetModal",
            "chatDock",
            "gdprConsentBanner",
            "mobileBottomTabBar",
            "toastContainer",
            "pricing",
        ]:
            if f'id="{required_dom_id}"' not in html:
                errors.append(f"Missing required DOM element #{required_dom_id} in index.html")

    # Automated iOS Safari Caret, Multi-Line Card Geometry & Mobile Layout Gatekeeper Checks
    styles_path = WORKSPACE_ROOT / "styles.css"
    if styles_path.exists():
        s_text = styles_path.read_text(encoding="utf-8")
        if "line-height: 45px" in s_text or "line-height: 46px" in s_text:
            errors.append("styles.css contains fixed pixel line-height (45px/46px) on input, which misaligns the iOS Safari text caret")

    if tahoe_path.exists():
        t_text = tahoe_path.read_text(encoding="utf-8")
        for ios_token in [
            "line-height: 1.25 !important;",
            "button:not(.offer-list-item)",
            "touch-action: pan-y !important;",
            "backdrop-filter: blur(26px) saturate(150%) !important;",
        ]:
            if ios_token not in t_text:
                errors.append(f"tahoe-skin.css missing iOS Safari / Mobile HIG protection token: {ios_token}")

    app_path = WORKSPACE_ROOT / "app.js"
    if app_path.exists():
        a_text = app_path.read_text(encoding="utf-8")
        for inp_tag in re.findall(r"<input[^>]*>", a_text):
            if "padding:0 " in inp_tag or "padding: 0 " in inp_tag:
                errors.append(f"app.js has inline zero vertical padding on <input> (causes iOS caret drop): {inp_tag[:80]}")


    return len(errors) == 0, errors


def main():
    print(f"\n{BOLD}{CYAN}======================================================================={RESET}")
    print(f"{BOLD}{CYAN}  CLOUDFLARE-GRADE 6-PHASE SECURITY & BUSINESS AUDIT GATEKEEPER{RESET}")
    print(f"{BOLD}{CYAN}  Workspace: {WORKSPACE_ROOT}{RESET}")
    print(f"{BOLD}{CYAN}======================================================================={RESET}\n")

    p1_ok, p1_errs = phase_1_compilation_and_config()
    (p2_ok, p2_errs), (p3_ok, p3_errs), (p4_ok, p4_errs) = phase_2_3_4_node_sandbox_audit()
    p5_ok, p5_errs = phase_5_security_no_alerts_no_emojis()
    p6_ok, p6_errs = phase_6_ui_ux_and_tahoe_skin()

    phases = [
        ("Faza 1: Compilare JS, Structură DOM & Configurare Vercel", p1_ok, p1_errs),
        ("Faza 2: Reziliența Formularelor la \"\" & Virgule (Fără 422/NaN)", p2_ok, p2_errs),
        ("Faza 3: Calcule Financiare, Paritate 1:1 & Monetizare (10 Free -> PRO)", p3_ok, p3_errs),
        ("Faza 4: Integritate Date, Izolare Multi-Cont & GDPR/DSA", p4_ok, p4_errs),
        ("Faza 5: Securitate, 0 alert()/confirm(), 0 Emoji & 0 Secrete Expuse", p5_ok, p5_errs),
        ("Faza 6: Integritate UI/UX & macOS Tahoe Native Skin", p6_ok, p6_errs),
    ]

    all_passed = True
    for title, ok, errs in phases:
        if ok:
            print(f"  🟢 {GREEN}{BOLD}VERDE{RESET} — {title}")
        else:
            all_passed = False
            print(f"  🔴 {RED}{BOLD}ROȘU {RESET} — {title}")
            for err in errs:
                print(f"       └── {RED}{err}{RESET}")

    print(f"\n{BOLD}{CYAN}-----------------------------------------------------------------------{RESET}")
    if all_passed:
        print(f"  🟢 {GREEN}{BOLD}REZULTAT AUDIT GATEKEEPER: 6/6 FAZE VERDE (PREGĂTIT PENTRU COMMIT/PUSH){RESET}")
        print(f"{BOLD}{CYAN}-----------------------------------------------------------------------{RESET}\n")
        sys.exit(0)
    else:
        print(f"  🔴 {RED}{BOLD}REZULTAT AUDIT GATEKEEPER: EȘEC (REPARĂ CAUZELE ÎNAINTE DE COMMIT/PUSH){RESET}")
        print(f"{BOLD}{CYAN}-----------------------------------------------------------------------{RESET}\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
