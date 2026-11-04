// ChangeIt4Me — Main Application Logic
// Default Language: EN ("en") + Automatic European Geo-IP Language Routing + Full Swap Platform

const COUNTRY_COORDS = {
  "Germany": { lat: 51.1657, lng: 10.4515 },
  "Romania": { lat: 45.9432, lng: 24.9668 },
  "Spain": { lat: 40.4637, lng: -3.7492 },
  "Italy": { lat: 41.8719, lng: 12.5674 },
  "France": { lat: 46.2276, lng: 2.2137 },
  "Austria": { lat: 47.5162, lng: 14.5501 },
  "Switzerland": { lat: 46.8182, lng: 8.2275 },
  "United Kingdom": { lat: 54.0, lng: -2.0 },
  "Moldova": { lat: 47.0105, lng: 28.8638 }
};

// Default language is strictly English ("en") unless overridden by Geo-IP or explicit user selection
let currentLang = "en";
let currentCurrency = localStorage.getItem("ci4m_currency") || "EUR";
let detectedIpInfo = {
  countryCode: "GB",
  countryName: "Europe (Default EN)",
  city: "",
  ip: "",
  autoLang: "en",
  source: "default"
};

let currentCategoryFilter = "all";
let selectedMapCountry = null;
let leafletMap = null;
let mapMarkers = [];
let currentDashTab = "proposals";

// Saved Favorites (Offer IDs)
let favoriteIds = (() => {
  try {
    const saved = localStorage.getItem("ci4m_favs");
    return saved ? JSON.parse(saved) : [101, 102];
  } catch (e) {
    return [101, 102];
  }
})();

// Sent / Received Swap Proposals
let swapProposals = (() => {
  try {
    const saved = localStorage.getItem("ci4m_proposals");
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return [
    {
      id: 901,
      direction: "Incoming",
      offerId: 101,
      targetTitle: "2022 Porsche Macan S (38k km)",
      offeredItem: "2023 Audi Q8 e-tron 55 Quattro (24,000 km, Munich)",
      partner: "Markus H. (Munich, DE)",
      cashBalance: "Even 1:1 Key-for-Key (€0)",
      status: "Ready for Inspection"
    },
    {
      id: 902,
      direction: "Incoming",
      offerId: 102,
      targetTitle: "Modern 3-Room Apartment in Cluj-Napoca",
      offeredItem: "3-Room Apartment in Bucharest North (Herăstrău / Pipera)",
      partner: "elena.v@email.ro",
      cashBalance: "+ €10,000 Cash Top-up",
      status: "New Match Proposal"
    }
  ];
})();

// Load offers from localStorage + merge user-created offers with latest INITIAL_OFFERS
let deletedOfferIds = (() => {
  try {
    const saved = localStorage.getItem("ci4m_deleted_offers_v1");
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
})();

let offers = (() => {
  const baseOffers = (window.INITIAL_OFFERS || []).filter(o => !deletedOfferIds.includes(o.id));
  try {
    const userSavedRaw = localStorage.getItem("ci4m_user_offers_v1");
    const userSaved = userSavedRaw ? JSON.parse(userSavedRaw) : [];
    if (Array.isArray(userSaved) && userSaved.length > 0) {
      const userMap = new Map(userSaved.map(u => [u.id, u]));
      const mergedBase = baseOffers.map(b => userMap.has(b.id) ? userMap.get(b.id) : b);
      const baseIds = new Set(baseOffers.map(b => b.id));
      const customOnly = userSaved.filter(u => !baseIds.has(u.id) && !deletedOfferIds.includes(u.id));
      return [...customOnly, ...mergedBase];
    }
    const saved = localStorage.getItem("ci4m_offers_v4");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length >= window.INITIAL_OFFERS.length) {
        const baseIds = new Set(baseOffers.map(b => b.id));
        const customFromOld = parsed.filter(u => !baseIds.has(u.id) && !deletedOfferIds.includes(u.id));
        return [...customFromOld, ...baseOffers];
      }
    }
  } catch (e) {}
  return [...baseOffers];
})();

function saveOffersToStorage() {
  try {
    localStorage.setItem("ci4m_offers_v4", JSON.stringify(offers));
    const customOrEdited = offers.filter(o => o.createdByUser || o.id > 100000);
    localStorage.setItem("ci4m_user_offers_v1", JSON.stringify(customOrEdited));
    localStorage.setItem("ci4m_deleted_offers_v1", JSON.stringify(deletedOfferIds));
  } catch (e) {}
}

let currentDealModeFilter = "all";

// Persistent Accounts Database (Email -> Account Object)
let accountsDb = (() => {
  try {
    const saved = localStorage.getItem("ci4m_accounts_db");
    return saved ? JSON.parse(saved) : {};
  } catch (e) {
    return {};
  }
})();

function saveAccountsDb() {
  try {
    localStorage.setItem("ci4m_accounts_db", JSON.stringify(accountsDb));
  } catch (e) {}
}

// Current logged-in user state
let currentUser = (() => {
  try {
    const saved = localStorage.getItem("ci4m_user");
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    return null;
  }
})();

// 7-Step Wizard State (Persisted in localStorage so refresh never loses data)
const DEFAULT_WIZ_DATA = {
  editingOfferId: null,
  image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1000&q=80",
  category: "cars",
  titleHave: "",
  valueEur: "",
  originalAmount: "",
  originalCurrency: "",
  specs: "",
  desc: "",
  titleWant: "",
  dealType: "1to1",
  country: "Germany",
  city: "",
  owner: "",
  email: "",
  phone: ""
};

let wizStep = 1;
let currentOpenOfferId = null;
let currentAuthMode = "register";
let isRestoringRouteState = false;

let wizData = (() => {
  try {
    const saved = localStorage.getItem("ci4m_wiz_draft_v1");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.wizData) {
        if (parsed.wizStep >= 1 && parsed.wizStep <= 7) {
          wizStep = Number(parsed.wizStep);
        }
        return { ...DEFAULT_WIZ_DATA, ...parsed.wizData };
      }
    }
  } catch (e) {}
  return { ...DEFAULT_WIZ_DATA };
})();

function persistWizardDraft() {
  try {
    localStorage.setItem("ci4m_wiz_draft_v1", JSON.stringify({ wizStep, wizData }));
  } catch (e) {}
}

function isLocalhostServer() {
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1" || window.location.protocol === "file:";
}

function syncUrlWithRoute(routePath, replace = false) {
  if (isRestoringRouteState) return;
  const cleanRoute = routePath && routePath.startsWith("/") ? routePath : `/${routePath || ""}`;
  try {
    localStorage.setItem("ci4m_nav_state_v1", JSON.stringify({
      route: cleanRoute,
      mobileStarted: document.body.classList.contains("mobile-started"),
      wizStep,
      currentOpenOfferId,
      currentAuthMode,
      currentDashTab,
      currentCategoryFilter
    }));
  } catch (e) {}

  try {
    let targetUrl = cleanRoute;
    if (isLocalhostServer()) {
      targetUrl = cleanRoute === "/" ? "/" : `/?page=${encodeURIComponent(cleanRoute.replace(/^\//, ""))}`;
    }
    const currentFull = window.location.pathname + window.location.search;
    if (currentFull !== targetUrl) {
      if (replace) {
        window.history.replaceState({ route: cleanRoute }, "", targetUrl);
      } else {
        window.history.pushState({ route: cleanRoute }, "", targetUrl);
      }
    }
  } catch (e) {}
}

function getRouteFromUrlOrStorage() {
  const params = new URLSearchParams(window.location.search);
  const pageParam = params.get("page");
  if (pageParam) {
    return "/" + pageParam.replace(/^\//, "");
  }
  const path = window.location.pathname || "/";
  if (path !== "/" && path !== "/index.html") {
    return path;
  }
  const hash = (window.location.hash || "").replace(/^#\/?/, "");
  if (hash && hash !== "top") {
    return "/" + hash;
  }
  try {
    const saved = localStorage.getItem("ci4m_nav_state_v1");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.route && parsed.route !== "/") {
        return parsed.route;
      }
      if (parsed && parsed.mobileStarted) {
        return "/start";
      }
    }
  } catch (e) {}
  return "/";
}

function closeAllModalsSilently() {
  ["wizardModal", "offerModal", "authModal", "dashboardModal", "guideModal"].forEach(id => {
    document.getElementById(id)?.classList.remove("open");
  });
  document.body.classList.remove("modal-open");
}

function navigateToPageRoute(routePath, replace = false) {
  const clean = routePath && routePath.startsWith("/") ? routePath : `/${routePath || ""}`;
  isRestoringRouteState = true;
  try {
    closeAllModalsSilently();
    if (clean === "/" || clean === "/home") {
      document.body.classList.remove("mobile-started");
      window.scrollTo({ top: 0, behavior: "instant" });
    } else if (clean === "/start") {
      document.body.classList.add("mobile-started");
      window.scrollTo({ top: 0, behavior: "instant" });
    } else if (clean.startsWith("/wizard")) {
      document.body.classList.add("mobile-started");
      const m = clean.match(/step-(\d+)/);
      if (m && Number(m[1]) >= 1 && Number(m[1]) <= 7) {
        wizStep = Number(m[1]);
      }
      if (currentUser) {
        if (!wizData.owner) wizData.owner = currentUser.name;
        if (!wizData.email) wizData.email = currentUser.email;
        if (!wizData.phone) wizData.phone = currentUser.phone;
      }
      document.getElementById("wizardModal")?.classList.add("open");
      document.body.classList.add("modal-open");
      renderWizStep();
    } else if (clean.startsWith("/offer/")) {
      document.body.classList.add("mobile-started");
      const offerId = Number(clean.split("/")[2]);
      if (offerId) {
        openOfferModal(offerId);
      }
    } else if (clean === "/login") {
      document.body.classList.add("mobile-started");
      openAuthModal("login");
    } else if (clean === "/register") {
      document.body.classList.add("mobile-started");
      openAuthModal("register");
    } else if (clean === "/dashboard") {
      document.body.classList.add("mobile-started");
      if (currentUser) {
        openDashboardModal(currentDashTab || "proposals");
      } else {
        openAuthModal("login");
      }
    } else {
      const secId = clean.replace(/^\//, "");
      document.body.classList.add("mobile-started");
      const secEl = document.getElementById(secId);
      if (secEl) {
        setTimeout(() => secEl.scrollIntoView({ behavior: "smooth" }), 50);
      }
    }
  } finally {
    isRestoringRouteState = false;
  }
  syncUrlWithRoute(clean, replace);
}

function t(key) {
  const dict = window.TRANSLATIONS[currentLang] || window.TRANSLATIONS.en;
  return dict[key] || window.TRANSLATIONS.en[key] || key;
}

function getOfferLocalized(offer) {
  if (offer.i18n && offer.i18n[currentLang]) {
    return offer.i18n[currentLang];
  }
  if (offer.i18n && offer.i18n.en) {
    return offer.i18n.en;
  }
  return {
    title: offer.title || "Swap Offer",
    want: offer.want || "Open to direct 1:1 swap",
    desc: offer.desc || ""
  };
}

function getCategoryLabel(catCode) {
  const map = {
    "cars": t("catCars"),
    "real-estate": t("catRealEstate"),
    "electronics": t("catElectronics"),
    "home-garden": t("catHomeGarden"),
    "auto-parts": t("catAutoParts"),
    "clothing": t("catClothing")
  };
  return map[catCode] || catCode;
}

function getDealTypeLabel(dealType) {
  if (dealType === "1to1") return t("deal1to1");
  if (dealType === "cash") return t("dealCashAdd");
  if (dealType === "sale") return t("dealSaleOnly");
  return t("dealSwapOrSale");
}

// ============================================================================
// PREMIUM VECTOR SVG ICONS (No Emojis — Clean Architectural & Luxury Line Icons)
// ============================================================================
const PREMIUM_ICONS = {
  "cars": `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2"/><circle cx="6.5" cy="16.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/></svg>`,
  "real-estate": `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9.5Z"/><path d="M9 21V13h6v8"/></svg>`,
  "electronics": `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M2 20h20M12 16v4"/></svg>`,
  "home-garden": `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3"/><path d="M2 11v5a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H6v-2a2 2 0 0 0-4 0Z"/><path d="M4 18v2m16-2v2"/></svg>`,
  "auto-parts": `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3v6m0 6v6M3 12h6m6 0h6m-2.6-6.4-4.2 4.2m-4.4 4.4-4.2 4.2m12.8 0-4.2-4.2m-4.4-4.4-4.2-4.2"/></svg>`,
  "clothing": `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="6"/><polyline points="12 9 12 12 13.8 13.8"/><path d="M16.51 17.35l-.35 3.83a2 2 0 0 1-2 1.82H9.83a2 2 0 0 1-2-1.82l-.35-3.83m.01-10.7.35-3.83A2 2 0 0 1 9.83 1h4.35a2 2 0 0 1 2 1.82l.35 3.83"/></svg>`,
  "pin": `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:3px;flex-shrink:0;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
  "bolt": `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none" style="vertical-align:-2px;margin-right:3px;flex-shrink:0;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  "scale": `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:5px;"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10M12 3v18M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>`,
  "heartFilled": `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`,
  "heartOutline": `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`
};

// ============================================================================
// MULTI-CURRENCY SYSTEM (Exact Client-Price Parity + Live FX Sync)
// ============================================================================
function getCurrencyObj(code = currentCurrency) {
  const list = window.CURRENCIES || [{ code: "EUR", symbol: "€", short: "EUR", label: "Euro (EUR)", rateFromEur: 1.0 }];
  return list.find(c => c.code === code) || list[0];
}

// Exact unrounded conversion to EUR base (prevents any round-trip drift)
function convertToEur(valInCurr, code = currentCurrency) {
  const c = getCurrencyObj(code);
  const num = Number(valInCurr) || 0;
  if (!c.rateFromEur) return num;
  return num / c.rateFromEur;
}

function convertFromEur(valEur, code = currentCurrency) {
  const c = getCurrencyObj(code);
  const num = Number(valEur) || 0;
  return Math.round(num * c.rateFromEur);
}

// Direct cross-currency conversion respecting exact parity with client-set price
function convertBetweenCurrencies(amount, fromCode, toCode = currentCurrency) {
  const num = Number(amount) || 0;
  if (!num) return 0;
  const src = String(fromCode || "EUR").toUpperCase();
  const dst = String(toCode || currentCurrency).toUpperCase();
  if (src === dst) return Math.round(num);
  const fromObj = getCurrencyObj(src);
  const toObj = getCurrencyObj(dst);
  const exactInEur = num / (fromObj.rateFromEur || 1);
  return Math.round(exactInEur * (toObj.rateFromEur || 1));
}

// Returns the exact value of an offer in targetCode, preserving 100% of the client's original price
function getOfferValueInCurrency(item, targetCode = currentCurrency) {
  if (!item) return 0;
  const origCurr = String(item.originalCurrency || "EUR").toUpperCase();
  const origAmt = item.originalAmount !== undefined && item.originalAmount !== ""
    ? Number(item.originalAmount)
    : Number(item.valueEur || 0);
  if (origCurr === String(targetCode).toUpperCase()) {
    return Math.round(origAmt);
  }
  return convertBetweenCurrencies(origAmt, origCurr, targetCode);
}

function formatAmountInCurrentCurrency(rawAmount, code = currentCurrency) {
  const c = getCurrencyObj(code);
  const rounded = Math.round(Number(rawAmount) || 0);
  if (c.code === "RON") return `${rounded.toLocaleString("ro-RO")} LEI`;
  if (c.code === "MDL") return `${rounded.toLocaleString("ro-RO")} MDL`;
  if (c.code === "RUB") return `${rounded.toLocaleString("ru-RU")} ₽`;
  if (c.code === "CHF") return `CHF ${rounded.toLocaleString("de-CH")}`;
  if (c.code === "GBP") return `£${rounded.toLocaleString("en-GB")}`;
  if (c.code === "USD") return `$${rounded.toLocaleString("en-US")}`;
  return `€${rounded.toLocaleString("en-US")}`;
}

function formatOfferPrice(item, code = currentCurrency) {
  const val = getOfferValueInCurrency(item, code);
  return formatAmountInCurrentCurrency(val, code);
}

function formatCurrency(valEur, code = currentCurrency) {
  const converted = convertFromEur(valEur, code);
  return formatAmountInCurrentCurrency(converted, code);
}

function buildParityPreviewHtml(amount, baseCurrCode) {
  const num = Number(amount) || 0;
  if (num <= 0) return "";
  const others = (window.CURRENCIES || []).filter(c => c.code !== baseCurrCode);
  const pills = others.map(c => {
    const eq = convertBetweenCurrencies(num, baseCurrCode, c.code);
    return `<span style="display:inline-block;background:rgba(12,44,40,0.08);border:1px solid rgba(12,44,40,0.15);border-radius:999px;padding:2px 9px;font-size:11.5px;font-weight:700;color:var(--forest);">~ ${formatAmountInCurrentCurrency(eq, c.code)}</span>`;
  }).join(" ");
  const parityText = (typeof getSmartUiLabels === "function" && getSmartUiLabels().parityLabel) || "Parity";
  return `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:5px;margin-top:6px;"><span style="font-size:11.5px;color:var(--muted);font-weight:700;">⇄ ${parityText}:</span>${pills}</div>`;
}

async function syncLiveExchangeRates() {
  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=EUR&to=USD,RON,GBP,CHF");
    if (!res.ok) return;
    const data = await res.json();
    if (data && data.rates && Array.isArray(window.CURRENCIES)) {
      window.CURRENCIES.forEach(c => {
        if (data.rates[c.code]) {
          c.rateFromEur = Number(data.rates[c.code]);
        }
      });
      renderOffers();
      renderMapPinsAndPanel();
    }
  } catch (e) {
    // Keep default reference rates if offline
  }
}

function getDefaultCurrencyForLanguage(langCode, isoCountryCode = "") {
  const upperIso = String(isoCountryCode || "").toUpperCase();
  if (upperIso && window.COUNTRY_TO_CURRENCY && window.COUNTRY_TO_CURRENCY[upperIso]) {
    // Only apply country currency if it matches the language family or if language wasn't manually changed
    if (langCode === "ro" && upperIso === "MD") return "MDL";
    if (langCode === "de" && upperIso === "CH") return "CHF";
    if (langCode === "en" && (upperIso === "GB" || upperIso === "UK")) return "GBP";
  }
  return (window.LANG_TO_CURRENCY && window.LANG_TO_CURRENCY[langCode]) || "EUR";
}

function initCurrencyDropdown() {
  const listEl = document.getElementById("currencyList");
  const triggerBtn = document.getElementById("currencyTriggerBtn");
  const dropdown = document.getElementById("currencyDropdown");
  if (!listEl || !triggerBtn || !dropdown) return;

  const currencies = window.CURRENCIES || [];
  listEl.innerHTML = currencies.map(c => `
    <li role="presentation">
      <button type="button" role="option" class="lang-option" data-currency="${c.code}" aria-selected="${c.code === currentCurrency}" onclick="setCurrency('${c.code}', true)">
        <span class="lang-option-left">
          <strong style="display:inline-block;min-width:34px;color:var(--forest);font-weight:800;">${c.symbol}</strong>
          <span>${c.label}</span>
        </span>
        <span class="lang-option-code">${c.code}</span>
      </button>
    </li>
  `).join("");

  triggerBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    document.getElementById("langDropdown")?.classList.remove("is-open");
    const isOpen = dropdown.classList.toggle("is-open");
    triggerBtn.setAttribute("aria-expanded", String(isOpen));
  });

  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove("is-open");
      triggerBtn.setAttribute("aria-expanded", "false");
    }
  });
}

function updateCurrencyDependentLabels() {
  const c = getCurrencyObj(currentCurrency);
  const symEl = document.getElementById("currentCurrencySymbol");
  const codeEl = document.getElementById("currentCurrencyCode");
  const shortText = c.short || c.code;
  const hasDistinctSymbol = c.symbol && c.symbol.toUpperCase() !== shortText.toUpperCase();
  if (symEl) {
    symEl.textContent = hasDistinctSymbol ? c.symbol : "";
    symEl.style.display = hasDistinctSymbol ? "inline" : "none";
  }
  if (codeEl) codeEl.textContent = shortText;

  document.querySelectorAll("#currencyList .lang-option").forEach(btn => {
    btn.setAttribute("aria-selected", String(btn.dataset.currency === currentCurrency));
  });

  ["inlineRegCurrencySelect", "modalRegCurrencySelect", "quickPostCurrencySelect", "wizCurrencySelect"].forEach(id => {
    const sel = document.getElementById(id);
    if (sel) sel.value = currentCurrency;
  });

  const minInput = document.getElementById("catalogMinEur");
  const maxInput = document.getElementById("catalogMaxEur");
  if (minInput) minInput.setAttribute("placeholder", `Min ${c.symbol}`);
  if (maxInput) maxInput.setAttribute("placeholder", `Max ${c.symbol}`);

  const quickValLabel = document.getElementById("quickValueLabel");
  if (quickValLabel) {
    quickValLabel.textContent = t("quickValueEur").replace(/\(EUR\)|\(LEI\)|\(RON\)|\(MDL\)|\(RUB\)|\(USD\)|\(GBP\)|\(CHF\)|\(€\)|\(\$\)|\(£\)/gi, `(${c.short || c.code})`);
  }
  onQuickPostPriceChange();
}

function setCurrency(currCode, isManualUserAction = false) {
  const c = getCurrencyObj(currCode);
  currentCurrency = c.code;
  localStorage.setItem("ci4m_currency", currentCurrency);
  if (isManualUserAction) {
    localStorage.setItem("ci4m_currency_manual", currentCurrency);
  }

  document.getElementById("currencyDropdown")?.classList.remove("is-open");
  updateCurrencyDependentLabels();
  renderOffers();
  renderMapPinsAndPanel();

  if (document.getElementById("wizardModal")?.classList.contains("open")) {
    saveCurrentWizStepInputs();
    renderWizStep();
  }
  if (document.getElementById("offerModal")?.classList.contains("open") && currentOpenOfferId != null) {
    openOfferModal(currentOpenOfferId);
  }
  if (document.getElementById("dashboardModal")?.classList.contains("open")) {
    renderDashboardContent();
  }
}

function onRegLangSelectChange(newLang, targetCurrencySelectId) {
  setLanguage(newLang, true);
  const sel = document.getElementById(targetCurrencySelectId);
  if (sel) sel.value = currentCurrency;
}

// ============================================================================
// EUROPEAN GEO-IP AUTO-DETECTION (Default: EN -> European Country Native Lang)
// ============================================================================
function resolveLanguageFromCountryCode(isoCode) {
  if (!isoCode) return "en";
  const upper = String(isoCode).trim().toUpperCase();
  return window.COUNTRY_TO_LANG[upper] || "en";
}

function updateGeoIpBannerUI() {
  document.getElementById("geoIpStatusPill")?.remove();
  document.querySelectorAll(".lang-geo-footer, [data-tab='geoip']").forEach(el => el.remove());
}

async function detectLanguageByGeoIP(forceOverwriteManual = false) {
  // 1. Check URL ?lang= parameter first
  const urlParams = new URLSearchParams(window.location.search);
  const urlLang = urlParams.get("lang")?.toLowerCase();
  if (urlLang && window.TRANSLATIONS[urlLang] && !forceOverwriteManual) {
    setLanguage(urlLang, true);
    detectedIpInfo.source = "url";
    updateGeoIpBannerUI();
    return;
  }

  // 2. Check if user explicitly selected a language manually in this browser
  const manualLang = localStorage.getItem("ci4m_lang_manual");
  if (manualLang && window.TRANSLATIONS[manualLang] && !forceOverwriteManual) {
    setLanguage(manualLang, false);
  } else {
    // Baseline default before IP resolves is always English ("en")
    setLanguage("en", false);
  }

  // 3. Query Geo-IP APIs to detect visitor's European country
  const endpoints = [
    {
      url: "https://ipwho.is/",
      parse: (d) => d && d.success !== false && d.country_code ? { code: d.country_code, name: d.country || d.country_code, city: d.city || "", ip: d.ip || "" } : null
    },
    {
      url: "https://ipapi.co/json/",
      parse: (d) => d && d.country_code ? { code: d.country_code, name: d.country_name || d.country_code, city: d.city || "", ip: d.ip || "" } : null
    },
    {
      url: "https://api.country.is/",
      parse: (d) => d && d.country ? { code: d.country, name: d.country, city: "", ip: d.ip || "" } : null
    }
  ];

  for (const ep of endpoints) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(ep.url, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) continue;
      const data = await res.json();
      const parsed = ep.parse(data);
      if (parsed && parsed.code) {
        const mappedLang = resolveLanguageFromCountryCode(parsed.code);
        detectedIpInfo = {
          countryCode: parsed.code.toUpperCase(),
          countryName: parsed.name,
          city: parsed.city,
          ip: parsed.ip,
          autoLang: mappedLang,
          source: "geoip"
        };

        // If user hasn't manually locked another language (or if forced), apply the IP-matched language
        if (!manualLang || forceOverwriteManual) {
          localStorage.removeItem("ci4m_lang_manual");
          setLanguage(mappedLang, false);
        } else {
          updateGeoIpBannerUI();
        }
        return;
      }
    } catch (err) {
      // Try next Geo-IP endpoint
    }
  }

  // Fallback if offline/blocked: keep English ("en") as default
  updateGeoIpBannerUI();
}

// ============================================================================
// LANGUAGE SWITCHER (EN Default + DE, FR, IT, ES, RO, RU)
// ============================================================================
function initLanguageDropdown() {
  const listEl = document.getElementById("langList");
  const triggerBtn = document.getElementById("langTriggerBtn");
  const dropdown = document.getElementById("langDropdown");

  listEl.innerHTML = window.LANGUAGES.map(l => `
    <li role="presentation">
      <button type="button" role="option" class="lang-option" data-lang="${l.code}" aria-selected="${l.code === currentLang}" onclick="setLanguage('${l.code}', true)">
        <span class="lang-option-left">
          ${l.flagSvg}
          <span>${l.label}</span>
        </span>
        <span class="lang-option-code">${l.short}</span>
      </button>
    </li>
  `).join("");

  triggerBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    document.getElementById("currencyDropdown")?.classList.remove("is-open");
    const isOpen = dropdown.classList.toggle("is-open");
    triggerBtn.setAttribute("aria-expanded", String(isOpen));
  });

  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove("is-open");
      triggerBtn.setAttribute("aria-expanded", "false");
    }
  });
}

