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

// Load offers from localStorage or initial dataset
let offers = (() => {
  try {
    const saved = localStorage.getItem("ci4m_offers_v4");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length >= window.INITIAL_OFFERS.length) {
        return parsed;
      }
    }
  } catch (e) {}
  return [...window.INITIAL_OFFERS];
})();

let currentDealModeFilter = "all";

// Current logged-in user state
let currentUser = (() => {
  try {
    const saved = localStorage.getItem("ci4m_user");
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    return null;
  }
})();

// 7-Step Wizard State
let wizStep = 1;
let currentOpenOfferId = null;
let wizData = {
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
  return `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:5px;margin-top:6px;"><span style="font-size:11.5px;color:var(--muted);font-weight:700;">⇄ Paritate:</span>${pills}</div>`;
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
    quickValLabel.textContent = t("quickValueEur").replace(/\(EUR\)|\(€\)/gi, `(${c.short || c.code})`);
  }
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
  }

  renderOffers();
  document.getElementById("offers").scrollIntoView({ behavior: "smooth" });
  showToast(`✓ ${t("navOffers")}: ${wantCat === "all" ? t("catAll") : getCategoryLabel(wantCat)}`);
}

const SEARCH_SYNONYMS = {
  "casa": ["villa", "house", "chalet", "casă", "vilă", "haus", "maison", "дом", "вилла", "real-estate"],
  "casă": ["villa", "house", "chalet", "casă", "vilă", "haus", "maison", "дом", "вилла", "real-estate"],
  "vila": ["villa", "house", "chalet", "vilă", "дом", "вилла", "real-estate"],
  "дом": ["villa", "house", "chalet", "casă", "vilă", "дом", "вилла", "real-estate"],
  "вилла": ["villa", "house", "chalet", "casă", "vilă", "дом", "вилла", "real-estate"],
  "haus": ["villa", "house", "chalet", "haus", "real-estate"],
  "maison": ["villa", "house", "chalet", "maison", "real-estate"],
  "apartament": ["apartment", "penthouse", "studio", "wohnung", "appartement", "piso", "квартира", "апартаменты", "real-estate"],
  "квартира": ["apartment", "penthouse", "studio", "wohnung", "appartement", "piso", "квартира", "апартаменты", "real-estate"],
  "wohnung": ["apartment", "penthouse", "studio", "wohnung", "real-estate"],
  "appartement": ["apartment", "penthouse", "studio", "appartement", "real-estate"],
  "appartamento": ["apartment", "penthouse", "studio", "appartamento", "real-estate"],
  "piso": ["apartment", "penthouse", "studio", "piso", "real-estate"],
  "imobiliare": ["real-estate", "apartment", "villa", "penthouse", "house", "teren", "недвижимость"],
  "недвижимость": ["real-estate", "apartment", "villa", "penthouse", "house"],
  "masina": ["cars", "bmw", "mercedes", "audi", "porsche", "tesla", "suv", "auto", "авто", "машина"],
  "mașină": ["cars", "bmw", "mercedes", "audi", "porsche", "tesla", "suv", "auto", "авто", "машина"],
  "авто": ["cars", "bmw", "mercedes", "audi", "porsche", "tesla", "suv", "auto"],
  "машина": ["cars", "bmw", "mercedes", "audi", "porsche", "tesla", "suv", "auto"],
  "auto": ["cars", "bmw", "mercedes", "audi", "porsche", "tesla", "auto-parts"],
  "coche": ["cars", "bmw", "mercedes", "audi", "porsche", "tesla"],
  "voiture": ["cars", "bmw", "mercedes", "audi", "porsche", "tesla"],
  "telefon": ["iphone", "smartphone", "samsung", "electronics", "айфон", "телефон"],
  "айфон": ["iphone", "apple", "electronics"],
  "айпад": ["ipad", "apple", "electronics"],
  "макбук": ["macbook", "apple", "electronics"],
  "laptop": ["macbook", "laptop", "notebook", "electronics", "ноутбук"],
  "tableta": ["ipad", "tablet", "oled", "electronics", "планшет"],
  "ceas": ["rolex", "watch", "chronograph", "clothing", "часы"]
};