function setLanguage(langCode, isManualUserAction = false) {
  if (!window.TRANSLATIONS[langCode]) langCode = "en";
  currentLang = langCode;
  localStorage.setItem("ci4m_lang", langCode);
  if (isManualUserAction) {
    localStorage.setItem("ci4m_lang_manual", langCode);
  }
  document.documentElement.lang = langCode;

  // Automatically adapt currency by language (unless user locked a manual currency on initial load)
  const manualCurr = localStorage.getItem("ci4m_currency_manual");
  if (isManualUserAction || !manualCurr) {
    const autoCurr = getDefaultCurrencyForLanguage(langCode, detectedIpInfo?.countryCode);
    currentCurrency = autoCurr;
    localStorage.setItem("ci4m_currency", currentCurrency);
  }

  // Update header flag & short label
  const langObj = window.LANGUAGES.find(l => l.code === langCode) || window.LANGUAGES[0];
  const flagEl = document.getElementById("currentLangFlag");
  const shortEl = document.getElementById("currentLangShort");
  if (flagEl) flagEl.innerHTML = langObj.flagSvg;
  if (shortEl) shortEl.textContent = langObj.short;

  // Update selected state in dropdown
  document.querySelectorAll("#langList .lang-option").forEach(btn => {
    btn.setAttribute("aria-selected", String(btn.dataset.lang === langCode));
  });
  document.getElementById("langDropdown")?.classList.remove("is-open");

  // Sync language selects in forms
  const inlineSel = document.getElementById("inlineRegLangSelect");
  if (inlineSel) inlineSel.value = langCode;
  const modalSel = document.getElementById("modalRegLangSelect");
  if (modalSel) modalSel.value = langCode;

  // Translate all static DOM nodes
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    el.textContent = t(key);
  });

  document.querySelectorAll("[data-i18n-html]").forEach(el => {
    const key = el.getAttribute("data-i18n-html");
    el.innerHTML = t(key);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    el.setAttribute("placeholder", t(key));
  });

  updateCurrencyDependentLabels();
  updateGeoIpBannerUI();
  renderUserHeaderState();
  renderOffers();
  renderMapPinsAndPanel();
  if (document.getElementById("wizardModal")?.classList.contains("open")) {
    renderWizStep();
  }
  if (document.getElementById("dashboardModal")?.classList.contains("open")) {
    renderDashboardContent();
  }
}

// ============================================================================
// OFFERS CATALOG, FAVORITES & SMART FILTERING
// ============================================================================
function updateFavCountUI() {
  const pill = document.getElementById("favCountPill");
  if (pill) pill.textContent = String(favoriteIds.length);
  const propBadge = document.getElementById("headerProposalsBadge");
  if (propBadge) propBadge.textContent = String(swapProposals.length);
}

function toggleFavorite(offerId, ev) {
  if (ev) ev.stopPropagation();
  const idx = favoriteIds.indexOf(offerId);
  if (idx >= 0) {
    favoriteIds.splice(idx, 1);
  } else {
    favoriteIds.push(offerId);
    showToast("♥ Saved to your favorites!");
  }
  localStorage.setItem("ci4m_favs", JSON.stringify(favoriteIds));
  updateFavCountUI();
  renderOffers();
}

function filterByCategory(catCode) {
  document.body.classList.add("mobile-started");
  currentCategoryFilter = catCode;
  document.querySelectorAll("#categoryFilterPills .cat-pill").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.cat === catCode);
  });
  renderOffers();
  syncUrlWithRoute("/offers");
  const offersSec = document.getElementById("offers");
  if (offersSec) {
    offersSec.scrollIntoView({ behavior: "smooth" });
  }
}

function filterByDealMode(mode) {
  currentDealModeFilter = mode;
  document.querySelectorAll("#dealModePills .cat-pill").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.mode === mode);
  });
  const dealSel = document.getElementById("catalogDealSelect");
  if (dealSel) {
    if (mode === "all") dealSel.value = "all";
    else if (mode === "either") dealSel.value = "either";
    else if (mode === "buy") dealSel.value = "all";
    else if (mode === "swap") dealSel.value = "all";
  }
  renderOffers();
}

function invertMatcherCategories() {
  const haveSel = document.getElementById("matcherHave");
  const wantSel = document.getElementById("matcherWant");
  const tmp = haveSel.value;
  haveSel.value = wantSel.value;
  wantSel.value = tmp;
}

function handleHeroMatcher(e) {
  e.preventDefault();
  const wantCat = document.getElementById("matcherWant").value;
  const country = document.getElementById("matcherCountry").value;

  currentCategoryFilter = wantCat;
  document.querySelectorAll("#categoryFilterPills .cat-pill").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.cat === wantCat);
  });

  if (country !== "all") {
    document.getElementById("catalogSearchInput").value = country;
  } else {
    document.getElementById("catalogSearchInput").value = "";
    const heroSearch = document.getElementById("heroSmartSearchInput");
    if (heroSearch) heroSearch.value = "";
    const mobSearch = document.getElementById("mobileSmartSearchInput");
    if (mobSearch) mobSearch.value = "";
  }

  renderOffers();
  document.getElementById("offers").scrollIntoView({ behavior: "smooth" });
  showToast(`✓ ${t("navOffers")}: ${wantCat === "all" ? t("catAll") : getCategoryLabel(wantCat)}`);
}

const SEARCH_SYNONYMS = {
  "casa": ["villa", "house", "chalet", "casă", "vilă", "haus", "maison", "дом", "вилла"],
  "casă": ["villa", "house", "chalet", "casă", "vilă", "haus", "maison", "дом", "вилла"],
  "vila": ["villa", "house", "chalet", "vilă", "дом", "вилла"],
  "vilă": ["villa", "house", "chalet", "vilă", "дом", "вилла"],
  "house": ["villa", "house", "chalet", "casă", "vilă", "haus", "maison"],
  "villa": ["villa", "house", "chalet", "casă", "vilă", "haus", "maison"],
  "дом": ["villa", "house", "chalet", "casă", "vilă", "дом", "вилла"],
  "вилла": ["villa", "house", "chalet", "casă", "vilă", "дом", "вилла"],
  "haus": ["villa", "house", "chalet", "haus", "casă", "vilă"],
  "maison": ["villa", "house", "chalet", "maison", "casă", "vilă"],
  "apartament": ["apartment", "penthouse", "studio", "wohnung", "appartement", "piso", "квартира", "апартаменты", "trilocale", "attico", "ático"],
  "apartment": ["apartment", "penthouse", "studio", "wohnung", "appartement", "piso", "apartament"],
  "квартира": ["apartment", "penthouse", "studio", "wohnung", "appartement", "piso", "квартира", "апартаменты"],
  "wohnung": ["apartment", "penthouse", "studio", "wohnung", "apartament"],
  "appartement": ["apartment", "penthouse", "studio", "appartement", "apartament"],
  "appartamento": ["apartment", "penthouse", "studio", "appartamento", "trilocale", "attico"],
  "piso": ["apartment", "penthouse", "studio", "piso", "ático"],
  "imobiliare": ["real-estate", "apartment", "villa", "penthouse", "house", "teren", "недвижимость"],
  "недвижимость": ["real-estate", "apartment", "villa", "penthouse", "house"],
  "masina": ["cars", "bmw", "mercedes", "audi", "porsche", "tesla", "suv", "auto", "авто", "машина"],
  "mașină": ["cars", "bmw", "mercedes", "audi", "porsche", "tesla", "suv", "auto", "авто", "машина"],
  "авто": ["cars", "bmw", "mercedes", "audi", "porsche", "tesla", "suv", "auto"],
  "машина": ["cars", "bmw", "mercedes", "audi", "porsche", "tesla", "suv", "auto"],
  "auto": ["cars", "bmw", "mercedes", "audi", "porsche", "tesla"],
  "coche": ["cars", "bmw", "mercedes", "audi", "porsche", "tesla"],
  "voiture": ["cars", "bmw", "mercedes", "audi", "porsche", "tesla"],
  "telefon": ["iphone", "smartphone", "samsung", "айфон", "телефон"],
  "айфон": ["iphone", "smartphone"],
  "айпад": ["ipad", "tablet"],
  "макбук": ["macbook", "laptop"],
  "laptop": ["macbook", "laptop", "notebook", "portátil", "ноутбук"],
  "tableta": ["ipad", "tablet", "планшет"],
  "tabletă": ["ipad", "tablet", "планшет"],
  "ceas": ["rolex", "watch", "chronograph", "часы"]
};

const STOP_PREFIX_TOKENS = new Set([
  "sport", "sports", "sportback", "sportpaket", "sportivo", "deportivo",
  "commercial", "commerciale", "comercial", "comercială",
  "contemporary", "contemporain", "contemporaneo", "contemporáneo",
  "transport", "import", "export", "support", "opportunity", "portion", "portal",
  "portatil", "portátil", "portbagaj", "portable", "portiere", "port", "por"
]);

function extractSearchTokens(str) {
  return String(str || "")
    .toLowerCase()
    .split(/[^a-z0-9ăâîșțäöüßéèêëàùûüçñа-яё]+/i)
    .filter(Boolean);
}

function tokensMatchQueryWords(tokens, queryWords, allowSynonyms = true) {
  return queryWords.every(w => {
    if (tokens.some(tok => tok.startsWith(w) && !(w.length <= 4 && STOP_PREFIX_TOKENS.has(tok) && tok !== w))) {
      return true;
    }
    if (!allowSynonyms) return false;
    const directSyns = SEARCH_SYNONYMS[w];
    if (directSyns && directSyns.some(s => tokens.some(tok => tok.startsWith(s)))) return true;
    if (w.length >= 3) {
      for (const [k, synList] of Object.entries(SEARCH_SYNONYMS)) {
        if (k.startsWith(w) && synList.some(s => tokens.some(tok => tok.startsWith(s)))) return true;
      }
    }
    return false;
  });
}

function getOfferPrimaryTokens(item) {
  const activeTr = (item.i18n && item.i18n[currentLang]) || {};
  const enTr = (item.i18n && item.i18n.en) || {};
  const primaryText = `${item.category || ""} ${item.country || ""} ${item.city || ""} ${item.specs || ""} ${item.title || ""} ${activeTr.title || ""} ${enTr.title || ""}`;
  return extractSearchTokens(primaryText);
}

function getOfferWantTokens(item) {
  const activeTr = (item.i18n && item.i18n[currentLang]) || {};
  const enTr = (item.i18n && item.i18n.en) || {};
  const wantText = `${item.want || ""} ${activeTr.want || ""} ${enTr.want || ""}`;
  return extractSearchTokens(wantText);
}

function matchesSmartSearchQuery(item, rawQuery) {
  if (!rawQuery) return true;
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;
  const words = extractSearchTokens(q);
  if (words.length === 0) return true;

  const primaryTokens = getOfferPrimaryTokens(item);
  return tokensMatchQueryWords(primaryTokens, words, true);
}

function matchesWantSearchQuery(item, rawQuery) {
  if (!rawQuery) return false;
  const q = rawQuery.trim().toLowerCase();
  if (!q) return false;
  const words = extractSearchTokens(q);
  if (words.length === 0) return false;

  const wantTokens = getOfferWantTokens(item);
  return tokensMatchQueryWords(wantTokens, words, false);
}

function inferSearchCategory(rawQuery, exactMatches) {
  if (exactMatches && exactMatches.length > 0) {
    return exactMatches[0].category;
  }
  const q = String(rawQuery || "").trim().toLowerCase();
  const words = extractSearchTokens(q);
  const carPrefixes = ["merc", "bmw", "por", "aud", "tes", "volk", "vw", "toy", "rang", "ferr", "lamb", "masin", "mașin", "auto", "car", "suv", "авто", "машин"];
  const realEstatePrefixes = ["vil", "cas", "apart", "penth", "imob", "teren", "haus", "wohn", "piso", "maison", "недвиж", "дом", "кварт"];
  const elecPrefixes = ["iph", "ipad", "mac", "appl", "sams", "lap", "tel", "watch", "son", "cam", "ps5", "playst", "dji", "electr", "айф", "мак"];
  for (const w of words) {
    if (carPrefixes.some(p => w.startsWith(p) || p.startsWith(w))) return "cars";
    if (realEstatePrefixes.some(p => w.startsWith(p) || p.startsWith(w))) return "real-estate";
    if (elecPrefixes.some(p => w.startsWith(p) || p.startsWith(w))) return "electronics";
  }
  return null;
}

function getSmartUiLabels() {
  const map = {
    en: {
      noMatch: "No exact listing for",
      postFirst: "+ Post your offer",
      seeAll: "See all results in catalog →",
      smartHeader: "Smart Category Assistant",
      templatesHint: "Quick Models & Templates (auto-fills title + specs + price):",
      titlePlaceholder: "Type e.g. iPhone 16, iPad, MacBook, BMW X5, 3-Room Apartment, Villa...",
      specsLabel: "Technical Specifications (auto-filled from chips above or type manually)",
      specsPlaceholder: "E.g. 256GB · 98% Battery · Warranty / 2022 · 48,000 km / 3 Rooms · 92 m²",
      geoTitle: "Search City, District or Address (Live Autocomplete)",
      gpsBtn: "Detect my location (GPS)",
      geoPlaceholder: "Type city or address (e.g. Vienna, Munich, Bucharest, Zurich, Paris)...",
      countryLabel: "Country",
      cityLabel: "City / Area",
      selectBtn: "Select",
      parityLabel: "Parity",
      stepWord: "Step",
      nextStepBtn: "Next Step →",
      publishBtn: "✓ Publish Swap Offer",
      uploadPhotoDesc: "Upload a photo of your item/property or choose a quick preview photo below:",
      uploadPhotoTitle: "+ Upload JPG / PNG from device",
      uploadPhotoSub: "Up to 10 high-resolution photos",
      samplePhotoLabel: "Or select a sample category photo:",
      noFilterMatchTitle: "No exact swap offers matched your filter",
      noFilterMatchDesc: "Reset filters or post your own swap offer so other members can match with you.",
      resetFiltersBtn: "Reset Filters",
      altSectionTitle: "Similar Alternatives & Owners looking for",
      altSectionSub: "Offers in the same category or members who explicitly want this item in exchange",
      wantMatchBadge: "Wants in swap",
      altBadge: "Alternative",
      ddAltHeader: "Similar Alternatives & Swap Matches"
    },
    de: {
      noMatch: "Kein exaktes Inserat für",
      postFirst: "+ Inserat aufgeben",
      seeAll: "Alle Ergebnisse im Katalog ansehen →",
      smartHeader: "Smart-Kategorie-Assistent",
      templatesHint: "Schnellvorlagen (füllt Titel + Daten + Preis automatisch aus):",
      titlePlaceholder: "z.B. iPhone 16, iPad, MacBook, BMW X5, 3-Zimmer-Wohnung, Haus...",
      specsLabel: "Technische Daten (automatisch per Klick oben oder manuell)",
      specsPlaceholder: "z.B. 256GB · 98% Akku · Garantie / 2022 · 48.000 km / 3 Zimmer · 92 m²",
      geoTitle: "Stadt, Bezirk oder Adresse suchen (Live-Autocomplete)",
      gpsBtn: "Meinen Standort erkennen (GPS)",
      geoPlaceholder: "Stadt oder Adresse eingeben (z.B. Wien, München, Zürich, Berlin)...",
      countryLabel: "Land",
      cityLabel: "Stadt / Bezirk",
      selectBtn: "Wählen",
      parityLabel: "Parität",
      stepWord: "Schritt",
      nextStepBtn: "Nächster Schritt →",
      publishBtn: "✓ Tauschangebot veröffentlichen",
      uploadPhotoDesc: "Laden Sie ein Foto hoch oder wählen Sie unten ein Vorschaubild:",
      uploadPhotoTitle: "+ JPG / PNG vom Gerät hochladen",
      uploadPhotoSub: "Bis zu 10 hochauflösende Fotos",
      samplePhotoLabel: "Oder Beispielbild der Kategorie wählen:",
      noFilterMatchTitle: "Keine exakten Angebote für Ihren Filter gefunden",
      noFilterMatchDesc: "Filter zurücksetzen oder eigenes Angebot erstellen.",
      resetFiltersBtn: "Filter zurücksetzen",
      altSectionTitle: "Ähnliche Alternativen & Eigentümer, die suchen nach",
      altSectionSub: "Angebote derselben Kategorie oder Mitglieder, die dieses Objekt im Tausch suchen",
      wantMatchBadge: "Sucht im Tausch",
      altBadge: "Alternative",
      ddAltHeader: "Ähnliche Alternativen & Tausch-Matches"
    },
    fr: {
      noMatch: "Aucune annonce exacte pour",
      postFirst: "+ Publier une annonce",
      seeAll: "Voir tous les résultats dans le catalogue →",
      smartHeader: "Assistant Intelligent par Catégorie",
      templatesHint: "Modèles rapides (remplit titre + détails + prix en 1 clic) :",
      titlePlaceholder: "Ex : iPhone 16, iPad, MacBook, BMW X5, Appartement 3 pièces, Villa...",
      specsLabel: "Caractéristiques clés (remplies automatiquement ou manuellement)",
      specsPlaceholder: "Ex : 256GB · Batterie 98% / 2022 · 48 000 km / 3 Pièces · 92 m²",
      geoTitle: "Rechercher Ville, Quartier ou Adresse (Autocomplete Live)",
      gpsBtn: "Détecter ma position (GPS)",
      geoPlaceholder: "Tapez la ville ou l'adresse (ex : Paris, Nice, Genève, Lyon)...",
      countryLabel: "Pays",
      cityLabel: "Ville / Quartier",
      selectBtn: "Choisir",
      parityLabel: "Parité",
      stepWord: "Étape",
      nextStepBtn: "Étape suivante →",
      publishBtn: "✓ Publier l'annonce",
      uploadPhotoDesc: "Téléchargez une photo de votre bien ou choisissez un aperçu ci-dessous :",
      uploadPhotoTitle: "+ Télécharger JPG / PNG",
      uploadPhotoSub: "Jusqu'à 10 photos haute résolution",
      samplePhotoLabel: "Ou choisir une photo d'exemple :",
      noFilterMatchTitle: "Aucune offre exacte ne correspond à votre filtre",
      noFilterMatchDesc: "Réinitialisez les filtres ou publiez votre propre offre d'échange.",
      resetFiltersBtn: "Réinitialiser les filtres",
      altSectionTitle: "Alternatives similaires & Propriétaires cherchant",
      altSectionSub: "Offres de la même catégorie ou membres souhaitant cet article en échange",
      wantMatchBadge: "Cherche en échange",
      altBadge: "Alternative",
      ddAltHeader: "Alternatives similaires & Échanges compatibles"
    },
    it: {
      noMatch: "Nessun annuncio esatto per",
      postFirst: "+ Pubblica annuncio",
      seeAll: "Vedi tutti i risultati nel catalogo →",
      smartHeader: "Assistente Smart per Categoria",
      templatesHint: "Modelli rapidi (compila titolo + specifiche + prezzo in 1 clic):",
      titlePlaceholder: "Es: iPhone 16, iPad, MacBook, BMW X5, Trilocale, Villa...",
      specsLabel: "Specifiche tecniche (automatiche dai pulsanti sopra o manuali)",
      specsPlaceholder: "Es: 256GB · Batteria 98% / 2022 · 48.000 km / 3 Locali · 92 m²",
      geoTitle: "Cerca Città, Quartiere o Indirizzo (Autocomplete Live)",
      gpsBtn: "Rileva la mia posizione (GPS)",
      geoPlaceholder: "Scrivi città o indirizzo (es: Milano, Roma, Zurigo, Torino)...",
      countryLabel: "Paese",
      cityLabel: "Città / Zona",
      selectBtn: "Scegli",
      parityLabel: "Parità",
      stepWord: "Passo",
      nextStepBtn: "Passo successivo →",
      publishBtn: "✓ Pubblica annuncio",
      uploadPhotoDesc: "Carica una foto del tuo bene o scegli un'anteprima qui sotto:",
      uploadPhotoTitle: "+ Carica JPG / PNG dal dispositivo",
      uploadPhotoSub: "Fino a 10 foto ad alta risoluzione",
      samplePhotoLabel: "Oppure scegli una foto di esempio:",
      noFilterMatchTitle: "Nessuna offerta esatta corrisponde al filtro",
      noFilterMatchDesc: "Reimposta i filtri o pubblica la tua offerta di scambio.",
      resetFiltersBtn: "Reimposta filtri",
      altSectionTitle: "Alternative simili & Proprietari che cercano",
      altSectionSub: "Offerte della stessa categoria o membri che cercano questo bene in permuta",
      wantMatchBadge: "Cerca in scambio",
      altBadge: "Alternativa",
      ddAltHeader: "Alternative simili & Scambi compatibili"
    },
    es: {
      noMatch: "Ningún anuncio exacto para",
      postFirst: "+ Publicar anuncio",
      seeAll: "Ver todos los resultados en el catálogo →",
      smartHeader: "Asistente Inteligente por Categoría",
      templatesHint: "Plantillas rápidas (completa título + detalles + precio en 1 clic):",
      titlePlaceholder: "Ej: iPhone 16, iPad, MacBook, BMW X5, Piso 3 hab, Casa / Chalet...",
      specsLabel: "Especificaciones técnicas (automáticas o manuales)",
      specsPlaceholder: "Ej: 256GB · Batería 98% / 2022 · 48.000 km / 3 Hab · 92 m²",
      geoTitle: "Buscar Ciudad, Zona o Dirección (Autocompletado en Vivo)",
      gpsBtn: "Detectar mi ubicación (GPS)",
      geoPlaceholder: "Escribe ciudad o dirección (ej: Madrid, Barcelona, Marbella)...",
      countryLabel: "País",
      cityLabel: "Ciudad / Zona",
      selectBtn: "Elegir",
      parityLabel: "Paridad",
      stepWord: "Paso",
      nextStepBtn: "Siguiente paso →",
      publishBtn: "✓ Publicar anuncio",
      uploadPhotoDesc: "Sube una foto de tu artículo/propiedad o elige una vista previa abajo:",
      uploadPhotoTitle: "+ Subir JPG / PNG desde dispositivo",
      uploadPhotoSub: "Hasta 10 fotos en alta resolución",
      samplePhotoLabel: "O selecciona una foto de ejemplo:",
      noFilterMatchTitle: "Ninguna oferta exacta coincide con tu filtro",
      noFilterMatchDesc: "Restablece los filtros o publica tu propia oferta de intercambio.",
      resetFiltersBtn: "Restablecer filtros",
      altSectionTitle: "Alternativas similares & Propietarios que buscan",
      altSectionSub: "Ofertas de la misma categoría o miembros que buscan este artículo a cambio",
      wantMatchBadge: "Busca a cambio",
      altBadge: "Alternativa",
      ddAltHeader: "Alternativas similares e Intercambios"
    },
    ro: {
      noMatch: "Niciun anunț exact pentru",
      postFirst: "+ Adaugă anunțul tău",
      seeAll: "Vezi toate rezultatele în catalog →",
      smartHeader: "Asistent Smart pe Categorie",
      templatesHint: "Modele & Șabloane Rapide (completează automat titlu + specificații + preț):",
      titlePlaceholder: "Tastează ex: iPhone 16, iPad, MacBook, BMW X5, Apartament 3 camere, Casă...",
      specsLabel: "Specificații Tehnice (se completează automat din butoanele de mai sus sau manual)",
      specsPlaceholder: "Ex: 256GB · 98% Battery · Garanție / 2022 · 48.000 km / 3 Camere · 92 m²",
      geoTitle: "Caută Oraș, Cartier sau Adresă (Autocomplete Live)",
      gpsBtn: "Detectează locația mea (GPS)",
      geoPlaceholder: "Tastează orașul sau adresa (ex: Cluj-Napoca, București, Timișoara, Wien)...",
      countryLabel: "Țară",
      cityLabel: "Oraș / Zonă",
      selectBtn: "Selectează",
      parityLabel: "Paritate",
      stepWord: "Pasul",
      nextStepBtn: "Pasul următor →",
      publishBtn: "✓ Publică Anunțul",
      uploadPhotoDesc: "Încarcă o fotografie a bunului tău sau alege o imagine rapidă mai jos:",
      uploadPhotoTitle: "+ Încarcă JPG / PNG din dispozitiv",
      uploadPhotoSub: "Până la 10 fotografii de înaltă rezoluție",
      samplePhotoLabel: "Sau alege o fotografie-șablon din categorie:",
      noFilterMatchTitle: "Nicio ofertă exactă nu corespunde filtrului selectat",
      noFilterMatchDesc: "Resetează filtrele sau adaugă propria ta ofertă pentru a primi propuneri.",
      resetFiltersBtn: "Resetează filtrele",
      altSectionTitle: "Alternative similare & Proprietari care caută",
      altSectionSub: "Oferte din aceeași categorie sau membri care caută explicit acest bun la schimb",
      wantMatchBadge: "Caută la schimb",
      altBadge: "Alternativă",
      ddAltHeader: "Alternative similare & Schimburi compatibile"
    },
    ru: {
      noMatch: "Точных объявлений не найдено для",
      postFirst: "+ Разместить объявление",
      seeAll: "Смотреть все результаты в каталоге →",
      smartHeader: "Умный помощник по категории",
      templatesHint: "Быстрые шаблоны (автозаполнение названия, характеристик и цены в 1 клик):",
      titlePlaceholder: "Например: iPhone 16, iPad, MacBook, BMW X5, 3-комн. квартира, Дом...",
      specsLabel: "Характеристики (заполняются автоматически кнопками выше или вручную)",
      specsPlaceholder: "Напр.: 256GB · АКБ 98% · Гарантия / 2022 · 48 000 км / 3 комн. · 92 м²",
      geoTitle: "Поиск города, района или адреса (Живой автопоиск на карте)",
      gpsBtn: "Определить мою геолокацию (GPS)",
      geoPlaceholder: "Введите город или адрес (например: Вена, Мюнхен, Бухарест, Кишинёв)...",
      countryLabel: "Страна",
      cityLabel: "Город / Район",
      selectBtn: "Выбрать",
      parityLabel: "Паритет",
      stepWord: "Шаг",
      nextStepBtn: "Далее →",
      publishBtn: "✓ Опубликовать обмен",
      uploadPhotoDesc: "Загрузите фото вашего объекта или выберите быстрое превью ниже:",
      uploadPhotoTitle: "+ Загрузить JPG / PNG с устройства",
      uploadPhotoSub: "До 10 фото в высоком разрешении",
      samplePhotoLabel: "Или выберите шаблонное фото категории:",
      noFilterMatchTitle: "Точных предложений по вашему фильтру не найдено",
      noFilterMatchDesc: "Сбросьте фильтры или разместите своё предложение обмена.",
      resetFiltersBtn: "Сбросить фильтры",
      altSectionTitle: "Похожие альтернативы и владельцы, ищущие",
      altSectionSub: "Предложения из той же категории или участники, ищущие этот товар на обмен",
      wantMatchBadge: "Ищет на обмен",
      altBadge: "Альтернатива",
      ddAltHeader: "Похожие альтернативы и обмен"
    }
  };
  return map[currentLang] || map.en;
}

function buildAiSmartRecommendations(rawQuery, exactMatches, candidatePool) {
  const q = String(rawQuery || "").trim().toLowerCase();
  const words = extractSearchTokens(q);
  const ui = getSmartUiLabels();
  const exactIds = new Set((exactMatches || []).map(it => it.id));
  const pool = (candidatePool || offers).filter(it => !exactIds.has(it.id));

  const hasPrefix = (prefList) => words.some(w => prefList.some(p => w.startsWith(p) || p.startsWith(w)));
  const isIphone = hasPrefix(["iph", "telefon", "smartph", "айф", "телеф"]);
  const isIpad = hasPrefix(["ipad", "tablet", "айпад", "планш"]);
  const isMac = hasPrefix(["mac", "laptop", "noteb", "макб", "ноут"]);
  const isHouse = hasPrefix(["cas", "vil", "hous", "haus", "mais", "chal", "дом", "вилл"]);
  const isApt = hasPrefix(["apart", "penth", "wohn", "piso", "triloc", "attic", "кварт"]);
  const isCar = hasPrefix(["merc", "bmw", "por", "aud", "tes", "auto", "masin", "mașin", "car", "suv", "coche", "voitur", "авто", "машин"]);

  const lang = currentLang || "en";
  const aiCopyMap = {
    ro: {
      aiTag: "AI Smart Match",
      tryAlso: "Sugestii AI conexe:",
      ecoApple: "AI Smart · Ecosistem Apple (iPad / MacBook)",
      ecoHouseApt: "AI Smart · Alternativă Apartament / Penthouse",
      ecoAptHouse: "AI Smart · Alternativă Casă / Vilă",
      ecoCar: "AI Smart · Alternativă Auto din aceeași clasă",
      wantBadge: "AI Smart · Caută la schimb",
      subIphone: "Pentru căutarea ta, AI-ul îți propune și tablete iPad Pro M4, laptopuri MacBook Pro și echipamente tech compatibile la schimb.",
      subHouse: "Pentru «Casă / Vilă», AI-ul îți propune și Penthouse-uri panoramice și Apartamente 3 camere (inclusiv proprietari care caută o casă la schimb).",
      subApt: "Pentru «Apartament», AI-ul îți propune și Case & Vile ale căror proprietari caută un apartament sau penthouse la schimb.",
      subCar: "AI-ul a selectat proprietari care caută acest model la schimb și alternative auto din aceeași clasă (Porsche, Mercedes-AMG, BMW M, Audi, Tesla)."
    },
    en: {
      aiTag: "AI Smart Match",
      tryAlso: "AI related suggestions:",
      ecoApple: "AI Smart · Apple Ecosystem (iPad / MacBook)",
      ecoHouseApt: "AI Smart · Apartment / Penthouse Alternative",
      ecoAptHouse: "AI Smart · House / Villa Alternative",
      ecoCar: "AI Smart · Same-Class Car Alternative",
      wantBadge: "AI Smart · Wants in swap",
      subIphone: "Based on your search, AI also recommends iPad Pro M4 tablets, MacBook Pro laptops, and compatible premium tech swaps.",
      subHouse: "For «House / Villa», AI also suggests Panoramic Penthouses and 3-Room Apartments (including owners looking to swap for a house).",
      subApt: "For «Apartment», AI also suggests Houses & Villas whose owners are looking for an apartment or penthouse in exchange.",
      subCar: "AI selected owners looking for this model in exchange plus same-class automotive alternatives (Porsche, Mercedes-AMG, BMW M, Audi, Tesla)."
    },
    de: {
      aiTag: "AI Smart Match",
      tryAlso: "KI-Vorschläge:",
      ecoApple: "KI Smart · Apple-Ökosystem (iPad / MacBook)",
      ecoHouseApt: "KI Smart · Wohnung / Penthouse Alternative",
      ecoAptHouse: "KI Smart · Haus / Villa Alternative",
      ecoCar: "KI Smart · Fahrzeug-Alternative",
      wantBadge: "KI Smart · Sucht im Tausch",
      subIphone: "Passend zu Ihrer Suche schlägt die KI auch iPad Pro M4, MacBook Pro und kompatible Tech-Tauschangebote vor.",
      subHouse: "Für «Haus / Villa» schlägt die KI auch Panorama-Penthouses und 3-Zimmer-Wohnungen vor.",
      subApt: "Für «Wohnung» schlägt die KI auch Häuser & Villen vor, deren Eigentümer eine Wohnung im Tausch suchen.",
      subCar: "Die KI zeigt Eigentümer, die dieses Modell im Tausch suchen, sowie passende Alternativen derselben Fahrzeugklasse."
    },
    fr: {
      aiTag: "AI Smart Match",
      tryAlso: "Suggestions IA :",
      ecoApple: "IA Smart · Écosystème Apple (iPad / MacBook)",
      ecoHouseApt: "IA Smart · Alternative Appartement / Penthouse",
      ecoAptHouse: "IA Smart · Alternative Maison / Villa",
      ecoCar: "IA Smart · Alternative Auto similaire",
      wantBadge: "IA Smart · Cherche en échange",
      subIphone: "Pour votre recherche, l'IA suggère aussi l'iPad Pro M4, le MacBook Pro et des échanges tech compatibles.",
      subHouse: "Pour « Maison / Villa », l'IA propose aussi des Penthouses et Appartements 3 pièces compatibles.",
      subApt: "Pour « Appartement », l'IA propose aussi des Villas et Maisons dont les propriétaires cherchent un appartement.",
      subCar: "L'IA a sélectionné des propriétaires cherchant ce modèle en échange ainsi que des alternatives de même catégorie."
    },
    it: {
      aiTag: "AI Smart Match",
      tryAlso: "Suggerimenti IA:",
      ecoApple: "IA Smart · Ecosistema Apple (iPad / MacBook)",
      ecoHouseApt: "IA Smart · Alternativa Appartamento / Attico",
      ecoAptHouse: "IA Smart · Alternativa Casa / Villa",
      ecoCar: "IA Smart · Alternativa Auto simile",
      wantBadge: "IA Smart · Cerca in scambio",
      subIphone: "In base alla ricerca, l'IA consiglia anche iPad Pro M4, MacBook Pro e scambi tech compatibili.",
      subHouse: "Per «Casa / Villa», l'IA propone anche Attici panoramici e Appartamenti trilocali.",
      subApt: "Per «Appartamento», l'IA propone anche Ville e Case i cui proprietari cercano un appartamento in permuta.",
      subCar: "L'IA ha selezionato proprietari che cercano questo modello in scambio e auto alternative della stessa classe."
    },
    es: {
      aiTag: "AI Smart Match",
      tryAlso: "Sugerencias IA:",
      ecoApple: "IA Smart · Ecosistema Apple (iPad / MacBook)",
      ecoHouseApt: "IA Smart · Alternativa Piso / Ático",
      ecoAptHouse: "IA Smart · Alternativa Casa / Villa",
      ecoCar: "IA Smart · Alternativa Auto similar",
      wantBadge: "IA Smart · Busca a cambio",
      subIphone: "Según tu búsqueda, la IA también sugiere iPad Pro M4, MacBook Pro e intercambios tech compatibles.",
      subHouse: "Para «Casa / Villa», la IA también sugiere Áticos panorámicos y Pisos de 3 habitaciones.",
      subApt: "Para «Piso / Apartamento», la IA también sugiere Villas y Casas cuyos propietarios buscan un piso a cambio.",
      subCar: "La IA seleccionó propietarios que buscan este modelo a cambio y alternativas de la misma categoría."
    },
    ru: {
      aiTag: "AI Smart Match",
      tryAlso: "ИИ-рекомендации:",
      ecoApple: "ИИ Smart · Экосистема Apple (iPad / MacBook)",
      ecoHouseApt: "ИИ Smart · Альтернатива: Квартира / Пентхаус",
      ecoAptHouse: "ИИ Smart · Альтернатива: Дом / Вилла",
      ecoCar: "ИИ Smart · Авто-альтернатива того же класса",
      wantBadge: "ИИ Smart · Ищет на обмен",
      subIphone: "По вашему запросу ИИ также рекомендует планшеты iPad Pro M4, ноутбуки MacBook Pro и совместимую технику.",
      subHouse: "Для «Дом / Вилла» ИИ также предлагает панорамные пентхаусы и 3-комнатные квартиры.",
      subApt: "Для «Квартира» ИИ также предлагает виллы и дома, владельцы которых ищут квартиру на обмен.",
      subCar: "ИИ подобрал владельцев, ищущих эту модель на обмен, и альтернативы того же класса."
    }
  };
  const copy = aiCopyMap[lang] || aiCopyMap.en;

  let relatedChips = [];
  let aiSubtext = ui.altSectionSub;

  if (isIphone) {
    relatedChips = ["iPad", "MacBook", "Sony Alpha"];
    aiSubtext = copy.subIphone;
  } else if (isIpad) {
    relatedChips = ["iPhone", "MacBook", "Sony Alpha"];
    aiSubtext = copy.subIphone;
  } else if (isMac) {
    relatedChips = ["iPad", "iPhone", "Sony Alpha"];
    aiSubtext = copy.subIphone;
  } else if (isHouse) {
    relatedChips = [t("qtagApartment"), "Penthouse", "Cluj-Napoca", "Chișinău"];
    aiSubtext = copy.subHouse;
  } else if (isApt) {
    relatedChips = [t("qtagHouse"), "Marbella", "Salzburg", "Alicante"];
    aiSubtext = copy.subApt;
  } else if (isCar) {
    relatedChips = ["Porsche", "Mercedes", "BMW", "Audi", "Tesla"];
    aiSubtext = copy.subCar;
  }

  const inferredCat = inferSearchCategory(q, exactMatches);
  const wantMatches = pool.filter(it => matchesWantSearchQuery(it, q));
  const wantIds = new Set(wantMatches.map(it => it.id));
  const catPeers = inferredCat
    ? pool.filter(it => !wantIds.has(it.id) && it.category === inferredCat)
    : [];

  // Score and order peers so the most relevant AI cross-suggestions come first (e.g. iPad Pro first for iPhone)
  catPeers.sort((a, b) => {
    const aText = `${a.specs || ""} ${a.i18n?.en?.title || ""}`.toLowerCase();
    const bText = `${b.specs || ""} ${b.i18n?.en?.title || ""}`.toLowerCase();
    if (isIphone) {
      const aScore = aText.includes("ipad") ? 3 : aText.includes("macbook") ? 2 : 1;
      const bScore = bText.includes("ipad") ? 3 : bText.includes("macbook") ? 2 : 1;
      return bScore - aScore;
    }
    if (isIpad) {
      const aScore = aText.includes("iphone") ? 3 : aText.includes("macbook") ? 2 : 1;
      const bScore = bText.includes("iphone") ? 3 : bText.includes("macbook") ? 2 : 1;
      return bScore - aScore;
    }
    return (b.matchScore || 90) - (a.matchScore || 90);
  });

  const getCustomAltBadge = (item, isWant) => {
    const enTitle = (item.i18n?.en?.title || "").toLowerCase();
    if (isIphone || isIpad || isMac) {
      if (enTitle.includes("ipad") || enTitle.includes("iphone") || enTitle.includes("macbook")) {
        return isWant ? `${copy.wantBadge} · Apple` : copy.ecoApple;
      }
    }
    if (isHouse && item.category === "real-estate") {
      return isWant ? copy.wantBadge : copy.ecoHouseApt;
    }
    if (isApt && item.category === "real-estate") {
      return isWant ? copy.wantBadge : copy.ecoAptHouse;
    }
    if (isWant) return copy.wantBadge;
    if (item.category === "cars") return copy.ecoCar;
    return `${copy.aiTag} · ${ui.altBadge}`;
  };

  // For iPhone/iPad/Mac or House/Apt, put same-category ecosystem matches first, then cross-category want matches
  const sameCatWant = wantMatches.filter(it => !inferredCat || it.category === inferredCat);
  const crossCatWant = wantMatches.filter(it => inferredCat && it.category !== inferredCat);

  const items = [
    ...sameCatWant.map(item => ({ item, altType: "want", badgeLabel: getCustomAltBadge(item, true) })),
    ...catPeers.map(item => ({ item, altType: "alt", badgeLabel: getCustomAltBadge(item, false) })),
    ...crossCatWant.map(item => ({ item, altType: "want", badgeLabel: getCustomAltBadge(item, true) }))
  ];

  return {
    items,
    relatedChips,
    aiTag: copy.aiTag,
    tryAlso: copy.tryAlso,
    aiSubtext
  };
}

function buildLiveSearchDropdownHtml(val) {
  const q = String(val || "").trim();
  if (q.length < 1) return "";
  const ui = getSmartUiLabels();
  const qTokens = extractSearchTokens(q);
  const exactMatches = offers
    .filter(it => matchesSmartSearchQuery(it, q))
    .sort((a, b) => {
      const aTitleTokens = extractSearchTokens(`${a.title} ${getOfferLocalized(a).title}`);
      const bTitleTokens = extractSearchTokens(`${b.title} ${getOfferLocalized(b).title}`);
      const aInTitle = tokensMatchQueryWords(aTitleTokens, qTokens, true) ? 1 : 0;
      const bInTitle = tokensMatchQueryWords(bTitleTokens, qTokens, true) ? 1 : 0;
      return bInTitle - aInTitle;
    })
    .slice(0, 4);

  const aiRecs = buildAiSmartRecommendations(q, exactMatches, offers);
  const alternatives = aiRecs.items.slice(0, 3);

  if (exactMatches.length === 0 && alternatives.length === 0) {
    return `
      <div class="smart-dd-empty" style="padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:10px;">
        <span style="font-size:13px;color:var(--muted);font-weight:600;">${ui.noMatch} «${q}»</span>
        <button type="button" class="btn btn-mint" style="height:32px;padding:0 12px;font-size:12px;" onclick="openWizardModal()">${ui.postFirst}</button>
      </div>
    `;
  }

  const renderRow = (item, badgeText = "", isWant = false) => {
    const loc = getOfferLocalized(item);
    const price = formatOfferPrice(item, currentCurrency);
    const badgeHtml = badgeText
      ? `<span style="display:inline-block;margin-left:6px;padding:2px 8px;border-radius:999px;font-size:10.5px;font-weight:800;background:${isWant ? '#dcfce7' : '#e0f2fe'};color:${isWant ? '#065f46' : '#0c4a6e'};border:1px solid ${isWant ? '#86efac' : '#bae6fd'};vertical-align:middle;">${badgeText}</span>`
      : "";
    return `
      <button type="button" class="smart-dd-item" onclick="document.getElementById('heroSmartDropdown').style.display='none'; document.getElementById('mobileSmartDropdown').style.display='none'; openOfferModal(${item.id}, 'details');">
        <img src="${item.image}" alt="" />
        <div class="smart-dd-info">
          <strong>${loc.title}${badgeHtml}</strong>
          <span>${getCategoryLabel(item.category)} · ${item.city}, ${item.country} · ${isWant ? `${t("wantBadge")}: ${loc.want}` : getDealTypeLabel(item.dealType)}</span>
        </div>
        <span class="smart-dd-price">~${price}</span>
      </button>
    `;
  };

  const chipsHtml = aiRecs.relatedChips.length > 0
    ? `<div style="padding:7px 14px;background:#f0fdf4;border-top:1px solid rgba(12,44,40,0.08);display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
        <span style="font-size:11px;font-weight:800;color:var(--forest);">${aiRecs.tryAlso}</span>
        ${aiRecs.relatedChips.map(chip => `<button type="button" style="background:#ffffff;color:var(--forest);border:1px solid rgba(12,44,40,0.22);border-radius:999px;padding:2px 9px;font-size:11px;font-weight:700;cursor:pointer;" onclick="event.stopPropagation(); executeQuickKeywordSearch('${chip.replace(/'/g, "\\'")}')">${chip}</button>`).join("")}
      </div>`
    : "";

  return `
    ${exactMatches.map(item => renderRow(item)).join("")}
    ${chipsHtml}
    ${alternatives.length > 0 ? `
      <div style="padding:6px 14px;background:#f8faf9;border-top:1px solid rgba(12,44,40,0.08);border-bottom:1px solid rgba(12,44,40,0.08);font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.04em;color:var(--forest);">
        ${aiRecs.aiTag} · ${ui.ddAltHeader}
      </div>
      ${alternatives.map(a => renderRow(a.item, a.badgeLabel, a.altType === "want")).join("")}
    ` : ""}
    <button type="button" class="smart-dd-all" onclick="executeQuickKeywordSearch('${q.replace(/'/g, "\\'")}')">
      ${ui.seeAll} (${exactMatches.length + alternatives.length})
    </button>
  `;
}

function handleHeroLiveSearch(val) {
  const dd = document.getElementById("heroSmartDropdown");
  if (!dd) return;
  const html = buildLiveSearchDropdownHtml(val);
  dd.innerHTML = html;
  dd.style.display = html ? "block" : "none";
}

function handleMobileLiveSearch(val) {
  const dd = document.getElementById("mobileSmartDropdown");
  if (!dd) return;
  const html = buildLiveSearchDropdownHtml(val);
  dd.innerHTML = html;
  dd.style.display = html ? "block" : "none";
}

function executeQuickKeywordSearch(keyword) {
  const clean = String(keyword || "").trim();
  const heroDd = document.getElementById("heroSmartDropdown");
  const mobDd = document.getElementById("mobileSmartDropdown");
  if (heroDd) heroDd.style.display = "none";
  if (mobDd) mobDd.style.display = "none";

  currentCategoryFilter = "all";
  currentDealModeFilter = "all";
  document.querySelectorAll("#categoryFilterPills .cat-pill").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.cat === "all");
  });
  document.querySelectorAll("#dealModePills .cat-pill").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.mode === "all");
  });

  const catSearch = document.getElementById("catalogSearchInput");
  if (catSearch) catSearch.value = clean;
  const heroInput = document.getElementById("heroSmartSearchInput");
  if (heroInput && clean) heroInput.value = clean;
  const mobInput = document.getElementById("mobileSmartSearchInput");
  if (mobInput && clean) mobInput.value = clean;

  renderOffers();
  document.getElementById("offers")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

document.addEventListener("click", (e) => {
  const heroWrap = document.getElementById("heroSmartSearchWrap");
  const heroDd = document.getElementById("heroSmartDropdown");
  if (heroDd && heroWrap && !heroWrap.contains(e.target)) {
    heroDd.style.display = "none";
  }
  const mobDd = document.getElementById("mobileSmartDropdown");
  const mobInput = document.getElementById("mobileSmartSearchInput");
  if (mobDd && mobInput && !mobInput.parentElement?.parentElement?.contains(e.target)) {
    mobDd.style.display = "none";
  }
});

function renderOffers() {
  const grid = document.getElementById("offersGrid");
  if (!grid) return;

  updateFavCountUI();

  const query = (document.getElementById("catalogSearchInput")?.value || "").trim().toLowerCase();
  const dealFilter = document.getElementById("catalogDealSelect")?.value || "all";
  const sortMode = document.getElementById("catalogSortSelect")?.value || "match";
  const minVal = Number(document.getElementById("catalogMinEur")?.value) || 0;
  const maxVal = Number(document.getElementById("catalogMaxEur")?.value) || 0;

  const passesBaseFilters = (item) => {
    if (currentCategoryFilter === "favs") {
      if (!favoriteIds.includes(item.id)) return false;
    } else if (currentCategoryFilter !== "all" && item.category !== currentCategoryFilter) {
      return false;
    }
    if (dealFilter !== "all" && item.dealType !== dealFilter) {
      return false;
    }
    if (currentDealModeFilter === "swap" && item.dealType === "sale") {
      return false;
    }
    if (currentDealModeFilter === "buy" && item.dealType !== "sale" && item.dealType !== "either") {
      return false;
    }
    if (currentDealModeFilter === "either" && item.dealType !== "either") {
      return false;
    }
    const itemValInCurrentCurr = getOfferValueInCurrency(item, currentCurrency);
    if (minVal > 0 && itemValInCurrentCurr < minVal) return false;
    if (maxVal > 0 && itemValInCurrentCurr > maxVal) return false;
    return true;
  };

  const baseCandidates = offers.filter(passesBaseFilters);
  let filtered = query
    ? baseCandidates.filter(item => matchesSmartSearchQuery(item, query))
    : [...baseCandidates];

  const sortList = (list) => {
    if (sortMode === "valDesc") {
      list.sort((a, b) => (b.valueEur || 0) - (a.valueEur || 0));
    } else if (sortMode === "valAsc") {
      list.sort((a, b) => (a.valueEur || 0) - (b.valueEur || 0));
    } else if (query) {
      const qTokens = extractSearchTokens(query);
      list.sort((a, b) => {
        const aTitle = tokensMatchQueryWords(extractSearchTokens(`${a.title} ${getOfferLocalized(a).title}`), qTokens, true) ? 1 : 0;
        const bTitle = tokensMatchQueryWords(extractSearchTokens(`${b.title} ${getOfferLocalized(b).title}`), qTokens, true) ? 1 : 0;
        if (bTitle !== aTitle) return bTitle - aTitle;
        return (b.matchScore || 90) - (a.matchScore || 90);
      });
    } else {
      list.sort((a, b) => (b.matchScore || 90) - (a.matchScore || 90));
    }
  };
  sortList(filtered);

  const ui = getSmartUiLabels();

  // Compute AI Smart Recommendations & Swap Matches when a search query is active
  let alternativesList = [];
  let aiRecs = null;
  if (query) {
    aiRecs = buildAiSmartRecommendations(query, filtered, baseCandidates);
    alternativesList = aiRecs.items;
  }

  if (filtered.length === 0 && alternativesList.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; background: #fff; border-radius: 24px; padding: 42px; text-align: center; border: 1px solid var(--line);">
        <h3 style="margin:0 0 8px;">${ui.noFilterMatchTitle}</h3>
        <p style="color:var(--muted);margin:0 0 18px;">${ui.noFilterMatchDesc}</p>
        <button type="button" class="btn btn-mint" onclick="filterByCategory('all'); document.getElementById('catalogSearchInput').value=''; document.getElementById('catalogMinEur').value=''; document.getElementById('catalogMaxEur').value=''; renderOffers();">
          ${ui.resetFiltersBtn}
        </button>
        <button type="button" class="btn btn-dark" style="margin-left:8px;" onclick="openWizardModal()">
          ${t("navPostSwap")}
        </button>
      </div>
    `;
    return;
  }

  const renderCardHtml = (item, extraBadge = null, isWantHighlight = false) => {
    const loc = getOfferLocalized(item);
    const valFormatted = formatOfferPrice(item, currentCurrency);
    const isFav = favoriteIds.includes(item.id);
    const score = item.matchScore || 95;
    const altPillHtml = extraBadge
      ? `<span style="background:${isWantHighlight ? '#a9ffca' : 'rgba(255,255,255,0.94)'};color:var(--forest);font-size:11px;font-weight:800;padding:5px 10px;border-radius:999px;box-shadow:0 4px 12px rgba(0,0,0,0.18);">${extraBadge}</span>`
      : "";

    return `
      <article class="swap-card">
        <div class="swap-card-media" style="background-image:url('${item.image}')">
          <div class="swap-card-badges">
            <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
              <span class="swap-pill-cat">${getCategoryLabel(item.category)}</span>
              ${altPillHtml}
            </div>
            <div style="display:flex;gap:6px;align-items:center;">
              <span class="swap-pill-deal">${getDealTypeLabel(item.dealType)}</span>
              <button type="button" class="swap-fav-btn ${isFav ? 'is-fav' : ''}" style="width:36px;height:36px;border-radius:999px;border:1px solid rgba(255,255,255,0.45);background:${isFav ? 'var(--mint)' : 'rgba(12,44,40,0.78)'};color:${isFav ? 'var(--forest)' : '#ffffff'};backdrop-filter:blur(8px);display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:0;box-shadow:0 4px 14px rgba(0,0,0,0.2);" onclick="toggleFavorite(${item.id}, event)" aria-label="Save favorite">
                ${isFav ? PREMIUM_ICONS.heartFilled : PREMIUM_ICONS.heartOutline}
              </button>
            </div>
          </div>
          <span class="swap-card-match" style="position:absolute;bottom:12px;left:12px;z-index:2;display:inline-flex;align-items:center;gap:4px;">${PREMIUM_ICONS.bolt}${score}% Match</span>
          <span class="swap-card-value">~ ${valFormatted}</span>
        </div>
        <div class="swap-card-body">
          <div class="swap-card-location">
            <span style="display:inline-flex;align-items:center;">${PREMIUM_ICONS.pin}${item.city}, ${item.country}</span>
            <span style="color:var(--forest);">✓ ${item.owner}</span>
          </div>
          <h3>${loc.title}</h3>
          <div class="swap-exchange-box">
            <div class="swap-row">
              <span class="swap-tag have">${t("haveBadge")}</span>
              <span>${item.specs}</span>
            </div>
            <div class="swap-row" style="${isWantHighlight ? 'background:rgba(16,185,129,0.12);border-radius:8px;padding:4px 6px;margin:-2px -6px;' : ''}">
              <span class="swap-tag want" style="${item.dealType === 'sale' ? 'background:#0c2c28;color:#a9ffca;' : ''}">${item.dealType === "sale" ? t("saleBadge") : t("wantBadge")}</span>
              <span style="font-weight:600;color:var(--ink);">${item.dealType === "sale" ? `${t("dealSaleOnly")} · ~${valFormatted}` : loc.want}</span>
            </div>
          </div>
          <div class="swap-card-footer">
            ${item.dealType === "sale" ? `
              <button type="button" class="btn btn-mint" onclick="openOfferModal(${item.id}, 'buy')">
                ${t("buyOfferBtn")}
              </button>
              <button type="button" class="btn btn-login" onclick="openOfferModal(${item.id}, 'details')">
                ${t("detailsBtn")}
              </button>
            ` : `
              <button type="button" class="btn btn-mint" onclick="openOfferModal(${item.id}, 'propose')">
                ${t("proposeSwapBtn")}
              </button>
              <button type="button" class="btn btn-login" onclick="openOfferModal(${item.id}, 'buy')">
                ${t("buyOfferBtn")}
              </button>
            `}
          </div>
        </div>
      </article>
    `;
  };

  let htmlOut = filtered.map(item => renderCardHtml(item)).join("");

  if (query && alternativesList.length > 0 && aiRecs) {
    const chipsBannerHtml = aiRecs.relatedChips.length > 0
      ? `<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:8px;">
          <span style="font-size:12px;font-weight:800;color:var(--forest);">${aiRecs.tryAlso}</span>
          ${aiRecs.relatedChips.map(chip => `<button type="button" style="background:#ffffff;color:var(--forest);border:1px solid rgba(12,44,40,0.25);border-radius:999px;padding:4px 12px;font-size:12px;font-weight:700;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.05);" onclick="executeQuickKeywordSearch('${chip.replace(/'/g, "\\'")}')">${chip}</button>`).join("")}
        </div>`
      : "";

    htmlOut += `
      <div style="grid-column: 1 / -1; margin-top: ${filtered.length > 0 ? '14px' : '0'}; padding: 18px 22px; background: linear-gradient(90deg, rgba(12,44,40,0.06) 0%, rgba(169,255,202,0.22) 100%); border: 1px solid rgba(12,44,40,0.16); border-radius: 18px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
        <div style="max-width:820px;">
          <div style="display:inline-flex;align-items:center;gap:6px;background:var(--forest);color:var(--mint);font-size:11px;font-weight:800;padding:3px 10px;border-radius:999px;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.04em;">
            ${PREMIUM_ICONS.bolt}${aiRecs.aiTag}
          </div>
          <strong style="font-size: 15.5px; color: var(--forest); display: block;">${ui.altSectionTitle} «${query}»</strong>
          <span style="font-size: 13px; color: var(--muted); font-weight: 500; display:block; margin-top:2px;">${aiRecs.aiSubtext}</span>
          ${chipsBannerHtml}
        </div>
        <span style="background: var(--forest); color: var(--mint); font-size: 12px; font-weight: 800; padding: 6px 14px; border-radius: 999px;">+${alternativesList.length} ${ui.altBadge}</span>
      </div>
      ${alternativesList.map(entry => renderCardHtml(entry.item, entry.badgeLabel, entry.altType === "want")).join("")}
    `;
  }

  grid.innerHTML = htmlOut;

  initScrollRevealAnimations();
}

// ============================================================================
// INTERACTIVE LEAFLET WORLD MAP & COUNTRY PANEL
// ============================================================================
function initWorldMap() {
  const mapEl = document.getElementById("worldMap");
  if (!mapEl || typeof window.L === "undefined") return;

  leafletMap = window.L.map(mapEl, {
    scrollWheelZoom: false,
    zoomSnap: 0.5,
    minZoom: 2
  }).setView([47.0, 12.0], 4);

  window.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap",
    maxZoom: 10
  }).addTo(leafletMap);

  renderMapPinsAndPanel();
}

function renderMapPinsAndPanel() {
  const grouped = new Map();
  offers.forEach(o => {
    if (!grouped.has(o.country)) {
      grouped.set(o.country, {
        country: o.country,
        lat: o.lat || (COUNTRY_COORDS[o.country]?.lat ?? 46),
        lng: o.lng || (COUNTRY_COORDS[o.country]?.lng ?? 14),
        items: []
      });
    }
    grouped.get(o.country).items.push(o);
  });

  const countries = Array.from(grouped.values());
  if (!selectedMapCountry && countries.length > 0) {
    selectedMapCountry = countries[0].country;
  }

  const chipsEl = document.getElementById("countryChipsContainer");
  if (chipsEl) {
    chipsEl.innerHTML = countries.map(g => `
      <button type="button" class="country-chip ${g.country === selectedMapCountry ? 'active' : ''}" onclick="selectCountryOnMap('${g.country}')">
        ${g.country} (${g.items.length})
      </button>
    `).join("");
  }

  if (leafletMap) {
    mapMarkers.forEach(m => m.remove());
    mapMarkers = [];

    countries.forEach(g => {
      const isSelected = g.country === selectedMapCountry;
      const icon = window.L.divIcon({
        className: "pin-wrap",
        html: `<span class="pin ${isSelected ? 'active' : ''}"></span>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = window.L.marker([g.lat, g.lng], { icon, title: g.country }).addTo(leafletMap);
      marker.bindTooltip(`${g.country} · ${g.items.length} swaps`, {
        direction: "top",
        offset: [0, -10],
        opacity: 1,
        className: "map-tip"
      });
      marker.on("click", () => selectCountryOnMap(g.country));
      mapMarkers.push(marker);
    });
  }

  const activeGroup = grouped.get(selectedMapCountry);
  const headingEl = document.getElementById("selectedCountryHeading");
  const listEl = document.getElementById("countryOffersList");

  if (activeGroup && listEl) {
    headingEl.innerHTML = `${PREMIUM_ICONS.pin}${activeGroup.country} (${activeGroup.items.length})`;
    listEl.innerHTML = activeGroup.items.map(item => {
      const loc = getOfferLocalized(item);
      return `
        <button type="button" class="offer-list-item" onclick="openOfferModal(${item.id}, 'details')">
          <strong>${loc.title}</strong>
          <span>${getCategoryLabel(item.category)} · ${item.city} · ~${formatOfferPrice(item, currentCurrency)}</span>
          <em>⇄ ${t("wantBadge")}: ${loc.want}</em>
        </button>
      `;
    }).join("");
  }
}