function matchesSmartSearchQuery(item, rawQuery) {
  if (!rawQuery) return true;
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;

  let allText = `${item.category} ${item.country} ${item.city} ${item.specs || ""} ${item.title || ""} ${item.want || ""} ${item.desc || ""}`;
  if (item.i18n) {
    Object.values(item.i18n).forEach(tr => {
      allText += ` ${tr.title || ""} ${tr.want || ""} ${tr.desc || ""}`;
    });
  }
  const haystack = allText.toLowerCase();
  if (haystack.includes(q)) return true;

  const words = q.split(/\s+/);
  return words.every(w => {
    if (haystack.includes(w)) return true;
    const directSyns = SEARCH_SYNONYMS[w];
    if (directSyns && directSyns.some(s => haystack.includes(s))) return true;
    if (w.length >= 2) {
      for (const [k, synList] of Object.entries(SEARCH_SYNONYMS)) {
        if (k.startsWith(w) && synList.some(s => haystack.includes(s))) return true;
      }
    }
    return false;
  });
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
      selectBtn: "Select"
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
      selectBtn: "Wählen"
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
      selectBtn: "Choisir"
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
      selectBtn: "Scegli"
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
      selectBtn: "Elegir"
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
      selectBtn: "Selectează"
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
      selectBtn: "Выбрать"
    }
  };
  return map[currentLang] || map.en;
}

function buildLiveSearchDropdownHtml(val) {
  const q = String(val || "").trim();
  if (q.length < 1) return "";
  const ui = getSmartUiLabels();
  const matches = offers.filter(it => matchesSmartSearchQuery(it, q)).slice(0, 5);
  if (matches.length === 0) {
    return `
      <div class="smart-dd-empty" style="padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:10px;">
        <span style="font-size:13px;color:var(--muted);font-weight:600;">${ui.noMatch} «${q}»</span>
        <button type="button" class="btn btn-mint" style="height:32px;padding:0 12px;font-size:12px;" onclick="openWizardModal()">${ui.postFirst}</button>
      </div>
    `;
  }
  return `
    ${matches.map(item => {
      const loc = getOfferLocalized(item);
      const price = formatOfferPrice(item, currentCurrency);
      return `
        <button type="button" class="smart-dd-item" onclick="document.getElementById('heroSmartDropdown').style.display='none'; document.getElementById('mobileSmartDropdown').style.display='none'; openOfferModal(${item.id}, 'details');">
          <img src="${item.image}" alt="" />
          <div class="smart-dd-info">
            <strong>${loc.title}</strong>
            <span>${getCategoryLabel(item.category)} · ${item.city}, ${item.country} · ${getDealTypeLabel(item.dealType)}</span>
          </div>
          <span class="smart-dd-price">~${price}</span>
        </button>
      `;
    }).join("")}
    <button type="button" class="smart-dd-all" onclick="executeQuickKeywordSearch('${q.replace(/'/g, "\\'")}')">
      ${ui.seeAll} (${matches.length})
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

  let filtered = offers.filter(item => {
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

    if (query && !matchesSmartSearchQuery(item, query)) {
      return false;
    }
    return true;
  });

  if (sortMode === "valDesc") {
    filtered.sort((a, b) => (b.valueEur || 0) - (a.valueEur || 0));
  } else if (sortMode === "valAsc") {
    filtered.sort((a, b) => (a.valueEur || 0) - (b.valueEur || 0));
  } else {
    filtered.sort((a, b) => (b.matchScore || 90) - (a.matchScore || 90));
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; background: #fff; border-radius: 24px; padding: 42px; text-align: center; border: 1px solid var(--line);">
        <h3 style="margin:0 0 8px;">No exact swap offers matched your filter</h3>
        <p style="color:var(--muted);margin:0 0 18px;">Reset filters or post your own swap offer so other members can match with you.</p>
        <button type="button" class="btn btn-mint" onclick="filterByCategory('all'); document.getElementById('catalogSearchInput').value=''; document.getElementById('catalogMinEur').value=''; document.getElementById('catalogMaxEur').value=''; renderOffers();">
          Reset Filters
        </button>
        <button type="button" class="btn btn-dark" style="margin-left:8px;" onclick="openWizardModal()">
          ${t("navPostSwap")}
        </button>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(item => {
    const loc = getOfferLocalized(item);
    const valFormatted = formatOfferPrice(item, currentCurrency);
    const isFav = favoriteIds.includes(item.id);
    const score = item.matchScore || 95;

    return `
      <article class="swap-card">
        <div class="swap-card-media" style="background-image:url('${item.image}')">
          <div class="swap-card-badges">
            <span class="swap-pill-cat">${getCategoryLabel(item.category)}</span>
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
            <div class="swap-row">
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
  }).join("");

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

  if (currentUser) {
    guestBtns.style.display = "none";
    userPill.style.display = "inline-flex";
    if (dashHeaderBtn) dashHeaderBtn.style.display = "none";
    if (postWizardBtn) postWizardBtn.style.display = "inline-flex";
    if (dashLogoutBtn) dashLogoutBtn.style.display = "inline-flex";
    if (mobileDashBtn) mobileDashBtn.style.display = "block";
    if (mobileRegBtn) mobileRegBtn.style.display = "none";
    if (mobileAuthBtn) {
      mobileAuthBtn.textContent = "Log out (" + (currentUser.name.split(" ")[0] || "Account") + ")";
      mobileAuthBtn.onclick = () => { closeMobileMenu(); handleUserLogout(); };
    }
    const initials = (currentUser.name || "U").split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
    userPill.innerHTML = `
      <div class="user-pill" onclick="openDashboardModal('proposals')" title="Open Personal Swap Dashboard">
        <span class="user-pill-avatar">${initials}</span>
        <span>${currentUser.name.split(" ")[0]}</span>
        <span class="user-swaps-badge">${currentUser.freeSwaps} Swaps</span>
        <button type="button" class="user-logout-btn" onclick="event.stopPropagation(); handleUserLogout();" title="Log out / Delogare" aria-label="Log out">
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
  showToast("✓ Logged out successfully");
}

function activateUserAccount(userData) {
  currentUser = {
    name: userData.name || "Alexandru",
    email: userData.email || "",
    phone: userData.phone || "",
    country: userData.country || detectedIpInfo.countryName || "Europe",
    prefLang: userData.prefLang || currentLang,
    freeSwaps: 10
  };
  localStorage.setItem("ci4m_user", JSON.stringify(currentUser));
  if (userData.prefLang && window.TRANSLATIONS[userData.prefLang]) {
    setLanguage(userData.prefLang, true);
  }
  renderUserHeaderState();

  const counterEl = document.getElementById("liveUserCount");
  if (counterEl) {
    counterEl.textContent = "1,481";
  }
  showToast(`✓ ${currentUser.name} — 10 Free Swaps Activated!`);
}

function handleInlineRegistration(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const pass = fd.get("password");
  const confirm = fd.get("confirmPassword");
  if (pass !== confirm) {
    showToast("! Passwords do not match!");
    return;
  }
  startEmailVerification({
    name: fd.get("name"),
    email: fd.get("email"),
    phone: fd.get("phone"),
    country: fd.get("country"),
    prefLang: fd.get("prefLang")
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
    if (wantLabel) wantLabel.textContent = `${t("dealSaleOnly")} (Optional notes)`;
  } else {
    wantInput.required = true;
    if (wantInput.value === t("dealSaleOnly")) wantInput.value = "";
    if (wantLabel) wantLabel.textContent = t("quickTitleWant");
  }
}

function handleInlineQuickPost(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const locParts = String(fd.get("location") || "Germany, Munich").split(",");
  const country = (locParts[0] || "Germany").trim();
  const city = (locParts[1] || locParts[0] || "Munich").trim();
  const coords = COUNTRY_COORDS[country] || { lat: 48.13, lng: 11.58 };

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

  const newOffer = {
    id: Date.now(),
    category: cat,
    country,
    city,
    lat: coords.lat,
    lng: coords.lng,
    valueEur: normalizedValueEur,
    originalAmount: enteredVal,
    originalCurrency: enteredCurr,
    dealType,
    owner: currentUser ? currentUser.name : "Verified Member",
    verified: true,
    matchScore: 99,
    image: defaultImages[cat] || defaultImages.cars,
    specs: fd.get("desc") || "Direct Listing",
    title: fd.get("titleHave"),
    want: fd.get("titleWant") || (dealType === "sale" ? t("dealSaleOnly") : "Direct 1:1 Swap"),
    desc: fd.get("desc")
  };

  offers.unshift(newOffer);
  localStorage.setItem("ci4m_offers_v4", JSON.stringify(offers));
  currentCategoryFilter = "all";
  renderOffers();
  renderMapPinsAndPanel();
  e.target.reset();
  document.getElementById("offers").scrollIntoView({ behavior: "smooth" });
  showToast("✓ Offer Published Live!");
}

// ============================================================================
// AUTH MODAL (REGISTER / LOGIN)
// ============================================================================
let pendingRegistrationUser = null;
let verifyTimerInterval = null;
let verifySecondsRemaining = 60;
let generatedVerifyCode = "482910";

function openAuthModal(mode = "register") {
  document.getElementById("authModal").classList.add("open");
  document.body.classList.add("modal-open");
  switchAuthTab(mode);
}

function closeAuthModal() {
  document.getElementById("authModal").classList.remove("open");
  document.body.classList.remove("modal-open");
  if (verifyTimerInterval) {
    clearInterval(verifyTimerInterval);
    verifyTimerInterval = null;
  }
}

function switchAuthTab(mode) {
  const isReg = mode === "register";
  const isLogin = mode === "login";
  const isVerify = mode === "verify";

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

  startVerifyCountdown(60);
  showToast(`✓ ${t("authCodeSentMsg")} (Demo code: ${generatedVerifyCode})`);
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
  startVerifyCountdown(60);
  showToast(`✓ ${t("authCodeSentMsg")} (Demo code: ${generatedVerifyCode})`);
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
    prefLang: currentLang
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
  showToast("✓ Password reset link sent! Check your inbox.");
}

function handleModalRegister(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  if (fd.get("password") !== fd.get("confirmPassword")) {
    showToast("! Passwords do not match!");
    return;
  }
  startEmailVerification({
    name: fd.get("name"),
    email: fd.get("email"),
    phone: fd.get("phone"),
    country: fd.get("country"),
    prefLang: fd.get("prefLang")
  });
}

function handleModalLogin(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const email = String(fd.get("email") || "member@changeit4me.com");
  const nameFromEmail = email.split("@")[0].replace(/[._]/g, " ");
  activateUserAccount({
    name: nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1),
    email,
    prefLang: currentLang
  });
  closeAuthModal();
}

function handleGoogleAuth() {
  activateUserAccount({
    name: "Google Verified Member",
    email: "verified@gmail.com",
    prefLang: currentLang
  });
  closeAuthModal();
}

function handleAppleAuth() {
  activateUserAccount({
    name: "Apple ID Verified",
    email: "verified@icloud.com",
    prefLang: currentLang
  });
  closeAuthModal();
}

// ============================================================================
// 7-STEP SWAP LISTING WIZARD
// ============================================================================
function openWizardModal() {
  wizStep = 1;
  if (currentUser) {
    wizData.owner = currentUser.name;
    wizData.email = currentUser.email;
    wizData.phone = currentUser.phone;
  }
  document.getElementById("wizardModal").classList.add("open");
  document.body.classList.add("modal-open");
  renderWizStep();
}

function closeWizardModal() {
  document.getElementById("wizardModal").classList.remove("open");
  document.body.classList.remove("modal-open");
}

function goToWizStep(stepNum) {
  saveCurrentWizStepInputs();
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
  if (wizStep < 7) {
    wizStep++;
    renderWizStep();
  } else {
    publishWizardOffer();
  }
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
  if (q.length < 2) {
    suggEl.style.display = "none";
    return;
  }
  const activeCurr = document.getElementById("wizCurrencySelect")?.value || wizData.originalCurrency || currentCurrency;
  const allTemplates = [];
  Object.entries(SMART_WIZ_CATALOG).forEach(([catKey, groupObj]) => {
    groupObj.templates.forEach((tObj, i) => {
      allTemplates.push({ ...tObj, catKey, idx: i });
    });
  });
  const matches = allTemplates.filter(item =>
    `${item.title} ${item.specs} ${item.catKey}`.toLowerCase().includes(q)
  ).slice(0, 5);

  if (matches.length === 0) {
    suggEl.style.display = "none";
    return;
  }
  suggEl.innerHTML = matches.map(m => {
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
  renderWizStep();
}

function renderWizStep() {
  document.getElementById("wizMeterBar").style.width = `${(wizStep / 7) * 100}%`;
  document.getElementById("wizStepCounter").textContent = `Step ${wizStep} / 7`;
  document.getElementById("wizPrevBtn").style.visibility = wizStep === 1 ? "hidden" : "visible";
  document.getElementById("wizNextBtn").textContent = wizStep === 7 ? "✓ Publish Swap Offer" : "Next Step →";

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
      <h3 style="margin:0 0 14px;font-size:24px;">1. ${t("wizStep2")}</h3>
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
    const valLabel = t("quickValueEur").replace(/\(EUR\)|\(LEI\)|\(RON\)|\(USD\)|\(GBP\)|\(CHF\)|\(€\)|\(\$\)|\(£\)/gi, `(${cObj.short || cObj.code})`);
    const displayVal = wizData.originalAmount !== "" && wizData.originalAmount !== undefined
      ? wizData.originalAmount
      : (wizData.valueEur ? convertFromEur(wizData.valueEur, activeWizCurr) : "");
    const catCfg = SMART_WIZ_CATALOG[wizData.category] || SMART_WIZ_CATALOG.electronics;
    const ui = getSmartUiLabels();
    c.innerHTML = `
      <h3 style="margin:0 0 10px;font-size:22px;">2. ${t("wizStep3")} (${t("haveBadge")})</h3>

      <div class="wiz-smart-box">
        <div class="wiz-smart-header">
          <span>${ui.smartHeader} · ${getCategoryLabel(wizData.category)}</span>
          <span style="font-size:11px;font-weight:600;color:var(--muted);">1-Click Autocomplete</span>
        </div>
        <div style="font-size:11.5px;font-weight:700;color:var(--muted);margin-bottom:6px;">${ui.templatesHint}</div>
        <div class="wiz-chip-row">
          ${(catCfg.templates || []).map((tpl, idx) => `
            <button type="button" class="wiz-chip wiz-chip-tpl" onclick="applyWizSmartTemplate(${idx})">${tpl.title}</button>
          `).join("")}
        </div>
        ${(catCfg.groups || []).map(grp => `
          <div style="margin-top:8px;display:flex;align-items:center;flex-wrap:wrap;gap:5px;">
            <span style="font-size:11px;font-weight:800;color:var(--forest);margin-right:4px;">${grp.name}:</span>
            ${(grp.chips || []).map(ch => `
              <button type="button" class="wiz-chip" onclick="appendWizSmartChip('${ch.replace(/'/g, "\\'")}')">+ ${ch}</button>
            `).join("")}
          </div>
        `).join("")}
      </div>

      <div class="field-group" style="position:relative;margin-top:12px;">
        <label style="color:var(--ink);">${t("quickTitleHave")}</label>
        <input type="text" id="wizTitleHave" class="input-light" placeholder="${ui.titlePlaceholder}" value="${wizData.titleHave}" autocomplete="off" oninput="onWizTitleHaveInput(this.value)" />
        <div id="wizTitleSuggestions" class="wiz-autocomplete-list" style="display:none;"></div>
      </div>

      <div class="field-group">
        <label style="color:var(--ink);">${ui.specsLabel}</label>
        <input type="text" id="wizSpecsPreview" class="input-light" placeholder="${ui.specsPlaceholder}" value="${wizData.specs || ''}" oninput="wizData.specs = this.value" />
      </div>

      <div class="field-group">
        <label id="wizValueCurrencyLabel" style="color:var(--ink);">${valLabel}</label>
        <div style="display:grid;grid-template-columns:1fr 145px;gap:10px;">
          <input type="number" id="wizValueEur" class="input-light" value="${displayVal}" min="1" placeholder="1150" oninput="onWizPriceInputChange()" />
          <select id="wizCurrencySelect" class="input-light" onchange="onWizPriceInputChange()">
            ${(window.CURRENCIES || []).map(curr => `<option value="${curr.code}" ${curr.code === activeWizCurr ? 'selected' : ''}>${curr.code} (${curr.symbol})</option>`).join("")}
          </select>
        </div>
        <div id="wizParityPreview">${buildParityPreviewHtml(displayVal, activeWizCurr)}</div>
      </div>
    `;
  } else if (wizStep === 3) {
    const presets = [
      WIZ_CATEGORY_PHOTOS["cars"],
      WIZ_CATEGORY_PHOTOS["real-estate"],
      WIZ_CATEGORY_PHOTOS["electronics"],
      WIZ_CATEGORY_PHOTOS["home-garden"]
    ];
    c.innerHTML = `
      <h3 style="margin:0 0 8px;font-size:24px;">3. ${t("wizStep1")}</h3>
      <p style="color:var(--muted);margin:0 0 18px;">Upload a photo of your item/property or choose a quick preview photo below:</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:center;">
        <label style="border:2px dashed var(--forest);background:var(--mint-soft);border-radius:20px;padding:30px;text-align:center;cursor:pointer;display:flex;flex-direction:column;gap:10px;align-items:center;">
          <strong style="color:var(--forest);">+ Upload JPG / PNG from device</strong>
          <span style="font-size:13px;color:var(--muted);">Up to 10 high-resolution photos</span>
          <input type="file" accept="image/*" style="display:none;" onchange="handleWizFileUpload(event)" />
        </label>
        <div style="height:170px;border-radius:20px;background:url('${wizData.image}') 50%/cover no-repeat;border:2px solid var(--forest);"></div>
      </div>
      <p style="font-size:13px;font-weight:700;margin:16px 0 8px;color:var(--muted);">Or select a sample category photo:</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        ${presets.map(u => `
          <img src="${u}" onclick="selectWizPresetPhoto('${u}')" style="width:90px;height:64px;object-fit:cover;border-radius:12px;cursor:pointer;border:3px solid ${wizData.image === u ? 'var(--forest)' : 'transparent'};" alt="Preset" />
        `).join("")}
      </div>
    `;
  } else if (wizStep === 4) {
    const ui = getSmartUiLabels();
    c.innerHTML = `
      <h3 style="margin:0 0 14px;font-size:24px;">4. ${t("wizStep4")}</h3>
      <div class="field-group">
        <label style="color:var(--ink);">${ui.specsLabel}</label>
        <input type="text" id="wizSpecs" class="input-light" value="${wizData.specs}" oninput="wizData.specs = this.value" />
        <div class="wiz-chip-row" style="margin-top:8px;">
          <button type="button" class="wiz-chip" onclick="document.getElementById('wizSpecs').value += (document.getElementById('wizSpecs').value ? ' · ' : '') + 'Warranty / Invoice'; wizData.specs = document.getElementById('wizSpecs').value;">+ Warranty / Invoice</button>
          <button type="button" class="wiz-chip" onclick="document.getElementById('wizSpecs').value += (document.getElementById('wizSpecs').value ? ' · ' : '') + 'Original Box'; wizData.specs = document.getElementById('wizSpecs').value;">+ Original Box</button>
          <button type="button" class="wiz-chip" onclick="document.getElementById('wizSpecs').value += (document.getElementById('wizSpecs').value ? ' · ' : '') + 'Full Service History'; wizData.specs = document.getElementById('wizSpecs').value;">+ Full Service History</button>
          <button type="button" class="wiz-chip" onclick="document.getElementById('wizSpecs').value += (document.getElementById('wizSpecs').value ? ' · ' : '') + 'Accident-Free'; wizData.specs = document.getElementById('wizSpecs').value;">+ Accident-Free</button>
          <button type="button" class="wiz-chip" onclick="document.getElementById('wizSpecs').value += (document.getElementById('wizSpecs').value ? ' · ' : '') + 'Verified Owner'; wizData.specs = document.getElementById('wizSpecs').value;">+ Verified Owner</button>
        </div>
      </div>
      <div class="field-group">
        <label style="color:var(--ink);">${t("quickDescription")}</label>
        <textarea id="wizDesc" class="input-light" rows="3">${wizData.desc}</textarea>
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
        <input type="text" id="wizTitleWant" class="input-light" value="${wizData.titleWant || (isSaleOnly ? t('dealSaleOnly') : '')}" placeholder="${ui.titlePlaceholder}" />
        <div class="wiz-chip-row" style="margin-top:8px;">
          <button type="button" class="wiz-chip" onclick="document.getElementById('wizTitleWant').value='iPhone 16 Pro Max / iPad Pro M4 / MacBook Pro'; wizData.titleWant=document.getElementById('wizTitleWant').value;">iPhone / iPad / MacBook</button>
          <button type="button" class="wiz-chip" onclick="document.getElementById('wizTitleWant').value='SUV 2020+ (BMW X5, Mercedes GLE, Audi Q7)'; wizData.titleWant=document.getElementById('wizTitleWant').value;">${t("qtagCar")}</button>
          <button type="button" class="wiz-chip" onclick="document.getElementById('wizTitleWant').value='${t("qtagApartment")} / ${t("qtagHouse")}'; wizData.titleWant=document.getElementById('wizTitleWant').value;">${t("qtagApartment")} / ${t("qtagHouse")}</button>
          <button type="button" class="wiz-chip" onclick="document.getElementById('wizTitleWant').value='${t("dealSwapOrSale")}'; wizData.titleWant=document.getElementById('wizTitleWant').value;">${t("dealSwapOrSale")}</button>
        </div>
      </div>
    `;
  } else if (wizStep === 6) {
    const ui = getSmartUiLabels();
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
          <select id="wizCountry" class="input-light" onchange="wizData.country=this.value">
            ${Object.keys(COUNTRY_COORDS).map(cnt => `<option value="${cnt}" ${wizData.country === cnt ? 'selected' : ''}>${cnt}</option>`).join("")}
          </select>
        </div>
        <div class="field-group">
          <label style="color:var(--ink);">${ui.cityLabel}</label>
          <input type="text" id="wizCity" class="input-light" value="${wizData.city}" placeholder="Vienna / Munich / Bucharest / Paris" oninput="wizData.city=this.value" />
        </div>
      </div>
    `;
  } else if (wizStep === 7) {
    c.innerHTML = `
      <h3 style="margin:0 0 14px;font-size:24px;">7. ${t("wizStep7")} & Publish</h3>
      <div class="field-group">
        <label style="color:var(--ink);">${t("formFullName")}</label>
        <input type="text" id="wizOwner" class="input-light" value="${wizData.owner}" />
      </div>
      <div class="form-grid-2">
        <div class="field-group">
          <label style="color:var(--ink);">${t("formEmail")}</label>
          <input type="email" id="wizEmail" class="input-light" value="${wizData.email}" />
        </div>
        <div class="field-group">
          <label style="color:var(--ink);">${t("formPhone")}</label>
          <input type="tel" id="wizPhone" class="input-light" value="${wizData.phone}" />
        </div>
      </div>
    `;
  }
}