function selectCountryOnMap(countryName) {
  selectedMapCountry = countryName;
  renderMapPinsAndPanel();
  if (leafletMap) {
    const match = offers.find(o => o.country === countryName);
    if (match && match.lat && match.lng) {
      leafletMap.flyTo([match.lat, match.lng], 5, { duration: 0.6 });
    }
  }
}

// ============================================================================
// USER REGISTRATION, LOGIN & INLINE ENROLLMENT HUB
// ============================================================================
function renderUserHeaderState() {
  const guestBtns = document.getElementById("guestAuthButtons");
  const userPill = document.getElementById("userAccountPill");
  const dashHeaderBtn = document.getElementById("headerDashboardBtn");
  const postWizardBtn = document.getElementById("postWizardHeaderBtn");
  const dashLogoutBtn = document.getElementById("dashLogoutBtn");
  const mobileAuthBtn = document.getElementById("mobileAuthBtn");
  const mobileDashBtn = document.getElementById("mobileDashboardBtn");
  const mobileRegBtn = document.getElementById("mobileRegisterBtn");
  if (!guestBtns || !userPill) return;

  const dashSwapsEl = document.getElementById("dashFreeSwapsCount");
  if (dashSwapsEl) {
    dashSwapsEl.textContent = String(currentUser ? (currentUser.freeSwaps ?? 10) : 10);
  }

  if (currentUser) {
    guestBtns.style.display = "none";
    userPill.style.display = "inline-flex";
    if (dashHeaderBtn) dashHeaderBtn.style.display = "none";
    if (postWizardBtn) postWizardBtn.style.display = "inline-flex";
    if (dashLogoutBtn) dashLogoutBtn.style.display = "inline-flex";
    if (mobileDashBtn) mobileDashBtn.style.display = "block";
    if (mobileRegBtn) mobileRegBtn.style.display = "none";
    if (mobileAuthBtn) {
      mobileAuthBtn.textContent = t("dashLogout") + " (" + (currentUser.name.split(" ")[0] || "Account") + ")";
      mobileAuthBtn.onclick = () => { closeMobileMenu(); handleUserLogout(); };
    }
    const initials = (currentUser.name || "U").split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
    userPill.innerHTML = `
      <div class="user-pill" onclick="openDashboardModal('proposals')" title="${t('navMyDashboard')}">
        <span class="user-pill-avatar">${initials}</span>
        <span>${currentUser.name.split(" ")[0]}</span>
        <span class="user-swaps-badge">${currentUser.freeSwaps ?? 10} Swaps</span>
        <button type="button" class="user-logout-btn" onclick="event.stopPropagation(); handleUserLogout();" title="${t('dashLogout')}" aria-label="${t('dashLogout')}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
      </div>
    `;
  } else {
    guestBtns.style.display = "flex";
    userPill.style.display = "none";
    userPill.innerHTML = "";
    if (dashHeaderBtn) dashHeaderBtn.style.display = "none";
    if (postWizardBtn) postWizardBtn.style.display = "none";
    if (dashLogoutBtn) dashLogoutBtn.style.display = "none";
    if (mobileDashBtn) mobileDashBtn.style.display = "none";
    if (mobileRegBtn) mobileRegBtn.style.display = "inline-flex";
    if (mobileAuthBtn) {
      mobileAuthBtn.textContent = t("navLogin");
      mobileAuthBtn.onclick = () => { closeMobileMenu(); openAuthModal("login"); };
    }
  }
}

function handleUserLogout() {
  currentUser = null;
  localStorage.removeItem("ci4m_user");
  renderUserHeaderState();
  closeDashboardModal();
  const logoutMsgMap = {
    en: "✓ Logged out successfully",
    de: "✓ Erfolgreich abgemeldet",
    fr: "✓ Déconnexion réussie",
    it: "✓ Disconnessione effettuata",
    es: "✓ Sesión cerrada correctamente",
    ro: "✓ Te-ai delogat cu succes",
    ru: "✓ Вы успешно вышли из аккаунта"
  };
  showToast(logoutMsgMap[currentLang] || logoutMsgMap.en);
}

function activateUserAccount(userData) {
  const emailKey = String(userData.email || "").trim().toLowerCase();
  const existingAcc = emailKey && accountsDb[emailKey] ? accountsDb[emailKey] : null;
  currentUser = {
    name: userData.name || existingAcc?.name || "Alexandru",
    email: userData.email || existingAcc?.email || "",
    phone: userData.phone || existingAcc?.phone || "",
    country: userData.country || existingAcc?.country || detectedIpInfo.countryName || "Europe",
    prefLang: userData.prefLang || existingAcc?.prefLang || currentLang,
    prefCurrency: userData.prefCurrency || existingAcc?.prefCurrency || currentCurrency,
    freeSwaps: typeof userData.freeSwaps === "number" ? userData.freeSwaps : (typeof existingAcc?.freeSwaps === "number" ? existingAcc.freeSwaps : 10)
  };
  if (emailKey) {
    accountsDb[emailKey] = {
      ...existingAcc,
      ...currentUser,
      password: userData.password || existingAcc?.password || ""
    };
    saveAccountsDb();
  }
  localStorage.setItem("ci4m_user", JSON.stringify(currentUser));
  if (userData.prefLang && window.TRANSLATIONS[userData.prefLang]) {
    setLanguage(userData.prefLang, true);
  }
  if (userData.prefCurrency) {
    setCurrency(userData.prefCurrency, true);
  }
  renderUserHeaderState();

  const counterEl = document.getElementById("liveUserCount");
  if (counterEl) {
    counterEl.textContent = "1,481";
  }
  showToast(`✓ ${currentUser.name} — ${currentUser.freeSwaps} Free Swaps!`);
}

function getAuthMsg() {
  const map = {
    en: { pwdMismatch: "! Passwords do not match!", wrongPwd: "! Incorrect password for this registered email.", codeAutoFill: "Instant code:", clickToFill: "Click to auto-fill", resetSent: "✓ Password reset instructions sent to your email!" },
    de: { pwdMismatch: "! Passwörter stimmen nicht überein!", wrongPwd: "! Falsches Passwort für diese E-Mail.", codeAutoFill: "Sofort-Code:", clickToFill: "Klicken zum Einfügen", resetSent: "✓ Link zum Zurücksetzen des Passworts gesendet!" },
    fr: { pwdMismatch: "! Les mots de passe ne correspondent pas !", wrongPwd: "! Mot de passe incorrect pour cet e-mail.", codeAutoFill: "Code instantané :", clickToFill: "Cliquer pour remplir", resetSent: "✓ Lien de réinitialisation envoyé par e-mail !" },
    it: { pwdMismatch: "! Le password non coincidono!", wrongPwd: "! Password errata per questa email.", codeAutoFill: "Codice istantaneo:", clickToFill: "Clicca per compilare", resetSent: "✓ Link di reimpostazione password inviato!" },
    es: { pwdMismatch: "! ¡Las contraseñas no coinciden!", wrongPwd: "! Contraseña incorrecta para este correo.", codeAutoFill: "Código instantáneo:", clickToFill: "Clic para autocompletar", resetSent: "✓ ¡Enlace de restablecimiento enviado!" },
    ro: { pwdMismatch: "! Parolele nu coincid!", wrongPwd: "! Parolă incorectă pentru acest email înregistrat.", codeAutoFill: "Cod generat instant:", clickToFill: "Click pentru completare automată", resetSent: "✓ Link-ul de resetare a parolei a fost trimis pe email!" },
    ru: { pwdMismatch: "! Пароли не совпадают!", wrongPwd: "! Неверный пароль для этого email.", codeAutoFill: "Мгновенный код:", clickToFill: "Нажмите для автозаполнения", resetSent: "✓ Ссылка для сброса пароля отправлена!" }
  };
  return map[currentLang] || map.en;
}

function handleInlineRegistration(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const pass = String(fd.get("password") || "");
  const confirm = String(fd.get("confirmPassword") || "");
  if (pass !== confirm) {
    showToast(getAuthMsg().pwdMismatch);
    return;
  }
  startEmailVerification({
    name: String(fd.get("name") || "").trim(),
    email: String(fd.get("email") || "").trim(),
    password: pass,
    phone: String(fd.get("phone") || "").trim(),
    country: String(fd.get("country") || detectedIpInfo.countryName || "Romania").trim(),
    prefLang: String(fd.get("prefLang") || currentLang),
    prefCurrency: String(fd.get("prefCurrency") || currentCurrency)
  });
  e.target.reset();
}

function switchEnrollTab(tab) {
  const isAccount = tab === "account";
  const isSignIn = tab === "signin";
  const isQuickPost = tab === "quickpost";
  document.getElementById("tabBtnAccount")?.classList.toggle("active", isAccount);
  document.getElementById("tabBtnSignIn")?.classList.toggle("active", isSignIn);
  document.getElementById("tabBtnQuickPost")?.classList.toggle("active", isQuickPost);
  const accPanel = document.getElementById("enrollAccountPanel");
  const signInPanel = document.getElementById("enrollSignInPanel");
  const quickPanel = document.getElementById("enrollQuickPostPanel");
  if (accPanel) accPanel.style.display = isAccount ? "block" : "none";
  if (signInPanel) signInPanel.style.display = isSignIn ? "block" : "none";
  if (quickPanel) quickPanel.style.display = isQuickPost ? "block" : "none";
}

function onQuickDealTypeChange() {
  const dealSel = document.getElementById("quickDealTypeSelect");
  const wantInput = document.getElementById("quickWantInput");
  const wantLabel = document.getElementById("quickWantLabel");
  if (!dealSel || !wantInput) return;
  if (dealSel.value === "sale") {
    wantInput.required = false;
    if (!wantInput.value) wantInput.value = t("dealSaleOnly");
    if (wantLabel) wantLabel.textContent = `${t("dealSaleOnly")}`;
  } else {
    wantInput.required = true;
    if (wantInput.value === t("dealSaleOnly")) wantInput.value = "";
    if (wantLabel) wantLabel.textContent = t("quickTitleWant");
  }
}

function parseSmartLocationString(rawLoc) {
  const raw = String(rawLoc || "").trim();
  if (!raw) {
    const defCountry = detectedIpInfo?.countryName && COUNTRY_COORDS[detectedIpInfo.countryName] ? detectedIpInfo.countryName : "Romania";
    const defCity = detectedIpInfo?.city || (defCountry === "Romania" ? "Bucharest" : "Munich");
    const c = COUNTRY_COORDS[defCountry] || { lat: 44.4268, lng: 26.1025 };
    return { country: defCountry, city: defCity, lat: c.lat, lng: c.lng };
  }
  const lower = raw.toLowerCase();
  const matchedEuCity = (typeof SMART_EUROPEAN_CITIES !== "undefined" ? SMART_EUROPEAN_CITIES : []).find(c =>
    lower.includes(c.city.toLowerCase())
  );
  if (matchedEuCity) {
    return {
      country: matchedEuCity.country,
      city: matchedEuCity.city,
      lat: matchedEuCity.lat,
      lng: matchedEuCity.lng
    };
  }
  const parts = raw.split(",").map(s => s.trim()).filter(Boolean);
  const countryAliases = {
    "romania": "Romania", "românia": "Romania", "ro": "Romania",
    "germany": "Germany", "deutschland": "Germany", "germania": "Germany", "de": "Germany",
    "austria": "Austria", "österreich": "Austria", "at": "Austria",
    "switzerland": "Switzerland", "schweiz": "Switzerland", "elveția": "Switzerland", "ch": "Switzerland",
    "france": "France", "franța": "France", "fr": "France",
    "italy": "Italy", "italia": "Italy", "it": "Italy",
    "spain": "Spain", "españa": "Spain", "spania": "Spain", "es": "Spain",
    "united kingdom": "United Kingdom", "uk": "United Kingdom", "marea britanie": "United Kingdom",
    "moldova": "Moldova", "republica moldova": "Moldova", "md": "Moldova"
  };
  let detectedCountry = null;
  let detectedCity = null;
  for (const p of parts) {
    const pLow = p.toLowerCase();
    if (COUNTRY_COORDS[p]) {
      detectedCountry = p;
    } else if (countryAliases[pLow]) {
      detectedCountry = countryAliases[pLow];
    } else if (!detectedCity) {
      detectedCity = p;
    }
  }
  if (!detectedCountry) {
    for (const [alias, canonical] of Object.entries(countryAliases)) {
      if (alias.length > 2 && lower.includes(alias)) {
        detectedCountry = canonical;
        break;
      }
    }
  }
  if (!detectedCountry) {
    detectedCountry = detectedIpInfo?.countryName && COUNTRY_COORDS[detectedIpInfo.countryName] ? detectedIpInfo.countryName : "Romania";
  }
  if (!detectedCity) {
    detectedCity = parts[0] || "Center";
  }
  const coords = COUNTRY_COORDS[detectedCountry] || { lat: 46.77, lng: 23.62 };
  return { country: detectedCountry, city: detectedCity, lat: coords.lat, lng: coords.lng };
}

function handleInlineQuickPost(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const parsedLoc = parseSmartLocationString(fd.get("location"));

  const cat = fd.get("category") || "cars";
  const defaultImages = {
    "cars": "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1000&q=80",
    "real-estate": "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1000&q=80",
    "electronics": "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=1000&q=80",
    "home-garden": "https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&w=1000&q=80",
    "auto-parts": "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=1000&q=80",
    "clothing": "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1000&q=80"
  };

  const enteredVal = Number(fd.get("valueEur")) || 15000;
  const enteredCurr = String(fd.get("valueCurrency") || currentCurrency).toUpperCase();
  const normalizedValueEur = convertToEur(enteredVal, enteredCurr);
  const dealType = fd.get("dealType") || "1to1";
  const titleHave = String(fd.get("titleHave") || "").trim();
  const titleWant = String(fd.get("titleWant") || "").trim() || (dealType === "sale" ? t("dealSaleOnly") : "Direct 1:1 Swap");
  const desc = String(fd.get("desc") || "").trim() || "Verified Condition";

  const newOffer = {
    id: Date.now(),
    createdByUser: true,
    ownerEmail: currentUser?.email || "",
    category: cat,
    country: parsedLoc.country,
    city: parsedLoc.city,
    lat: parsedLoc.lat,
    lng: parsedLoc.lng,
    valueEur: normalizedValueEur,
    originalAmount: enteredVal,
    originalCurrency: enteredCurr,
    dealType,
    owner: currentUser ? currentUser.name : "Verified Member",
    verified: true,
    matchScore: 99,
    image: defaultImages[cat] || defaultImages.cars,
    specs: desc,
    title: titleHave,
    want: titleWant,
    desc
  };

  offers.unshift(newOffer);
  saveOffersToStorage();
  currentCategoryFilter = "all";
  currentDealModeFilter = "all";
  const catSearch = document.getElementById("catalogSearchInput");
  if (catSearch) catSearch.value = "";
  renderOffers();
  renderMapPinsAndPanel();
  e.target.reset();
  onQuickPostPriceChange();
  document.getElementById("offers")?.scrollIntoView({ behavior: "smooth" });
  showToast(`✓ ${titleHave} — Live!`);
}

// ============================================================================
// AUTH MODAL (REGISTER / LOGIN)
// ============================================================================
let pendingRegistrationUser = null;
let verifyTimerInterval = null;
let verifySecondsRemaining = 60;
let generatedVerifyCode = "482910";

function openAuthModal(mode = "register") {
  currentAuthMode = mode;
  document.getElementById("authModal").classList.add("open");
  document.body.classList.add("modal-open");
  switchAuthTab(mode);
  syncUrlWithRoute(mode === "login" ? "/login" : "/register");
}

function closeAuthModal() {
  document.getElementById("authModal").classList.remove("open");
  document.body.classList.remove("modal-open");
  if (verifyTimerInterval) {
    clearInterval(verifyTimerInterval);
    verifyTimerInterval = null;
  }
  syncUrlWithRoute(document.body.classList.contains("mobile-started") ? "/start" : "/");
}

function switchAuthTab(mode) {
  currentAuthMode = mode;
  const isReg = mode === "register";
  const isLogin = mode === "login";
  const isVerify = mode === "verify";
  if (document.getElementById("authModal")?.classList.contains("open") && (isReg || isLogin)) {
    syncUrlWithRoute(isLogin ? "/login" : "/register", true);
  }

  document.getElementById("authTabRegisterBtn")?.classList.toggle("active", isReg);
  document.getElementById("authTabLoginBtn")?.classList.toggle("active", isLogin);

  const regForm = document.getElementById("modalRegisterForm");
  const loginForm = document.getElementById("modalLoginForm");
  const verifyForm = document.getElementById("modalVerifyForm");

  if (regForm) regForm.style.display = isReg ? "flex" : "none";
  if (loginForm) loginForm.style.display = isLogin ? "flex" : "none";
  if (verifyForm) verifyForm.style.display = isVerify ? "flex" : "none";

  const titleEl = document.getElementById("authModalTitle");
  if (titleEl) {
    if (isVerify) {
      titleEl.style.display = "none";
    } else {
      titleEl.style.display = "block";
      const key = isReg ? "authCreateHeading" : "authSignInHeading";
      titleEl.setAttribute("data-i18n", key);
      titleEl.textContent = t(key);
    }
  }
}

function renderVerifySentHelper() {
  const statusEl = document.getElementById("verifySentStatus");
  if (!statusEl) return;
  const am = getAuthMsg();
  const targetEmail = pendingRegistrationUser?.email || "email";
  statusEl.innerHTML = `
    <span style="display:block;margin-bottom:8px;">✓ ${t("authCodeSentMsg")} (<strong>${targetEmail}</strong>)</span>
    <button type="button" onclick="autoFillVerificationCode()" style="background:rgba(169,255,202,0.22);border:1px solid #a9ffca;color:#a9ffca;padding:6px 14px;border-radius:999px;font-size:12.5px;font-weight:800;cursor:pointer;">
      ${am.codeAutoFill} ${generatedVerifyCode} · ${am.clickToFill}
    </button>
  `;
}

function autoFillVerificationCode() {
  const codeInput = document.getElementById("verifyCodeInput");
  if (codeInput) {
    codeInput.value = generatedVerifyCode;
    codeInput.focus();
  }
}

function startEmailVerification(userData) {
  pendingRegistrationUser = userData;
  generatedVerifyCode = String(Math.floor(100000 + Math.random() * 900000));
  document.getElementById("authModal").classList.add("open");
  document.body.classList.add("modal-open");
  switchAuthTab("verify");

  const codeInput = document.getElementById("verifyCodeInput");
  if (codeInput) {
    codeInput.value = "";
    setTimeout(() => codeInput.focus(), 80);
  }

  renderVerifySentHelper();
  startVerifyCountdown(60);
  showToast(`✓ ${t("authCodeSentMsg")} (${generatedVerifyCode})`);
}

function startVerifyCountdown(seconds = 60) {
  if (verifyTimerInterval) clearInterval(verifyTimerInterval);
  verifySecondsRemaining = seconds;
  const resendBtn = document.getElementById("verifyResendBtn");
  const resendText = document.getElementById("verifyResendText");

  const updateTick = () => {
    if (!resendBtn || !resendText) return;
    if (verifySecondsRemaining > 0) {
      resendBtn.disabled = true;
      resendText.textContent = `${t("authResendIn")} ${verifySecondsRemaining}s`;
    } else {
      resendBtn.disabled = false;
      resendText.textContent = t("authResendBtn");
      clearInterval(verifyTimerInterval);
      verifyTimerInterval = null;
    }
  };

  updateTick();
  verifyTimerInterval = setInterval(() => {
    verifySecondsRemaining--;
    updateTick();
  }, 1000);
}

function handleResendVerificationCode() {
  generatedVerifyCode = String(Math.floor(100000 + Math.random() * 900000));
  renderVerifySentHelper();
  startVerifyCountdown(60);
  showToast(`✓ ${t("authCodeSentMsg")} (${generatedVerifyCode})`);
}

function handleVerifyEmailCode(e) {
  e.preventDefault();
  const codeInput = document.getElementById("verifyCodeInput");
  const entered = String(codeInput?.value || "").trim();
  if (!/^\d{6}$/.test(entered)) {
    showToast(`! ${t("authVerifyPlaceholder")}`);
    return;
  }
  if (verifyTimerInterval) {
    clearInterval(verifyTimerInterval);
    verifyTimerInterval = null;
  }
  activateUserAccount(pendingRegistrationUser || {
    name: "Verified Member",
    email: "member@changeit4me.com",
    prefLang: currentLang,
    prefCurrency: currentCurrency
  });
  pendingRegistrationUser = null;
  closeAuthModal();
}

function togglePasswordVisibility(inputId, btnEl) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isPwd = input.type === "password";
  input.type = isPwd ? "text" : "password";
  if (btnEl) {
    btnEl.innerHTML = isPwd
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  }
}

function updatePasswordStrength(val, barsContainerId) {
  const container = document.getElementById(barsContainerId);
  if (!container) return;
  const bars = container.querySelectorAll("span");
  let score = 0;
  if (val.length >= 6) score++;
  if (val.length >= 9) score++;
  if (/[A-Z]/.test(val) && /[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val) || val.length >= 12) score++;

  const cls = score <= 1 ? "active-weak" : score === 2 ? "active-fair" : "active-strong";
  bars.forEach((b, idx) => {
    b.className = idx < score ? cls : "";
  });
}

function handleForgotPassword() {
  showToast(getAuthMsg().resetSent);
}

function handleModalRegister(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const pass = String(fd.get("password") || "");
  const confirm = String(fd.get("confirmPassword") || "");
  if (pass !== confirm) {
    showToast(getAuthMsg().pwdMismatch);
    return;
  }
  startEmailVerification({
    name: String(fd.get("name") || "").trim(),
    email: String(fd.get("email") || "").trim(),
    password: pass,
    phone: String(fd.get("phone") || "").trim(),
    country: String(fd.get("country") || detectedIpInfo.countryName || "Romania").trim(),
    prefLang: String(fd.get("prefLang") || currentLang),
    prefCurrency: String(fd.get("prefCurrency") || currentCurrency)
  });
  e.target.reset();
}

function handleModalLogin(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const email = String(fd.get("email") || "member@changeit4me.com").trim();
  const password = String(fd.get("password") || "");
  const emailKey = email.toLowerCase();
  const savedAcc = accountsDb[emailKey];

  if (savedAcc) {
    if (savedAcc.password && password && savedAcc.password !== password) {
      showToast(getAuthMsg().wrongPwd);
      return;
    }
    activateUserAccount(savedAcc);
  } else {
    const rawPrefix = email.split("@")[0].replace(/[._-]+/g, " ").trim();
    const formattedName = rawPrefix
      ? rawPrefix.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
      : "Verified Member";
    activateUserAccount({
      name: formattedName,
      email,
      password,
      prefLang: currentLang,
      prefCurrency: currentCurrency
    });
  }
  e.target.reset();
  closeAuthModal();
}

function handleGoogleAuth() {
  activateUserAccount({
    name: "Google Verified Member",
    email: "verified@gmail.com",
    prefLang: currentLang,
    prefCurrency: currentCurrency
  });
  closeAuthModal();
}

function handleAppleAuth() {
  activateUserAccount({
    name: "Apple ID Verified",
    email: "verified@icloud.com",
    prefLang: currentLang,
    prefCurrency: currentCurrency
  });
  closeAuthModal();
}

// ============================================================================
// 7-STEP SWAP LISTING WIZARD
// ============================================================================
function openWizardModal(stepOverride) {
  if (typeof stepOverride === "number" && stepOverride >= 1 && stepOverride <= 7) {
    wizStep = stepOverride;
  } else if (!wizStep || wizStep < 1 || wizStep > 7) {
    wizStep = 1;
  }
  if (currentUser) {
    if (!wizData.owner) wizData.owner = currentUser.name;
    if (!wizData.email) wizData.email = currentUser.email;
    if (!wizData.phone) wizData.phone = currentUser.phone;
  }
  document.body.classList.add("mobile-started");
  document.getElementById("wizardModal").classList.add("open");
  document.body.classList.add("modal-open");
  renderWizStep();
  syncUrlWithRoute(`/wizard/step-${wizStep}`);
}

function closeWizardModal() {
  saveCurrentWizStepInputs();
  document.getElementById("wizardModal").classList.remove("open");
  document.body.classList.remove("modal-open");
  syncUrlWithRoute(document.body.classList.contains("mobile-started") ? "/start" : "/");
}

function getWizValidationCopy() {
  const map = {
    en: {
      needTitle: "! Please enter the title of what you have (or select a 1-click template below).",
      needValue: "! Please enter the estimated value of your item.",
      needWant: "! Please specify what you want in exchange (or pick a quick chip below).",
      needCity: "! Please enter or select the city for your listing.",
      needOwner: "! Please enter your name so interested partners know who to contact.",
      needContact: "! Please enter your email or phone number for swap proposals.",
      quickTemplatesLabel: "1-Click Quick Templates (auto-fills title, specs & value):",
      pasteUrlPlaceholder: "Or paste an image URL (https://...)",
      autoDescBtn: "+ Generate Smart Description",
      quickCitiesLabel: "Quick Cities in",
      previewHeading: "Live Listing Preview",
      resetWizBtn: "Reset Wizard",
      editModeBadge: "Editing Listing",
      savedToast: "✓ Listing updated successfully!"
    },
    de: {
      needTitle: "! Bitte geben Sie den Titel Ihres Artikels ein (oder wählen Sie eine Vorlage).",
      needValue: "! Bitte geben Sie den geschätzten Wert ein.",
      needWant: "! Bitte geben Sie an, was Sie im Tausch suchen.",
      needCity: "! Bitte geben Sie Ihre Stadt ein oder wählen Sie sie aus.",
      needOwner: "! Bitte geben Sie Ihren Namen ein.",
      needContact: "! Bitte geben Sie Ihre E-Mail-Adresse oder Telefonnummer ein.",
      quickTemplatesLabel: "1-Klick-Schnellvorlagen (füllt Titel, Daten & Preis automatisch):",
      pasteUrlPlaceholder: "Oder Bild-URL einfügen (https://...)",
      autoDescBtn: "+ Smart-Beschreibung generieren",
      quickCitiesLabel: "Schnellauswahl Städte in",
      previewHeading: "Live-Anzeigenvorschau",
      resetWizBtn: "Formular zurücksetzen",
      editModeBadge: "Anzeige bearbeiten",
      savedToast: "✓ Anzeige erfolgreich aktualisiert!"
    },
    fr: {
      needTitle: "! Veuillez saisir le titre de votre bien (ou choisir un modèle rapide).",
      needValue: "! Veuillez indiquer la valeur estimée.",
      needWant: "! Veuillez préciser ce que vous souhaitez en échange.",
      needCity: "! Veuillez saisir ou sélectionner votre ville.",
      needOwner: "! Veuillez indiquer votre nom.",
      needContact: "! Veuillez indiquer votre e-mail ou numéro de téléphone.",
      quickTemplatesLabel: "Modèles rapides en 1 clic (remplit titre, détails et prix) :",
      pasteUrlPlaceholder: "Ou collez l'URL d'une image (https://...)",
      autoDescBtn: "+ Générer une description intelligente",
      quickCitiesLabel: "Villes rapides en",
      previewHeading: "Aperçu de votre annonce",
      resetWizBtn: "Réinitialiser",
      editModeBadge: "Modification de l'annonce",
      savedToast: "✓ Annonce mise à jour avec succès !"
    },
    it: {
      needTitle: "! Inserisci il titolo del tuo bene (o scegli un modello rapido).",
      needValue: "! Inserisci il valore stimato.",
      needWant: "! Specifica cosa cerchi in cambio.",
      needCity: "! Inserisci o seleziona la tua città.",
      needOwner: "! Inserisci il tuo nome.",
      needContact: "! Inserisci la tua email o numero di telefono.",
      quickTemplatesLabel: "Modelli rapidi in 1 clic (compila titolo, specifiche e prezzo):",
      pasteUrlPlaceholder: "Oppure incolla l'URL di un'immagine (https://...)",
      autoDescBtn: "+ Genera descrizione automatica",
      quickCitiesLabel: "Città rapide in",
      previewHeading: "Anteprima dell'annuncio",
      resetWizBtn: "Reimposta modulo",
      editModeBadge: "Modifica annuncio",
      savedToast: "✓ Annuncio aggiornato con successo!"
    },
    es: {
      needTitle: "! Introduce el título de lo que ofreces (o elige una plantilla rápida).",
      needValue: "! Introduce el valor estimado.",
      needWant: "! Especifica qué buscas a cambio.",
      needCity: "! Introduce o selecciona tu ciudad.",
      needOwner: "! Introduce tu nombre.",
      needContact: "! Introduce tu correo o teléfono.",
      quickTemplatesLabel: "Plantillas rápidas en 1 clic (rellena título, detalles y precio):",
      pasteUrlPlaceholder: "O pega la URL de una imagen (https://...)",
      autoDescBtn: "+ Generar descripción automática",
      quickCitiesLabel: "Ciudades rápidas en",
      previewHeading: "Vista previa del anuncio",
      resetWizBtn: "Reiniciar formulario",
      editModeBadge: "Editando anuncio",
      savedToast: "✓ ¡Anuncio actualizado correctamente!"
    },
    ro: {
      needTitle: "! Te rugăm să introduci titlul bunului oferit (sau alege un șablon rapid cu 1 click).",
      needValue: "! Te rugăm să introduci valoarea estimată a bunului.",
      needWant: "! Te rugăm să specifici ce îți dorești la schimb (sau alege o sugestie rapidă).",
      needCity: "! Te rugăm să introduci sau să selectezi orașul.",
      needOwner: "! Te rugăm să introduci numele tău de contact.",
      needContact: "! Te rugăm să introduci adresa de email sau numărul de telefon.",
      quickTemplatesLabel: "Șabloane rapide 1-Click (completează automat titlul, specificațiile și prețul):",
      pasteUrlPlaceholder: "Sau lipește link-ul unei fotografii (https://...)",
      autoDescBtn: "+ Generează descriere automată",
      quickCitiesLabel: "Orașe rapide în",
      previewHeading: "Previzualizare Anunț Live",
      resetWizBtn: "Resetează formularul",
      editModeBadge: "Editare Anunț",
      savedToast: "✓ Anunțul a fost actualizat cu succes!"
    },
    ru: {
      needTitle: "! Пожалуйста, введите название того, что вы предлагаете (или выберите шаблон в 1 клик).",
      needValue: "! Пожалуйста, укажите оценочную стоимость.",
      needWant: "! Пожалуйста, укажите, что вы ищете взамен.",
      needCity: "! Пожалуйста, введите или выберите город.",
      needOwner: "! Пожалуйста, укажите ваше имя.",
      needContact: "! Пожалуйста, укажите email или телефон для связи.",
      quickTemplatesLabel: "Быстрые шаблоны в 1 клик (автозаполнение названия, характеристик и цены):",
      pasteUrlPlaceholder: "Или вставьте ссылку на фото (https://...)",
      autoDescBtn: "+ Сгенерировать описание автоматически",
      quickCitiesLabel: "Быстрый выбор города в",
      previewHeading: "Предпросмотр объявления",
      resetWizBtn: "Сбросить форму",
      editModeBadge: "Редактирование объявления",
      savedToast: "✓ Объявление успешно обновлено!"
    }
  };
  return map[currentLang] || map.en;
}

function highlightInvalidWizInput(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.focus();
  el.style.borderColor = "#dc2626";
  el.style.boxShadow = "0 0 0 3px rgba(220,38,38,0.18)";
  setTimeout(() => {
    el.style.borderColor = "";
    el.style.boxShadow = "";
  }, 2200);
}

function validateWizStep(stepNum) {
  saveCurrentWizStepInputs();
  const vc = getWizValidationCopy();
  if (stepNum === 2) {
    if (!String(wizData.titleHave || "").trim() || String(wizData.titleHave || "").trim().length < 2) {
      highlightInvalidWizInput("wizTitleHave");
      showToast(vc.needTitle);
      return false;
    }
    const amt = Number(wizData.originalAmount) || Number(wizData.valueEur) || 0;
    if (amt <= 0) {
      highlightInvalidWizInput("wizValueEur");
      showToast(vc.needValue);
      return false;
    }
  } else if (stepNum === 5) {
    if (wizData.dealType !== "sale" && !String(wizData.titleWant || "").trim()) {
      highlightInvalidWizInput("wizTitleWant");
      showToast(vc.needWant);
      return false;
    }
  } else if (stepNum === 6) {
    if (!String(wizData.city || "").trim()) {
      const defCityObj = SMART_EUROPEAN_CITIES.find(c => c.country === wizData.country);
      if (defCityObj) {
        wizData.city = defCityObj.city;
        wizData.lat = defCityObj.lat;
        wizData.lng = defCityObj.lng;
      } else {
        highlightInvalidWizInput("wizCity");
        showToast(vc.needCity);
        return false;
      }
    }
  } else if (stepNum === 7) {
    if (!String(wizData.owner || "").trim()) {
      highlightInvalidWizInput("wizOwner");
      showToast(vc.needOwner);
      return false;
    }
    if (!String(wizData.email || "").trim() && !String(wizData.phone || "").trim()) {
      highlightInvalidWizInput("wizEmail");
      showToast(vc.needContact);
      return false;
    }
  }
  return true;
}

function goToWizStep(stepNum) {
  saveCurrentWizStepInputs();
  if (stepNum > wizStep) {
    for (let s = wizStep; s < stepNum; s++) {
      if (!validateWizStep(s)) return;
    }
  }
  wizStep = stepNum;
  renderWizStep();
}

function prevWizStep() {
  if (wizStep > 1) {
    saveCurrentWizStepInputs();
    wizStep--;
    renderWizStep();
  }
}

function nextWizStep() {
  saveCurrentWizStepInputs();
  if (!validateWizStep(wizStep)) return;
  if (wizStep < 7) {
    wizStep++;
    renderWizStep();
  } else {
    publishWizardOffer();
  }
}

function resetWizardDraft() {
  wizStep = 1;
  wizData = { ...DEFAULT_WIZ_DATA };
  if (currentUser) {
    wizData.owner = currentUser.name || "";
    wizData.email = currentUser.email || "";
    wizData.phone = currentUser.phone || "";
  }
  persistWizardDraft();
  renderWizStep();
}

function generateSmartWizDesc() {
  const title = wizData.titleHave || getCategoryLabel(wizData.category);
  const specs = wizData.specs || "Verified condition";
  const want = wizData.titleWant || getDealTypeLabel(wizData.dealType);
  const genMap = {
    en: `${title} (${specs}). Well-maintained, verified owner, ready for inspection and direct ${getDealTypeLabel(wizData.dealType)} (${want}) with 0% platform commission.`,
    de: `${title} (${specs}). Sehr gepflegter Zustand, verifizierter Eigentümer, bereit für Besichtigung und direkten ${getDealTypeLabel(wizData.dealType)} (${want}) mit 0% Provision.`,
    fr: `${title} (${specs}). Très bon état, propriétaire vérifié, disponible pour inspection et ${getDealTypeLabel(wizData.dealType)} (${want}) sans commission.`,
    it: `${title} (${specs}). Condizioni eccellenti, proprietario verificato, disponibile per visione e ${getDealTypeLabel(wizData.dealType)} (${want}) con 0% commissioni.`,
    es: `${title} (${specs}). Excelente estado, propietario verificado, disponible para revisión y ${getDealTypeLabel(wizData.dealType)} (${want}) con 0% comisión.`,
    ro: `${title} (${specs}). Stare impecabilă, proprietar verificat, disponibil pentru vizionare/verificare și ${getDealTypeLabel(wizData.dealType)} (${want}) cu 0% comision.`,
    ru: `${title} (${specs}). Отличное состояние, проверенный владелец, готов к проверке и прямому обмену (${want}) без комиссии.`
  };
  const desc = genMap[currentLang] || genMap.en;
  wizData.desc = desc;
  const descEl = document.getElementById("wizDesc");
  if (descEl) descEl.value = desc;
  persistWizardDraft();
}

function editListingInWizard(offerId) {
  const item = offers.find(o => o.id === offerId);
  if (!item) return;
  const loc = getOfferLocalized(item);
  closeDashboardModal();
  closeOfferModal();
  wizData = {
    editingOfferId: item.id,
    image: item.image || WIZ_CATEGORY_PHOTOS[item.category] || DEFAULT_WIZ_DATA.image,
    category: item.category || "cars",
    titleHave: item.title || loc.title || "",
    valueEur: item.valueEur || 15000,
    originalAmount: item.originalAmount || getOfferValueInCurrency(item, item.originalCurrency || currentCurrency),
    originalCurrency: item.originalCurrency || currentCurrency,
    specs: item.specs || "",
    desc: item.desc || loc.desc || "",
    titleWant: item.want || loc.want || "",
    dealType: item.dealType || "1to1",
    country: item.country || "Romania",
    city: item.city || "Bucharest",
    lat: item.lat,
    lng: item.lng,
    owner: item.owner || (currentUser ? currentUser.name : ""),
    email: item.ownerEmail || (currentUser ? currentUser.email : ""),
    phone: currentUser ? currentUser.phone : ""
  };
  wizStep = 2;
  persistWizardDraft();
  openWizardModal(2);
}

function deleteUserListing(offerId) {
  const idx = offers.findIndex(o => o.id === offerId);
  if (idx >= 0) {
    offers.splice(idx, 1);
  }
  if (!deletedOfferIds.includes(offerId)) {
    deletedOfferIds.push(offerId);
  }
  saveOffersToStorage();
  renderOffers();
  renderMapPinsAndPanel();
  if (document.getElementById("dashboardModal")?.classList.contains("open")) {
    renderDashboardContent();
  }
  showToast("✓ Listing removed");
}

function saveCurrentWizStepInputs() {
  const c = document.getElementById("wizStepContainer");
  if (!c) return;
  const val = (id) => c.querySelector(`#${id}`)?.value;

  if (val("wizTitleHave") !== undefined) wizData.titleHave = val("wizTitleHave");
  if (val("wizValueEur") !== undefined) {
    const rawStr = val("wizValueEur");
    const rawVal = Number(rawStr) || 0;
    const wizCurr = val("wizCurrencySelect") || wizData.originalCurrency || currentCurrency;
    wizData.originalCurrency = wizCurr;
    if (rawVal > 0) {
      wizData.originalAmount = rawVal;
      wizData.valueEur = convertToEur(rawVal, wizCurr);
    }
  }
  if (val("wizSpecs") !== undefined) wizData.specs = val("wizSpecs");
  if (val("wizSpecsPreview") !== undefined) wizData.specs = val("wizSpecsPreview");
  if (val("wizDesc") !== undefined) wizData.desc = val("wizDesc");
  if (val("wizTitleWant") !== undefined) wizData.titleWant = val("wizTitleWant");
  if (val("wizDealType") !== undefined) wizData.dealType = val("wizDealType");
  if (val("wizCountry") !== undefined) wizData.country = val("wizCountry");
  if (val("wizCity") !== undefined) wizData.city = val("wizCity");
  if (val("wizOwner") !== undefined) wizData.owner = val("wizOwner");
  if (val("wizEmail") !== undefined) wizData.email = val("wizEmail");
  if (val("wizPhone") !== undefined) wizData.phone = val("wizPhone");
  persistWizardDraft();
}

function onWizPriceInputChange() {
  const valEl = document.getElementById("wizValueEur");
  const currEl = document.getElementById("wizCurrencySelect");
  const previewEl = document.getElementById("wizParityPreview");
  const labelEl = document.getElementById("wizValueCurrencyLabel");
  const rawVal = Number(valEl?.value) || 0;
  const chosenCurr = currEl?.value || currentCurrency;
  wizData.originalCurrency = chosenCurr;
  wizData.originalAmount = rawVal > 0 ? rawVal : "";
  wizData.valueEur = rawVal > 0 ? convertToEur(rawVal, chosenCurr) : "";
  persistWizardDraft();
  if (labelEl) {
    const cObj = getCurrencyObj(chosenCurr);
    labelEl.textContent = t("quickValueEur").replace(/\(EUR\)|\(LEI\)|\(RON\)|\(USD\)|\(GBP\)|\(CHF\)|\(€\)|\(\$\)|\(£\)/gi, `(${cObj.short || cObj.code})`);
  }
  if (previewEl) {
    previewEl.innerHTML = buildParityPreviewHtml(rawVal, chosenCurr);
  }
}

// ============================================================================
// MEGA-SMART CATEGORY ASSISTANT & LIVE LOCATION GEOCODER FOR WIZARD
// ============================================================================
const SMART_WIZ_CATALOG = {
  "electronics": {
    templates: [
      { title: "Apple iPhone 16 Pro Max 256GB Natural Titanium", specs: "256GB · 8GB RAM · 100% Battery Health · Unlocked · Apple Warranty", eur: 1350 },
      { title: "Apple iPhone 15 Pro Max 512GB Black Titanium", specs: "512GB · Unlocked · 98% Battery · Original Box + Invoice", eur: 1180 },
      { title: "Apple iPad Pro 13\" M4 (512GB OLED) + Magic Keyboard", specs: "512GB Wi-Fi + Cellular · Tandem OLED · Apple Pencil Pro", eur: 1550 },
      { title: "Apple MacBook Pro 16\" M3 Max (64GB RAM / 2TB SSD)", specs: "Apple M3 Max · 64GB RAM · 2TB SSD · 19 Battery Cycles · AppleCare+", eur: 3800 },
      { title: "Apple MacBook Air 15\" M3 (16GB RAM / 512GB SSD)", specs: "Apple M3 · 16GB RAM · 512GB SSD · Midnight · Mint Condition", eur: 1490 },
      { title: "Samsung Galaxy S24 Ultra 512GB Titanium Gray", specs: "512GB · 12GB RAM · S-Pen · Unlocked · 24M Warranty", eur: 1090 },
      { title: "Sony PlayStation 5 Pro 2TB + 2 DualSense Controllers", specs: "2TB SSD · 4K 120Hz · 2x DualSense · Original Box", eur: 780 }
    ],
    groups: [
      { name: "Brand", chips: ["Apple", "Samsung", "Sony", "ASUS ROG", "Lenovo", "DJI", "Xiaomi"] },
      { name: "Storage", chips: ["128GB", "256GB", "512GB", "1TB SSD", "2TB SSD"] },
      { name: "RAM & State", chips: ["8GB RAM", "16GB RAM", "32GB RAM", "64GB RAM", "100% Battery", "Warranty / Invoice", "Unlocked"] }
    ]
  },
  "cars": {
    templates: [
      { title: "2022 BMW X5 M50d xDrive · M-Sport · Panorama", specs: "2022 · 48,000 km · 3.0 Diesel 400 HP · Automatic · xDrive AWD", eur: 68500 },
      { title: "2022 BMW M5 Competition (F90) 625 HP", specs: "2022 · 29,000 km · 4.4 V8 Biturbo · M xDrive · Carbon Roof", eur: 72000 },
      { title: "2023 Mercedes-Benz GLE 400d 4MATIC AMG Line", specs: "2023 · 31,000 km · 330 HP Diesel · 9G-Tronic · Burmester 3D", eur: 76000 },
      { title: "2022 Audi A6 Avant 55 TFSIe Quattro S-Line", specs: "2022 · 41,000 km · 367 HP Plug-in Hybrid · Matrix LED · Quattro", eur: 43500 },
      { title: "2022 Porsche Panamera 4 E-Hybrid Sport Chrono", specs: "2022 · 24,000 km · 462 HP AWD · PDK · Burmester Audio", eur: 89000 },
      { title: "2023 Tesla Model 3 Long Range Dual Motor AWD", specs: "2023 · 22,000 km · 602 km WLTP · Autopilot · Heat Pump", eur: 36800 }
    ],
    groups: [
      { name: "Brand", chips: ["BMW", "Mercedes-Benz", "Audi", "Porsche", "Volkswagen", "Tesla", "Range Rover", "Toyota"] },
      { name: "Year & Km", chips: ["2024", "2023", "2022", "2021", "2020", "< 30,000 km", "60,000 km", "100,000 km"] },
      { name: "Engine & Gearbox", chips: ["Diesel", "Petrol", "Plug-in Hybrid", "100% Electric", "Automatic", "4x4 / AWD", "Full Service History"] }
    ]
  },
  "real-estate": {
    templates: [
      { title: "Modern 3-Room Apartment + Underground Parking", specs: "3 Rooms · 86 m² + 14 m² Terrace · Floor 3/6 · Built 2023 · Parking", eur: 175000 },
      { title: "5-Room Detached Villa with Heated Pool & Garden", specs: "5 Rooms · 220 m² · 600 m² Plot · Heated Pool · Heat Pump", eur: 390000 },
      { title: "Panoramic 4-Room Penthouse with 40 m² Terrace", specs: "4 Rooms · 135 m² + 40 m² Terrace · 2 Parking Spots · Luxury Furnished", eur: 285000 },
      { title: "Central 2-Room Apartment / Studio (Turnkey)", specs: "2 Rooms · 54 m² · Fully Furnished · Metro 3 min", eur: 118000 },
      { title: "Buildable Land Plot with Full Utilities", specs: "850 m² Plot · 24m Frontage · Electricity, Gas, Water, Paved Road", eur: 95000 }
    ],
    groups: [
      { name: "Type", chips: ["Apartment", "House / Villa", "Penthouse", "Studio", "Land Plot", "Commercial Space"] },
      { name: "Rooms & Area", chips: ["2 Rooms", "3 Rooms", "4+ Rooms", "55 m²", "85 m²", "120 m²", "200+ m²"] },
      { name: "Features", chips: ["Underground Parking", "Terrace / Garden", "Luxury Furnished", "New Build", "Central", "Clear Title Deed"] }
    ]
  },
  "home-garden": {
    templates: [
      { title: "Italian Designer 3-Seater Sofa (Velvet / Leather)", specs: "240 x 98 cm · Solid Wood · Mint 10/10 Condition", eur: 2600 },
      { title: "Complete Modular Kitchen + Island & Bosch Appliances", specs: "360 cm · Oven, Induction Hob, Built-in Dishwasher", eur: 6800 }
    ],
    groups: [
      { name: "Details", chips: ["Designer Furniture", "Appliances", "Garden / Patio", "Solar System", "New / Like New"] }
    ]
  },
  "auto-parts": {
    templates: [
      { title: "Set of 4 Forged OEM 21\" Rims + Michelin Pilot Sport Tires", specs: "21 inch · 5x112 OEM · No welds or scratches · 90% Tread", eur: 2900 }
    ],
    groups: [
      { name: "Specs", chips: ["Rims + Tires", "19\"", "20\"", "21\"", "5x112", "5x120", "Original OEM", "Exhaust / Brakes"] }
    ]
  },
  "clothing": {
    templates: [
      { title: "Swiss Automatic Chronograph Watch Full-Set (Box + Papers)", specs: "41mm Steel · Sapphire · Automatic Movement · Authenticity Card", eur: 6500 }
    ],
    groups: [
      { name: "Details", chips: ["Automatic Watch", "Designer Bag", "Full-Set (Box + Papers)", "Unworn 10/10", "Authenticity Verified"] }
    ]
  }
};