function publishWizardOffer() {
  const fallbackCoords = COUNTRY_COORDS[wizData.country] || { lat: 48.13, lng: 11.58 };
  const finalLat = wizData.lat || fallbackCoords.lat;
  const finalLng = wizData.lng || fallbackCoords.lng;
  const chosenCurr = wizData.originalCurrency || currentCurrency;
  const chosenAmt = Number(wizData.originalAmount) || convertFromEur(20000, chosenCurr);
  const exactEur = convertToEur(chosenAmt, chosenCurr);
  const newOffer = {
    id: Date.now(),
    category: wizData.category,
    country: wizData.country,
    city: wizData.city || "Center",
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
    want: wizData.titleWant || "Direct 1:1 Swap",
    desc: wizData.desc || "Ready for direct key-for-key exchange."
  };

  offers.unshift(newOffer);
  localStorage.setItem("ci4m_offers_v4", JSON.stringify(offers));
  closeWizardModal();
  currentCategoryFilter = "all";
  renderOffers();
  renderMapPinsAndPanel();
  document.getElementById("offers").scrollIntoView({ behavior: "smooth" });
  showToast("✓ Your 7-Step Swap Offer is now LIVE!");
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

  content.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--line);">
      <span style="margin:0;font-size:13.5px;color:var(--muted);font-weight:700;display:inline-flex;align-items:center;">${PREMIUM_ICONS.pin}${item.city}, ${item.country} · Owner: ${item.owner} (Verified ✓) · ${getDealTypeLabel(item.dealType)}</span>
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
            <strong style="display:block;margin-bottom:10px;color:var(--forest);font-size:15px;">⇄ ${t("proposeSwapBtn")} (0% Fee Direct Message)</strong>
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
              Send 1:1 Swap Proposal to ${item.owner} →
            </button>
          </form>
        </div>

        <!-- PANEL 2: DIRECT BUY / CASH OFFER -->
        <div id="offerActionBuyPanel" style="display:${startInBuyMode ? 'block' : 'none'};">
          <form onsubmit="submitDirectBuyOffer(event, ${item.id})" style="background:var(--mint-soft);padding:18px;border-radius:20px;border:1.5px solid var(--forest);">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
              <strong style="color:var(--forest);font-size:15px;">${t("buyOfferBtn")} · 0% Commission</strong>
              <span style="background:var(--forest);color:var(--mint);padding:3px 10px;border-radius:999px;font-size:12px;font-weight:800;">~ ${valFormatted}</span>
            </div>
            <div class="field-group">
              <label style="font-size:12px;color:var(--ink-soft);font-weight:700;">Your Cash Offer / Purchase Price</label>
              <div style="display:grid;grid-template-columns:1fr 110px;gap:8px;">
                <input type="number" id="buyOfferAmountInput" name="buyAmount" class="input-light" value="${theirValConverted}" required min="1" oninput="onBuyOfferPriceChange(${item.id})" />
                <select id="buyOfferCurrencySelect" name="buyCurrency" class="input-light" style="font-weight:700;" onchange="onBuyOfferPriceChange(${item.id})">
                  ${(window.CURRENCIES || []).map(curr => `<option value="${curr.code}" ${curr.code === currentCurrency ? 'selected' : ''}>${curr.code} (${curr.symbol})</option>`).join("")}
                </select>
              </div>
              <div id="buyOfferParityPreview">${buildParityPreviewHtml(theirValConverted, currentCurrency)}</div>
            </div>
            <div class="field-group">
              <label style="font-size:12px;color:var(--ink-soft);font-weight:700;">Payment & Handover Preference</label>
              <select name="paymentMethod" class="input-light">
                <option value="Bank Transfer / Cash on Handover">Bank Transfer / Cash on Safe Handover</option>
                <option value="Buy Now at Asking Price">Buy Immediately at Full Asking Price (~${valFormatted})</option>
                <option value="Notary / Verified Escrow Contract">Notary / Verified Sale Contract</option>
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
              Send Cash Purchase Offer to ${item.owner} →
            </button>
          </form>
        </div>
      </div>
    </div>
  `;

  modal.classList.add("open");
  document.body.classList.add("modal-open");
}

function closeOfferModal() {
  document.getElementById("offerModal").classList.remove("open");
  document.body.classList.remove("modal-open");
}

function submitDirectSwapProposal(e, offerId) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const item = offers.find(o => o.id === offerId);
  const loc = item ? getOfferLocalized(item) : { title: "Swap Offer" };
  const calcBanner = document.getElementById("calcResultBanner")?.innerText.replace(/\n/g, " ") || "1:1 Key-for-Key";

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
  updateFavCountUI();
  closeOfferModal();
  showToast("✓ Swap Proposal sent & saved to your Dashboard!");
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
  document.getElementById("dashboardModal").classList.add("open");
  document.body.classList.add("modal-open");
  switchDashboardTab(tab);
}

function closeDashboardModal() {
  document.getElementById("dashboardModal").classList.remove("open");
  document.body.classList.remove("modal-open");
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

  if (currentDashTab === "proposals") {
    container.innerHTML = swapProposals.map(p => `
      <div class="dash-list-item">
        <div>
          <span style="font-size:11.5px;font-weight:800;text-transform:uppercase;padding:2px 8px;border-radius:6px;background:${p.direction === 'Incoming' ? 'var(--mint)' : 'var(--forest)'};color:${p.direction === 'Incoming' ? 'var(--forest)' : '#fff'};">
            ${p.direction}
          </span>
          <strong style="display:block;font-size:16px;margin-top:6px;">${p.offeredItem} ⇄ ${p.targetTitle}</strong>
          <span style="font-size:13px;color:var(--muted);">Partner: ${p.partner} · ${p.cashBalance}</span>
        </div>
        <span style="font-size:12.5px;font-weight:700;color:var(--forest);white-space:nowrap;">✓ ${p.status}</span>
      </div>
    `).join("");
  } else if (currentDashTab === "mylistings") {
    const myItems = offers.slice(0, 3);
    container.innerHTML = `
      ${myItems.map(item => {
        const loc = getOfferLocalized(item);
        return `
          <div class="dash-list-item">
            <div style="display:flex;align-items:center;gap:12px;">
              <img src="${item.image}" style="width:64px;height:48px;object-fit:cover;border-radius:10px;" alt="" />
              <div>
                <strong>${loc.title}</strong>
                <span style="display:flex;align-items:center;font-size:12.5px;color:var(--muted);">${PREMIUM_ICONS.pin}${item.city}, ${item.country} · ~${formatOfferPrice(item, currentCurrency)}</span>
              </div>
            </div>
            <button type="button" class="btn btn-login" style="padding:7px 14px;font-size:12.5px;" onclick="closeDashboardModal(); openOfferModal(${item.id}, 'details')">View</button>
          </div>
        `;
      }).join("")}
      <button type="button" class="btn btn-mint btn-block" style="margin-top:12px;" onclick="closeDashboardModal(); openWizardModal();">
        ${t("navPostSwap")} →
      </button>
    `;
  } else if (currentDashTab === "favorites") {
    const favOffers = offers.filter(o => favoriteIds.includes(o.id));
    if (favOffers.length === 0) {
      container.innerHTML = `<p style="color:var(--muted);">No saved favorites yet. Click the heart icon on any swap offer card to save it here.</p>`;
    } else {
      container.innerHTML = favOffers.map(item => {
        const loc = getOfferLocalized(item);
        return `
          <div class="dash-list-item">
            <div>
              <strong>${loc.title}</strong>
              <span style="display:flex;align-items:center;font-size:13px;color:var(--muted);">${PREMIUM_ICONS.pin}${item.city}, ${item.country} · ${t("wantBadge")}: ${loc.want}</span>
            </div>
            <button type="button" class="btn btn-mint" style="padding:8px 14px;font-size:13px;" onclick="closeDashboardModal(); openOfferModal(${item.id}, 'propose')">
              ⇄ ${t("proposeSwapBtn")}
            </button>
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

  setTimeout(() => {
    box.innerHTML += `
      <div class="chat-bubble bot">
        ✓ We found matching owners in our live catalog! You can propose a 1:1 swap directly on any card or <a href="#enroll" onclick="toggleChatDock()" style="text-decoration:underline;font-weight:700;color:var(--forest);">register for 10 free swaps</a>.
      </div>
    `;
    box.scrollTop = box.scrollHeight;
  }, 400);
}

// ============================================================================
// MOBILE MENU, SCROLL & TOAST HELPERS
// ============================================================================
function closeMobileMenu() {
  document.body.classList.add("mobile-started");
  document.getElementById("mobilePanel").classList.remove("open");
  document.getElementById("mobileMenuBtn").setAttribute("aria-expanded", "false");
}

function scrollToMobileHub() {
  document.body.classList.add("mobile-started");
  window.scrollTo({ top: 0, behavior: "instant" });
}

function exitMobileStartScreen() {
  document.body.classList.remove("mobile-started");
  window.scrollTo({ top: 0, behavior: "instant" });
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