const SMART_EUROPEAN_CITIES = [
  { city: "Bucharest", region: "Sector 1 / Herăstrău", country: "Romania", lat: 44.4268, lng: 26.1025 },
  { city: "Cluj-Napoca", region: "Centru / Sopor", country: "Romania", lat: 46.7712, lng: 23.6236 },
  { city: "Timișoara", region: "Timiș", country: "Romania", lat: 45.7489, lng: 21.2087 },
  { city: "Iași", region: "Palas / Copou", country: "Romania", lat: 47.1585, lng: 27.6014 },
  { city: "Brașov", region: "Centru", country: "Romania", lat: 45.6427, lng: 25.5887 },
  { city: "Constanța", region: "Mamaia / Nord", country: "Romania", lat: 44.1598, lng: 28.6348 },
  { city: "Chișinău", region: "Centru / Valea Morilor", country: "Moldova", lat: 47.0105, lng: 28.8638 },
  { city: "Vienna", region: "Innere Stadt / Donaustadt", country: "Austria", lat: 48.2082, lng: 16.3738 },
  { city: "Salzburg", region: "Zentrum", country: "Austria", lat: 47.8095, lng: 13.0550 },
  { city: "Graz", region: "Steiermark", country: "Austria", lat: 47.0707, lng: 15.4395 },
  { city: "Munich", region: "Bavaria", country: "Germany", lat: 48.1351, lng: 11.5820 },
  { city: "Berlin", region: "Mitte / Charlottenburg", country: "Germany", lat: 52.5200, lng: 13.4050 },
  { city: "Frankfurt", region: "Hessen", country: "Germany", lat: 50.1109, lng: 8.6821 },
  { city: "Stuttgart", region: "Baden-Württemberg", country: "Germany", lat: 48.7758, lng: 9.1829 },
  { city: "Zurich", region: "Zürichsee", country: "Switzerland", lat: 47.3769, lng: 8.5417 },
  { city: "Geneva", region: "Genève", country: "Switzerland", lat: 46.2044, lng: 6.1432 },
  { city: "Paris", region: "Île-de-France", country: "France", lat: 48.8566, lng: 2.3522 },
  { city: "Nice", region: "Côte d'Azur", country: "France", lat: 43.7102, lng: 7.2620 },
  { city: "Milan", region: "Lombardia", country: "Italy", lat: 45.4642, lng: 9.1900 },
  { city: "Rome", region: "Lazio", country: "Italy", lat: 41.9028, lng: 12.4964 },
  { city: "Madrid", region: "Comunidad de Madrid", country: "Spain", lat: 40.4168, lng: -3.7038 },
  { city: "Barcelona", region: "Catalunya", country: "Spain", lat: 41.3874, lng: 2.1686 },
  { city: "Marbella", region: "Costa del Sol", country: "Spain", lat: 36.5101, lng: -4.8824 },
  { city: "London", region: "Greater London", country: "United Kingdom", lat: 51.5072, lng: -0.1276 }
];

function applyWizSmartTemplate(idx) {
  const cfg = SMART_WIZ_CATALOG[wizData.category] || SMART_WIZ_CATALOG.electronics;
  const tpl = cfg.templates[idx];
  if (!tpl) return;
  const activeCurr = document.getElementById("wizCurrencySelect")?.value || wizData.originalCurrency || currentCurrency;
  const convertedAmt = convertFromEur(tpl.eur, activeCurr);

  wizData.titleHave = tpl.title;
  wizData.specs = tpl.specs;
  wizData.originalCurrency = activeCurr;
  wizData.originalAmount = convertedAmt;
  wizData.valueEur = tpl.eur;

  const titleEl = document.getElementById("wizTitleHave");
  const specsEl = document.getElementById("wizSpecsPreview");
  const valEl = document.getElementById("wizValueEur");
  const suggEl = document.getElementById("wizTitleSuggestions");
  if (titleEl) titleEl.value = tpl.title;
  if (specsEl) specsEl.value = tpl.specs;
  if (valEl) valEl.value = convertedAmt;
  if (suggEl) suggEl.style.display = "none";
  onWizPriceInputChange();
  showToast(`✓ ${tpl.title}`);
}

function appendWizSmartChip(chipText) {
  const titleEl = document.getElementById("wizTitleHave");
  const specsEl = document.getElementById("wizSpecsPreview");
  const curTitle = String(titleEl ? titleEl.value : wizData.titleHave || "").trim();
  if (!curTitle.toLowerCase().includes(chipText.toLowerCase())) {
    const updated = curTitle ? `${curTitle} · ${chipText}` : chipText;
    wizData.titleHave = updated;
    if (titleEl) titleEl.value = updated;
  }
  const curSpecs = String(specsEl ? specsEl.value : wizData.specs || "").trim();
  if (!curSpecs.toLowerCase().includes(chipText.toLowerCase())) {
    const nextSpecs = curSpecs ? `${curSpecs} · ${chipText}` : chipText;
    wizData.specs = nextSpecs;
    if (specsEl) specsEl.value = nextSpecs;
  }
}

function onWizTitleHaveInput(val) {
  wizData.titleHave = val;
  const suggEl = document.getElementById("wizTitleSuggestions");
  if (!suggEl) return;
  const q = String(val || "").trim().toLowerCase();
  if (q.length < 1) {
    suggEl.style.display = "none";
    return;
  }
  const activeCurr = document.getElementById("wizCurrencySelect")?.value || wizData.originalCurrency || currentCurrency;
  const catKeyActive = wizData.category || "electronics";
  const catCfg = SMART_WIZ_CATALOG[catKeyActive] || SMART_WIZ_CATALOG.electronics;

  const allTemplates = [];
  // Prioritize templates from the selected category first
  (catCfg.templates || []).forEach((tObj, i) => {
    allTemplates.push({ ...tObj, catKey: catKeyActive, idx: i, priority: 1 });
  });
  Object.entries(SMART_WIZ_CATALOG).forEach(([catKey, groupObj]) => {
    if (catKey === catKeyActive) return;
    groupObj.templates.forEach((tObj, i) => {
      allTemplates.push({ ...tObj, catKey, idx: i, priority: 2 });
    });
  });

  let matches = allTemplates.filter(item =>
    `${item.title} ${item.specs} ${item.catKey}`.toLowerCase().includes(q)
  ).slice(0, 4);

  if (matches.length === 0) {
    matches = (catCfg.templates || []).slice(0, 3).map((tObj, i) => ({
      ...tObj,
      catKey: catKeyActive,
      idx: i
    }));
  }

  const allChips = [];
  (catCfg.groups || []).forEach(grp => {
    (grp.chips || []).forEach(ch => allChips.push(ch));
  });
  const matchingChips = allChips.filter(ch => ch.toLowerCase().includes(q));
  const chipsToShow = (matchingChips.length > 0 ? matchingChips : allChips).slice(0, 8);

  const templatesHtml = matches.map(m => {
    const priceStr = formatAmountInCurrentCurrency(convertFromEur(m.eur, activeCurr), activeCurr);
    return `
      <button type="button" class="smart-dd-item" onclick="selectCrossCategoryWizTemplate('${m.catKey}', ${m.idx})">
        <div class="smart-dd-info">
          <strong>${m.title}</strong>
          <span>${m.specs}</span>
        </div>
        <span class="smart-dd-price">~${priceStr}</span>
      </button>
    `;
  }).join("");

  const chipsHtml = chipsToShow.length > 0 ? `
    <div style="padding:8px 10px;background:var(--mint-soft);border-top:1px solid rgba(13,43,34,0.08);display:flex;flex-wrap:wrap;gap:5px;align-items:center;">
      ${chipsToShow.map(ch => `
        <button type="button" class="wiz-chip" onclick="appendWizSmartChip('${ch.replace(/'/g, "\\'")}')">+ ${ch}</button>
      `).join("")}
    </div>
  ` : "";

  suggEl.innerHTML = templatesHtml + chipsHtml;
  suggEl.style.display = "block";
}

function selectCrossCategoryWizTemplate(catKey, idx) {
  wizData.category = catKey;
  applyWizSmartTemplate(idx);
}

let geoSearchTimer = null;
async function handleWizGeoSearchInput(val) {
  const dd = document.getElementById("wizGeoDropdown");
  if (!dd) return;
  const q = String(val || "").trim();
  if (q.length < 2) {
    dd.style.display = "none";
    return;
  }

  // 1. Instant local match from curated European cities
  const localMatches = SMART_EUROPEAN_CITIES.filter(c =>
    `${c.city} ${c.region} ${c.country}`.toLowerCase().includes(q.toLowerCase())
  ).slice(0, 4);

  const renderGeoList = (items) => {
    const ui = getSmartUiLabels();
    if (!items.length) {
      dd.style.display = "none";
      return;
    }
    dd.innerHTML = items.map(loc => `
      <button type="button" class="smart-dd-item" onclick="selectWizGeoPlace('${loc.country.replace(/'/g, "\\'")}', '${loc.city.replace(/'/g, "\\'")}', ${loc.lat}, ${loc.lng})">
        <div class="smart-dd-info">
          <strong>${loc.city}${loc.region ? ` (${loc.region})` : ""}</strong>
          <span>${loc.country} · GPS: ${Number(loc.lat).toFixed(4)}, ${Number(loc.lng).toFixed(4)}</span>
        </div>
        <span class="smart-dd-price">${ui.selectBtn}</span>
      </button>
    `).join("");
    dd.style.display = "block";
  };

  renderGeoList(localMatches);

  // 2. Live OpenStreetMap Photon Geocoding API (Streets, Cities, Postcodes across Europe)
  if (geoSearchTimer) clearTimeout(geoSearchTimer);
  geoSearchTimer = setTimeout(async () => {
    try {
      const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5`);
      if (!res.ok) return;
      const data = await res.json();
      if (data && Array.isArray(data.features) && data.features.length > 0) {
        const apiPlaces = data.features.map(f => {
          const p = f.properties || {};
          const coords = (f.geometry && f.geometry.coordinates) || [11.58, 48.13];
          return {
            city: p.city || p.town || p.name || q,
            region: p.street ? `${p.street} ${p.housenumber || ""}`.trim() : (p.state || p.county || ""),
            country: p.country || wizData.country || "Germany",
            lat: coords[1],
            lng: coords[0]
          };
        });
        const merged = [...localMatches, ...apiPlaces].slice(0, 6);
        renderGeoList(merged);
      }
    } catch (e) {}
  }, 240);
}

function selectWizGeoPlace(country, city, lat, lng) {
  wizData.country = country;
  wizData.city = city;
  wizData.lat = Number(lat);
  wizData.lng = Number(lng);
  const countryEl = document.getElementById("wizCountry");
  const cityEl = document.getElementById("wizCity");
  const searchEl = document.getElementById("wizGeoSearchInput");
  const dd = document.getElementById("wizGeoDropdown");
  const badge = document.getElementById("wizGeoVerifiedBadge");
  if (countryEl) {
    // Add option if country isn't in the static list
    if (!Array.from(countryEl.options).some(o => o.value === country)) {
      const opt = document.createElement("option");
      opt.value = country;
      opt.textContent = country;
      countryEl.appendChild(opt);
    }
    countryEl.value = country;
  }
  if (cityEl) cityEl.value = city;
  if (searchEl) searchEl.value = `${city}, ${country}`;
  if (dd) dd.style.display = "none";
  if (badge) {
    badge.style.display = "block";
    badge.innerHTML = `✓ GPS: <strong>${city}, ${country}</strong> (${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)})`;
  }
}

function detectWizLocationGPS() {
  if (detectedIpInfo && detectedIpInfo.city && detectedIpInfo.countryName) {
    const cCoords = COUNTRY_COORDS[detectedIpInfo.countryName] || { lat: 47.0, lng: 14.0 };
    selectWizGeoPlace(detectedIpInfo.countryName, detectedIpInfo.city, cCoords.lat, cCoords.lng);
    showToast(`✓ GPS: ${detectedIpInfo.city}, ${detectedIpInfo.countryName}`);
    return;
  }
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      try {
        const res = await fetch(`https://photon.komoot.io/reverse?lon=${longitude}&lat=${latitude}`);
        const data = await res.json();
        const p = data?.features?.[0]?.properties || {};
        selectWizGeoPlace(p.country || "Austria", p.city || p.town || p.name || "Center", latitude, longitude);
        showToast("✓ GPS Location Detected!");
      } catch (e) {
        selectWizGeoPlace(wizData.country || "Austria", wizData.city || "Vienna", latitude, longitude);
      }
    }, () => {
      selectWizGeoPlace("Austria", "Vienna", 48.2082, 16.3738);
      showToast("✓ Location Selected!");
    });
  }
}

function onQuickPostPriceChange() {
  const valEl = document.getElementById("quickPostValueInput");
  const currEl = document.getElementById("quickPostCurrencySelect");
  const previewEl = document.getElementById("quickParityPreview");
  const rawVal = Number(valEl?.value) || 0;
  const chosenCurr = currEl?.value || currentCurrency;
  if (previewEl) {
    previewEl.innerHTML = buildParityPreviewHtml(rawVal, chosenCurr);
  }
}

function selectWizPresetPhoto(url) {
  wizData.image = url;
  renderWizStep();
}

function handleWizImageUrlInput(val) {
  const cleanUrl = String(val || "").trim();
  if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) {
    wizData.image = cleanUrl;
    const b = document.getElementById("wizPhotoPreviewBox");
    if (b) b.style.backgroundImage = `url('${cleanUrl}')`;
    persistWizardDraft();
  }
}

function handleWizFileUpload(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    wizData.image = ev.target.result;
    renderWizStep();
  };
  reader.readAsDataURL(file);
}

const WIZ_CATEGORY_PHOTOS = {
  "cars": "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1000&q=80",
  "real-estate": "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1000&q=80",
  "electronics": "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=1000&q=80",
  "home-garden": "https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&w=1000&q=80",
  "auto-parts": "https://images.unsplash.com/photo-1600706432502-77a0e2e32795?auto=format&fit=crop&w=1000&q=80",
  "clothing": "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=1000&q=80"
};

function selectWizCategoryCard(cat) {
  wizData.category = cat;
  if (WIZ_CATEGORY_PHOTOS[cat]) {
    wizData.image = WIZ_CATEGORY_PHOTOS[cat];
  }
  wizStep = 2;
  renderWizStep();
}

function renderWizStep() {
  const uiTop = getSmartUiLabels();
  const vc = getWizValidationCopy();
  document.getElementById("wizMeterBar").style.width = `${(wizStep / 7) * 100}%`;
  document.getElementById("wizStepCounter").textContent = `${uiTop.stepWord} ${wizStep} / 7${wizData.editingOfferId ? ` · ${vc.editModeBadge}` : ""}`;
  document.getElementById("wizPrevBtn").style.visibility = wizStep === 1 ? "hidden" : "visible";
  document.getElementById("wizPrevBtn").textContent = t("mobileBackBtn");
  document.getElementById("wizNextBtn").textContent = wizStep === 7 ? uiTop.publishBtn : uiTop.nextStepBtn;

  const stepBtns = document.querySelectorAll("#wizStepsBar .wiz-step-btn");
  stepBtns.forEach((btn, idx) => {
    const s = idx + 1;
    btn.classList.toggle("active", s === wizStep);
    btn.classList.toggle("done", s < wizStep);
  });

  const c = document.getElementById("wizStepContainer");
  if (wizStep === 1) {
    const cats = ["cars", "real-estate", "electronics", "home-garden", "auto-parts", "clothing"];
    c.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 14px;flex-wrap:wrap;">
        <h3 style="margin:0;font-size:24px;">1. ${t("wizStep2")}</h3>
        ${(wizData.titleHave || wizData.editingOfferId) ? `<button type="button" class="wiz-chip" onclick="resetWizardDraft()">↺ ${vc.resetWizBtn}</button>` : ""}
      </div>
      <div class="wiz-cat-grid">
        ${cats.map(cat => `
          <div class="wiz-cat-card ${wizData.category === cat ? 'selected' : ''}" onclick="selectWizCategoryCard('${cat}')">
            <div class="wiz-cat-icon">${PREMIUM_ICONS[cat] || PREMIUM_ICONS.cars}</div>
            <div>${getCategoryLabel(cat)}</div>
          </div>
        `).join("")}
      </div>
    `;
  } else if (wizStep === 2) {
    const activeWizCurr = wizData.originalCurrency || currentCurrency || "EUR";
    const cObj = getCurrencyObj(activeWizCurr);
    const valLabel = t("quickValueEur").replace(/\(EUR\)|\(LEI\)|\(RON\)|\(MDL\)|\(RUB\)|\(USD\)|\(GBP\)|\(CHF\)|\(€\)|\(\$\)|\(£\)/gi, `(${cObj.short || cObj.code})`);
    const displayVal = wizData.originalAmount !== "" && wizData.originalAmount !== undefined
      ? wizData.originalAmount
      : (wizData.valueEur ? convertFromEur(wizData.valueEur, activeWizCurr) : "");
    const ui = getSmartUiLabels();
    const catCfg = SMART_WIZ_CATALOG[wizData.category] || SMART_WIZ_CATALOG.cars;
    const quickTemplates = (catCfg.templates || []).slice(0, 4);
    c.innerHTML = `
      <h3 style="margin:0 0 10px;font-size:22px;">2. ${t("wizStep3")} (${t("haveBadge")})</h3>

      <div style="margin-bottom:12px;padding:10px 12px;background:var(--mint-soft);border:1px solid rgba(12,44,40,0.12);border-radius:14px;">
        <span style="display:block;font-size:11.5px;font-weight:800;color:var(--forest);margin-bottom:6px;">${vc.quickTemplatesLabel}</span>
        <div class="wiz-chip-row">
          ${quickTemplates.map((tpl, idx) => `
            <button type="button" class="wiz-chip wiz-chip-tpl" onclick="applyWizSmartTemplate(${idx})">+ ${tpl.title.split("·")[0].trim()}</button>
          `).join("")}
        </div>
      </div>

      <div class="field-group" style="position:relative;">
        <label style="color:var(--ink);">${t("quickTitleHave")}</label>
        <input type="text" id="wizTitleHave" class="input-light" placeholder="${ui.titlePlaceholder}" value="${wizData.titleHave}" autocomplete="off" oninput="onWizTitleHaveInput(this.value)" />
        <div id="wizTitleSuggestions" class="wiz-autocomplete-list" style="display:none;"></div>
      </div>

      <div class="field-group">
        <label style="color:var(--ink);">${ui.specsLabel}</label>
        <input type="text" id="wizSpecsPreview" class="input-light" placeholder="${ui.specsPlaceholder}" value="${wizData.specs || ''}" onfocus="const s=document.getElementById('wizTitleSuggestions');if(s)s.style.display='none';" oninput="wizData.specs = this.value" />
      </div>

      <div class="field-group">
        <label id="wizValueCurrencyLabel" style="color:var(--ink);">${valLabel}</label>
        <div style="display:grid;grid-template-columns:1fr 145px;gap:10px;">
          <input type="number" id="wizValueEur" class="input-light" value="${displayVal}" min="1" placeholder="1150" onfocus="const s=document.getElementById('wizTitleSuggestions');if(s)s.style.display='none';" oninput="onWizPriceInputChange()" />
          <select id="wizCurrencySelect" class="input-light" onchange="onWizPriceInputChange()">
            ${(window.CURRENCIES || []).map(curr => `<option value="${curr.code}" ${curr.code === activeWizCurr ? 'selected' : ''}>${curr.code} (${curr.symbol})</option>`).join("")}
          </select>
        </div>
        <div id="wizParityPreview">${buildParityPreviewHtml(displayVal, activeWizCurr)}</div>
      </div>
    `;
  } else if (wizStep === 3) {
    const ui = getSmartUiLabels();
    const presets = [
      WIZ_CATEGORY_PHOTOS[wizData.category] || WIZ_CATEGORY_PHOTOS["cars"],
      WIZ_CATEGORY_PHOTOS["cars"],
      WIZ_CATEGORY_PHOTOS["real-estate"],
      WIZ_CATEGORY_PHOTOS["electronics"],
      WIZ_CATEGORY_PHOTOS["home-garden"],
      WIZ_CATEGORY_PHOTOS["clothing"]
    ].filter((v, i, a) => a.indexOf(v) === i);
    c.innerHTML = `
      <h3 style="margin:0 0 8px;font-size:24px;">3. ${t("wizStep1")}</h3>
      <p style="color:var(--muted);margin:0 0 14px;">${ui.uploadPhotoDesc}</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:center;">
        <label style="border:2px dashed var(--forest);background:var(--mint-soft);border-radius:20px;padding:26px;text-align:center;cursor:pointer;display:flex;flex-direction:column;gap:8px;align-items:center;">
          <strong style="color:var(--forest);">${ui.uploadPhotoTitle}</strong>
          <span style="font-size:13px;color:var(--muted);">${ui.uploadPhotoSub}</span>
          <input type="file" accept="image/*" style="display:none;" onchange="handleWizFileUpload(event)" />
        </label>
        <div id="wizPhotoPreviewBox" style="height:160px;border-radius:20px;background:url('${wizData.image}') 50%/cover no-repeat;border:2px solid var(--forest);"></div>
      </div>
      <div class="field-group" style="margin-top:12px;margin-bottom:8px;">
        <input type="url" id="wizImageUrlInput" class="input-light" placeholder="${vc.pasteUrlPlaceholder}" value="${wizData.image.startsWith('http') ? wizData.image : ''}" oninput="handleWizImageUrlInput(this.value)" />
      </div>
      <p style="font-size:13px;font-weight:700;margin:10px 0 8px;color:var(--muted);">${ui.samplePhotoLabel}</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        ${presets.map(u => `
          <img src="${u}" onclick="selectWizPresetPhoto('${u}')" style="width:90px;height:64px;object-fit:cover;border-radius:12px;cursor:pointer;border:3px solid ${wizData.image === u ? 'var(--forest)' : 'transparent'};" alt="Preset" />
        `).join("")}
      </div>
    `;
  } else if (wizStep === 4) {
    const ui = getSmartUiLabels();
    const specChipsMap = {
      en: ["Warranty / Invoice", "Original Box", "Full Service History", "Accident-Free", "Verified Owner"],
      de: ["Garantie / Rechnung", "Originalverpackung", "Scheckheftgepflegt", "Unfallfrei", "Geprüfter Eigentümer"],
      fr: ["Garantie / Facture", "Boîte d'origine", "Carnet d'entretien complet", "Sans accident", "Propriétaire vérifié"],
      it: ["Garanzia / Fattura", "Scatola originale", "Cronologia tagliandi", "Mai incidentata", "Proprietario verificato"],
      es: ["Garantía / Factura", "Caja original", "Historial de mantenimiento", "Sin accidentes", "Propietario verificado"],
      ro: ["Garanție / Factură", "Cutie originală", "Istoric complet service", "Fără accident", "Proprietar verificat"],
      ru: ["Гарантия / Чек", "Оригинальная коробка", "Полная сервисная история", "Без ДТП", "Проверенный владелец"]
    };
    const specChips = specChipsMap[currentLang] || specChipsMap.en;
    c.innerHTML = `
      <h3 style="margin:0 0 14px;font-size:24px;">4. ${t("wizStep4")}</h3>
      <div class="field-group">
        <label style="color:var(--ink);">${ui.specsLabel}</label>
        <input type="text" id="wizSpecs" class="input-light" value="${wizData.specs}" oninput="wizData.specs = this.value" />
        <div class="wiz-chip-row" style="margin-top:8px;">
          ${specChips.map(chip => `
            <button type="button" class="wiz-chip" onclick="document.getElementById('wizSpecs').value += (document.getElementById('wizSpecs').value ? ' · ' : '') + '${chip.replace(/'/g, "\\'")}'; wizData.specs = document.getElementById('wizSpecs').value; persistWizardDraft();">+ ${chip}</button>
          `).join("")}
        </div>
      </div>
      <div class="field-group">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;flex-wrap:wrap;">
          <label style="color:var(--ink);margin:0;">${t("quickDescription")}</label>
          <button type="button" class="wiz-chip wiz-chip-tpl" onclick="generateSmartWizDesc()">${vc.autoDescBtn}</button>
        </div>
        <textarea id="wizDesc" class="input-light" rows="3" oninput="wizData.desc = this.value">${wizData.desc}</textarea>
      </div>
    `;
  } else if (wizStep === 5) {
    const isSaleOnly = wizData.dealType === "sale";
    const ui = getSmartUiLabels();
    c.innerHTML = `
      <h3 style="margin:0 0 14px;font-size:24px;">5. ${t("wizStep5")} (${isSaleOnly ? t("saleBadge") : t("wantBadge")})</h3>
      <div class="field-group">
        <label style="color:var(--ink);">${t("quickDealType")}</label>
        <select id="wizDealType" class="input-light" onchange="wizData.dealType=this.value; if(this.value==='sale' && !wizData.titleWant){wizData.titleWant=t('dealSaleOnly');} renderWizStep();">
          <option value="1to1" ${wizData.dealType === '1to1' ? 'selected' : ''}>${t("deal1to1")}</option>
          <option value="cash" ${wizData.dealType === 'cash' ? 'selected' : ''}>${t("dealCashAdd")}</option>
          <option value="either" ${wizData.dealType === 'either' ? 'selected' : ''}>${t("dealSwapOrSale")}</option>
          <option value="sale" ${wizData.dealType === 'sale' ? 'selected' : ''}>${t("dealSaleOnly")}</option>
        </select>
      </div>
      <div class="field-group">
        <label style="color:var(--ink);">${isSaleOnly ? `${t("dealSaleOnly")}` : t("quickTitleWant")}</label>
        <input type="text" id="wizTitleWant" class="input-light" value="${wizData.titleWant || (isSaleOnly ? t('dealSaleOnly') : '')}" placeholder="${ui.titlePlaceholder}" oninput="wizData.titleWant = this.value" />
        <div class="wiz-chip-row" style="margin-top:8px;">
          <button type="button" class="wiz-chip" onclick="document.getElementById('wizTitleWant').value='iPhone 16 Pro Max / iPad Pro M4 / MacBook Pro'; wizData.titleWant=document.getElementById('wizTitleWant').value; persistWizardDraft();">iPhone / iPad / MacBook</button>
          <button type="button" class="wiz-chip" onclick="document.getElementById('wizTitleWant').value='SUV 2020+ (BMW X5, Mercedes GLE, Audi Q7)'; wizData.titleWant=document.getElementById('wizTitleWant').value; persistWizardDraft();">${t("qtagCar")}</button>
          <button type="button" class="wiz-chip" onclick="document.getElementById('wizTitleWant').value='${t("qtagApartment")} / ${t("qtagHouse")}'; wizData.titleWant=document.getElementById('wizTitleWant').value; persistWizardDraft();">${t("qtagApartment")} / ${t("qtagHouse")}</button>
          <button type="button" class="wiz-chip" onclick="document.getElementById('wizTitleWant').value='${t("dealSwapOrSale")}'; wizData.titleWant=document.getElementById('wizTitleWant').value; persistWizardDraft();">${t("dealSwapOrSale")}</button>
        </div>
      </div>
    `;
  } else if (wizStep === 6) {
    const ui = getSmartUiLabels();
    const countryCities = SMART_EUROPEAN_CITIES.filter(cObj => cObj.country === wizData.country);
    const citiesToRender = countryCities.length > 0 ? countryCities : SMART_EUROPEAN_CITIES.slice(0, 6);
    c.innerHTML = `
      <h3 style="margin:0 0 10px;font-size:22px;">6. ${t("wizStep6")} · GPS & Map</h3>
      <div class="wiz-smart-box" style="margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px;">
          <strong style="font-size:13px;color:var(--forest);">${ui.geoTitle}</strong>
          <button type="button" id="wizGpsBtn" class="wiz-chip wiz-chip-tpl" onclick="detectWizLocationGPS()">${ui.gpsBtn}</button>
        </div>
        <div style="position:relative;">
          <input type="text" id="wizGeoSearchInput" class="input-light" placeholder="${ui.geoPlaceholder}" autocomplete="off" oninput="handleWizGeoSearchInput(this.value)" />
          <div id="wizGeoDropdown" class="wiz-autocomplete-list" style="display:none;"></div>
        </div>
        <div id="wizGeoVerifiedBadge" style="display:${wizData.lat ? 'block' : 'none'};margin-top:8px;padding:8px 12px;border-radius:10px;background:#ecfdf5;border:1px solid #10b981;color:#065f46;font-size:12.5px;font-weight:700;">
          ${wizData.lat ? `✓ GPS: ${wizData.city}, ${wizData.country} (${Number(wizData.lat).toFixed(4)}, ${Number(wizData.lng).toFixed(4)})` : ''}
        </div>
      </div>
      <div class="form-grid-2">
        <div class="field-group">
          <label style="color:var(--ink);">${ui.countryLabel}</label>
          <select id="wizCountry" class="input-light" onchange="wizData.country=this.value; renderWizStep();">
            ${Object.keys(COUNTRY_COORDS).map(cnt => `<option value="${cnt}" ${wizData.country === cnt ? 'selected' : ''}>${cnt}</option>`).join("")}
          </select>
        </div>
        <div class="field-group">
          <label style="color:var(--ink);">${ui.cityLabel}</label>
          <input type="text" id="wizCity" class="input-light" value="${wizData.city}" placeholder="Bucharest / Cluj-Napoca / Munich / Vienna" oninput="wizData.city=this.value" />
        </div>
      </div>
      <div style="margin-top:4px;">
        <span style="display:block;font-size:11.5px;font-weight:800;color:var(--muted);margin-bottom:6px;">${vc.quickCitiesLabel} ${wizData.country}:</span>
        <div class="wiz-chip-row">
          ${citiesToRender.map(ct => `
            <button type="button" class="wiz-chip" onclick="selectWizGeoPlace('${ct.country.replace(/'/g, "\\'")}', '${ct.city.replace(/'/g, "\\'")}', ${ct.lat}, ${ct.lng})">${PREMIUM_ICONS.pin}${ct.city}</button>
          `).join("")}
        </div>
      </div>
    `;
  } else if (wizStep === 7) {
    const activeCurr = wizData.originalCurrency || currentCurrency;
    const rawAmt = Number(wizData.originalAmount) || convertFromEur(wizData.valueEur || 15000, activeCurr);
    const previewPrice = formatAmountInCurrentCurrency(rawAmt, activeCurr);
    c.innerHTML = `
      <h3 style="margin:0 0 12px;font-size:22px;">7. ${t("wizStep7")}</h3>
      <div class="field-group">
        <label style="color:var(--ink);">${t("formFullName")}</label>
        <input type="text" id="wizOwner" class="input-light" value="${wizData.owner || (currentUser ? currentUser.name : '')}" oninput="wizData.owner = this.value" />
      </div>
      <div class="form-grid-2">
        <div class="field-group">
          <label style="color:var(--ink);">${t("formEmail")}</label>
          <input type="email" id="wizEmail" class="input-light" value="${wizData.email || (currentUser ? currentUser.email : '')}" oninput="wizData.email = this.value" />
        </div>
        <div class="field-group">
          <label style="color:var(--ink);">${t("formPhone")}</label>
          <input type="tel" id="wizPhone" class="input-light" value="${wizData.phone || (currentUser ? currentUser.phone : '')}" placeholder="+40 / +49 / +43..." oninput="wizData.phone = this.value" />
        </div>
      </div>

      <div style="margin-top:12px;padding:12px 14px;background:var(--mint-soft);border:1.5px solid var(--forest);border-radius:16px;display:flex;align-items:center;gap:14px;">
        <img src="${wizData.image}" style="width:84px;height:64px;object-fit:cover;border-radius:12px;border:1px solid rgba(12,44,40,0.2);flex-shrink:0;" alt="" />
        <div style="min-width:0;flex:1;">
          <div style="font-size:11px;font-weight:800;text-transform:uppercase;color:var(--forest);">${vc.previewHeading} · ${getCategoryLabel(wizData.category)} · ~${previewPrice}</div>
          <strong style="display:block;font-size:15px;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${wizData.titleHave || "—"}</strong>
          <div style="font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${PREMIUM_ICONS.pin}${wizData.city || "—"}, ${wizData.country} · ${t("wantBadge")}: ${wizData.titleWant || getDealTypeLabel(wizData.dealType)}
          </div>
        </div>
      </div>
    `;
  }

  c.oninput = () => {
    saveCurrentWizStepInputs();
  };
  c.onchange = () => {
    saveCurrentWizStepInputs();
  };
  persistWizardDraft();
  if (document.getElementById("wizardModal")?.classList.contains("open")) {
    syncUrlWithRoute(`/wizard/step-${wizStep}`);
  }
}

function publishWizardOffer() {
  saveCurrentWizStepInputs();
  if (!validateWizStep(7)) return;
  const fallbackCoords = COUNTRY_COORDS[wizData.country] || { lat: 48.13, lng: 11.58 };
  const finalLat = wizData.lat || fallbackCoords.lat;
  const finalLng = wizData.lng || fallbackCoords.lng;
  const chosenCurr = wizData.originalCurrency || currentCurrency;
  const chosenAmt = Number(wizData.originalAmount) || convertFromEur(20000, chosenCurr);
  const exactEur = convertToEur(chosenAmt, chosenCurr);
  const isEditing = Boolean(wizData.editingOfferId);
  const offerPayload = {
    id: isEditing ? wizData.editingOfferId : Date.now(),
    createdByUser: true,
    ownerEmail: wizData.email || currentUser?.email || "",
    category: wizData.category,
    country: wizData.country,
    city: wizData.city || "Bucharest",
    lat: finalLat,
    lng: finalLng,
    valueEur: exactEur,
    originalAmount: chosenAmt,
    originalCurrency: chosenCurr,
    dealType: wizData.dealType || "1to1",
    owner: wizData.owner || (currentUser ? currentUser.name : "Verified Owner"),
    verified: true,
    matchScore: 99,
    image: wizData.image,
    specs: wizData.specs || "Verified Condition",
    title: wizData.titleHave || "New Swap Listing",
    want: wizData.titleWant || (wizData.dealType === "sale" ? t("dealSaleOnly") : "Direct 1:1 Swap"),
    desc: wizData.desc || `${wizData.titleHave} (${wizData.specs || "Verified"}).`
  };

  if (isEditing) {
    const idx = offers.findIndex(o => o.id === wizData.editingOfferId);
    if (idx >= 0) {
      offers[idx] = { ...offers[idx], ...offerPayload, i18n: undefined };
    } else {
      offers.unshift(offerPayload);
    }
  } else {
    offers.unshift(offerPayload);
  }

  saveOffersToStorage();
  wizStep = 1;
  wizData = { ...DEFAULT_WIZ_DATA };
  persistWizardDraft();
  closeWizardModal();
  currentCategoryFilter = "all";
  currentDealModeFilter = "all";
  const catSearch = document.getElementById("catalogSearchInput");
  if (catSearch) catSearch.value = "";
  renderOffers();
  renderMapPinsAndPanel();
  syncUrlWithRoute("/offers");
  document.getElementById("offers")?.scrollIntoView({ behavior: "smooth" });
  showToast(isEditing ? getWizValidationCopy().savedToast : `✓ ${offerPayload.title} — Live!`);
}

// ============================================================================
// OFFER DETAIL, 1:1 VALUE CALCULATOR & "PROPOSE A SWAP" MODAL
// ============================================================================
function updateSwapValueCalculator(offerId) {
  const item = offers.find(o => o.id === offerId);
  if (!item) return;
  const myVal = Number(document.getElementById("calcMyValueInput")?.value) || 0;
  const myCurr = document.getElementById("calcMyCurrencySelect")?.value || currentCurrency;
  const resEl = document.getElementById("calcResultBanner");
  if (!resEl) return;

  const theirValueInCurrentCurrency = getOfferValueInCurrency(item, currentCurrency);
  const myValueInCurrentCurrency = convertBetweenCurrencies(myVal, myCurr, currentCurrency);

  const cObj = getCurrencyObj(currentCurrency);
  const threshold = Math.round(250 * cObj.rateFromEur);
  const diff = theirValueInCurrentCurrency - myValueInCurrentCurrency;
  if (Math.abs(diff) < threshold) {
    resEl.innerHTML = `<span>⇄ ${t("calcEven")}</span><span>${formatAmountInCurrentCurrency(0, currentCurrency)}</span>`;
  } else if (diff > 0) {
    resEl.innerHTML = `<span>${t("calcYouAdd")}</span><span>+ ${formatAmountInCurrentCurrency(diff, currentCurrency)}</span>`;
  } else {
    resEl.innerHTML = `<span>${t("calcTheyAdd")}</span><span>+ ${formatAmountInCurrentCurrency(Math.abs(diff), currentCurrency)}</span>`;
  }
}

function switchOfferActionTab(tab) {
  const isBuy = tab === "buy";
  const swapBtn = document.getElementById("offerTabSwapBtn");
  const buyBtn = document.getElementById("offerTabBuyBtn");
  const swapPanel = document.getElementById("offerActionSwapPanel");
  const buyPanel = document.getElementById("offerActionBuyPanel");
  if (swapBtn) swapBtn.classList.toggle("active", !isBuy);
  if (buyBtn) buyBtn.classList.toggle("active", isBuy);
  if (swapPanel) swapPanel.style.display = isBuy ? "none" : "block";
  if (buyPanel) buyPanel.style.display = isBuy ? "block" : "none";
}

function onBuyOfferPriceChange(offerId) {
  const valEl = document.getElementById("buyOfferAmountInput");
  const currEl = document.getElementById("buyOfferCurrencySelect");
  const previewEl = document.getElementById("buyOfferParityPreview");
  const rawVal = Number(valEl?.value) || 0;
  const chosenCurr = currEl?.value || currentCurrency;
  if (previewEl) {
    previewEl.innerHTML = buildParityPreviewHtml(rawVal, chosenCurr);
  }
}

function submitDirectBuyOffer(e, offerId) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const item = offers.find(o => o.id === offerId);
  const loc = item ? getOfferLocalized(item) : { title: "Listing" };
  const amount = Number(fd.get("buyAmount")) || 0;
  const curr = String(fd.get("buyCurrency") || currentCurrency).toUpperCase();
  const formattedOffer = formatAmountInCurrentCurrency(amount, curr);
  const payMethod = String(fd.get("paymentMethod") || "Direct Purchase");

  swapProposals.unshift({
    id: Date.now(),
    direction: "Buy Offer",
    offerId,
    targetTitle: loc.title,
    offeredItem: `Cash Offer: ${formattedOffer}`,
    partner: item ? `${item.owner} (${item.city}, ${item.country})` : "Owner",
    cashBalance: `${payMethod} · Listed at ~${item ? formatOfferPrice(item, curr) : formattedOffer}`,
    status: "Sent · Awaiting Seller Confirmation"
  });
  localStorage.setItem("ci4m_proposals", JSON.stringify(swapProposals));
  updateFavCountUI();
  closeOfferModal();
  showToast(`✓ Cash Purchase Offer (${formattedOffer}) sent to ${item ? item.owner : "Seller"}!`);
}

function openOfferModal(offerId, mode = "details") {
  const item = offers.find(o => o.id === offerId);
  if (!item) return;
  currentOpenOfferId = offerId;
  const loc = getOfferLocalized(item);
  const valFormatted = formatOfferPrice(item, currentCurrency);
  const cObj = getCurrencyObj(currentCurrency);
  const theirValConverted = getOfferValueInCurrency(item, currentCurrency);
  const origCurr = String(item.originalCurrency || "EUR").toUpperCase();
  const origAmt = item.originalAmount !== undefined && item.originalAmount !== "" ? Number(item.originalAmount) : Number(item.valueEur || 0);
  const clientBaseNote = origCurr !== currentCurrency
    ? ` <span style="opacity:0.85;font-weight:600;font-size:11.5px;">(${formatAmountInCurrentCurrency(origAmt, origCurr)})</span>`
    : "";
  const yourValLabel = t("calcYourValue").replace(/\(EUR\)|\(€\)/gi, `(${cObj.short || cObj.code})`);
  const theirValLabel = t("calcTheirValue").replace(/\(EUR\)|\(€\)/gi, `(${cObj.short || cObj.code})`);
  const startInBuyMode = mode === "buy" || item.dealType === "sale";

  const modal = document.getElementById("offerModal");
  const content = document.getElementById("offerModalContent");
  content.classList.add("offer-detail-modal");

  const modalUiMap = {
    ro: {
      ownerVerified: "Proprietar",
      verifiedWord: "Verificat ✓",
      zeroFeeDirect: "0% Comision · Mesaj Direct",
      sendSwapTo: "Trimite Propunere de Schimb 1:1 către",
      zeroCommission: "0% Comision",
      yourCashOffer: "Oferta ta de Preț / Cumpărare Directă",
      paymentPref: "Preferință Plată & Predare",
      payOpt1: "Transfer Bancar / Numerar la Predare Sigură",
      payOpt2: "Cumpără Imediat la Prețul Afișat",
      payOpt3: "Contract Notarial / Tranzacție Verificată",
      sendBuyTo: "Trimite Ofertă de Cumpărare către"
    },
    en: {
      ownerVerified: "Owner",
      verifiedWord: "Verified ✓",
      zeroFeeDirect: "0% Fee Direct Message",
      sendSwapTo: "Send 1:1 Swap Proposal to",
      zeroCommission: "0% Commission",
      yourCashOffer: "Your Cash Offer / Purchase Price",
      paymentPref: "Payment & Handover Preference",
      payOpt1: "Bank Transfer / Cash on Safe Handover",
      payOpt2: "Buy Immediately at Full Asking Price",
      payOpt3: "Notary / Verified Sale Contract",
      sendBuyTo: "Send Cash Purchase Offer to"
    },
    de: {
      ownerVerified: "Eigentümer",
      verifiedWord: "Verifiziert ✓",
      zeroFeeDirect: "0% Gebühr · Direktnachricht",
      sendSwapTo: "1:1-Tauschvorschlag senden an",
      zeroCommission: "0% Provision",
      yourCashOffer: "Ihr Kaufpreis-Angebot",
      paymentPref: "Zahlung & Übergabe",
      payOpt1: "Banküberweisung / Bar bei Übergabe",
      payOpt2: "Sofortkauf zum vollen Angebotspreis",
      payOpt3: "Notar / Verifizierter Kaufvertrag",
      sendBuyTo: "Kaufangebot senden an"
    },
    fr: {
      ownerVerified: "Propriétaire",
      verifiedWord: "Vérifié ✓",
      zeroFeeDirect: "0% Commission · Message Direct",
      sendSwapTo: "Envoyer la proposition d'échange 1:1 à",
      zeroCommission: "0% Commission",
      yourCashOffer: "Votre offre d'achat comptant",
      paymentPref: "Mode de paiement et remise",
      payOpt1: "Virement bancaire / Espèces à la remise",
      payOpt2: "Achat immédiat au prix affiché",
      payOpt3: "Notaire / Contrat de vente vérifié",
      sendBuyTo: "Envoyer l'offre d'achat à"
    },
    it: {
      ownerVerified: "Proprietario",
      verifiedWord: "Verificato ✓",
      zeroFeeDirect: "0% Commissione · Messaggio Diretto",
      sendSwapTo: "Invia proposta di scambio 1:1 a",
      zeroCommission: "0% Commissione",
      yourCashOffer: "La tua offerta d'acquisto",
      paymentPref: "Preferenza di pagamento e consegna",
      payOpt1: "Bonifico bancario / Contanti alla consegna",
      payOpt2: "Acquista subito al prezzo richiesto",
      payOpt3: "Notaio / Contratto di vendita verificato",
      sendBuyTo: "Invia offerta d'acquisto a"
    },
    es: {
      ownerVerified: "Propietario",
      verifiedWord: "Verificado ✓",
      zeroFeeDirect: "0% Comisión · Mensaje Directo",
      sendSwapTo: "Enviar propuesta de intercambio 1:1 a",
      zeroCommission: "0% Comisión",
      yourCashOffer: "Tu oferta de compra",
      paymentPref: "Preferencia de pago y entrega",
      payOpt1: "Transferencia bancaria / Efectivo en entrega",
      payOpt2: "Comprar ahora al precio anunciado",
      payOpt3: "Notario / Contrato de compraventa verificado",
      sendBuyTo: "Enviar oferta de compra a"
    },
    ru: {
      ownerVerified: "Владелец",
      verifiedWord: "Проверен ✓",
      zeroFeeDirect: "0% комиссия · Прямое сообщение",
      sendSwapTo: "Отправить предложение обмена 1:1 для",
      zeroCommission: "0% комиссия",
      yourCashOffer: "Ваше предложение цены / Покупка",
      paymentPref: "Способ оплаты и передачи",
      payOpt1: "Банковский перевод / Наличные при встрече",
      payOpt2: "Купить сразу по указанной цене",
      payOpt3: "Нотариус / Проверенный договор купли-продажи",
      sendBuyTo: "Отправить предложение о покупке"
    }
  };
  const mUi = modalUiMap[currentLang] || modalUiMap.en;

  content.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--line);">
      <span style="margin:0;font-size:13.5px;color:var(--muted);font-weight:700;display:inline-flex;align-items:center;">${PREMIUM_ICONS.pin}${item.city}, ${item.country} · ${mUi.ownerVerified}: ${item.owner} (${mUi.verifiedWord}) · ${getDealTypeLabel(item.dealType)}</span>
      <button type="button" class="modal-close" style="position:static;color:var(--ink);background:var(--bg);flex-shrink:0;" onclick="closeOfferModal()" aria-label="Close">✕</button>
    </div>

    <div class="offer-modal-grid">
      <div>
        <div style="height:220px;border-radius:20px;background:url('${item.image}') 50%/cover no-repeat;margin-bottom:14px;position:relative;">
          <span style="position:absolute;bottom:14px;left:14px;background:var(--forest);color:var(--mint);padding:6px 14px;border-radius:999px;font-weight:700;font-size:13px;">
            ${getCategoryLabel(item.category)} · ~ ${valFormatted}${clientBaseNote}
          </span>
        </div>
        <h2 style="font-size:23px;margin:0 0 8px;line-height:1.2;">${loc.title}</h2>
        <p style="color:var(--ink-soft);margin:0 0 14px;font-size:14px;">${loc.desc || item.specs}</p>

        <div class="swap-exchange-box" style="margin-bottom:0;">
          <div class="swap-row">
            <span class="swap-tag have">${t("haveBadge")}</span>
            <span><strong>${loc.title}</strong> (${item.specs})</span>
          </div>
          <div class="swap-row">
            <span class="swap-tag want" style="${item.dealType === 'sale' ? 'background:#0c2c28;color:#a9ffca;' : ''}">${item.dealType === "sale" ? t("saleBadge") : t("wantBadge")}</span>
            <span style="font-weight:700;color:var(--forest);">${item.dealType === "sale" ? `${t("dealSaleOnly")} · ~${valFormatted}` : loc.want}</span>
          </div>
        </div>
      </div>

      <div>
        <!-- ACTION MODE SWITCHER: SWAP vs BUY / CASH OFFER -->
        <div class="catalog-pills" style="margin-bottom:12px;display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <button type="button" id="offerTabSwapBtn" class="cat-pill ${!startInBuyMode ? 'active' : ''}" style="justify-content:center;text-align:center;" onclick="switchOfferActionTab('swap')">
            ${t("proposeSwapBtn")}
          </button>
          <button type="button" id="offerTabBuyBtn" class="cat-pill ${startInBuyMode ? 'active' : ''}" style="justify-content:center;text-align:center;" onclick="switchOfferActionTab('buy')">
            ${t("buyOfferBtn")}
          </button>
        </div>

        <!-- PANEL 1: 1:1 SWAP + VALUE BALANCE CALCULATOR -->
        <div id="offerActionSwapPanel" style="display:${startInBuyMode ? 'none' : 'block'};">
          <div class="calc-box" style="margin:0 0 14px;">
            <strong style="display:flex;align-items:center;font-size:14px;margin-bottom:10px;">${PREMIUM_ICONS.scale}${t("calcTitle")} (${cObj.code})</strong>
            <div class="form-grid-2">
              <div>
                <label style="font-size:12px;color:var(--muted);font-weight:700;">${yourValLabel}</label>
                <div style="display:grid;grid-template-columns:1fr 90px;gap:6px;">
                  <input type="number" id="calcMyValueInput" class="input-light" value="${theirValConverted}" oninput="updateSwapValueCalculator(${item.id})" />
                  <select id="calcMyCurrencySelect" class="input-light" style="padding:0 26px 0 10px;font-size:13px;font-weight:700;" onchange="updateSwapValueCalculator(${item.id})">
                    ${(window.CURRENCIES || []).map(curr => `<option value="${curr.code}" ${curr.code === currentCurrency ? 'selected' : ''}>${curr.code}</option>`).join("")}
                  </select>
                </div>
              </div>
              <div>
                <label style="font-size:12px;color:var(--muted);font-weight:700;">${theirValLabel}</label>
                <input type="number" class="input-light" value="${theirValConverted}" disabled />
              </div>
            </div>
            <div class="calc-result-banner" id="calcResultBanner">
              <span>⇄ ${t("calcEven")}</span><span>${formatAmountInCurrentCurrency(0, currentCurrency)}</span>
            </div>
          </div>

          <form onsubmit="submitDirectSwapProposal(event, ${item.id})" style="background:var(--mint-soft);padding:18px;border-radius:20px;border:1.5px solid var(--forest);">
            <strong style="display:block;margin-bottom:10px;color:var(--forest);font-size:15px;">⇄ ${t("proposeSwapBtn")} (${mUi.zeroFeeDirect})</strong>
            <div class="field-group">
              <label style="font-size:12px;color:var(--ink-soft);font-weight:700;">${t("quickTitleHave")}</label>
              <input type="text" name="offeredItem" class="input-light" required />
            </div>
            <div class="form-grid-2">
              <div class="field-group" style="margin-bottom:0;">
                <label style="font-size:12px;color:var(--ink-soft);font-weight:700;">${t("formFullName")}</label>
                <input type="text" name="senderName" class="input-light" required value="${currentUser ? currentUser.name : ''}" />
              </div>
              <div class="field-group" style="margin-bottom:0;">
                <label style="font-size:12px;color:var(--ink-soft);font-weight:700;">${t("formPhone")} / Email</label>
                <input type="text" name="senderContact" class="input-light" required value="${currentUser ? (currentUser.phone || currentUser.email) : ''}" />
              </div>
            </div>
            <button type="submit" class="btn btn-dark btn-block" style="margin-top:12px;">
              ${mUi.sendSwapTo} ${item.owner} →
            </button>
          </form>
        </div>

        <!-- PANEL 2: DIRECT BUY / CASH OFFER -->
        <div id="offerActionBuyPanel" style="display:${startInBuyMode ? 'block' : 'none'};">
          <form onsubmit="submitDirectBuyOffer(event, ${item.id})" style="background:var(--mint-soft);padding:18px;border-radius:20px;border:1.5px solid var(--forest);">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
              <strong style="color:var(--forest);font-size:15px;">${t("buyOfferBtn")} · ${mUi.zeroCommission}</strong>
              <span style="background:var(--forest);color:var(--mint);padding:3px 10px;border-radius:999px;font-size:12px;font-weight:800;">~ ${valFormatted}</span>
            </div>
            <div class="field-group">
              <label style="font-size:12px;color:var(--ink-soft);font-weight:700;">${mUi.yourCashOffer}</label>
              <div style="display:grid;grid-template-columns:1fr 110px;gap:8px;">
                <input type="number" id="buyOfferAmountInput" name="buyAmount" class="input-light" value="${theirValConverted}" required min="1" oninput="onBuyOfferPriceChange(${item.id})" />
                <select id="buyOfferCurrencySelect" name="buyCurrency" class="input-light" style="font-weight:700;" onchange="onBuyOfferPriceChange(${item.id})">
                  ${(window.CURRENCIES || []).map(curr => `<option value="${curr.code}" ${curr.code === currentCurrency ? 'selected' : ''}>${curr.code} (${curr.symbol})</option>`).join("")}
                </select>
              </div>
              <div id="buyOfferParityPreview">${buildParityPreviewHtml(theirValConverted, currentCurrency)}</div>
            </div>
            <div class="field-group">
              <label style="font-size:12px;color:var(--ink-soft);font-weight:700;">${mUi.paymentPref}</label>
              <select name="paymentMethod" class="input-light">
                <option value="Bank Transfer / Cash on Handover">${mUi.payOpt1}</option>
                <option value="Buy Now at Asking Price">${mUi.payOpt2} (~${valFormatted})</option>
                <option value="Notary / Verified Escrow Contract">${mUi.payOpt3}</option>
              </select>
            </div>
            <div class="form-grid-2">
              <div class="field-group" style="margin-bottom:0;">
                <label style="font-size:12px;color:var(--ink-soft);font-weight:700;">${t("formFullName")}</label>
                <input type="text" name="senderName" class="input-light" required value="${currentUser ? currentUser.name : ''}" />
              </div>
              <div class="field-group" style="margin-bottom:0;">
                <label style="font-size:12px;color:var(--ink-soft);font-weight:700;">${t("formPhone")} / Email</label>
                <input type="text" name="senderContact" class="input-light" required value="${currentUser ? (currentUser.phone || currentUser.email) : ''}" />
              </div>
            </div>
            <button type="submit" class="btn btn-dark btn-block" style="margin-top:12px;">
              ${mUi.sendBuyTo} ${item.owner} →
            </button>
          </form>
        </div>
      </div>
    </div>
  `;

  modal.classList.add("open");
  document.body.classList.add("modal-open");
  document.body.classList.add("mobile-started");
  syncUrlWithRoute(`/offer/${offerId}`);
}

function closeOfferModal() {
  document.getElementById("offerModal").classList.remove("open");
  document.body.classList.remove("modal-open");
  syncUrlWithRoute(document.body.classList.contains("mobile-started") ? "/start" : "/");
}

function consumeFreeSwapIfLogged() {
  if (currentUser && typeof currentUser.freeSwaps === "number" && currentUser.freeSwaps > 0) {
    currentUser.freeSwaps = Math.max(0, currentUser.freeSwaps - 1);
    localStorage.setItem("ci4m_user", JSON.stringify(currentUser));
    const emailKey = String(currentUser.email || "").trim().toLowerCase();
    if (emailKey && accountsDb[emailKey]) {
      accountsDb[emailKey].freeSwaps = currentUser.freeSwaps;
      saveAccountsDb();
    }
    renderUserHeaderState();
  }
}

function submitDirectSwapProposal(e, offerId) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const item = offers.find(o => o.id === offerId);
  const loc = item ? getOfferLocalized(item) : { title: "Swap Offer" };
  const bannerEl = document.getElementById("calcResultBanner");
  const calcBanner = String(bannerEl?.innerText || bannerEl?.textContent || "").replace(/\n/g, " ").trim() || "1:1 Key-for-Key";

  swapProposals.unshift({
    id: Date.now(),
    direction: "Sent",
    offerId,
    targetTitle: loc.title,
    offeredItem: String(fd.get("offeredItem")),
    partner: item ? `${item.owner} (${item.city}, ${item.country})` : "Owner",
    cashBalance: calcBanner,
    status: "Sent · Awaiting Owner Response"
  });
  localStorage.setItem("ci4m_proposals", JSON.stringify(swapProposals));
  consumeFreeSwapIfLogged();
  updateFavCountUI();
  closeOfferModal();
  showToast("✓ Swap Proposal sent & saved to your Dashboard!");
}

function acceptSwapProposal(propId) {
  const p = swapProposals.find(x => x.id === propId);
  if (!p) return;
  p.status = "Accepted · Direct Contact Unlocked";
  p.accepted = true;
  localStorage.setItem("ci4m_proposals", JSON.stringify(swapProposals));
  renderDashboardContent();
  showToast(`✓ Swap with ${p.partner} accepted!`);
}

function deleteSwapProposal(propId) {
  swapProposals = swapProposals.filter(x => x.id !== propId);
  localStorage.setItem("ci4m_proposals", JSON.stringify(swapProposals));
  updateFavCountUI();
  renderDashboardContent();
}

// ============================================================================
// PERSONAL DASHBOARD MODAL (PROPOSALS, MY LISTINGS, FAVORITES, GEO-IP)
// ============================================================================
function openDashboardModal(tab = "proposals") {
  if (!currentUser) {
    openAuthModal("login");
    return;
  }
  currentDashTab = tab;
  document.body.classList.add("mobile-started");
  document.getElementById("dashboardModal").classList.add("open");
  document.body.classList.add("modal-open");
  renderUserHeaderState();
  switchDashboardTab(tab);
  syncUrlWithRoute("/dashboard");
}

function closeDashboardModal() {
  document.getElementById("dashboardModal").classList.remove("open");
  document.body.classList.remove("modal-open");
  syncUrlWithRoute(document.body.classList.contains("mobile-started") ? "/start" : "/");
}

function switchDashboardTab(tab) {
  currentDashTab = tab;
  document.querySelectorAll("#dashTabsBar .cat-pill").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });
  renderDashboardContent();
}

function renderDashboardContent() {
  const container = document.getElementById("dashboardBodyContent");
  if (!container) return;

  const dashLabelsMap = {
    en: { partner: "Partner", view: "View", edit: "Edit", del: "Delete", accept: "Accept", emptyFav: "No saved favorites yet. Click the heart icon on any swap offer card to save it here.", emptyProps: "No active swap proposals yet. Open any listing and click Propose Swap.", incoming: "Incoming", outgoing: "Outgoing", yourAd: "Your Ad" },
    de: { partner: "Partner", view: "Ansehen", edit: "Bearbeiten", del: "Löschen", accept: "Annehmen", emptyFav: "Noch keine Favoriten gespeichert. Klicken Sie auf das Herz-Symbol bei einem Angebot.", emptyProps: "Noch keine aktiven Tauschvorschläge.", incoming: "Eingehend", outgoing: "Ausgehend", yourAd: "Ihr Inserat" },
    fr: { partner: "Partenaire", view: "Voir", edit: "Modifier", del: "Supprimer", accept: "Accepter", emptyFav: "Aucun favori enregistré. Cliquez sur l'icône cœur sur une annonce pour la sauvegarder.", emptyProps: "Aucune proposition d'échange active.", incoming: "Reçue", outgoing: "Envoyée", yourAd: "Votre annonce" },
    it: { partner: "Partner", view: "Vedi", edit: "Modifica", del: "Elimina", accept: "Accetta", emptyFav: "Nessun preferito salvato. Clicca sull'icona del cuore su un annuncio per salvarlo qui.", emptyProps: "Nessuna proposta di scambio attiva.", incoming: "In entrata", outgoing: "In uscita", yourAd: "Tuo annuncio" },
    es: { partner: "Socio", view: "Ver", edit: "Editar", del: "Eliminar", accept: "Aceptar", emptyFav: "Aún no tienes favoritos guardados. Haz clic en el icono de corazón en cualquier oferta.", emptyProps: "Aún no hay propuestas de intercambio activas.", incoming: "Recibida", outgoing: "Enviada", yourAd: "Tu anuncio" },
    ro: { partner: "Partener", view: "Vezi", edit: "Editează", del: "Șterge", accept: "Acceptă", emptyFav: "Nu ai încă favorite salvate. Apasă pe iconița inimă de pe orice anunț pentru a-l salva aici.", emptyProps: "Nu ai propuneri active. Deschide orice ofertă și apasă pe Propune schimb.", incoming: "Primită", outgoing: "Trimisă", yourAd: "Anunțul tău" },
    ru: { partner: "Партнёр", view: "Открыть", edit: "Изменить", del: "Удалить", accept: "Принять", emptyFav: "Пока нет сохранённых избранных. Нажмите на сердечко на любой карточке объявления.", emptyProps: "Пока нет активных предложений обмена.", incoming: "Входящее", outgoing: "Исходящее", yourAd: "Ваше объявление" }
  };
  const dl = dashLabelsMap[currentLang] || dashLabelsMap.en;

  if (currentDashTab === "proposals") {
    if (swapProposals.length === 0) {
      container.innerHTML = `<p style="color:var(--muted);">${dl.emptyProps}</p>`;
      return;
    }
    container.innerHTML = swapProposals.map(p => `
      <div class="dash-list-item" style="gap:12px;flex-wrap:wrap;">
        <div style="flex:1;min-width:220px;">
          <span style="font-size:11.5px;font-weight:800;text-transform:uppercase;padding:2px 8px;border-radius:6px;background:${p.direction === 'Incoming' ? 'var(--mint)' : 'var(--forest)'};color:${p.direction === 'Incoming' ? 'var(--forest)' : '#fff'};">
            ${p.direction === 'Incoming' ? dl.incoming : dl.outgoing}
          </span>
          <strong style="display:block;font-size:15.5px;margin-top:6px;cursor:pointer;color:var(--forest);" onclick="closeDashboardModal(); if(${Number(p.offerId) || 0}) openOfferModal(${Number(p.offerId)}, 'details');">${p.offeredItem} ⇄ ${p.targetTitle}</strong>
          <span style="font-size:13px;color:var(--muted);">${dl.partner}: ${p.partner} · ${p.cashBalance}</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span style="font-size:12.5px;font-weight:700;color:var(--forest);white-space:nowrap;">✓ ${p.status}</span>
          ${p.direction === "Incoming" && !p.accepted ? `<button type="button" class="btn btn-mint" style="padding:6px 12px;font-size:12px;" onclick="acceptSwapProposal(${p.id})">${dl.accept}</button>` : ""}
          ${p.offerId ? `<button type="button" class="btn btn-login" style="padding:6px 12px;font-size:12px;" onclick="closeDashboardModal(); openOfferModal(${p.offerId}, 'details')">${dl.view}</button>` : ""}
          <button type="button" class="btn btn-login" style="padding:6px 10px;font-size:12px;color:#b91c1c;" onclick="deleteSwapProposal(${p.id})" title="${dl.del}">✕</button>
        </div>
      </div>
    `).join("");
  } else if (currentDashTab === "mylistings") {
    const userCreated = offers.filter(o => o.createdByUser || o.id > 100000);
    const myItems = userCreated.length > 0 ? userCreated : offers.slice(0, 3);
    container.innerHTML = `
      ${myItems.map(item => {
        const loc = getOfferLocalized(item);
        const isCustom = Boolean(item.createdByUser || item.id > 100000);
        return `
          <div class="dash-list-item" style="gap:12px;flex-wrap:wrap;">
            <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:210px;">
              <img src="${item.image}" style="width:64px;height:48px;object-fit:cover;border-radius:10px;flex-shrink:0;" alt="" />
              <div>
                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                  <strong>${loc.title}</strong>
                  ${isCustom ? `<span style="background:var(--mint);color:var(--forest);font-size:10.5px;font-weight:800;padding:1px 7px;border-radius:999px;">${dl.yourAd}</span>` : ""}
                </div>
                <span style="display:flex;align-items:center;font-size:12.5px;color:var(--muted);">${PREMIUM_ICONS.pin}${item.city}, ${item.country} · ~${formatOfferPrice(item, currentCurrency)}</span>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
              <button type="button" class="btn btn-login" style="padding:6px 12px;font-size:12px;" onclick="closeDashboardModal(); openOfferModal(${item.id}, 'details')">${dl.view}</button>
              <button type="button" class="btn btn-mint" style="padding:6px 12px;font-size:12px;" onclick="editListingInWizard(${item.id})">${dl.edit}</button>
              <button type="button" class="btn btn-login" style="padding:6px 10px;font-size:12px;color:#b91c1c;" onclick="deleteUserListing(${item.id})" title="${dl.del}">✕</button>
            </div>
          </div>
        `;
      }).join("")}
      <button type="button" class="btn btn-mint btn-block" style="margin-top:12px;" onclick="closeDashboardModal(); resetWizardDraft(); openWizardModal(1);">
        ${t("navPostSwap")} →
      </button>
    `;
  } else if (currentDashTab === "favorites") {
    const favOffers = offers.filter(o => favoriteIds.includes(o.id));
    if (favOffers.length === 0) {
      container.innerHTML = `<p style="color:var(--muted);">${dl.emptyFav}</p>`;
    } else {
      container.innerHTML = favOffers.map(item => {
        const loc = getOfferLocalized(item);
        return `
          <div class="dash-list-item" style="gap:12px;flex-wrap:wrap;">
            <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:210px;">
              <img src="${item.image}" style="width:60px;height:44px;object-fit:cover;border-radius:10px;flex-shrink:0;" alt="" />
              <div>
                <strong>${loc.title}</strong>
                <span style="display:flex;align-items:center;font-size:12.5px;color:var(--muted);">${PREMIUM_ICONS.pin}${item.city}, ${item.country} · ~${formatOfferPrice(item, currentCurrency)} · ${t("wantBadge")}: ${loc.want}</span>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;">
              <button type="button" class="btn btn-mint" style="padding:7px 13px;font-size:12.5px;" onclick="closeDashboardModal(); openOfferModal(${item.id}, 'propose')">
                ⇄ ${t("proposeSwapBtn")}
              </button>
              <button type="button" class="btn btn-login" style="padding:7px 10px;font-size:12.5px;color:#b91c1c;" onclick="toggleFavorite(${item.id}); renderDashboardContent();" title="${dl.del}">✕</button>
            </div>
          </div>
        `;
      }).join("");
    }
  }
}

// ============================================================================
// GUIDES MODAL, WATCHLIST & CHAT ASSISTANT
// ============================================================================
function openGuideModal(guideKey) {
  const g = window.GUIDES_DATA[guideKey];
  if (!g) return;
  const title = g.title[currentLang] || g.title.en;
  const content = document.getElementById("guideModalContent");

  content.innerHTML = `
    <button type="button" class="modal-close" style="color:var(--ink);" onclick="closeGuideModal()">✕</button>
    <span style="background:var(--mint);color:var(--forest);padding:4px 12px;border-radius:999px;font-size:12px;font-weight:700;">ChangeIt4Me Checklist</span>
    <h2 style="font-size:28px;margin:12px 0 18px;">${title}</h2>
    <ul class="checks" style="margin-bottom:22px;">
      ${g.items.map(line => `
        <li>
          <svg width="20" height="20" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="9" fill="#a9ffca"/><path d="M5 9.2 7.6 12 13 6.5" stroke="#0c2c28" stroke-width="1.7" stroke-linecap="round"/></svg>
          <span>${line}</span>
        </li>
      `).join("")}
    </ul>
    <button type="button" class="btn btn-mint btn-block" onclick="closeGuideModal(); openWizardModal();">
      ${t("postFreeAdBtn")} →
    </button>
  `;

  document.getElementById("guideModal").classList.add("open");
  document.body.classList.add("modal-open");
}

function closeGuideModal() {
  document.getElementById("guideModal").classList.remove("open");
  document.body.classList.remove("modal-open");
}

function handleWatchlistSubmit(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const note = document.getElementById("watchlistNote");
  if (note) {
    note.textContent = `✓ Alert active for "${fd.get("interest")}" in ${fd.get("country")}!`;
  }
  showToast(`✓ Watchlist alert activated for ${fd.get("interest")}!`);
  e.target.reset();
}

function toggleChatDock() {
  document.getElementById("chatDock").classList.toggle("is-open");
}

function handleChatSubmit(e) {
  e.preventDefault();
  const input = document.getElementById("chatInput");
  const text = input.value.trim();
  if (!text) return;

  const box = document.getElementById("chatMessages");
  box.innerHTML += `<div class="chat-bubble user">${text}</div>`;
  input.value = "";
  box.scrollTop = box.scrollHeight;

  setTimeout(() => {
    const directHits = offers.filter(o => matchesSmartSearchQuery(o, text));
    const aiSmart = buildAiSmartRecommendations(text, directHits, offers);
    const aiItems = (aiSmart && Array.isArray(aiSmart.items)) ? aiSmart.items : [];
    const chatReplyCopy = {
      en: { found: "Direct & AI Smart Matches found:", aiTag: "AI Alternative", none: "Tell me what you have or want (e.g. iPhone, Villa, Porsche, BMW) and I'll match you with verified owners:", postCta: "Post your swap offer" },
      de: { found: "Direkte & KI-Smart-Matches gefunden:", aiTag: "KI-Alternative", none: "Sagen Sie mir, was Sie haben oder suchen (z. B. iPhone, Villa, Porsche, BMW):", postCta: "Tauschangebot inserieren" },
      fr: { found: "Résultats directs & suggestions IA trouvés :", aiTag: "Alternative IA", none: "Dites-moi ce que vous avez ou cherchez (ex. iPhone, Villa, Porsche, BMW) :", postCta: "Publier votre annonce" },
      it: { found: "Risultati diretti e alternative AI trovati:", aiTag: "Alternativa AI", none: "Dimmi cosa offri o cerchi (es. iPhone, Villa, Porsche, BMW):", postCta: "Pubblica il tuo annuncio" },
      es: { found: "Resultados directos y sugerencias IA encontrados:", aiTag: "Alternativa IA", none: "Dime qué tienes o buscas (ej. iPhone, Villa, Porsche, BMW):", postCta: "Publicar tu oferta" },
      ro: { found: "Rezultate directe & recomandări AI găsite:", aiTag: "Alternativă AI", none: "Spune-mi ce oferi sau ce cauți (ex: iPhone, Vilă, Apartament, Porsche, BMW) și îți găsesc proprietari verificați:", postCta: "Publică oferta ta de schimb" },
      ru: { found: "Найдены прямые совпадения и AI-рекомендации:", aiTag: "AI-альтернатива", none: "Напишите, что вы предлагаете или ищете (например: iPhone, Вилла, Porsche, BMW):", postCta: "Разместить предложение обмена" }
    };
    const cr = chatReplyCopy[currentLang] || chatReplyCopy.en;
    const combined = [
      ...directHits.slice(0, 2).map(item => ({ item, isAi: false, reason: "" })),
      ...aiItems.slice(0, 2).map(entry => ({ item: entry.item, isAi: true, reason: entry.badgeLabel }))
    ].slice(0, 3);

    if (combined.length > 0) {
      const linksHtml = combined.map(({ item, isAi, reason }) => {
        const loc = getOfferLocalized(item);
        return `
          <div style="margin-top:6px;padding:7px 9px;background:#fff;border:1px solid rgba(12,44,40,0.12);border-radius:10px;cursor:pointer;" onclick="toggleChatDock(); openOfferModal(${item.id}, 'details')">
            <div style="font-weight:700;font-size:12.5px;color:var(--forest);">${loc.title}</div>
            <div style="font-size:11.5px;color:var(--muted);">${item.city} · ~${formatOfferPrice(item, currentCurrency)} ${isAi ? `· <span style="color:#0a5c46;font-weight:700;">${reason || cr.aiTag}</span>` : ""}</div>
          </div>
        `;
      }).join("");
      box.innerHTML += `
        <div class="chat-bubble bot">
          <strong>✓ ${cr.found}</strong>
          ${linksHtml}
        </div>
      `;
    } else {
      box.innerHTML += `
        <div class="chat-bubble bot">
          ${cr.none}<br/>
          <button type="button" class="btn btn-mint" style="margin-top:8px;padding:6px 12px;font-size:12px;" onclick="toggleChatDock(); openWizardModal();">${cr.postCta} →</button>
        </div>
      `;
    }
    box.scrollTop = box.scrollHeight;
  }, 300);
}

// ============================================================================
// MOBILE MENU, SCROLL & TOAST HELPERS
// ============================================================================
function closeMobileMenu() {
  closeAllModalsSilently();
  document.body.classList.add("mobile-started");
  document.getElementById("mobilePanel").classList.remove("open");
  document.getElementById("mobileMenuBtn").setAttribute("aria-expanded", "false");
}

function scrollToMobileHub() {
  closeAllModalsSilently();
  document.body.classList.add("mobile-started");
  window.scrollTo({ top: 0, behavior: "instant" });
  syncUrlWithRoute("/start");
}

function exitMobileStartScreen() {
  closeAllModalsSilently();
  document.body.classList.remove("mobile-started");
  window.scrollTo({ top: 0, behavior: "instant" });
  syncUrlWithRoute("/");
}

let scrollRevealObserver = null;

function initScrollRevealAnimations() {
  if (!("IntersectionObserver" in window)) return;
  if (!scrollRevealObserver) {
    scrollRevealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          scrollRevealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -30px 0px" });
  }

  document.querySelectorAll(".stat, .service, .swap-card, .step, .plan, .article").forEach((el, idx) => {
    if (!el.classList.contains("reveal-on-scroll")) {
      el.classList.add("reveal-on-scroll");
      el.style.transitionDelay = `${(idx % 3) * 65}ms`;
      scrollRevealObserver.observe(el);
    }
  });
}

function animateLiveMemberCount() {
  const el = document.getElementById("liveUserCount");
  if (!el) return;
  const target = currentUser ? 1481 : 1480;
  const start = 1390;
  const duration = 1200;
  const startTime = performance.now();

  const step = (now) => {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const val = Math.round(start + (target - start) * eased);
    el.textContent = val.toLocaleString("en-US");
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function showToast(message) {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => {
    el.remove();
  }, 4200);
}

document.addEventListener("DOMContentLoaded", () => {
  initLanguageDropdown();
  initCurrencyDropdown();
  initWorldMap();
  // Start with English ('en') as default and run European Geo-IP detection
  detectLanguageByGeoIP(false);
  syncLiveExchangeRates();
  initScrollRevealAnimations();
  animateLiveMemberCount();

  // Restore exact page / screen / wizard step & draft on Refresh
  const initialRoute = getRouteFromUrlOrStorage();
  if (initialRoute && initialRoute !== "/") {
    navigateToPageRoute(initialRoute, true);
  }

  // Handle browser Back / Forward buttons across all pages & Wizard steps
  window.addEventListener("popstate", (ev) => {
    const route = (ev.state && ev.state.route) ? ev.state.route : getRouteFromUrlOrStorage();
    navigateToPageRoute(route || "/", true);
  });

  // Intercept section anchor clicks so top header & menu links work from any modal/page and update the URL
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");
      if (!href || href === "#") return;
      const secId = href.slice(1);
      if (secId === "top") {
        e.preventDefault();
        exitMobileStartScreen();
        return;
      }
      const targetEl = document.getElementById(secId);
      if (targetEl) {
        e.preventDefault();
        closeAllModalsSilently();
        document.body.classList.add("mobile-started");
        syncUrlWithRoute(`/${secId}`);
        targetEl.scrollIntoView({ behavior: "smooth" });
      }
    });
  });

  // Header scroll effect
  const header = document.getElementById("header");
  window.addEventListener("scroll", () => {
    header.classList.toggle("scrolled", window.scrollY > 8);
  }, { passive: true });

  // Story slider progress bar
  const slider = document.getElementById("storySlider");
  const progress = document.getElementById("sliderProgress");
  if (slider && progress) {
    slider.addEventListener("scroll", () => {
      const max = slider.scrollWidth - slider.clientWidth;
      const ratio = max > 0 ? slider.scrollLeft / max : 0;
      progress.style.width = `${30 + 70 * ratio}%`;
    }, { passive: true });
  }

  // Mobile menu toggle
  const mobileBtn = document.getElementById("mobileMenuBtn");
  const mobilePanel = document.getElementById("mobilePanel");
  if (mobileBtn && mobilePanel) {
    mobileBtn.addEventListener("click", () => {
      const open = mobilePanel.classList.toggle("open");
      mobileBtn.setAttribute("aria-expanded", String(open));
    });
  }
});
