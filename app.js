// Default Language: EN ("en") + Automatic European Geo-IP Language Routing + Full Swap Platform
function escapeHtml(raw) {
  if (raw === null || raw === undefined) return "";
  return String(raw)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function escapeJsStr(raw) {
  return escapeHtml(String(raw ?? "").replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\r?\n/g, " "));
}
let dsaReports = (() => {
  try {
    const saved = localStorage.getItem("ci4m_dsa_reports_v1");
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
})();
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
let currentDashTab = "mylistings";
let favoriteIds = (() => {
  try {
    localStorage.removeItem("ci4m_favs");
    if (!localStorage.getItem("ci4m_user")) {
      localStorage.removeItem("ci4m_favs_v2");
      return [];
    }
    const saved = localStorage.getItem("ci4m_favs_v2");
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
})();
function normalizeSeedProposals(list) {
  if (!Array.isArray(list)) return [];
  return list.map(p => {
    if (p && Number(p.id) === 901) {
      return {
        ...p,
        id: 901,
        direction: "Incoming",
        offerId: 101,
        targetTitle: "2022 Porsche Macan S (38,000 km)",
        offeredItem: "2023 Audi Q8 e-tron 55 Quattro (24,000 km)",
        offeredImage: "https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=600&q=80",
        targetImage: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=600&q=80",
        partner: "Markus Weber (Munich, Germany)",
        senderEmail: "markus.weber@changeit4me.de",
        partnerPhone: "+49 171 440 8210",
        cashBalance: "1:1 Key-for-Key (€0)",
        status: p.status || "Ready for Inspection"
      };
    }
    if (p && Number(p.id) === 902) {
      return {
        ...p,
        id: 902,
        direction: "Incoming",
        offerId: 104,
        targetTitle: "Modern 3-Room Apartment in Cluj-Napoca",
        offeredItem: "3-Room Penthouse in Bucharest North (Herăstrău)",
        offeredImage: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600&q=80",
        targetImage: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=600&q=80",
        partner: "Elena Voicu (Bucharest, Romania)",
        senderEmail: "elena.voicu@changeit4me.ro",
        partnerPhone: "+40 723 510 890",
        cashBalance: "+ €10,000 Cash Top-up",
        status: p.status || "New Match Proposal"
      };
    }
    return p;
  });
}
let swapProposals = (() => {
  try {
    const saved = localStorage.getItem("ci4m_proposals");
    if (saved) return normalizeSeedProposals(JSON.parse(saved));
  } catch (e) { }
  return normalizeSeedProposals([
    { id: 901, direction: "Incoming", offerId: 101, status: "Ready for Inspection" },
    { id: 902, direction: "Incoming", offerId: 104, status: "New Match Proposal" }
  ]);
})();
let deletedOfferIds = (() => {
  try {
    const saved = localStorage.getItem("ci4m_deleted_offers_v1");
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
})();
let deletedProposalIds = (() => {
  try {
    const saved = localStorage.getItem("ci4m_deleted_proposals_v1");
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
})();
let deletedWatchlistIds = (() => {
  try {
    const saved = localStorage.getItem("ci4m_deleted_watchlist_v1");
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
  } catch (e) { }
  return [...baseOffers];
})();
function saveOffersToStorage() {
  try {
    localStorage.setItem("ci4m_offers_v4", JSON.stringify(offers));
    const customOrEdited = offers.filter(o => o.createdByUser || o.id > 100000);
    localStorage.setItem("ci4m_user_offers_v1", JSON.stringify(customOrEdited));
    localStorage.setItem("ci4m_deleted_offers_v1", JSON.stringify(deletedOfferIds));
    if (typeof scheduleCloudSyncPush === "function") scheduleCloudSyncPush();
  } catch (e) { }
}
let currentDealModeFilter = "all";
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
    if (typeof scheduleCloudSyncPush === "function") scheduleCloudSyncPush();
  } catch (e) { }
}
let currentUser = (() => {
  try {
    const saved = localStorage.getItem("ci4m_user");
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    return null;
  }
})();
let watchlistAlerts = (() => {
  try {
    const saved = localStorage.getItem("ci4m_watchlist_alerts");
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
})();
function saveWatchlistAlerts() {
  try {
    localStorage.setItem("ci4m_watchlist_alerts", JSON.stringify(watchlistAlerts));
    if (typeof scheduleCloudSyncPush === "function") scheduleCloudSyncPush();
  } catch (e) { }
}
let gdprConsent = (() => {
  try {
    const saved = localStorage.getItem("ci4m_gdpr_consent_v1");
    if (saved) return JSON.parse(saved);
  } catch (e) { }
  return { essential: true, functional: true, decided: false, timestamp: null };
})();
function saveGdprConsentState() {
  try {
    localStorage.setItem("ci4m_gdpr_consent_v1", JSON.stringify(gdprConsent));
  } catch (e) { }
}
function getGdprUiCopy() {
  const map = {
    ro: {
      bannerTitle: "Protecția Datelor (GDPR) & Preferințe Stocare Locală",
      bannerDesc: "Folosim stocare locală strict necesară pentru sesiune și opțional preferințe funcționale (limbă, monedă, detecție regiune Geo-IP). Fără cookie-uri de tracking sau reclame terțe.",
      btnSettings: "Setări GDPR",
      btnEssential: "Doar Esențiale",
      btnAcceptAll: "Acceptă Tot",
      footerLink: "GDPR & Consimțământ",
      modalBadge: "Conformitate UE · GDPR (Reg. 2016/679) & ePrivacy",
      modalTitle: "Centrul de Confidențialitate, GDPR & Cookies",
      modalSub: "Controlează transparent ce date sunt stocate local în browserul tău conform Art. 6 și Art. 7 din GDPR.",
      catEssentialTitle: "1. Stocare Strict Necesară (Esențială)",
      catEssentialDesc: "Necesară pentru autentificare, securitatea contului, favorite și propunerile tale de schimb 1:1. Nu poate fi dezactivată.",
      alwaysActive: "Mereu Activ",
      catFuncTitle: "2. Preferințe Funcționale & Rutare Geo-IP Europeană",
      catFuncDesc: "Permite memorarea limbii/monedei alese, salvarea ciornei în Wizard-ul de 7 pași și detecția automată a țării prin Geo-IP la prima vizită.",
      savePrefsBtn: "Salvează Preferințele GDPR",
      acceptAllBtn: "Acceptă Toate",
      savedToast: "✓ Preferințele GDPR & ePrivacy au fost salvate!",
      rightsTitle: "Drepturile Tale GDPR (Art. 15, 17, 20)",
      rightsSub: "Conform Regulamentului (UE) 2016/679, ai dreptul de acces, portabilitate (export JSON) și ștergere completă a datelor („Dreptul de a fi uitat”).",
      exportBtn: "Exportă Datele Mele (JSON)",
      deleteAccBtn: "Șterge Contul & Toate Datele",
      consentPrefsBtn: "Preferințe GDPR & Cookies",
      exportedToast: "✓ Arhiva cu datele tale personale (GDPR Art. 20) a fost generată și descărcată!",
      deletedToast: "✓ Contul și toate datele asociate au fost șterse definitiv conform GDPR Art. 17.",
      dsaReportBtn: "Raportează (DSA)",
      dsaReportedToast: "✓ Raport înregistrat conform EU Digital Services Act (DSA). Anunțul va fi verificat.",
      gdprContactNote: "Protecție GDPR: Datele tale de contact sunt transmise exclusiv proprietarului verificat pentru acest schimb direct.",
      wizConsentLabel: "Confirm că sunt proprietarul de drept al bunului și accept Termenii de Utilizare și Politica de Confidențialitate GDPR."
    },
    en: {
      bannerTitle: "Data Privacy (GDPR) & Local Storage Consent",
      bannerDesc: "We use strictly necessary local storage for your session and optional functional preferences (language, currency, Geo-IP region). Zero third-party ad trackers.",
      btnSettings: "GDPR Settings",
      btnEssential: "Essential Only",
      btnAcceptAll: "Accept All",
      footerLink: "GDPR & Consent",
      modalBadge: "EU Compliance · GDPR (Reg. 2016/679) & ePrivacy",
      modalTitle: "Privacy, GDPR & Cookie Preferences Center",
      modalSub: "Control what data is stored locally in your browser in full compliance with GDPR Art. 6 and Art. 7.",
      catEssentialTitle: "1. Strictly Necessary Storage (Essential)",
      catEssentialDesc: "Required for account login, session security, saved favorites, and your 1:1 swap proposals. Cannot be disabled.",
      alwaysActive: "Always Active",
      catFuncTitle: "2. Functional Preferences & European Geo-IP Routing",
      catFuncDesc: "Remembers your chosen language/currency, saves 7-Step Wizard drafts, and enables automatic European country Geo-IP detection.",
      savePrefsBtn: "Save GDPR Preferences",
      acceptAllBtn: "Accept All",
      savedToast: "✓ Your GDPR & ePrivacy preferences have been saved!",
      rightsTitle: "Your GDPR Data Rights (Art. 15, 17, 20)",
      rightsSub: "Under EU Regulation 2016/679, you have the right to access, export (JSON portability), and permanently erase your personal data ('Right to be Forgotten').",
      exportBtn: "Export My Data (JSON)",
      deleteAccBtn: "Delete Account & Erase Data",
      consentPrefsBtn: "GDPR & Cookie Settings",
      exportedToast: "✓ Your personal data archive (GDPR Art. 20) has been generated and downloaded!",
      deletedToast: "✓ Your account and all associated data have been permanently erased (GDPR Art. 17).",
      dsaReportBtn: "Report Ad (DSA)",
      dsaReportedToast: "✓ Listing reported under the EU Digital Services Act (DSA). Our team will review it.",
      gdprContactNote: "GDPR Privacy: Your contact details are shared strictly peer-to-peer with the verified owner.",
      wizConsentLabel: "I confirm rightful ownership of this item and agree to the Terms of Use and GDPR Privacy Policy."
    },
    de: {
      bannerTitle: "Datenschutz (DSGVO) & Lokale Speicherung",
      bannerDesc: "Wir nutzen technisch notwendigen lokalen Speicher für Ihre Sitzung sowie optionale Komfort-Einstellungen (Sprache, Währung, Geo-IP). Keine Werbe-Tracker.",
      btnSettings: "DSGVO-Optionen",
      btnEssential: "Nur Notwendige",
      btnAcceptAll: "Alle akzeptieren",
      footerLink: "DSGVO & Cookies",
      modalBadge: "EU-Konformität · DSGVO (VO 2016/679) & ePrivacy",
      modalTitle: "Datenschutz-, DSGVO- & Cookie-Zentrum",
      modalSub: "Steuern Sie transparent, welche Daten gemäß Art. 6 und Art. 7 DSGVO lokal gespeichert werden.",
      catEssentialTitle: "1. Technisch notwendige Speicherung (Essenziell)",
      catEssentialDesc: "Erforderlich für Login, Sitzungssicherheit, Favoriten und Ihre 1:1-Tauschvorschläge.",
      alwaysActive: "Immer aktiv",
      catFuncTitle: "2. Funktionale Präferenzen & Europäische Geo-IP-Erkennung",
      catFuncDesc: "Speichert Ihre Sprach-/Währungsauswahl, Entwürfe im 7-Schritte-Assistenten und erkennt automatisch Ihr Land per Geo-IP.",
      savePrefsBtn: "DSGVO-Auswahl speichern",
      acceptAllBtn: "Alle akzeptieren",
      savedToast: "✓ Ihre DSGVO- & Datenschutz-Einstellungen wurden gespeichert!",
      rightsTitle: "Ihre DSGVO-Betroffenenrechte (Art. 15, 17, 20)",
      rightsSub: "Gemäß EU-DSGVO haben Sie das Recht auf Auskunft, Datenübertragbarkeit (JSON-Export) und vollständige Löschung („Recht auf Vergessenwerden“).",
      exportBtn: "Meine Daten exportieren (JSON)",
      deleteAccBtn: "Konto & alle Daten löschen",
      consentPrefsBtn: "DSGVO- & Cookie-Einstellungen",
      exportedToast: "✓ Ihr persönliches Datenarchiv (Art. 20 DSGVO) wurde heruntergeladen!",
      deletedToast: "✓ Ihr Konto und alle zugehörigen Daten wurden gemäß Art. 17 DSGVO endgültig gelöscht.",
      dsaReportBtn: "Melden (DSA)",
      dsaReportedToast: "✓ Inserat gemäß EU Digital Services Act (DSA) gemeldet.",
      gdprContactNote: "DSGVO-Schutz: Ihre Kontaktdaten werden ausschließlich direkt an den geprüften Eigentümer übermittelt.",
      wizConsentLabel: "Ich bestätige das rechtmäßige Eigentum und stimme den Nutzungsbedingungen sowie der DSGVO-Datenschutzerklärung zu."
    },
    fr: {
      bannerTitle: "Protection des Données (RGPD) & Stockage Local",
      bannerDesc: "Nous utilisons un stockage local strictement nécessaire pour votre session et des préférences fonctionnelles optionnelles (langue, devise, Géo-IP). Aucun traceur publicitaire.",
      btnSettings: "Paramètres RGPD",
      btnEssential: "Essentiels seuls",
      btnAcceptAll: "Tout accepter",
      footerLink: "RGPD & Consentement",
      modalBadge: "Conformité UE · RGPD (Règl. 2016/679) & ePrivacy",
      modalTitle: "Centre de Confidentialité, RGPD & Cookies",
      modalSub: "Contrôlez les données stockées localement conformément aux articles 6 et 7 du RGPD.",
      catEssentialTitle: "1. Stockage Strictement Nécessaire (Essentiel)",
      catEssentialDesc: "Indispensable pour la connexion, la sécurité, les favoris et vos propositions d'échange 1:1.",
      alwaysActive: "Toujours actif",
      catFuncTitle: "2. Préférences Fonctionnelles & Routage Géo-IP Européen",
      catFuncDesc: "Mémorise votre langue/devise, vos brouillons d'annonce et active la détection automatique du pays par Géo-IP.",
      savePrefsBtn: "Enregistrer mes choix RGPD",
      acceptAllBtn: "Tout accepter",
      savedToast: "✓ Vos préférences RGPD & ePrivacy ont été enregistrées !",
      rightsTitle: "Vos Droits RGPD (Art. 15, 17, 20)",
      rightsSub: "Conformément au RGPD, vous disposez d'un droit d'accès, de portabilité (export JSON) et d'effacement complet (« Droit à l'oubli »).",
      exportBtn: "Exporter mes données (JSON)",
      deleteAccBtn: "Supprimer le compte et les données",
      consentPrefsBtn: "Préférences RGPD & Cookies",
      exportedToast: "✓ Votre archive de données personnelles (RGPD Art. 20) a été téléchargée !",
      deletedToast: "✓ Votre compte et toutes vos données ont été définitivement supprimés (RGPD Art. 17).",
      dsaReportBtn: "Signaler (DSA)",
      dsaReportedToast: "✓ Annonce signalée conformément au Digital Services Act (DSA) de l'UE.",
      gdprContactNote: "Protection RGPD : Vos coordonnées sont transmises uniquement au propriétaire vérifié.",
      wizConsentLabel: "Je confirme être le propriétaire légitime du bien et j'accepte les Conditions d'utilisation et la Politique RGPD."
    },
    it: {
      bannerTitle: "Protezione Dati (GDPR) & Consenso Archiviazione",
      bannerDesc: "Utilizziamo archiviazione locale strettamente necessaria per la sessione e preferenze funzionali opzionali (lingua, valuta, Geo-IP). Zero tracker pubblicitari.",
      btnSettings: "Impostazioni GDPR",
      btnEssential: "Solo Essenziali",
      btnAcceptAll: "Accetta Tutto",
      footerLink: "GDPR & Consenso",
      modalBadge: "Conformità UE · GDPR (Reg. 2016/679) & ePrivacy",
      modalTitle: "Centro Privacy, GDPR e Preferenze Cookie",
      modalSub: "Controlla in modo trasparente quali dati vengono salvati localmente ai sensi degli artt. 6 e 7 del GDPR.",
      catEssentialTitle: "1. Archiviazione Strettamente Necessaria (Essenziale)",
      catEssentialDesc: "Necessaria per accesso, sicurezza, preferiti e proposte di scambio 1:1. Non disattivabile.",
      alwaysActive: "Sempre attivo",
      catFuncTitle: "2. Preferenze Funzionali & Rilevamento Geo-IP Europeo",
      catFuncDesc: "Ricorda lingua/valuta, salva le bozze del Wizard in 7 passi e abilita il rilevamento automatico del paese via Geo-IP.",
      savePrefsBtn: "Salva Preferenze GDPR",
      acceptAllBtn: "Accetta Tutto",
      savedToast: "✓ Preferenze GDPR ed ePrivacy salvate!",
      rightsTitle: "I Tuoi Diritti GDPR (Artt. 15, 17, 20)",
      rightsSub: "Ai sensi del Regolamento UE 2016/679, hai diritto di accesso, portabilità (esportazione JSON) e cancellazione totale («Diritto all'oblio»).",
      exportBtn: "Esporta i miei dati (JSON)",
      deleteAccBtn: "Elimina account e tutti i dati",
      consentPrefsBtn: "Impostazioni GDPR & Cookie",
      exportedToast: "✓ L'archivio dei tuoi dati personali (GDPR Art. 20) è stato scaricato!",
      deletedToast: "✓ Account e dati personali cancellati definitivamente ai sensi dell'Art. 17 GDPR.",
      dsaReportBtn: "Segnala (DSA)",
      dsaReportedToast: "✓ Annuncio segnalato ai sensi del Digital Services Act (DSA) dell'UE.",
      gdprContactNote: "Tutela GDPR: I tuoi recapiti sono condivisi esclusivamente con il proprietario verificato.",
      wizConsentLabel: "Confermo la legittima proprietà del bene e accetto i Termini di utilizzo e l'Informativa GDPR."
    },
    es: {
      bannerTitle: "Protección de Datos (RGPD) y Almacenamiento Local",
      bannerDesc: "Usamos almacenamiento local estrictamente necesario para tu sesión y preferencias funcionales opcionales (idioma, moneda, Geo-IP). Sin rastreadores publicitarios.",
      btnSettings: "Ajustes RGPD",
      btnEssential: "Solo Esenciales",
      btnAcceptAll: "Aceptar Todo",
      footerLink: "RGPD y Consentimiento",
      modalBadge: "Cumplimiento UE · RGPD (Reg. 2016/679) y ePrivacy",
      modalTitle: "Centro de Privacidad, RGPD y Cookies",
      modalSub: "Controla qué datos se almacenan localmente en tu navegador conforme a los arts. 6 y 7 del RGPD.",
      catEssentialTitle: "1. Almacenamiento Estrictamente Necesario (Esencial)",
      catEssentialDesc: "Necesario para iniciar sesión, seguridad, favoritos y tus propuestas de intercambio 1:1.",
      alwaysActive: "Siempre activo",
      catFuncTitle: "2. Preferencias Funcionales y Detección Geo-IP Europea",
      catFuncDesc: "Recuerda tu idioma/moneda, guarda borradores del asistente de 7 pasos y detecta el país por Geo-IP.",
      savePrefsBtn: "Guardar Preferencias RGPD",
      acceptAllBtn: "Aceptar Todo",
      savedToast: "✓ ¡Tus preferencias de RGPD y privacidad han sido guardadas!",
      rightsTitle: "Tus Derechos RGPD (Arts. 15, 17, 20)",
      rightsSub: "Bajo el Reglamento UE 2016/679, tienes derecho de acceso, portabilidad (exportar JSON) y supresión total («Derecho al olvido»).",
      exportBtn: "Exportar mis datos (JSON)",
      deleteAccBtn: "Eliminar cuenta y borrar datos",
      consentPrefsBtn: "Preferencias RGPD y Cookies",
      exportedToast: "✓ ¡Tu archivo de datos personales (RGPD Art. 20) ha sido descargado!",
      deletedToast: "✓ Tu cuenta y todos los datos asociados han sido eliminados definitivamente (RGPD Art. 17).",
      dsaReportBtn: "Reportar (DSA)",
      dsaReportedToast: "✓ Anuncio reportado conforme a la Ley de Servicios Digitales (DSA) de la UE.",
      gdprContactNote: "Privacidad RGPD: Tus datos de contacto se envían únicamente al propietario verificado.",
      wizConsentLabel: "Confirmo la propiedad legítima del artículo y acepto los Términos de uso y la Política de privacidad RGPD."
    },
    ru: {
      bannerTitle: "Защита данных (GDPR) и локальное хранилище",
      bannerDesc: "Мы используем строго необходимое локальное хранилище для вашей сессии и опциональные функциональные настройки (язык, валюта, Geo-IP). Без рекламных трекеров.",
      btnSettings: "Настройки GDPR",
      btnEssential: "Только необходимые",
      btnAcceptAll: "Принять все",
      footerLink: "GDPR и согласие",
      modalBadge: "Соответствие ЕС · GDPR (Регл. 2016/679) и ePrivacy",
      modalTitle: "Центр конфиденциальности, GDPR и файлов Cookie",
      modalSub: "Управляйте данными, сохраняемыми локально в вашем браузере согласно ст. 6 и ст. 7 GDPR.",
      catEssentialTitle: "1. Строго необходимое хранилище (Обязательное)",
      catEssentialDesc: "Необходимо для входа в аккаунт, безопасности, избранного и ваших предложений обмена 1:1.",
      alwaysActive: "Всегда активно",
      catFuncTitle: "2. Функциональные настройки и европейский Geo-IP",
      catFuncDesc: "Сохраняет выбранный язык/валюту, черновики в мастере из 7 шагов и определяет страну через Geo-IP.",
      savePrefsBtn: "Сохранить настройки GDPR",
      acceptAllBtn: "Принять все",
      savedToast: "✓ Ваши настройки GDPR и конфиденциальности сохранены!",
      rightsTitle: "Ваши права по GDPR (ст. 15, 17, 20)",
      rightsSub: "Согласно Регламенту ЕС 2016/679, вы имеете право на доступ, переносимость (экспорт JSON) и полное удаление данных («Право на забвение»).",
      exportBtn: "Экспорт моих данных (JSON)",
      deleteAccBtn: "Удалить аккаунт и все данные",
      consentPrefsBtn: "Настройки GDPR и Cookie",
      exportedToast: "✓ Архив ваших персональных данных (ст. 20 GDPR) сформирован и скачан!",
      deletedToast: "✓ Ваш аккаунт и все связанные данные безвозвратно удалены (ст. 17 GDPR).",
      dsaReportBtn: "Пожаловаться (DSA)",
      dsaReportedToast: "✓ Жалоба отправлена согласно Закону ЕС о цифровых услугах (DSA).",
      gdprContactNote: "Защита GDPR: Ваши контактные данные передаются напрямую только проверенному владельцу.",
      wizConsentLabel: "Я подтверждаю право собственности и принимаю Условия использования и Политику конфиденциальности GDPR."
    }
  };
  return map[currentLang] || map.en;
}
function renderGdprBannerText() {
  const g = getGdprUiCopy();
  const titleEl = document.getElementById("gdprBannerTitle");
  const descEl = document.getElementById("gdprBannerDesc");
  const btnSet = document.getElementById("gdprBtnSettings");
  const btnEss = document.getElementById("gdprBtnEssential");
  const btnAll = document.getElementById("gdprBtnAcceptAll");
  const footLink = document.getElementById("footerGdprLink");
  if (titleEl) titleEl.textContent = g.bannerTitle;
  if (descEl) descEl.textContent = g.bannerDesc;
  if (btnSet) btnSet.textContent = g.btnSettings;
  if (btnEss) btnEss.textContent = g.btnEssential;
  if (btnAll) btnAll.textContent = g.btnAcceptAll;
  if (footLink) footLink.textContent = g.footerLink;
  const sampleChipCopy = {
    ro: { cars: "+ Auto (Porsche / BMW)", re: "+ Imobiliare (Apartament / Vilă)", tech: "+ Tech (iPhone 16 / MacBook)" },
    en: { cars: "+ Cars (Porsche / BMW)", re: "+ Real Estate (Apartment / Villa)", tech: "+ Tech (iPhone 16 / MacBook)" },
    de: { cars: "+ Autos (Porsche / BMW)", re: "+ Immobilien (Wohnung / Villa)", tech: "+ Tech (iPhone 16 / MacBook)" },
    fr: { cars: "+ Auto (Porsche / BMW)", re: "+ Immobilier (Appartement / Villa)", tech: "+ Tech (iPhone 16 / MacBook)" },
    it: { cars: "+ Auto (Porsche / BMW)", re: "+ Immobili (Appartamento / Villa)", tech: "+ Tech (iPhone 16 / MacBook)" },
    es: { cars: "+ Autos (Porsche / BMW)", re: "+ Inmobiliaria (Piso / Villa)", tech: "+ Tech (iPhone 16 / MacBook)" },
    ru: { cars: "+ Авто (Porsche / BMW)", re: "+ Недвижимость (Квартира / Вилла)", tech: "+ Техника (iPhone 16 / MacBook)" }
  }[currentLang] || { cars: "+ Cars (Porsche / BMW)", re: "+ Real Estate (Apartment / Villa)", tech: "+ Tech (iPhone 16 / MacBook)" };
  const cCars = document.getElementById("quickSampleChipCars");
  const cRe = document.getElementById("quickSampleChipRealEstate");
  const cTech = document.getElementById("quickSampleChipElectronics");
  if (cCars) cCars.textContent = sampleChipCopy.cars;
  if (cRe) cRe.textContent = sampleChipCopy.re;
  if (cTech) cTech.textContent = sampleChipCopy.tech;
}
function initGdprBanner() {
  renderGdprBannerText();
  const banner = document.getElementById("gdprConsentBanner");
  if (!banner) return;
  if (!gdprConsent || !gdprConsent.decided) {
    banner.style.display = "block";
  } else {
    banner.style.display = "none";
  }
}
function acceptGdprConsent(mode = "all") {
  gdprConsent = {
    essential: true,
    functional: mode === "all",
    decided: true,
    timestamp: new Date().toISOString()
  };
  saveGdprConsentState();
  const banner = document.getElementById("gdprConsentBanner");
  if (banner) banner.style.display = "none";
  if (!gdprConsent.functional) {
    localStorage.removeItem("ci4m_wiz_draft_v1");
  }
  closeGuideModal();
  if (document.getElementById("dashboardModal")?.classList.contains("open") && currentDashTab === "profile") {
    renderDashboardContent();
  }
  showToast(getGdprUiCopy().savedToast);
}
function openGdprPreferencesModal() {
  const g = getGdprUiCopy();
  const content = document.getElementById("guideModalContent");
  if (!content) return;
  const funcChecked = gdprConsent.functional !== false ? "checked" : "";
  const cancelWord = { ro: "Anulează", en: "Cancel", de: "Abbrechen", fr: "Annuler", it: "Annulla", es: "Cancelar", ru: "Отмена" }[currentLang] || "Cancel";
  content.innerHTML = `
    <div class="hig-sheet-toolbar">
      <button type="button" class="hig-btn-cancel" onclick="closeGuideModal()">${cancelWord}</button>
      <h3 class="hig-sheet-title">${g.modalTitle}</h3>
      <button type="button" class="hig-btn-save" onclick="acceptGdprConsent('all')">${g.acceptAllBtn}</button>
    </div>
    <span style="background:#f1f5f4;color:#0f172a;border:1px solid rgba(15,23,42,0.08);padding:4px 12px;border-radius:999px;font-size:12px;font-weight:700;">${g.modalBadge}</span>
    <p style="font-size:13px;color:var(--muted);margin:10px 0 16px;">${g.modalSub}</p>
    <form onsubmit="saveGdprPreferences(event)" style="display:grid;gap:12px;">
      <div style="padding:14px 16px;background:#f5f7f7;border:1px solid rgba(15,23,42,0.08);border-radius:16px;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
        <div>
          <strong style="font-size:14px;color:#0f172a;display:block;margin-bottom:4px;">${g.catEssentialTitle}</strong>
          <span style="font-size:12.5px;color:#475569;line-height:1.45;display:block;">${g.catEssentialDesc}</span>
        </div>
        <span style="background:#0f172a;color:#ffffff;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;white-space:nowrap;">✓ ${g.alwaysActive}</span>
      </div>
      <label style="padding:14px 16px;background:#ffffff;border:1px solid rgba(15,23,42,0.1);border-radius:16px;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;cursor:pointer;">
        <div>
          <strong style="font-size:14px;color:#0f172a;display:block;margin-bottom:4px;">${g.catFuncTitle}</strong>
          <span style="font-size:12.5px;color:#64748b;line-height:1.45;display:block;">${g.catFuncDesc}</span>
        </div>
        <input type="checkbox" id="gdprFuncToggle" ${funcChecked} style="width:20px;height:20px;accent-color:#0f172a;margin-top:2px;flex-shrink:0;" />
      </label>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:6px;">
        <button type="submit" class="btn btn-dark" style="flex:1;border-radius:999px;">✓ ${g.savePrefsBtn}</button>
      </div>
    </form>
    <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--line);display:flex;gap:14px;flex-wrap:wrap;font-size:12.5px;">
      <a href="#before-trade" onclick="openGuideModal('privacy-policy'); return false;" style="color:var(--forest);font-weight:700;text-decoration:underline;">${t("footerPrivacyLink")}</a>
      <a href="#before-trade" onclick="openGuideModal('cookies-policy'); return false;" style="color:var(--forest);font-weight:700;text-decoration:underline;">${t("footerCookiesLink")}</a>
      <a href="#before-trade" onclick="openGuideModal('terms-of-use'); return false;" style="color:var(--forest);font-weight:700;text-decoration:underline;">${t("footerTermsLink")}</a>
    </div>
  `;
  document.getElementById("guideModal")?.classList.add("open");
  document.body.classList.add("modal-open");
}
function saveGdprPreferences(e) {
  if (e) e.preventDefault();
  const funcToggle = document.getElementById("gdprFuncToggle");
  const allowFunc = funcToggle ? Boolean(funcToggle.checked) : true;
  acceptGdprConsent(allowFunc ? "all" : "essential");
}
function exportUserGdprData() {
  const emailKey = String(currentUser?.email || "").trim().toLowerCase();
  const userListings = currentUser && typeof getAccountLinkedOffers === "function"
    ? getAccountLinkedOffers(currentUser)
    : offers.filter(o => emailKey && o.ownerEmail && String(o.ownerEmail).trim().toLowerCase() === emailKey);
  const userProposals = currentUser && typeof isProposalOwnedByCurrentUser === "function"
    ? swapProposals.filter(p => isProposalOwnedByCurrentUser(p))
    : [];
  const userWatchlist = emailKey
    ? watchlistAlerts.filter(w => !w.email || String(w.email).trim().toLowerCase() === emailKey)
    : [];
  const payload = {
    platform: "ChangeIt4Me Global 1:1 Exchange",
    gdprArticle: "Article 15 (Right of Access) & Article 20 (Right to Data Portability)",
    exportedAt: new Date().toISOString(),
    userProfile: currentUser || null,
    gdprConsentPreferences: gdprConsent,
    myListings: userListings,
    swapProposals: userProposals,
    savedFavoriteOfferIds: favoriteIds,
    watchlistAlerts: userWatchlist
  };
  try {
    const jsonStr = JSON.stringify(payload, null, 2);
    if (typeof Blob !== "undefined" && typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      if (a && typeof a.click === "function") {
        a.href = url;
        a.download = "changeit4me-gdpr-data.json";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      setTimeout(() => URL.revokeObjectURL && URL.revokeObjectURL(url), 1000);
    }
  } catch (err) { }
  showToast(getGdprUiCopy().exportedToast);
  return payload;
}
function deleteUserGdprAccount() {
  const emailKey = String(currentUser?.email || "").trim().toLowerCase();
  if (emailKey && accountsDb[emailKey]) {
    delete accountsDb[emailKey];
    saveAccountsDb();
  }
  const removedOfferIds = [];
  offers = offers.filter(o => {
    const matchByEmail = Boolean(emailKey && o.ownerEmail && String(o.ownerEmail).trim().toLowerCase() === emailKey);
    const matchAnon = Boolean(!emailKey && o.createdByUser && !o.ownerEmail);
    if (matchByEmail || matchAnon) {
      removedOfferIds.push(o.id);
      if (!deletedOfferIds.includes(o.id)) deletedOfferIds.push(o.id);
      return false;
    }
    return true;
  });
  currentUser = null;
  saveOffersToStorage();
  watchlistAlerts = emailKey
    ? watchlistAlerts.filter(w => String(w.email || "").trim().toLowerCase() !== emailKey)
    : [];
  saveWatchlistAlerts();
  swapProposals = emailKey
    ? swapProposals.filter(p => !isSameUserEmailAlias(p.senderEmail, emailKey) && !isSameUserEmailAlias(p.ownerEmail, emailKey))
    : [];
  favoriteIds = [];
  wizStep = 1;
  wizData = { ...DEFAULT_WIZ_DATA };
  localStorage.removeItem("ci4m_user");
  localStorage.removeItem("ci4m_saved_google_user_v1");
  localStorage.removeItem("ci4m_favs"); localStorage.removeItem("ci4m_favs_v2");
  localStorage.setItem("ci4m_proposals", JSON.stringify(swapProposals));
  localStorage.removeItem("ci4m_wiz_draft_v1");
  localStorage.removeItem("ci4m_wiz_draft_v2");
  if (typeof scheduleCloudSyncPush === "function" && (emailKey || removedOfferIds.length > 0)) {
    scheduleCloudSyncPush({
      deletedAccountEmails: emailKey ? [emailKey] : [],
      deletedOfferIds
    });
  }
  renderUserHeaderState();
  renderOffers();
  renderMapPinsAndPanel();
  closeDashboardModal();
  showToast(getGdprUiCopy().deletedToast);
}
function reportOfferListing(offerId, reason = "", notes = "") {
  const item = offers.find(o => o.id === Number(offerId));
  const g = getGdprUiCopy();
  const cleanReason = String(reason || "DSA Notice").trim();
  const cleanNotes = String(notes || "").trim();
  dsaReports.unshift({
    id: Date.now(),
    offerId: Number(offerId),
    title: item?.title || `#${offerId}`,
    reason: cleanReason,
    notes: cleanNotes,
    reporterEmail: currentUser?.email || "anonymous",
    createdAt: new Date().toISOString(),
    status: "Pending Review"
  });
  try {
    localStorage.setItem("ci4m_dsa_reports_v1", JSON.stringify(dsaReports.slice(0, 100)));
  } catch (e) { }
  const reasonSuffix = reason ? ` [${cleanReason}]` : "";
  showToast(`${g.dsaReportedToast} (#${offerId}${item ? " · " + item.title : ""}${reasonSuffix})`);
}
function openReportOfferSheet(offerId) {
  const item = offers.find(o => o.id === Number(offerId));
  const modal = document.getElementById("appleSheetModal");
  const card = document.getElementById("appleSheetCard");
  const content = document.getElementById("appleSheetContent");
  if (!modal || !content) {
    reportOfferListing(offerId);
    return;
  }
  if (card) card.classList.add("hig-alert-mode");
  const loc = item ? getOfferLocalized(item) : { title: `#${offerId}` };
  const dsaCopyMap = {
    en: { cancel: "Cancel", title: "Report Listing (EU DSA)", send: "Submit Report", reasonLbl: "Reason for report (EU DSA Art. 16)", r1: "Inaccurate Valuation / Misleading Price", r2: "Suspected Fake or Non-Compliant Item", r3: "Duplicate / Spam Listing", r4: "Invalid Contact Information", notesLbl: "Additional details (optional)", notesPh: "Briefly describe the issue..." },
    ro: { cancel: "Anulează", title: "Raportează Anunț (DSA)", send: "Trimite Raportul", reasonLbl: "Motivul raportării (Art. 16 DSA)", r1: "Valoare / preț nerealist sau înșelător", r2: "Anunț suspect / produs neconform", r3: "Anunț duplicat / Spam", r4: "Date de contact invalide", notesLbl: "Detalii suplimentare (opțional)", notesPh: "Descrie pe scurt problema..." },
    de: { cancel: "Abbrechen", title: "Inserat melden (EU DSA)", send: "Meldung senden", reasonLbl: "Grund der Meldung (EU DSA Art. 16)", r1: "Irreführender Preis / Bewertung", r2: "Verdacht auf Fälschung / Verstoß", r3: "Duplikat / Spam-Inserat", r4: "Ungültige Kontaktdaten", notesLbl: "Weitere Details (optional)", notesPh: "Problem kurz beschreiben..." },
    fr: { cancel: "Annuler", title: "Signaler l'annonce (DSA)", send: "Envoyer", reasonLbl: "Motif du signalement (Art. 16 DSA)", r1: "Prix ou évaluation trompeuse", r2: "Annonce suspecte / non conforme", r3: "Doublon / Spam", r4: "Coordonnées invalides", notesLbl: "Détails supplémentaires (optionnel)", notesPh: "Décrivez brièvement le problème..." },
    it: { cancel: "Annulla", title: "Segnala annuncio (DSA)", send: "Invia", reasonLbl: "Motivo della segnalazione (Art. 16 DSA)", r1: "Valutazione o prezzo ingannevole", r2: "Annuncio sospetto / non conforme", r3: "Annuncio duplicato / Spam", r4: "Contatti non validi", notesLbl: "Dettagli aggiuntivi (opzionale)", notesPh: "Descrivi brevemente il problema..." },
    es: { cancel: "Cancelar", title: "Reportar anuncio (DSA)", send: "Enviar", reasonLbl: "Motivo del reporte (Art. 16 DSA)", r1: "Precio o valoración engañosa", r2: "Anuncio sospechoso / no conforme", r3: "Anuncio duplicado / Spam", r4: "Datos de contacto inválidos", notesLbl: "Detalles adicionales (opcional)", notesPh: "Describe brevemente el problema..." },
    ru: { cancel: "Отмена", title: "Пожаловаться (EU DSA)", send: "Отправить", reasonLbl: "Причина жалобы (ст. 16 DSA)", r1: "Недостоверная цена / оценка", r2: "Подозрительное объявление", r3: "Дубликат / Спам", r4: "Неверные контактные данные", notesLbl: "Дополнительные детали (необязательно)", notesPh: "Кратко опишите проблему..." }
  };
  const dc = dsaCopyMap[currentLang] || dsaCopyMap.en;
  content.innerHTML = `
    <form onsubmit="event.preventDefault(); const r = this.querySelector('select[name=dsaReason]')?.value || ''; const n = this.querySelector('input[name=dsaNotes]')?.value || ''; closeAppleSheetModal(); reportOfferListing(${Number(offerId)}, r, n);">
      <div class="hig-sheet-toolbar">
        <button type="button" class="hig-btn-cancel" onclick="closeAppleSheetModal()">${dc.cancel}</button>
        <h3 class="hig-sheet-title">${dc.title}</h3>
        <button type="submit" class="hig-btn-destructive">${dc.send}</button>
      </div>
      <p style="margin:0 0 12px;font-size:13px;color:#475569;line-height:1.45;">
        <strong>#${Number(offerId)}</strong> · ${escapeHtml(loc.title)}
      </p>
      <div style="display:grid;gap:10px;margin-bottom:6px;">
        <div>
          <label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:4px;">${dc.reasonLbl}</label>
          <select name="dsaReason" class="input-light" style="height:40px;font-size:13px;">
            <option value="Inaccurate Valuation / Price">${dc.r1}</option>
            <option value="Suspected Fake / Counterfeit">${dc.r2}</option>
            <option value="Duplicate / Spam Listing">${dc.r3}</option>
            <option value="Unreachable Owner">${dc.r4}</option>
          </select>
        </div>
        <div>
          <label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:4px;">${dc.notesLbl}</label>
          <input type="text" name="dsaNotes" placeholder="${dc.notesPh}" class="input-light" style="height:40px;font-size:13px;" />
        </div>
      </div>
    </form>
  `;
  modal.classList.add("open");
  modal.scrollTop = 0;
  document.getElementById("mobileBottomTabBar")?.classList.remove("is-scroll-hidden");
  content.scrollTop = 0;
  document.body.classList.add("modal-open");
}
let guestFreeSwaps = (() => {
  try {
    const saved = localStorage.getItem("ci4m_guest_free_swaps");
    return saved !== null ? Number(saved) : 10;
  } catch (e) {
    return 10;
  }
})();
function getSubscriptionUiCopy() {
  const map = {
    ro: {
      plan1Heading: "Starter · Primele 10 Schimburi",
      perPack: "/ +15 schimburi",
      packBtn: "Cumpără Pachet +15 Schimburi →",
      plan3Tag: "PRO Nelimitat ∞",
      perMonth: "/ lună",
      plan3B1: "Schimburi, oferte și anunțuri NELIMITATE (∞)",
      plan3B2: "Insignă PRO Verificat & afișare prioritară în catalog și pe hartă",
      plan3B3: "Alerte Watchlist VIP instant & suport dedicat în 7 limbi",
      proBtn: "Activează Abonament PRO →",
      dashUpgradeBtn: "+ PRO / Credite",
      proBadgeText: "PRO ∞ Nelimitat",
      swapsWord: "Schimburi",
      exhaustedToast: "! Ai epuizat cele 10 schimburi gratuite! Alege un Pachet de +15 Schimburi sau Abonamentul PRO Nelimitat.",
      modalBadge: "Credite de Schimb & Abonament PRO · ChangeIt4Me",
      modalTitle: "Alege Pachetul de Schimburi sau Abonamentul PRO",
      modalSub: "Primele 10 schimburi sunt gratuite la înregistrare. Pentru a continua să publici anunțuri și să trimiți propuneri de schimb, alege opțiunea potrivită:",
      statusLabel: "Statusul contului tău:",
      statusPro: "Abonament PRO Activ — Schimburi & Anunțuri Nelimitate (∞)",
      statusCredits: "Credite disponibile:",
      optPackTitle: "Pachet +15 Schimburi (Pay-As-You-Go)",
      optPackDesc: "Adaugă instant +15 schimburi și anunțuri în cont. Fără abonament lunar, creditele nu expiră.",
      optProMonthlyTitle: "Abonament PRO Lunar (Nelimitat ∞)",
      optProMonthlyDesc: "Schimburi și anunțuri nelimitate în toate categoriile + Insignă PRO Verificat + Promovare pe hartă.",
      optProYearlyTitle: "Abonament PRO Anual (-35% Reducere · Nelimitat ∞)",
      optProYearlyDesc: "12 luni de schimburi și anunțuri nelimitate (∞), prioritate maximă în AI Smart Match și asistență VIP.",
      payMethodLabel: "Metodă de plată securizată:",
      payCard: "Card Bancar (Visa / Mastercard / Maestro)",
      payWallet: "Apple Pay / Google Pay (1-Click)",
      payBank: "Transfer Bancar Instant (SEPA / Revolut)",
      activateBtn: "Activează Acum & Deblochează Schimburile →",
      packActivatedToast: "✓ +15 Credite de Schimb au fost adăugate în contul tău!",
      proActivatedToast: "✓ Abonamentul PRO Nelimitat (∞) a fost activat cu succes!",
      zeroSimulatedToast: "! Simulare activată: Contul are acum 0 schimburi gratuite rămase. Încearcă să trimiți o propunere sau să postezi un anunț!",
      dashCardTitle: "Abonament & Credite de Schimb (Primele 10 Gratuite)",
      dashSimulateZeroBtn: "Simulează 0 schimburi (Test Paywall)"
    },
    en: {
      plan1Heading: "Starter · 10 Free Swaps",
      perPack: "/ +15 swaps",
      packBtn: "Buy +15 Swaps Pack →",
      plan3Tag: "PRO Unlimited ∞",
      perMonth: "/ month",
      plan3B1: "UNLIMITED (∞) swap proposals, buy offers & listings",
      plan3B2: "PRO Verified badge & priority placement on map and catalog",
      plan3B3: "Instant VIP Watchlist alerts & priority 7-language support",
      proBtn: "Activate PRO Subscription →",
      dashUpgradeBtn: "+ PRO / Credits",
      proBadgeText: "PRO ∞ Unlimited",
      swapsWord: "Swaps",
      exhaustedToast: "! You have used all 10 free swaps! Please unlock a +15 Swap Pack or an Unlimited PRO Subscription.",
      modalBadge: "Swap Credits & PRO Subscription · ChangeIt4Me",
      modalTitle: "Top Up Swap Credits or Upgrade to PRO",
      modalSub: "Your first 10 swaps are free on registration. To continue posting listings and sending swap proposals, pick a plan below:",
      statusLabel: "Your current account status:",
      statusPro: "Active PRO Subscription — Unlimited Swaps & Listings (∞)",
      statusCredits: "Available swap credits:",
      optPackTitle: "Swap Pack (+15 Credits · Pay-As-You-Go)",
      optPackDesc: "Instantly adds +15 swap & listing credits to your account. No monthly commitment, credits never expire.",
      optProMonthlyTitle: "PRO Monthly Subscription (Unlimited ∞)",
      optProMonthlyDesc: "Unlimited swaps & listings across all categories + PRO Verified badge + priority map placement.",
      optProYearlyTitle: "PRO Annual Subscription (Save 35% · Unlimited ∞)",
      optProYearlyDesc: "12 months of unlimited swaps & listings (∞), top AI Smart Match ranking, and VIP support.",
      payMethodLabel: "Secure payment method:",
      payCard: "Credit / Debit Card (Visa / Mastercard)",
      payWallet: "Apple Pay / Google Pay (1-Click)",
      payBank: "Instant Bank Transfer (SEPA / Revolut)",
      activateBtn: "Activate Now & Unlock Swaps →",
      packActivatedToast: "✓ +15 Swap Credits added to your account!",
      proActivatedToast: "✓ PRO Unlimited Subscription (∞) activated!",
      zeroSimulatedToast: "! Simulation active: Free swaps set to 0. Try sending a swap proposal or posting an ad to test the paywall!",
      dashCardTitle: "Subscription & Swap Credits (First 10 Free)",
      dashSimulateZeroBtn: "Simulate 0 swaps left (Test Paywall)"
    },
    de: {
      plan1Heading: "Starter · 10 Gratis-Swaps",
      perPack: "/ +15 Swaps",
      packBtn: "+15 Swaps-Paket kaufen →",
      plan3Tag: "PRO Unbegrenzt ∞",
      perMonth: "/ Monat",
      plan3B1: "UNBEGRENZTE (∞) Tauschvorschläge, Kaufangebote & Inserate",
      plan3B2: "PRO-Verifizierungsabzeichen & Top-Platzierung im Katalog",
      plan3B3: "VIP-Watchlist-Alarme & Prioritäts-Support in 7 Sprachen",
      proBtn: "PRO-Abo aktivieren →",
      dashUpgradeBtn: "+ PRO / Credits",
      proBadgeText: "PRO ∞ Unbegrenzt",
      swapsWord: "Swaps",
      exhaustedToast: "! Sie haben Ihre 10 kostenlosen Swaps verbraucht! Bitte wählen Sie ein +15 Swap-Paket oder das PRO-Abonnement.",
      modalBadge: "Swap-Credits & PRO-Abonnement · ChangeIt4Me",
      modalTitle: "Swap-Credits aufladen oder PRO-Abo aktivieren",
      modalSub: "Die ersten 10 Swaps sind bei der Registrierung kostenlos. Wählen Sie Ihr gewünschtes Paket für weitere Tauschgeschäfte:",
      statusLabel: "Aktueller Kontostatus:",
      statusPro: "PRO-Abo Aktiv — Unbegrenzte Swaps & Inserate (∞)",
      statusCredits: "Verfügbare Swap-Credits:",
      optPackTitle: "Swap-Paket (+15 Credits · Ohne Abo)",
      optPackDesc: "Fügt sofort +15 Tausch- & Inserats-Credits hinzu. Kein Monatsabo, Credits verfallen nie.",
      optProMonthlyTitle: "PRO Monatsabo (Unbegrenzt ∞)",
      optProMonthlyDesc: "Unbegrenzte Swaps & Inserate in allen Kategorien + PRO-Abzeichen + Karten-Hervorhebung.",
      optProYearlyTitle: "PRO Jahresabo (35% sparen · Unbegrenzt ∞)",
      optProYearlyDesc: "12 Monate unbegrenzte Swaps & Inserate (∞) und höchste KI-Priorität.",
      payMethodLabel: "Sichere Zahlungsmethode:",
      payCard: "Kredit-/Debitkarte (Visa / Mastercard)",
      payWallet: "Apple Pay / Google Pay (1-Klick)",
      payBank: "SEPA-Sofortüberweisung / Revolut",
      activateBtn: "Jetzt aktivieren & Swaps freischalten →",
      packActivatedToast: "✓ +15 Swap-Credits wurden Ihrem Konto gutgeschrieben!",
      proActivatedToast: "✓ PRO Unlimited Abonnement (∞) erfolgreich aktiviert!",
      zeroSimulatedToast: "! Simulation aktiv: Gratis-Swaps auf 0 gesetzt.",
      dashCardTitle: "Abonnement & Swap-Credits (Erste 10 Gratis)",
      dashSimulateZeroBtn: "0 Swaps simulieren (Paywall testen)"
    },
    fr: {
      plan1Heading: "Starter · 10 Échanges Gratuits",
      perPack: "/ +15 échanges",
      packBtn: "Acheter Pack +15 Échanges →",
      plan3Tag: "PRO Illimité ∞",
      perMonth: "/ mois",
      plan3B1: "Propositions d'échange et annonces ILLIMITÉES (∞)",
      plan3B2: "Badge PRO Vérifié & mise en avant sur la carte et le catalogue",
      plan3B3: "Alertes Watchlist VIP & support prioritaire en 7 langues",
      proBtn: "Activer l'Abonnement PRO →",
      dashUpgradeBtn: "+ PRO / Crédits",
      proBadgeText: "PRO ∞ Illimité",
      swapsWord: "Échanges",
      exhaustedToast: "! Vous avez utilisé vos 10 échanges gratuits ! Choisissez un Pack +15 Échanges ou l'Abonnement PRO Illimité.",
      modalBadge: "Crédits d'Échange & Abonnement PRO · ChangeIt4Me",
      modalTitle: "Recharger vos Crédits ou Passer à PRO",
      modalSub: "Les 10 premiers échanges sont offerts à l'inscription. Pour continuer à publier et proposer des échanges :",
      statusLabel: "Statut actuel de votre compte :",
      statusPro: "Abonnement PRO Actif — Échanges & Annonces Illimités (∞)",
      statusCredits: "Crédits d'échange disponibles :",
      optPackTitle: "Pack +15 Échanges (Sans abonnement)",
      optPackDesc: "Ajoute immédiatement +15 crédits d'échange et d'annonce. Les crédits n'expirent jamais.",
      optProMonthlyTitle: "Abonnement PRO Mensuel (Illimité ∞)",
      optProMonthlyDesc: "Échanges et annonces illimités + Badge PRO Vérifié + priorité sur la carte.",
      optProYearlyTitle: "Abonnement PRO Annuel (-35% · Illimité ∞)",
      optProYearlyDesc: "12 mois d'échanges et d'annonces illimités (∞) et visibilité maximale.",
      payMethodLabel: "Moyen de paiement sécurisé :",
      payCard: "Carte Bancaire (Visa / Mastercard)",
      payWallet: "Apple Pay / Google Pay (1-Clic)",
      payBank: "Virement SEPA Instantané / Revolut",
      activateBtn: "Activer maintenant & débloquer →",
      packActivatedToast: "✓ +15 Crédits d'échange ajoutés à votre compte !",
      proActivatedToast: "✓ Abonnement PRO Illimité (∞) activé avec succès !",
      zeroSimulatedToast: "! Simulation : 0 échange gratuit restant.",
      dashCardTitle: "Abonnement & Crédits d'Échange (10 premiers gratuits)",
      dashSimulateZeroBtn: "Simuler 0 crédit (Tester Paywall)"
    },
    it: {
      plan1Heading: "Starter · 10 Scambi Gratis",
      perPack: "/ +15 scambi",
      packBtn: "Acquista Pacchetto +15 Scambi →",
      plan3Tag: "PRO Illimitato ∞",
      perMonth: "/ mese",
      plan3B1: "Proposte di scambio e annunci ILLIMITATI (∞)",
      plan3B2: "Badge PRO Verificato e priorità in catalogo e mappa",
      plan3B3: "Avvisi Watchlist VIP e supporto prioritario in 7 lingue",
      proBtn: "Attiva Abbonamento PRO →",
      dashUpgradeBtn: "+ PRO / Crediti",
      proBadgeText: "PRO ∞ Illimitato",
      swapsWord: "Scambi",
      exhaustedToast: "! Hai esaurito i 10 scambi gratuiti! Scegli un Pacchetto +15 Scambi o l'Abbonamento PRO Illimitato.",
      modalBadge: "Crediti di Scambio & Abbonamento PRO · ChangeIt4Me",
      modalTitle: "Ricarica Crediti o Passa a PRO Illimitato",
      modalSub: "I primi 10 scambi sono gratuiti alla registrazione. Scegli un piano per continuare:",
      statusLabel: "Stato attuale del tuo account:",
      statusPro: "Abbonamento PRO Attivo — Scambi e Annunci Illimitati (∞)",
      statusCredits: "Crediti di scambio disponibili:",
      optPackTitle: "Pacchetto +15 Scambi (Ricarica senza vincoli)",
      optPackDesc: "Aggiunge subito +15 crediti per scambi e annunci. Nessun canone mensile, i crediti non scadono.",
      optProMonthlyTitle: "Abbonamento PRO Mensile (Illimitato ∞)",
      optProMonthlyDesc: "Scambi e annunci illimitati in tutte le categorie + Badge PRO Verificato.",
      optProYearlyTitle: "Abbonamento PRO Annuale (-35% · Illimitato ∞)",
      optProYearlyDesc: "12 mesi di scambi e annunci illimitati (∞) e massima priorità.",
      payMethodLabel: "Metodo di pagamento sicuro:",
      payCard: "Carta di Credito / Debito (Visa / Mastercard)",
      payWallet: "Apple Pay / Google Pay (1-Click)",
      payBank: "Bonifico Istantaneo SEPA / Revolut",
      activateBtn: "Attiva Ora e Sblocca gli Scambi →",
      packActivatedToast: "✓ +15 Crediti di Scambio aggiunti al tuo account!",
      proActivatedToast: "✓ Abbonamento PRO Illimitato (∞) attivato con successo!",
      zeroSimulatedToast: "! Simulazione: 0 scambi gratuiti rimasti.",
      dashCardTitle: "Abbonamento & Crediti di Scambio (Primi 10 Gratis)",
      dashSimulateZeroBtn: "Simula 0 scambi (Test Paywall)"
    },
    es: {
      plan1Heading: "Starter · 10 Cambios Gratis",
      perPack: "/ +15 cambios",
      packBtn: "Comprar Paquete +15 Cambios →",
      plan3Tag: "PRO Ilimitado ∞",
      perMonth: "/ mes",
      plan3B1: "Propuestas de intercambio y anuncios ILIMITADOS (∞)",
      plan3B2: "Insignia PRO Verificado y prioridad en mapa y catálogo",
      plan3B3: "Alertas Watchlist VIP y soporte prioritario en 7 idiomas",
      proBtn: "Activar Suscripción PRO →",
      dashUpgradeBtn: "+ PRO / Créditos",
      proBadgeText: "PRO ∞ Ilimitado",
      swapsWord: "Cambios",
      exhaustedToast: "! ¡Has agotado tus 10 intercambios gratis! Elige un Paquete +15 Intercambios o la Suscripción PRO Ilimitada.",
      modalBadge: "Créditos de Intercambio y Suscripción PRO · ChangeIt4Me",
      modalTitle: "Recargar Créditos o Activar Suscripción PRO",
      modalSub: "Los primeros 10 intercambios son gratis al registrarte. Elige una opción para continuar:",
      statusLabel: "Estado actual de tu cuenta:",
      statusPro: "Suscripción PRO Activa — Intercambios y Anuncios Ilimitados (∞)",
      statusCredits: "Créditos de intercambio disponibles:",
      optPackTitle: "Paquete +15 Intercambios (Pago por uso)",
      optPackDesc: "Añade al instante +15 créditos de intercambio y anuncios. Sin cuota mensual.",
      optProMonthlyTitle: "Suscripción PRO Mensual (Ilimitado ∞)",
      optProMonthlyDesc: "Intercambios y anuncios ilimitados + Insignia PRO Verificado.",
      optProYearlyTitle: "Suscripción PRO Anual (-35% · Ilimitado ∞)",
      optProYearlyDesc: "12 meses de intercambios y anuncios ilimitados (∞) y máxima visibilidad.",
      payMethodLabel: "Método de pago seguro:",
      payCard: "Tarjeta Bancaria (Visa / Mastercard)",
      payWallet: "Apple Pay / Google Pay (1-Clic)",
      payBank: "Transferencia Instantánea SEPA / Revolut",
      activateBtn: "Activar Ahora y Desbloquear →",
      packActivatedToast: "✓ ¡+15 Créditos de Intercambio añadidos a tu cuenta!",
      proActivatedToast: "✓ ¡Suscripción PRO Ilimitada (∞) activada con éxito!",
      zeroSimulatedToast: "! Simulación: 0 intercambios gratuitos restantes.",
      dashCardTitle: "Suscripción y Créditos de Intercambio (Primeros 10 Gratis)",
      dashSimulateZeroBtn: "Simular 0 cambios (Probar Paywall)"
    },
    ru: {
      plan1Heading: "Starter · Первые 10 обменов",
      perPack: "/ +15 обменов",
      packBtn: "Купить пакет +15 обменов →",
      plan3Tag: "PRO Безлимит ∞",
      perMonth: "/ месяц",
      plan3B1: "БЕЗЛИМИТНЫЕ (∞) предложения обмена и объявления",
      plan3B2: "Значок PRO Verified и приоритет в каталоге и на карте",
      plan3B3: "VIP-уведомления Watchlist и поддержка на 7 языках",
      proBtn: "Активировать подписку PRO →",
      dashUpgradeBtn: "+ PRO / Кредиты",
      proBadgeText: "PRO ∞ Безлимит",
      swapsWord: "Обменов",
      exhaustedToast: "! Вы использовали все 10 бесплатных обменов! Выберите Пакет +15 обменов или Безлимитную подписку PRO.",
      modalBadge: "Кредиты обмена и подписка PRO · ChangeIt4Me",
      modalTitle: "Пополнить кредиты или подключить PRO",
      modalSub: "Первые 10 обменов предоставляются бесплатно при регистрации. Для продолжения выберите тариф:",
      statusLabel: "Текущий статус аккаунта:",
      statusPro: "Подписка PRO активна — Безлимитные обмены и объявления (∞)",
      statusCredits: "Доступно кредитов обмена:",
      optPackTitle: "Пакет +15 обменов (Без абонентской платы)",
      optPackDesc: "Мгновенно добавляет +15 кредитов на обмены и объявления. Кредиты не сгорают.",
      optProMonthlyTitle: "Подписка PRO на месяц (Безлимит ∞)",
      optProMonthlyDesc: "Неограниченные обмены и объявления во всех категориях + значок PRO Verified.",
      optProYearlyTitle: "Подписка PRO на год (-35% · Безлимит ∞)",
      optProYearlyDesc: "12 месяцев безлимитных обменов и объявлений (∞) и максимальный приоритет.",
      payMethodLabel: "Безопасный способ оплаты:",
      payCard: "Банковская карта (Visa / Mastercard)",
      payWallet: "Apple Pay / Google Pay (1-клик)",
      payBank: "Мгновенный банковский перевод (SEPA / Revolut)",
      activateBtn: "Активировать сейчас и разблокировать →",
      packActivatedToast: "✓ +15 кредитов обмена зачислены на ваш аккаунт!",
      proActivatedToast: "✓ Безлимитная подписка PRO (∞) успешно активирована!",
      zeroSimulatedToast: "! Симуляция: осталось 0 бесплатных обменов.",
      dashCardTitle: "Подписка и кредиты обмена (Первые 10 бесплатно)",
      dashSimulateZeroBtn: "Симулировать 0 обменов (Тест Paywall)"
    }
  };
  return map[currentLang] || map.en;
}
function updatePricingCardsUI() {
  const s = getSubscriptionUiCopy();
  const p1Head = document.getElementById("plan1Heading");
  const pPackPrice = document.getElementById("planPricePack");
  const pPerPack = document.getElementById("planPerPack");
  const p2Btn = document.getElementById("plan2ActionBtn");
  const p3Tag = document.getElementById("plan3Tag");
  const pProPrice = document.getElementById("planPricePro");
  const pPerMonth = document.getElementById("planPerMonth");
  const p3List = document.getElementById("plan3List");
  const p3Btn = document.getElementById("plan3ActionBtn");
  const dashUpBtn = document.getElementById("dashUpgradeBtn");
  if (p1Head) p1Head.textContent = s.plan1Heading;
  if (pPackPrice) pPackPrice.textContent = formatCurrency(9, currentCurrency);
  if (pPerPack) pPerPack.textContent = s.perPack;
  if (p2Btn) p2Btn.textContent = s.packBtn;
  if (p3Tag) p3Tag.textContent = s.plan3Tag;
  if (pProPrice) pProPrice.textContent = formatCurrency(19, currentCurrency);
  if (pPerMonth) pPerMonth.textContent = s.perMonth;
  if (p3List) {
    p3List.innerHTML = `
      <li style="color:#ffffff !important;border-top-color:rgba(255,255,255,0.16) !important;">${s.plan3B1}</li>
      <li style="color:#ffffff !important;border-top-color:rgba(255,255,255,0.16) !important;">${s.plan3B2}</li>
      <li style="color:#ffffff !important;border-top-color:rgba(255,255,255,0.16) !important;">${s.plan3B3}</li>
    `;
  }
  if (p3Btn) p3Btn.textContent = String(s.proBtn || "").replace(/\s*→\s*$/, "");
  if (dashUpBtn) dashUpBtn.textContent = s.dashUpgradeBtn;
}
function canPerformSwapOrPost() {
  if (currentUser) {
    if (currentUser.plan === "pro") return true;
    const rem = typeof currentUser.freeSwaps === "number" ? currentUser.freeSwaps : 10;
    if (rem <= 0) {
      showToast(getSubscriptionUiCopy().exhaustedToast);
      closeAllModalsSilently();
      openSubscriptionModal("pro");
      return false;
    }
    return true;
  } else {
    if (guestFreeSwaps <= 0) {
      showToast(getSubscriptionUiCopy().exhaustedToast);
      closeAllModalsSilently();
      openSubscriptionModal("pro");
      return false;
    }
    return true;
  }
}
function openSubscriptionModal(preselectedTier = "pro") {
  const s = getSubscriptionUiCopy();
  const content = document.getElementById("guideModalContent");
  if (!content) return;
  const pricePack = formatCurrency(9, currentCurrency);
  const priceProM = formatCurrency(19, currentCurrency);
  const priceProY = formatCurrency(149, currentCurrency);
  const isPro = Boolean(currentUser && currentUser.plan === "pro");
  const remSwaps = currentUser ? (currentUser.freeSwaps ?? 10) : guestFreeSwaps;
  const maxSwaps = remSwaps > 10 ? remSwaps : 10;
  const selPack = preselectedTier === "pack15";
  const selYearly = preselectedTier === "pro_yearly";
  const selMonthly = !selPack && !selYearly;
  content.innerHTML = `
    <button type="button" class="modal-close" style="color:var(--ink);" onclick="closeGuideModal()">✕</button>
    <span style="background:#f1f5f4;color:#0f172a;border:1px solid rgba(15,23,42,0.08);padding:4px 12px;border-radius:999px;font-size:12px;font-weight:700;">${s.modalBadge}</span>
    <h2 style="font-size:24px;margin:10px 0 6px;">${s.modalTitle}</h2>
    <p style="font-size:13px;color:var(--muted);margin:0 0 14px;">${s.modalSub}</p>
    <div style="padding:12px 15px;background:${remSwaps <= 0 && !isPro ? '#fff1f2' : '#f5f7f7'};border:1px solid ${remSwaps <= 0 && !isPro ? '#fecdd3' : 'rgba(15,23,42,0.08)'};border-radius:16px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
      <strong style="font-size:13px;color:#0f172a;">${s.statusLabel}</strong>
      <span style="font-size:13px;font-weight:800;color:${remSwaps <= 0 && !isPro ? '#be123c' : '#0f172a'};font-variant-numeric:tabular-nums;">
        ${isPro ? `✓ ${s.statusPro}` : `${s.statusCredits} ${remSwaps} / ${maxSwaps}`}
      </span>
    </div>
    <form onsubmit="activateSubscriptionPlan(event)" style="display:grid;grid-template-columns:minmax(0,1fr);gap:10px;max-width:100%;">
      <label data-tier-card="pack15" style="padding:13px 15px;background:${selPack ? '#f8fafc' : '#ffffff'};border:1.5px solid ${selPack ? '#0f172a' : 'rgba(15,23,42,0.1)'};border-radius:18px;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;cursor:pointer;">
        <div style="display:flex;gap:10px;align-items:flex-start;">
          <input type="radio" name="subTier" value="pack15" ${selPack ? "checked" : ""} onchange="highlightSubscriptionTierCard(this.value)" style="width:18px;height:18px;margin-top:3px;accent-color:#0f172a;" />
          <div>
            <strong style="font-size:14px;color:#0f172a;display:block;">${s.optPackTitle}</strong>
            <span style="font-size:12px;color:#64748b;line-height:1.4;display:block;">${s.optPackDesc}</span>
          </div>
        </div>
        <strong style="font-size:16px;color:#0f172a;white-space:nowrap;font-variant-numeric:tabular-nums;">${pricePack}</strong>
      </label>
      <label data-tier-card="pro_monthly" style="padding:13px 15px;background:${selMonthly ? '#f8fafc' : '#ffffff'};border:1.5px solid ${selMonthly ? '#0f172a' : 'rgba(15,23,42,0.1)'};border-radius:18px;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;cursor:pointer;">
        <div style="display:flex;gap:10px;align-items:flex-start;">
          <input type="radio" name="subTier" value="pro_monthly" ${selMonthly ? "checked" : ""} onchange="highlightSubscriptionTierCard(this.value)" style="width:18px;height:18px;margin-top:3px;accent-color:#0f172a;" />
          <div>
            <strong style="font-size:14px;color:#0f172a;display:block;">${s.optProMonthlyTitle}</strong>
            <span style="font-size:12px;color:#475569;line-height:1.4;display:block;">${s.optProMonthlyDesc}</span>
          </div>
        </div>
        <strong style="font-size:16px;color:#0f172a;white-space:nowrap;font-variant-numeric:tabular-nums;">${priceProM}${s.perMonth}</strong>
      </label>
      <label data-tier-card="pro_yearly" style="padding:13px 15px;background:${selYearly ? '#f8fafc' : '#ffffff'};border:1.5px solid ${selYearly ? '#0f172a' : 'rgba(15,23,42,0.1)'};border-radius:18px;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;cursor:pointer;">
        <div style="display:flex;gap:10px;align-items:flex-start;">
          <input type="radio" name="subTier" value="pro_yearly" ${selYearly ? "checked" : ""} onchange="highlightSubscriptionTierCard(this.value)" style="width:18px;height:18px;margin-top:3px;accent-color:#0f172a;" />
          <div>
            <strong style="font-size:14px;color:#0f172a;display:block;">${s.optProYearlyTitle}</strong>
            <span style="font-size:12px;color:#64748b;line-height:1.4;display:block;">${s.optProYearlyDesc}</span>
          </div>
        </div>
        <strong style="font-size:16px;color:#0f172a;white-space:nowrap;font-variant-numeric:tabular-nums;">${priceProY}</strong>
      </label>
      <div class="field-group" style="margin:4px 0;">
        <label style="font-size:12px;font-weight:700;color:var(--ink);">${s.payMethodLabel}</label>
        <select name="payMethod" class="input-light">
          <option value="card">${s.payCard}</option>
          <option value="wallet">${s.payWallet}</option>
          <option value="bank">${s.payBank}</option>
        </select>
      </div>
      <button type="submit" class="btn btn-dark btn-block" style="margin-top:4px;">
        ✓ ${s.activateBtn}
      </button>
    </form>
  `;
  document.getElementById("guideModal")?.classList.add("open");
  document.body.classList.add("modal-open");
}
function highlightSubscriptionTierCard(tierVal) {
  document.querySelectorAll("#guideModalContent label[data-tier-card]").forEach(lbl => {
    const isSel = lbl.getAttribute("data-tier-card") === tierVal;
    lbl.style.borderColor = isSel ? "#0f172a" : "rgba(15,23,42,0.1)";
    lbl.style.background = isSel ? "#f8fafc" : "#ffffff";
  });
}
function getRemainingFreeSwaps() {
  if (currentUser && currentUser.plan === "pro") return 999;
  return currentUser ? (currentUser.freeSwaps ?? 10) : guestFreeSwaps;
}
function applyPurchasedPlanLocally(chosenTier) {
  const s = getSubscriptionUiCopy();
  if (!currentUser) {
    activateUserAccount({
      name: "PRO Member",
      email: "member@changeit4me.com",
      country: detectedIpInfo?.countryName || "Romania",
      prefLang: currentLang,
      prefCurrency: currentCurrency,
      freeSwaps: chosenTier === "pack15" ? 25 : 999,
      plan: chosenTier === "pack15" ? "pack" : "pro"
    });
  } else {
    if (chosenTier === "pack15") {
      currentUser.freeSwaps = (Number(currentUser.freeSwaps) || 0) + 15;
      if (currentUser.plan !== "pro") currentUser.plan = "pack";
    } else {
      currentUser.plan = "pro";
      currentUser.freeSwaps = 999;
    }
    localStorage.setItem("ci4m_user", JSON.stringify(currentUser));
    const emailKey = String(currentUser.email || "").trim().toLowerCase();
    if (emailKey && accountsDb[emailKey]) {
      accountsDb[emailKey] = { ...accountsDb[emailKey], ...currentUser };
      saveAccountsDb();
    }
  }
  guestFreeSwaps = chosenTier === "pack15" ? guestFreeSwaps + 15 : 999;
  localStorage.setItem("ci4m_guest_free_swaps", String(guestFreeSwaps));
  renderUserHeaderState();
  closeGuideModal();
  if (document.getElementById("dashboardModal")?.classList.contains("open")) {
    renderDashboardContent();
  }
  showToast(chosenTier === "pack15" ? s.packActivatedToast : s.proActivatedToast);
}
function activateSubscriptionPlan(e) {
  if (e) e.preventDefault();
  const fd = e && e.target ? new FormData(e.target) : null;
  const chosenTier = (fd && fd.get("subTier")) || document.querySelector('input[name="subTier"]:checked')?.value || "pro_monthly";
  const gw = typeof getAuthGatewaysConfig === "function" ? getAuthGatewaysConfig() : {};
  const directLink = chosenTier === "pack15"
    ? gw.stripePack15Url
    : chosenTier === "pro_yearly"
      ? gw.stripeProYearlyUrl
      : gw.stripeProMonthlyUrl;
  if (directLink && /^https:\/\/(buy|checkout)\.stripe\.com\//i.test(directLink) && typeof fetch === "function") {
    showToast("↻ Redirecting to secure Stripe Checkout...");
    window.location.href = directLink;
    return;
  }
  if ((gw.stripeSecretKey || serverConfiguredGateways.stripe) && typeof fetch === "function") {
    showToast("↻ Opening secure Stripe Checkout...");
    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create_checkout_session",
        tier: chosenTier,
        email: currentUser?.email || "",
        origin: window.location.origin
      })
    })
      .then(r => r.json())
      .then(data => {
        if (data && data.ok && data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        } else {
          applyPurchasedPlanLocally(chosenTier);
        }
      })
      .catch(() => applyPurchasedPlanLocally(chosenTier));
    return;
  }
  applyPurchasedPlanLocally(chosenTier);
}
function checkStripeCheckoutReturnUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const paidTier = params.get("stripe_success");
    if (paidTier && ["pack15", "pro_monthly", "pro_yearly"].includes(paidTier)) {
      applyPurchasedPlanLocally(paidTier);
      params.delete("stripe_success");
      const nextQuery = params.toString();
      const cleanUrl = window.location.pathname + (nextQuery ? `?${nextQuery}` : "");
      window.history.replaceState({}, "", cleanUrl);
    }
  } catch (err) { }
}
function simulateZeroFreeSwaps() {
  if (currentUser) {
    currentUser.plan = "starter";
    currentUser.freeSwaps = 0;
    localStorage.setItem("ci4m_user", JSON.stringify(currentUser));
    const emailKey = String(currentUser.email || "").trim().toLowerCase();
    if (emailKey && accountsDb[emailKey]) {
      accountsDb[emailKey].plan = "starter";
      accountsDb[emailKey].freeSwaps = 0;
      saveAccountsDb();
    }
  }
  guestFreeSwaps = 0;
  localStorage.setItem("ci4m_guest_free_swaps", "0");
  renderUserHeaderState();
  if (document.getElementById("dashboardModal")?.classList.contains("open")) {
    renderDashboardContent();
  }
  showToast(getSubscriptionUiCopy().zeroSimulatedToast);
}
const DEFAULT_WIZ_DATA = {
  editingOfferId: null,
  image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1000&q=80",
  images: ["https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1000&q=80"],
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
  } catch (e) { }
  return { ...DEFAULT_WIZ_DATA };
})();
function persistWizardDraft() {
  try {
    localStorage.setItem("ci4m_wiz_draft_v1", JSON.stringify({ wizStep, wizData }));
  } catch (e) { }
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
  } catch (e) { }
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
  } catch (e) { }
}
function getRouteFromUrlOrStorage() {
  const params = new URLSearchParams(window.location.search);
  const offerParam = params.get("offer");
  if (offerParam && /^\d+$/.test(offerParam.trim())) {
    return "/offer/" + offerParam.trim();
  }
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
  } catch (e) { }
  return "/";
}
function closeAllModalsSilently() {
  ["wizardModal", "offerModal", "authModal", "dashboardModal", "guideModal", "adminModal", "appleSheetModal"].forEach(id => {
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
    } else if (clean === "/admin") {
      document.body.classList.add("mobile-started");
      openAdminModal("listings");
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
        openDashboardModal(currentDashTab || "mylistings");
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
function getCurrencyObj(code = currentCurrency) {
  const list = window.CURRENCIES || [{ code: "EUR", symbol: "€", short: "EUR", label: "Euro (EUR)", rateFromEur: 1.0 }];
  return list.find(c => c.code === code) || list[0];
}
// Universal numeric parser resilient to empty strings "", comma decimals ("15.500,50" or "15000,50"), thousands commas ("15,000"), and whitespace
function sanitizeNumericAmount(rawVal, fallback = 0) {
  if (typeof rawVal === "number") {
    return Number.isFinite(rawVal) ? rawVal : fallback;
  }
  if (rawVal === null || rawVal === undefined) return fallback;
  let str = String(rawVal).trim().replace(/\s+/g, "");
  if (!str) return fallback;
  str = str.replace(/[^0-9.,-]/g, "");
  if (!str) return fallback;
  const lastComma = str.lastIndexOf(",");
  const lastDot = str.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) {
      str = str.replace(/\./g, "").replace(",", ".");
    } else {
      str = str.replace(/,/g, "");
    }
  } else if (lastComma > -1) {
    const parts = str.split(",");
    if (parts.length === 2 && parts[1].length === 3 && parts[0].length >= 1) {
      str = str.replace(/,/g, "");
    } else {
      str = str.replace(/,/g, ".");
    }
  }
  const parsed = Number(str);
  return (Number.isFinite(parsed) && parsed >= 0) ? parsed : fallback;
}
function convertToEur(valInCurr, code = currentCurrency) {
  const c = getCurrencyObj(code);
  const num = sanitizeNumericAmount(valInCurr, 0);
  if (!c.rateFromEur) return num;
  return num / c.rateFromEur;
}
function convertFromEur(valEur, code = currentCurrency) {
  const c = getCurrencyObj(code);
  const num = sanitizeNumericAmount(valEur, 0);
  return Math.round(num * c.rateFromEur);
}
function convertBetweenCurrencies(amount, fromCode, toCode = currentCurrency) {
  const num = sanitizeNumericAmount(amount, 0);
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
    ? sanitizeNumericAmount(item.originalAmount, 0)
    : sanitizeNumericAmount(item.valueEur, 0);
  if (origCurr === String(targetCode).toUpperCase()) {
    return Math.round(origAmt);
  }
  return convertBetweenCurrencies(origAmt, origCurr, targetCode);
}
function formatAmountInCurrentCurrency(rawAmount, code = currentCurrency) {
  const c = getCurrencyObj(code);
  const rounded = Math.round(sanitizeNumericAmount(rawAmount, 0));
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
  const num = sanitizeNumericAmount(amount, 0);
  if (num <= 0) return "";
  const others = (window.CURRENCIES || []).filter(c => c.code !== baseCurrCode);
  if (!others.length) return "";
  const parityText = (typeof getSmartUiLabels === "function" && getSmartUiLabels().parityLabel) || "Parity";
  const optionsHtml = others.map(c => {
    const eq = convertBetweenCurrencies(num, baseCurrCode, c.code);
    return `<option value="${c.code}">${c.code} (${c.symbol}) — ~${formatAmountInCurrentCurrency(eq, c.code)}</option>`;
  }).join("");
  return `
    <div class="hig-parity-bar">
      <span class="hig-parity-label">⇄ ${parityText}:</span>
      <select class="hig-parity-select" aria-label="${parityText}">
        ${optionsHtml}
      </select>
    </div>
  `;
}
function setBuyOfferQuickPct(offerId, factor) {
  const item = offers.find(o => o.id === Number(offerId));
  if (!item) return;
  const currEl = document.getElementById("buyOfferCurrencySelect");
  const valEl = document.getElementById("buyOfferAmountInput");
  const chosenCurr = currEl?.value || currentCurrency;
  const baseVal = getOfferValueInCurrency(item, chosenCurr);
  const nextVal = Math.round(baseVal * Number(factor || 1));
  if (valEl) {
    valEl.value = String(nextVal);
  }
  onBuyOfferPriceChange(offerId);
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
  updatePricingCardsUI();
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
  if (document.getElementById("adminModal")?.classList.contains("open")) {
    renderAdminModalContent();
  }
}
function onRegLangSelectChange(newLang, targetCurrencySelectId) {
  setLanguage(newLang, true);
  const sel = document.getElementById(targetCurrencySelectId);
  if (sel) sel.value = currentCurrency;
}
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
  const urlParams = new URLSearchParams(window.location.search);
  const urlLang = urlParams.get("lang")?.toLowerCase();
  if (urlLang && window.TRANSLATIONS[urlLang] && !forceOverwriteManual) {
    setLanguage(urlLang, true);
    detectedIpInfo.source = "url";
    updateGeoIpBannerUI();
    return;
  }
  const manualLang = localStorage.getItem("ci4m_lang_manual");
  if (manualLang && window.TRANSLATIONS[manualLang] && !forceOverwriteManual) {
    setLanguage(manualLang, false);
  } else {
    setLanguage("en", false);
  }
  // 3. Query Geo-IP APIs to detect visitor's European country (only if functional GDPR consent allows it)
  if (gdprConsent && gdprConsent.decided && gdprConsent.functional === false) {
    updateGeoIpBannerUI();
    return;
  }
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
    }
  }
  updateGeoIpBannerUI();
}
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
  const langObj = window.LANGUAGES.find(l => l.code === langCode) || window.LANGUAGES[0];
  const flagEl = document.getElementById("currentLangFlag");
  const shortEl = document.getElementById("currentLangShort");
  if (flagEl) flagEl.innerHTML = langObj.flagSvg;
  if (shortEl) shortEl.textContent = langObj.short;
  document.querySelectorAll("#langList .lang-option").forEach(btn => {
    btn.setAttribute("aria-selected", String(btn.dataset.lang === langCode));
  });
  document.getElementById("langDropdown")?.classList.remove("is-open");
  const inlineSel = document.getElementById("inlineRegLangSelect");
  if (inlineSel) inlineSel.value = langCode;
  const modalSel = document.getElementById("modalRegLangSelect");
  if (modalSel) modalSel.value = langCode;
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
  renderGdprBannerText();
  renderUserHeaderState();
  renderOffers();
  renderMapPinsAndPanel();
  const sampleChipsMap = {
    en: { cars: "+ Cars (Porsche / BMW)", re: "+ Real Estate (Apartment / Villa)", el: "+ Tech (iPhone 16 / MacBook)" },
    de: { cars: "+ Auto (Porsche / BMW)", re: "+ Immobilien (Wohnung / Villa)", el: "+ Tech (iPhone 16 / MacBook)" },
    fr: { cars: "+ Auto (Porsche / BMW)", re: "+ Immobilier (Appartement / Villa)", el: "+ Tech (iPhone 16 / MacBook)" },
    it: { cars: "+ Auto (Porsche / BMW)", re: "+ Immobili (Appartamento / Villa)", el: "+ Tech (iPhone 16 / MacBook)" },
    es: { cars: "+ Autos (Porsche / BMW)", re: "+ Inmobiliaria (Piso / Villa)", el: "+ Tech (iPhone 16 / MacBook)" },
    ro: { cars: "+ Auto (Porsche / BMW)", re: "+ Imobiliare (Apartament / Vilă)", el: "+ Tech (iPhone 16 / MacBook)" },
    ru: { cars: "+ Авто (Porsche / BMW)", re: "+ Недвижимость (Квартира / Вилла)", el: "+ Техника (iPhone 16 / MacBook)" }
  };
  const sc = sampleChipsMap[langCode] || sampleChipsMap.en;
  const scCars = document.getElementById("quickSampleChipCars");
  const scRe = document.getElementById("quickSampleChipRealEstate");
  const scEl = document.getElementById("quickSampleChipElectronics");
  if (scCars) scCars.textContent = sc.cars;
  if (scRe) scRe.textContent = sc.re;
  if (scEl) scEl.textContent = sc.el;
  const qPhotoIn = document.getElementById("quickPhotoUrlInput");
  if (qPhotoIn) qPhotoIn.placeholder = getWizValidationCopy().pasteUrlPlaceholder;
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
  if (document.getElementById("adminModal")?.classList.contains("open")) {
    renderAdminModalContent();
  }
  if (document.getElementById("authModal")?.classList.contains("open") && typeof switchAuthTab === "function") {
    switchAuthTab(currentAuthMode || "register");
    if (currentAuthMode === "verify" && typeof renderVerifySentHelper === "function") {
      renderVerifySentHelper();
    }
  }
}
function updateFavCountUI() {
  if (!currentUser && Array.isArray(favoriteIds) && favoriteIds.length > 0) {
    favoriteIds = [];
  }
  if (typeof updateMobileBottomTabBarUI === 'function') updateMobileBottomTabBarUI();
  const activeFavCount = currentUser && Array.isArray(favoriteIds) ? offers.filter(o => favoriteIds.includes(o.id)).length : 0;
  const pill = document.getElementById("favCountPill");
  if (pill) pill.textContent = String(activeFavCount);
  const propBadge = document.getElementById("headerProposalsBadge");
  if (propBadge) {
    const activePropCount = currentUser && Array.isArray(swapProposals) ? swapProposals.filter(p => isProposalOwnedByCurrentUser(p)).length : 0;
    propBadge.textContent = String(activePropCount);
    propBadge.style.display = activePropCount > 0 ? "inline-block" : "none";
  }
  const userPillCount = document.getElementById("userListingsCountPill");
  if (userPillCount) {
    const customCount = offers.filter(o => o.createdByUser || o.id > 100000).length;
    userPillCount.textContent = String(customCount);
  }
  const userFilterLbl = document.getElementById("userListingsFilterLabel");
  if (userFilterLbl) {
    const lblMap = {
      ro: "★ Anunțuri Adăugate",
      en: "★ Added Listings",
      de: "★ Neue Inserate",
      fr: "★ Annonces Ajoutées",
      it: "★ Annunci Aggiunti",
      es: "★ Anuncios Añadidos",
      ru: "★ Новые Объявления"
    };
    userFilterLbl.textContent = lblMap[currentLang] || lblMap.en;
  }
}
let pendingFavoriteOfferId = null;
function toggleFavorite(offerId, ev) {
  if (ev) ev.stopPropagation();
  if (!currentUser) {
    pendingFavoriteOfferId = Number(offerId) || null;
    const needLoginFavMap = {
      ro: "Autentifică-te în contul tău pentru a salva anunțuri la Favorite.",
      en: "Please sign in to your account to save listings to Favorites.",
      de: "Bitte melden Sie sich an, um Inserate als Favoriten zu speichern.",
      fr: "Veuillez vous connecter pour enregistrer des favoris.",
      it: "Accedi al tuo account per salvare gli annunci tra i Preferiti.",
      es: "Inicia sesión para guardar anuncios en tus Favoritos.",
      ru: "Войдите в аккаунт, чтобы сохранять объявления в Избранное."
    };
    showToast(needLoginFavMap[currentLang] || needLoginFavMap.en);
    openAuthModal("login");
    return;
  }
  const favMsgMap = {
    ro: "♥ Salvat la favorite!",
    en: "♥ Saved to your favorites!",
    de: "♥ Zu Ihren Favoriten hinzugefügt!",
    fr: "♥ Ajouté à vos favoris !",
    it: "♥ Salvato nei preferiti!",
    es: "♥ ¡Guardado en tus favoritos!",
    ru: "♥ Сохранено в избранное!"
  };
  const idx = favoriteIds.indexOf(offerId);
  if (idx >= 0) {
    favoriteIds.splice(idx, 1);
  } else {
    favoriteIds.push(offerId);
    showToast(favMsgMap[currentLang] || favMsgMap.en);
  }
  localStorage.setItem("ci4m_favs_v2", JSON.stringify(favoriteIds));
  if (currentUser && currentUser.email) {
    const fKey = String(currentUser.email).trim().toLowerCase();
    if (accountsDb[fKey]) {
      accountsDb[fKey].favoriteIds = [...favoriteIds];
      saveAccountsDb();
    }
  }
  updateFavCountUI();
  renderOffers();
  if (document.getElementById("offerModal")?.classList.contains("open") && currentOpenOfferId === offerId) {
    const modalFavBtn = document.getElementById("offerModalFavBtn");
    if (modalFavBtn) {
      const isFav = favoriteIds.includes(offerId);
      modalFavBtn.style.background = isFav ? "#fff1f2" : "#f1f5f4";
      modalFavBtn.style.color = isFav ? "#e11d48" : "#0f172a";
      modalFavBtn.textContent = isFav ? "♥" : "♡";
    }
  }
}

function getFavPriceAlertCopy() {
  const map = {
    ro: {
      toastDrop: (title, oldP, newP) => `♥ Preț redus la Favorite: „${title}” este acum ${newP} (era ${oldP})!`,
      toastChange: (title, oldP, newP) => `♥ Preț actualizat la Favorite: „${title}” este acum ${newP} (era ${oldP})!`,
      ownerNotifiedToast: (cnt) => `✓ Preț actualizat! ${cnt} utilizator(i) care au anunțul la Favorite au fost notificați.`,
      badgeDrop: "↓ Preț redus",
      badgeUpdated: "Preț actualizat",
      wasWord: "era",
      dashBannerTitle: "Notificări modificare preț la anunțurile tale Favorite",
      dashItemAlert: (oldP, newP) => `Prețul s-a modificat: ${oldP} → ${newP}`,
      dismissBtn: "Am văzut"
    },
    en: {
      toastDrop: (title, oldP, newP) => `♥ Favorite Price Drop: "${title}" is now ${newP} (was ${oldP})!`,
      toastChange: (title, oldP, newP) => `♥ Favorite Price Update: "${title}" is now ${newP} (was ${oldP})!`,
      ownerNotifiedToast: (cnt) => `✓ Price updated! ${cnt} user(s) who saved this listing to Favorites have been notified.`,
      badgeDrop: "↓ Price Drop",
      badgeUpdated: "Price Updated",
      wasWord: "was",
      dashBannerTitle: "Price Change Notifications on Your Saved Favorites",
      dashItemAlert: (oldP, newP) => `Price changed: ${oldP} → ${newP}`,
      dismissBtn: "Dismiss"
    },
    de: {
      toastDrop: (title, oldP, newP) => `♥ Preissenkung bei Favoriten: „${title}“ jetzt ${newP} (vorher ${oldP})!`,
      toastChange: (title, oldP, newP) => `♥ Preisänderung bei Favoriten: „${title}“ jetzt ${newP} (vorher ${oldP})!`,
      ownerNotifiedToast: (cnt) => `✓ Preis aktualisiert! ${cnt} Nutzer mit diesem Favoriten wurden benachrichtigt.`,
      badgeDrop: "↓ Preissenkung",
      badgeUpdated: "Preis geändert",
      wasWord: "vorher",
      dashBannerTitle: "Preisänderungen bei Ihren gespeicherten Favoriten",
      dashItemAlert: (oldP, newP) => `Preis geändert: ${oldP} → ${newP}`,
      dismissBtn: "OK"
    },
    fr: {
      toastDrop: (title, oldP, newP) => `♥ Baisse de prix (Favoris) : « ${title} » est à ${newP} (au lieu de ${oldP}) !`,
      toastChange: (title, oldP, newP) => `♥ Prix modifié (Favoris) : « ${title} » est à ${newP} (était ${oldP}) !`,
      ownerNotifiedToast: (cnt) => `✓ Prix mis à jour ! ${cnt} membre(s) ayant ajouté l'annonce en favori ont été notifiés.`,
      badgeDrop: "↓ Prix réduit",
      badgeUpdated: "Prix mis à jour",
      wasWord: "était",
      dashBannerTitle: "Notifications de changement de prix sur vos Favoris",
      dashItemAlert: (oldP, newP) => `Prix modifié : ${oldP} → ${newP}`,
      dismissBtn: "Vu"
    },
    it: {
      toastDrop: (title, oldP, newP) => `♥ Prezzo ribassato nei Preferiti: "${title}" ora a ${newP} (era ${oldP})!`,
      toastChange: (title, oldP, newP) => `♥ Prezzo aggiornato nei Preferiti: "${title}" ora a ${newP} (era ${oldP})!`,
      ownerNotifiedToast: (cnt) => `✓ Prezzo aggiornato! ${cnt} utenti che hanno l'annuncio nei Preferiti sono stati avvisati.`,
      badgeDrop: "↓ Prezzo ridotto",
      badgeUpdated: "Prezzo aggiornato",
      wasWord: "era",
      dashBannerTitle: "Notifiche di variazione prezzo sui tuoi Preferiti",
      dashItemAlert: (oldP, newP) => `Prezzo modificato: ${oldP} → ${newP}`,
      dismissBtn: "Visto"
    },
    es: {
      toastDrop: (title, oldP, newP) => `♥ Bajada de precio en Favoritos: "${title}" ahora ${newP} (antes ${oldP})!`,
      toastChange: (title, oldP, newP) => `♥ Precio actualizado en Favoritos: "${title}" ahora ${newP} (antes ${oldP})!`,
      ownerNotifiedToast: (cnt) => `✓ ¡Precio actualizado! Se ha notificado a ${cnt} usuario(s) que tienen el anuncio en Favoritos.`,
      badgeDrop: "↓ Precio rebajado",
      badgeUpdated: "Precio actualizado",
      wasWord: "antes",
      dashBannerTitle: "Notificaciones de cambio de precio en tus Favoritos",
      dashItemAlert: (oldP, newP) => `Precio modificado: ${oldP} → ${newP}`,
      dismissBtn: "Visto"
    },
    ru: {
      toastDrop: (title, oldP, newP) => `♥ Снижение цены в Избранном: «${title}» теперь ${newP} (было ${oldP})!`,
      toastChange: (title, oldP, newP) => `♥ Изменение цены в Избранном: «${title}» теперь ${newP} (было ${oldP})!`,
      ownerNotifiedToast: (cnt) => `✓ Цена обновлена! Уведомлено пользователей с этим объявлением в Избранном: ${cnt}.`,
      badgeDrop: "↓ Цена снижена",
      badgeUpdated: "Цена обновлена",
      wasWord: "было",
      dashBannerTitle: "Уведомления об изменении цен в Избранном",
      dashItemAlert: (oldP, newP) => `Цена изменилась: ${oldP} → ${newP}`,
      dismissBtn: "Ок"
    }
  };
  return map[currentLang] || map.en;
}
function getOfferPreviousPriceFormatted(item, code = currentCurrency) {
  if (!item || !item.previousValueEur || Math.round(Number(item.previousValueEur)) === Math.round(Number(item.valueEur))) {
    return "";
  }
  const prevCurr = String(item.previousOriginalCurrency || "EUR").toUpperCase();
  const prevAmt = item.previousOriginalAmount !== undefined && item.previousOriginalAmount !== ""
    ? sanitizeNumericAmount(item.previousOriginalAmount, 0)
    : sanitizeNumericAmount(item.previousValueEur, 0);
  const valInTarget = prevCurr === String(code).toUpperCase()
    ? Math.round(prevAmt)
    : convertBetweenCurrencies(prevAmt, prevCurr, code);
  return formatAmountInCurrentCurrency(valInTarget, code);
}
function recordListingPriceChangeAndNotifyFavorites(item, oldValueEur, oldOriginalAmount, oldOriginalCurrency, newValueEur, newOriginalAmount, newOriginalCurrency) {
  if (!item) return 0;
  const oldEurRound = Math.round(Number(oldValueEur) || 0);
  const newEurRound = Math.round(Number(newValueEur) || 0);
  if (oldEurRound <= 0 || newEurRound <= 0 || oldEurRound === newEurRound) return 0;

  item.previousValueEur = oldEurRound;
  item.previousOriginalAmount = oldOriginalAmount || oldEurRound;
  item.previousOriginalCurrency = oldOriginalCurrency || "EUR";
  item.priceChangedAt = new Date().toISOString();
  item.priceChangeId = `pc_${item.id}_${newEurRound}_${Date.now()}`;
  item.priceChangeDirection = newEurRound < oldEurRound ? "down" : "up";

  const loc = getOfferLocalized(item);
  const oldFormattedEur = formatAmountInCurrentCurrency(convertFromEur(oldEurRound, currentCurrency), currentCurrency);
  const newFormattedEur = formatAmountInCurrentCurrency(convertFromEur(newEurRound, currentCurrency), currentCurrency);
  const editorEmail = currentUser?.email ? String(currentUser.email).trim().toLowerCase() : "";

  let notifiedUsersCount = 0;
  Object.entries(accountsDb || {}).forEach(([emailKey, acc]) => {
    if (!acc || typeof acc !== "object") return;
    const favs = Array.isArray(acc.favoriteIds) ? acc.favoriteIds.map(Number) : [];
    if (!favs.includes(Number(item.id))) return;
    if (editorEmail && isSameUserEmailAlias(emailKey, editorEmail)) return;
    notifiedUsersCount++;
    acc.pendingPriceAlerts = Array.isArray(acc.pendingPriceAlerts) ? acc.pendingPriceAlerts : [];
    acc.pendingPriceAlerts = acc.pendingPriceAlerts.filter(a => Number(a.offerId) !== Number(item.id));
    acc.pendingPriceAlerts.unshift({
      priceChangeId: item.priceChangeId,
      offerId: Number(item.id),
      title: loc.title || item.title || `#${item.id}`,
      oldValueEur: oldEurRound,
      newValueEur: newEurRound,
      direction: item.priceChangeDirection,
      changedAt: item.priceChangedAt
    });
    if (typeof dispatchPartnerNotificationToServer === "function" && acc.email) {
      dispatchPartnerNotificationToServer({
        toEmail: acc.email,
        toPhone: acc.phone || "",
        subject: `ChangeIt4Me · Favorite Price Update: ${loc.title || item.title} (${oldFormattedEur} -> ${newFormattedEur})`,
        message: `Good news! A listing in your ChangeIt4Me Favorites ("${loc.title || item.title}" in ${item.city}, ${item.country}) changed its price from ${oldFormattedEur} to ${newFormattedEur}.`
      });
    }
  });
  if (notifiedUsersCount > 0) {
    saveAccountsDb();
  }
  return notifiedUsersCount;
}
function getSeenPriceChangeIdsForCurrentUser() {
  if (!currentUser || !currentUser.email) return [];
  const k = `ci4m_seen_price_changes_${String(currentUser.email).trim().toLowerCase()}`;
  try {
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}
function markPriceChangeSeenForCurrentUser(priceChangeId, offerId = null) {
  if (!currentUser || !currentUser.email || !priceChangeId) return;
  const emailKey = String(currentUser.email).trim().toLowerCase();
  const k = `ci4m_seen_price_changes_${emailKey}`;
  const seen = getSeenPriceChangeIdsForCurrentUser();
  if (!seen.includes(priceChangeId)) {
    seen.push(priceChangeId);
    try { localStorage.setItem(k, JSON.stringify(seen.slice(-200))); } catch (e) {}
  }
  if (accountsDb[emailKey] && Array.isArray(accountsDb[emailKey].pendingPriceAlerts)) {
    accountsDb[emailKey].pendingPriceAlerts = accountsDb[emailKey].pendingPriceAlerts.filter(
      a => a.priceChangeId !== priceChangeId && (offerId === null || Number(a.offerId) !== Number(offerId))
    );
    saveAccountsDb();
  }
  if (document.getElementById("dashboardModal")?.classList.contains("open")) {
    renderDashboardContent();
  }
}
function checkAndNotifyFavoritePriceChangesForCurrentUser(showLiveToast = true) {
  if (!currentUser || !currentUser.email || !Array.isArray(favoriteIds) || favoriteIds.length === 0) return [];
  const seen = getSeenPriceChangeIdsForCurrentUser();
  const fc = getFavPriceAlertCopy();
  const activeAlerts = [];
  favoriteIds.forEach(favId => {
    const item = offers.find(o => Number(o.id) === Number(favId));
    if (!item || !item.previousValueEur || !item.priceChangeId) return;
    if (Math.round(Number(item.previousValueEur)) === Math.round(Number(item.valueEur))) return;
    if (isListingOwnedByCurrentUser(item)) return;
    if (seen.includes(item.priceChangeId)) return;
    const loc = getOfferLocalized(item);
    const oldP = getOfferPreviousPriceFormatted(item, currentCurrency);
    const newP = formatOfferPrice(item, currentCurrency);
    const isDrop = Number(item.valueEur) < Number(item.previousValueEur);
    activeAlerts.push({
      item,
      priceChangeId: item.priceChangeId,
      title: loc.title,
      oldP,
      newP,
      isDrop
    });
  });
  if (showLiveToast && activeAlerts.length > 0) {
    const first = activeAlerts[0];
    const msg = first.isDrop
      ? fc.toastDrop(first.title, first.oldP, first.newP)
      : fc.toastChange(first.title, first.oldP, first.newP);
    showToast(msg);
    markPriceChangeSeenForCurrentUser(first.priceChangeId, first.item.id);
  }
  return activeAlerts;
}

function filterByCategory(catCode) {
  if (catCode === "favs" && !currentUser) {
    const needLoginFavMap = {
      ro: "Autentifică-te în contul tău pentru a vedea și salva anunțuri la Favorite.",
      en: "Please sign in to your account to view and save Favorite listings.",
      de: "Bitte melden Sie sich an, um Ihre gespeicherten Favoriten zu sehen.",
      fr: "Veuillez vous connecter pour voir vos annonces favorites.",
      it: "Accedi al tuo account per vedere i tuoi annunci Preferiti.",
      es: "Inicia sesión para ver tus anuncios Favoritos.",
      ru: "Войдите в аккаунт, чтобы просматривать избранные объявления."
    };
    showToast(needLoginFavMap[currentLang] || needLoginFavMap.en);
    openAuthModal("login");
    return;
  }
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
  "ceas": ["rolex", "watch", "chronograph", "часы"],
  "bucuresti": ["bucharest", "bucuresti", "bucurești"],
  "bucurești": ["bucharest", "bucuresti", "bucurești"],
  "bucharest": ["bucharest", "bucuresti", "bucurești"]
};
const STOP_PREFIX_TOKENS = new Set([
  "sport", "sports", "sportback", "sportpaket", "sportivo", "deportivo",
  "commercial", "commerciale", "comercial", "comercială",
  "contemporary", "contemporain", "contemporaneo", "contemporáneo",
  "transport", "import", "export", "support", "opportunity", "portion", "portal",
  "portatil", "portátil", "portbagaj", "portable", "portiere", "port", "por"
]);
function normalizeSearchText(str) {
  return String(str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
function extractSearchTokens(str) {
  return normalizeSearchText(str)
    .split(/[^a-z0-9ßа-яё]+/i)
    .filter(Boolean);
}
function tokensMatchQueryWords(tokens, queryWords, allowSynonyms = true) {
  return queryWords.every(w => {
    if (tokens.some(tok => tok.startsWith(w) && !(w.length <= 4 && STOP_PREFIX_TOKENS.has(tok) && tok !== w))) {
      return true;
    }
    if (!allowSynonyms) return false;
    const directSyns = (SEARCH_SYNONYMS[w] || []).map(s => normalizeSearchText(s));
    if (directSyns.length && directSyns.some(s => tokens.some(tok => tok.startsWith(s)))) return true;
    if (w.length >= 3) {
      for (const [k, synList] of Object.entries(SEARCH_SYNONYMS)) {
        const normKey = normalizeSearchText(k);
        if (normKey.startsWith(w) && synList.some(s => tokens.some(tok => tok.startsWith(normalizeSearchText(s))))) return true;
      }
    }
    return false;
  });
}
function getOfferPrimaryTokens(item) {
  const activeTr = (item.i18n && item.i18n[currentLang]) || {};
  const enTr = (item.i18n && item.i18n.en) || {};
  const roTr = (item.i18n && item.i18n.ro) || {};
  const primaryText = `${item.id || ""} ${item.category || ""} ${item.country || ""} ${item.city || ""} ${item.owner || ""} ${item.ownerEmail || ""} ${item.specs || ""} ${item.title || ""} ${item.desc || ""} ${item.want || ""} ${activeTr.title || ""} ${activeTr.desc || ""} ${activeTr.want || ""} ${enTr.title || ""} ${enTr.desc || ""} ${roTr.title || ""} ${roTr.desc || ""}`;
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
  const isAdminQuery = normalizeSearchText(q) === "admin" || normalizeSearchText(q).startsWith("admin");
  const adminSubText = currentLang === "ro"
    ? "Vezi toate conturile înregistrate, anunțurile adăugate, ciornele și testele"
    : "Manage all registered accounts, catalog listings, swap proposals & cloud sync";
  const adminOpenWord = currentLang === "ro" ? "Deschide →" : "Open →";
  const adminShortcutHtml = isAdminQuery ? `
    <button type="button" class="smart-dd-item" style="background:#0a2520;color:#fff;" onclick="document.getElementById('heroSmartDropdown').style.display='none'; document.getElementById('mobileSmartDropdown').style.display='none'; openAdminModal('listings');">
      <div class="smart-dd-info">
        <strong style="color:#ffffff;">★ Admin & Diagnostics Console (/admin)</strong>
        <span style="color:#c9dfdb;">${adminSubText}</span>
      </div>
      <span class="smart-dd-price" style="background:#0d8a5e;color:#ffffff;">${adminOpenWord}</span>
    </button>
  ` : "";
  const qTokens = extractSearchTokens(q);
  const exactMatches = offers
    .filter(it => matchesSmartSearchQuery(it, q))
    .sort((a, b) => {
      const aCustom = (a.createdByUser || a.id > 100000) ? 1 : 0;
      const bCustom = (b.createdByUser || b.id > 100000) ? 1 : 0;
      if (bCustom !== aCustom) return bCustom - aCustom;
      const aTitleTokens = extractSearchTokens(`${a.title} ${getOfferLocalized(a).title}`);
      const bTitleTokens = extractSearchTokens(`${b.title} ${getOfferLocalized(b).title}`);
      const aInTitle = tokensMatchQueryWords(aTitleTokens, qTokens, true) ? 1 : 0;
      const bInTitle = tokensMatchQueryWords(bTitleTokens, qTokens, true) ? 1 : 0;
      return bInTitle - aInTitle;
    })
    .slice(0, 4);
  const aiRecs = buildAiSmartRecommendations(q, exactMatches, offers);
  const alternatives = aiRecs.items.slice(0, 3);
  if (exactMatches.length === 0 && alternatives.length === 0 && !adminShortcutHtml) {
    return `
      <div class="smart-dd-empty" style="padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:10px;">
        <span style="font-size:13px;color:var(--muted);font-weight:600;">${ui.noMatch} «${escapeHtml(q)}»</span>
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
        <img src="${escapeHtml(item.image)}" alt="" />
        <div class="smart-dd-info">
          <strong>${escapeHtml(loc.title)}${badgeHtml}</strong>
          <span>${getCategoryLabel(item.category)} · ${escapeHtml(item.city)}, ${escapeHtml(item.country)} · ${isWant ? `${t("wantBadge")}: ${escapeHtml(loc.want)}` : getDealTypeLabel(item.dealType)}</span>
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
    ${adminShortcutHtml}
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
  const minVal = sanitizeNumericAmount(document.getElementById("catalogMinEur")?.value, 0);
  const maxVal = sanitizeNumericAmount(document.getElementById("catalogMaxEur")?.value, 0);
  const passesBaseFilters = (item) => {
    if (currentCategoryFilter === "favs") {
      if (!favoriteIds.includes(item.id)) return false;
    } else if (currentCategoryFilter === "user") {
      if (!(item.createdByUser || item.id > 100000)) return false;
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
        const aCustom = (a.createdByUser || a.id > 100000) ? 1 : 0;
        const bCustom = (b.createdByUser || b.id > 100000) ? 1 : 0;
        if (bCustom !== aCustom) return bCustom - aCustom;
        const aTitle = tokensMatchQueryWords(extractSearchTokens(`${a.title} ${getOfferLocalized(a).title}`), qTokens, true) ? 1 : 0;
        const bTitle = tokensMatchQueryWords(extractSearchTokens(`${b.title} ${getOfferLocalized(b).title}`), qTokens, true) ? 1 : 0;
        if (bTitle !== aTitle) return bTitle - aTitle;
        return (b.matchScore || 90) - (a.matchScore || 90);
      });
    } else {
      list.sort((a, b) => {
        const aCustom = (a.createdByUser || a.id > 100000) ? 1 : 0;
        const bCustom = (b.createdByUser || b.id > 100000) ? 1 : 0;
        if (bCustom !== aCustom) return bCustom - aCustom;
        if (aCustom && bCustom) return (b.id || 0) - (a.id || 0);
        return (b.matchScore || 90) - (a.matchScore || 90);
      });
    }
  };
  sortList(filtered);
  const ui = getSmartUiLabels();
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
    const dealLabel = getDealTypeLabel(item.dealType);
    const catLabel = getCategoryLabel(item.category);
    const topGlassPillText = extraBadge ? `${catLabel} · ${extraBadge}` : `${catLabel} · ${dealLabel}`;
    return `
      <article class="swap-card">
        <div class="swap-card-media" style="background-image:url('${escapeJsStr(item.image)}');cursor:pointer;" onclick="openOfferModal(${item.id}, 'details')">
          <div class="swap-card-badges" onclick="event.stopPropagation()">
            <span class="swap-pill-cat">${topGlassPillText}</span>
            <button type="button" class="swap-fav-btn ${isFav ? 'is-fav' : ''}" onclick="toggleFavorite(${item.id}, event)" aria-label="Save favorite">
              ${isFav ? PREMIUM_ICONS.heartFilled : PREMIUM_ICONS.heartOutline}
            </button>
          </div>
        </div>
        <div class="swap-card-body">
          <div class="swap-card-meta-row">
            <span class="swap-card-loc-owner">${escapeHtml(item.city)}, ${escapeHtml(item.country)} · ${escapeHtml(item.owner)}</span>
            <strong class="swap-card-price-inline">${getOfferPreviousPriceFormatted(item, currentCurrency) ? `<del style="font-size:11.5px;color:#94a3b8;font-weight:500;margin-right:5px;">${getOfferPreviousPriceFormatted(item, currentCurrency)}</del>` : ""}${valFormatted}</strong>
          </div>
          <h3 style="cursor:pointer;" onclick="openOfferModal(${item.id}, 'details')">${escapeHtml(loc.title)}</h3>
          <div class="swap-exchange-box">
            <div class="swap-row">
              <span class="swap-tag have">${t("haveBadge")}</span>
              <span>${escapeHtml(item.specs)}</span>
            </div>
            <div class="swap-row" style="${isWantHighlight ? 'background:rgba(16,185,129,0.08);border-radius:8px;padding:4px 6px;margin:-2px -6px;' : ''}">
              <span class="swap-tag want">${item.dealType === "sale" ? t("saleBadge") : t("wantBadge")}</span>
              <span class="swap-want-text">${item.dealType === "sale" ? `${t("dealSaleOnly")} · ${valFormatted}` : escapeHtml(loc.want)}</span>
            </div>
          </div>
          <div class="swap-card-footer">
            ${item.dealType === "sale" ? `
              <button type="button" class="btn swap-btn-primary" onclick="openOfferModal(${item.id}, 'buy')">
                ${t("buyOfferBtn")}
              </button>
              <button type="button" class="btn swap-btn-secondary" onclick="openOfferModal(${item.id}, 'details')">
                ${t("detailsBtn")}
              </button>
            ` : `
              <button type="button" class="btn swap-btn-primary" onclick="openOfferModal(${item.id}, 'propose')">
                ${t("proposeSwapBtn")}
              </button>
              <button type="button" class="btn swap-btn-secondary" onclick="openOfferModal(${item.id}, 'buy')">
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
function initWorldMap() {
  const mapEl = document.getElementById("worldMap");
  if (!mapEl || typeof window.L === "undefined") return;
  const isMobileTouch = typeof window.innerWidth === "number" && window.innerWidth <= 820;
  leafletMap = window.L.map(mapEl, {
    scrollWheelZoom: false,
    dragging: !isMobileTouch,
    tap: false,
    zoomSnap: 0.5,
    minZoom: 2
  }).setView([47.0, 12.0], 4);
  window.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap",
    maxZoom: 10
  }).addTo(leafletMap);
  renderMapPinsAndPanel();
}
function getLocalizedCountryName(country) {
  const map = {
    "Germany": { en: "Germany", ro: "Germania", de: "Deutschland", fr: "Allemagne", it: "Germania", es: "Alemania", ru: "Германия" },
    "Romania": { en: "Romania", ro: "România", de: "Rumänien", fr: "Roumanie", it: "Romania", es: "Rumanía", ru: "Румыния" },
    "Spain": { en: "Spain", ro: "Spania", de: "Spanien", fr: "Espagne", it: "Spagna", es: "España", ru: "Испания" },
    "Italy": { en: "Italy", ro: "Italia", de: "Italien", fr: "Italie", it: "Italia", es: "Italia", ru: "Италия" },
    "France": { en: "France", ro: "Franța", de: "Frankreich", fr: "France", it: "Francia", es: "Francia", ru: "Франция" },
    "Austria": { en: "Austria", ro: "Austria", de: "Österreich", fr: "Autriche", it: "Austria", es: "Austria", ru: "Австрия" },
    "Switzerland": { en: "Switzerland", ro: "Elveția", de: "Schweiz", fr: "Suisse", it: "Svizzera", es: "Suiza", ru: "Швейцария" },
    "United Kingdom": { en: "United Kingdom", ro: "Marea Britanie", de: "Großbritannien", fr: "Royaume-Uni", it: "Regno Unito", es: "Reino Unido", ru: "Великобритания" },
    "Moldova": { en: "Moldova", ro: "Moldova", de: "Moldau", fr: "Moldavie", it: "Moldavia", es: "Moldavia", ru: "Молдова" }
  };
  return (map[country] && map[country][currentLang]) || country;
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
        ${getLocalizedCountryName(g.country)} (${g.items.length})
      </button>
    `).join("");
  }
  if (leafletMap) {
    mapMarkers.forEach(m => m.remove());
    mapMarkers = [];
    const swapsWordMap = { ro: "oferte", en: "swaps", de: "Angebote", fr: "offres", it: "offerte", es: "ofertas", ru: "обменов" };
    const swapsWord = swapsWordMap[currentLang] || swapsWordMap.en;
    countries.forEach(g => {
      const isSelected = g.country === selectedMapCountry;
      const icon = window.L.divIcon({
        className: "pin-wrap",
        html: `<span class="pin ${isSelected ? 'active' : ''}"></span>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });
      const locC = getLocalizedCountryName(g.country);
      const marker = window.L.marker([g.lat, g.lng], { icon, title: locC }).addTo(leafletMap);
      marker.bindTooltip(`${locC} · ${g.items.length} ${swapsWord}`, {
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
    headingEl.innerHTML = `${PREMIUM_ICONS.pin}${getLocalizedCountryName(activeGroup.country)} (${activeGroup.items.length})`;
    const visibleItems = activeGroup.items.slice(0, 5);
    listEl.innerHTML = visibleItems.map(item => {
      const loc = getOfferLocalized(item);
      return `
        <button type="button" class="offer-list-item" onclick="openOfferModal(${item.id}, 'details')">
          <img src="${escapeHtml(item.image)}" class="offer-list-item-thumb" alt="" />
          <div class="offer-list-item-body">
            <strong>${escapeHtml(loc.title)}</strong>
            <span>${getCategoryLabel(item.category)} · ${escapeHtml(item.city)} · ~${formatOfferPrice(item, currentCurrency)}</span>
            <em>⇄ ${t("wantBadge")}: ${escapeHtml(loc.want)}</em>
          </div>
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
function renderUserHeaderState() {
  if (typeof updateMobileBottomTabBarUI === 'function') updateMobileBottomTabBarUI();
  const guestBtns = document.getElementById("guestAuthButtons");
  const userPill = document.getElementById("userAccountPill");
  const dashHeaderBtn = document.getElementById("headerDashboardBtn");
  const postWizardBtn = document.getElementById("postWizardHeaderBtn");
  const dashLogoutBtn = document.getElementById("dashLogoutBtn");
  const mobileAuthBtn = document.getElementById("mobileAuthBtn");
  const mobileDashBtn = document.getElementById("mobileDashboardBtn");
  const mobileRegBtn = document.getElementById("mobileRegisterBtn");
  if (!guestBtns || !userPill) return;
  const isProPlan = Boolean(currentUser && currentUser.plan === "pro");
  const remCount = currentUser ? (currentUser.freeSwaps ?? 10) : guestFreeSwaps;
  const maxCredits = remCount > 10 ? remCount : 10;
  const subCopy = getSubscriptionUiCopy();
  const dashSwapsEl = document.getElementById("dashFreeSwapsCount");
  if (dashSwapsEl) {
    dashSwapsEl.textContent = isProPlan ? "PRO ∞" : String(remCount);
  }
  const dashSuffixEl = document.getElementById("dashFreeSwapsSuffix");
  if (dashSuffixEl) {
    if (isProPlan) {
      dashSuffixEl.textContent = "";
    } else {
      const suffixMap = {
        ro: `/ ${maxCredits} Schimburi Gratuite`,
        en: `/ ${maxCredits} Free Swaps Available`,
        de: `/ ${maxCredits} Gratis-Swaps verfügbar`,
        fr: `/ ${maxCredits} Échanges Gratuits`,
        it: `/ ${maxCredits} Scambi Gratuiti`,
        es: `/ ${maxCredits} Intercambios Gratis`,
        ru: `/ ${maxCredits} бесплатных обменов`
      };
      dashSuffixEl.textContent = suffixMap[currentLang] || suffixMap.en;
    }
  }
  const dashProfBtn = document.getElementById("dashTabProfileBtn");
  if (dashProfBtn) {
    const profTabMap = {
      ro: "Profil & Setări",
      en: "Profile & Settings",
      de: "Profil & Einstellungen",
      fr: "Profil & Paramètres",
      it: "Profilo & Impostazioni",
      es: "Perfil y Ajustes",
      ru: "Профиль и настройки"
    };
    dashProfBtn.textContent = profTabMap[currentLang] || profTabMap.en;
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
    const initials = escapeHtml((currentUser.name || "U").split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase());
    const firstName = escapeHtml(currentUser.name.split(" ")[0]);
    const badgeLabel = isProPlan ? subCopy.proBadgeText : `${remCount} ${subCopy.swapsWord}`;
    userPill.innerHTML = `
      <div class="user-pill" onclick="openDashboardModal('mylistings')" title="${t('navDashboard')}">
        <span class="user-pill-avatar">${initials}</span>
        <span>${firstName}</span>
        <span class="user-swaps-badge" onclick="event.stopPropagation(); openSubscriptionModal('pro');" title="Upgrade / Top-up Swaps">${badgeLabel}</span>
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
  if (currentUser && currentUser.email) {
    const prevKey = String(currentUser.email).trim().toLowerCase();
    if (accountsDb[prevKey]) {
      accountsDb[prevKey].favoriteIds = Array.isArray(favoriteIds) ? [...favoriteIds] : [];
      saveAccountsDb();
    }
  }
  currentUser = null;
  favoriteIds = [];
  wizStep = 1;
  wizData = { ...DEFAULT_WIZ_DATA };
  try {
    localStorage.removeItem('ci4m_favs');
    localStorage.removeItem('ci4m_favs_v2');
    localStorage.removeItem('ci4m_wiz_draft_v1');
    localStorage.removeItem('ci4m_wiz_draft_v2');
  } catch (e) {}
  localStorage.removeItem("ci4m_user");
  updateFavCountUI();
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
  const prevEmailKey = currentUser && currentUser.email ? String(currentUser.email).trim().toLowerCase() : "";
  const emailKey = String(userData.email || "").trim().toLowerCase();
  if (prevEmailKey && prevEmailKey !== emailKey) {
    if (accountsDb[prevEmailKey]) {
      accountsDb[prevEmailKey].favoriteIds = Array.isArray(favoriteIds) ? [...favoriteIds] : [];
    }
    wizStep = 1;
    wizData = { ...DEFAULT_WIZ_DATA };
    try { localStorage.removeItem("ci4m_wiz_draft_v1"); localStorage.removeItem("ci4m_wiz_draft_v2"); } catch (e) {}
  }
  const existingAcc = emailKey && accountsDb[emailKey] ? accountsDb[emailKey] : null;
  if (prevEmailKey !== emailKey) {
    favoriteIds = Array.isArray(existingAcc?.favoriteIds) ? [...existingAcc.favoriteIds] : [];
    try { localStorage.setItem("ci4m_favs_v2", JSON.stringify(favoriteIds)); } catch (e) {}
  }
  currentUser = {
    name: userData.name || existingAcc?.name || "Alexandru",
    email: userData.email || existingAcc?.email || "",
    phone: userData.phone || existingAcc?.phone || "",
    country: userData.country || existingAcc?.country || detectedIpInfo.countryName || "Europe",
    prefLang: userData.prefLang || existingAcc?.prefLang || currentLang,
    prefCurrency: userData.prefCurrency || existingAcc?.prefCurrency || currentCurrency,
    plan: userData.plan || existingAcc?.plan || "starter",
    freeSwaps: typeof userData.freeSwaps === "number" ? userData.freeSwaps : (typeof existingAcc?.freeSwaps === "number" ? existingAcc.freeSwaps : 10),
    emailVerified: Boolean(userData.emailVerified ?? existingAcc?.emailVerified ?? true),
    kycVerified: Boolean(userData.kycVerified ?? existingAcc?.kycVerified ?? true),
    phoneVerified: Boolean(userData.phoneVerified ?? existingAcc?.phoneVerified ?? true),
    registeredAt: userData.registeredAt || existingAcc?.registeredAt || new Date().toISOString().slice(0, 16).replace("T", " ")
  };
  if (emailKey) {
    const hashedPwd = userData.password ? hashUserPassword(emailKey, userData.password) : (existingAcc?.password || "");
    accountsDb[emailKey] = {
      ...existingAcc,
      ...currentUser,
      password: hashedPwd
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
  if (pendingFavoriteOfferId !== null) {
    const pFavId = Number(pendingFavoriteOfferId);
    pendingFavoriteOfferId = null;
    if (pFavId && !favoriteIds.includes(pFavId)) {
      favoriteIds.push(pFavId);
      try { localStorage.setItem("ci4m_favs_v2", JSON.stringify(favoriteIds)); } catch (e) {}
      if (emailKey && accountsDb[emailKey]) {
        accountsDb[emailKey].favoriteIds = [...favoriteIds];
        saveAccountsDb();
      }
    }
  }
  updateFavCountUI();
  renderOffers();
  if (document.getElementById("offerModal")?.classList.contains("open") && currentOpenOfferId) {
    const prevOffered = document.getElementById("swapOfferedItemInput")?.value || "";
    const prevCalcVal = document.getElementById("calcMyValueInput")?.value || "";
    const prevBuyVal = document.getElementById("buyOfferAmountInput")?.value || "";
    const isBuyActive = document.getElementById("offerActionBuyPanel")?.style.display === "block";
    openOfferModal(currentOpenOfferId, isBuyActive ? "buy" : "details");
    if (prevOffered && document.getElementById("swapOfferedItemInput")) {
      document.getElementById("swapOfferedItemInput").value = prevOffered;
    }
    if (prevCalcVal && document.getElementById("calcMyValueInput")) {
      document.getElementById("calcMyValueInput").value = prevCalcVal;
      updateSwapValueCalculator(currentOpenOfferId);
    }
    if (prevBuyVal && document.getElementById("buyOfferAmountInput")) {
      document.getElementById("buyOfferAmountInput").value = prevBuyVal;
      onBuyOfferPriceChange(currentOpenOfferId);
    }
  }
  if (document.getElementById("wizardModal")?.classList.contains("open")) {
    wizData.owner = currentUser.name || wizData.owner;
    wizData.email = currentUser.email || wizData.email;
    wizData.phone = currentUser.phone || wizData.phone;
    if (wizStep === 7) renderWizStep();
  }
  renderUserHeaderState();
  const counterEl = document.getElementById("liveUserCount");
  if (counterEl) {
    counterEl.textContent = "1,481";
  }
  const subCopy = getSubscriptionUiCopy();
  const creditLabel = currentUser.plan === "pro" ? subCopy.proBadgeText : `${currentUser.freeSwaps} ${subCopy.swapsWord}`;
  showToast(`✓ ${currentUser.name} — ${creditLabel}!`);
  setTimeout(() => { if (typeof checkAndNotifyFavoritePriceChangesForCurrentUser === "function") checkAndNotifyFavoritePriceChangesForCurrentUser(true); }, 350);
}
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com", "10minutemail.com", "tempmail.com", "temp-mail.org",
  "guerrillamail.com", "yopmail.com", "trashmail.com", "sharklasers.com",
  "fakeinbox.com", "maildrop.cc", "getnada.com", "throwawaymail.com",
  "fake.com", "example.com", "asdf.com", "qwerty.com", "mailnesia.com",
  "dispostable.com", "tempmailaddress.com", "burnermail.io"
]);
function isValidRealEmail(rawEmail) {
  const email = String(rawEmail || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,12}$/.test(email)) return false;
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain || localPart.length < 2) return false;
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) return false;
  if (/^(.)\1{4,}$/.test(localPart)) return false;
  if (["fake", "asdf", "qwerty", "12345", "123456", "000000", "none", "null"].includes(localPart)) return false;
  return true;
}
function isValidRealPhone(rawPhone) {
  const raw = String(rawPhone || "").trim();
  if (!raw) return false;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 15) return false;
  if (/(\d)\1{6,}/.test(digits)) return false;
  const tail8 = digits.slice(-8);
  if (["12345678", "23456789", "34567890", "87654321", "98765432", "01234567", "00000000"].includes(tail8)) {
    return false;
  }
  return true;
}
function validateLiveAuthField(inputEl) {
  if (!inputEl) return;
  const rawVal = String(inputEl.value || "");
  const val = rawVal.trim();
  if (!val) {
    inputEl.classList.remove("hig-field-valid", "hig-field-invalid");
    return;
  }
  const isEmail = inputEl.type === "email" || inputEl.name === "email";
  const isPhone = inputEl.type === "tel" || inputEl.name === "phone";
  const isName = inputEl.name === "name";
  const isPwd = inputEl.name === "password" || inputEl.name === "newPassword";
  const isConfirmPwd = inputEl.name === "confirmPassword";
  let ok = true;
  if (isEmail) ok = isValidRealEmail(val);
  if (isPhone) ok = isValidRealPhone(val);
  if (isName) ok = val.length >= 3 && !/^(test|fake|asdf|qwerty|1234)/i.test(val);
  if (isPwd) {
    ok = rawVal.length >= 6;
    const form = inputEl.closest("form");
    const confirmEl = form ? form.querySelector("input[name=\"confirmPassword\"]") : null;
    if (confirmEl && confirmEl.value) {
      const cOk = rawVal.length >= 6 && confirmEl.value === rawVal;
      confirmEl.classList.toggle("hig-field-valid", cOk);
      confirmEl.classList.toggle("hig-field-invalid", !cOk);
    }
  }
  if (isConfirmPwd) {
    const form = inputEl.closest("form");
    const pwdVal = String(form?.querySelector("input[name=\"password\"]")?.value || "");
    ok = rawVal.length >= 6 && rawVal === pwdVal;
  }
  inputEl.classList.toggle("hig-field-valid", ok);
  inputEl.classList.toggle("hig-field-invalid", !ok);
}
let serverConfiguredGateways = {
  brevo: false,
  resend: false,
  textbee: false,
  smsAdvert: false,
  twilio: false,
  stripe: false
};
function sha256HexSync(asciiInput) {
  let ascii = unescape(encodeURIComponent(String(asciiInput || "")));
  function rightRotate(value, amount) { return (value >>> amount) | (value << (32 - amount)); }
  const mathPow = Math.pow, maxWord = mathPow(2, 32);
  let i, j, result = "";
  const words = [], asciiBitLength = ascii.length * 8;
  let hash = [];
  const k = [];
  let primeCounter = 0;
  const isComposite = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) isComposite[i] = candidate;
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }
  ascii += "\x80";
  while (ascii.length % 64 - 56) ascii += "\x00";
  for (i = 0; i < ascii.length; i++) {
    j = ascii.charCodeAt(i);
    words[i >> 2] |= j << ((3 - i) % 4) * 8;
  }
  words[words.length] = ((asciiBitLength / maxWord) | 0);
  words[words.length] = (asciiBitLength);
  for (j = 0; j < words.length;) {
    const w = words.slice(j, j += 16), oldHash = hash;
    hash = hash.slice(0, 8);
    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2], a = hash[0], e = hash[4];
      const temp1 = hash[7] + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) + ((e & hash[5]) ^ ((~e) & hash[6])) + k[i] + (w[i] = (i < 16) ? w[i] : (w[i - 16] + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) | 0);
      const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }
    for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
  }
  for (i = 0; i < 8; i++) {
    for (j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += ((b < 16) ? 0 : "") + b.toString(16);
    }
  }
  return result;
}
function hashUserPassword(emailKey, rawPass) {
  const s = String(rawPass || "");
  if (!s) return "";
  if (s.startsWith("sha256$")) return s;
  const cleanEmail = String(emailKey || "").trim().toLowerCase();
  return "sha256$" + sha256HexSync(`ci4m_usr_v1:${cleanEmail}:${s}`);
}
function verifyUserPassword(emailKey, enteredPass, storedPass) {
  if (!enteredPass || !storedPass) return false;
  if (String(storedPass).startsWith("sha256$")) {
    return hashUserPassword(emailKey, enteredPass) === storedPass;
  }
  return storedPass === enteredPass;
}
function verifyAdminPasswordSync(enteredPass) {
  if (!enteredPass) return false;
  return sha256HexSync("ci4m_admin_v1:" + String(enteredPass).trim()) === BACKOFFICE_ADMIN_PASS_HASH;
}
function getAuthGatewaysConfig() {
  try {
    const raw = localStorage.getItem("ci4m_auth_gateways_v1");
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        googleClientId: String(parsed.googleClientId || "").trim(),
        brevoApiKey: String(parsed.brevoApiKey || "").trim(),
        brevoSenderEmail: String(parsed.brevoSenderEmail || "jeka7ro@gmail.com").trim(),
        resendApiKey: String(parsed.resendApiKey || "").trim(),
        textbeeKey: String(parsed.textbeeKey || "").trim(),
        textbeeDevice: String(parsed.textbeeDevice || "").trim(),
        smsAdvertToken: String(parsed.smsAdvertToken || "").trim(),
        twilioSid: String(parsed.twilioSid || "").trim(),
        twilioToken: String(parsed.twilioToken || "").trim(),
        twilioFrom: String(parsed.twilioFrom || "").trim(),
        stripeSecretKey: String(parsed.stripeSecretKey || "").trim(),
        stripePack15Url: String(parsed.stripePack15Url || "").trim(),
        stripeProMonthlyUrl: String(parsed.stripeProMonthlyUrl || "").trim(),
        stripeProYearlyUrl: String(parsed.stripeProYearlyUrl || "").trim()
      };
    }
  } catch (err) { }
  return {
    googleClientId: String(window.GOOGLE_CLIENT_ID || "").trim(),
    brevoApiKey: "",
    brevoSenderEmail: "jeka7ro@gmail.com",
    resendApiKey: "",
    textbeeKey: "",
    textbeeDevice: "",
    smsAdvertToken: "",
    twilioSid: "",
    twilioToken: "",
    twilioFrom: "",
    stripeSecretKey: "",
    stripePack15Url: "",
    stripeProMonthlyUrl: "",
    stripeProYearlyUrl: ""
  };
}
function saveAuthGatewaysConfig(e) {
  if (e && typeof e.preventDefault === "function") e.preventDefault();
  const prev = getAuthGatewaysConfig();
  const rawBrevo = String(document.getElementById("boBrevoApiKeyInput")?.value || "").trim();
  const rawStripeKey = String(document.getElementById("boStripeSecretKeyInput")?.value || "").trim();
  const cfg = {
    googleClientId: String(document.getElementById("boGoogleClientIdInput")?.value ?? prev.googleClientId).trim(),
    brevoApiKey: (rawBrevo && !rawBrevo.startsWith("•••")) ? rawBrevo : prev.brevoApiKey,
    brevoSenderEmail: String(document.getElementById("boBrevoSenderInput")?.value || prev.brevoSenderEmail || "jeka7ro@gmail.com").trim(),
    resendApiKey: String(document.getElementById("boResendApiKeyInput")?.value ?? prev.resendApiKey).trim(),
    textbeeKey: String(document.getElementById("boTextbeeKeyInput")?.value ?? prev.textbeeKey).trim(),
    textbeeDevice: String(document.getElementById("boTextbeeDeviceInput")?.value ?? prev.textbeeDevice).trim(),
    smsAdvertToken: String(document.getElementById("boSmsAdvertTokenInput")?.value ?? prev.smsAdvertToken).trim(),
    twilioSid: String(document.getElementById("boTwilioSidInput")?.value ?? prev.twilioSid).trim(),
    twilioToken: String(document.getElementById("boTwilioTokenInput")?.value ?? prev.twilioToken).trim(),
    twilioFrom: String(document.getElementById("boTwilioFromInput")?.value ?? prev.twilioFrom).trim(),
    stripeSecretKey: (rawStripeKey && !rawStripeKey.startsWith("•••")) ? rawStripeKey : prev.stripeSecretKey,
    stripePack15Url: String(document.getElementById("boStripePack15UrlInput")?.value ?? prev.stripePack15Url).trim(),
    stripeProMonthlyUrl: String(document.getElementById("boStripeProMonthlyUrlInput")?.value ?? prev.stripeProMonthlyUrl).trim(),
    stripeProYearlyUrl: String(document.getElementById("boStripeProYearlyUrlInput")?.value ?? prev.stripeProYearlyUrl).trim()
  };
  if (cfg.brevoApiKey) serverConfiguredGateways.brevo = true;
  if (cfg.stripeSecretKey) serverConfiguredGateways.stripe = true;
  try {
    localStorage.setItem("ci4m_auth_gateways_v1", JSON.stringify(cfg));
  } catch (err) { }
  if (typeof pushCloudDatabaseSync === "function") {
    pushCloudDatabaseSync({ authGateways: cfg });
  }
  renderAdminModalContent();
  showToast("✓ Configuration saved & synced to Cloud!");
}
async function testAuthGatewaysLive() {
  const gw = getAuthGatewaysConfig();
  const testCode = String(Math.floor(100000 + Math.random() * 900000));
  const testEmail = currentUser?.email || gw.brevoSenderEmail || BACKOFFICE_ADMIN_EMAIL;
  showToast(`↻ Testing live Brevo email delivery to ${testEmail}...`);
  const res = await dispatchOtpCodeToServer({
    name: "Eugeniu · Brevo Live Test",
    email: testEmail,
    phone: ""
  }, testCode);
  const emailLive = Boolean((res && res.emailSent) || gw.brevoApiKey || serverConfiguredGateways.brevo || gw.resendApiKey);
  showToast(`✓ Test Email OTP #${testCode} → ${testEmail} (${emailLive ? "LIVE SENT ✓ via Brevo" : "Sandbox"})`);
}
function getAuthMsg() {
  const map = {
    en: {
      pwdMismatch: "! Passwords do not match!",
      pwdTooShort: "! Password must be at least 6 characters long.",
      wrongPwd: "! Incorrect password for this registered email.",
      codeAutoFill: "Email verification code:",
      clickToFill: "Click to auto-fill",
      resetSent: "✓ Password reset instructions sent to your email!",
      invalidEmail: "! Please enter a valid, real email address (disposable/fake emails are blocked).",
      invalidPhone: "! Please enter a valid phone number (e.g. +40 722 123 456).",
      invalidName: "! Please enter your real full name (minimum 3 characters).",
      wrongOtpCode: "! Incorrect 6-digit verification code! Please check your email inbox and try again.",
      unregisteredLogin: "! This email is not registered yet. Please create an account and verify your email code first.",
      alreadyRegistered: "! An account with this email already exists. Please log in.",
      invalidGmail: "! Please enter a valid Google (@gmail.com) email address."
    },
    de: {
      pwdMismatch: "! Passwörter stimmen nicht überein!",
      pwdTooShort: "! Das Passwort muss mindestens 6 Zeichen lang sein.",
      wrongPwd: "! Falsches Passwort für diese E-Mail.",
      codeAutoFill: "E-Mail-Bestätigungscode:",
      clickToFill: "Klicken zum Einfügen",
      resetSent: "✓ Link zum Zurücksetzen des Passworts gesendet!",
      invalidEmail: "! Bitte geben Sie eine gültige E-Mail-Adresse ein (Wegwerf-E-Mails sind gesperrt).",
      invalidPhone: "! Bitte geben Sie eine gültige Telefonnummer ein (z.B. +49 170 1234567).",
      invalidName: "! Bitte geben Sie Ihren vollständigen Namen ein.",
      wrongOtpCode: "! Falscher 6-stelliger Bestätigungscode! Bitte prüfen Sie Ihr E-Mail-Postfach.",
      unregisteredLogin: "! Diese E-Mail ist noch nicht registriert. Bitte erstellen Sie zuerst ein Konto.",
      alreadyRegistered: "! Ein Konto mit dieser E-Mail existiert bereits. Bitte melden Sie sich an.",
      invalidGmail: "! Bitte geben Sie eine gültige @gmail.com-Adresse ein."
    },
    fr: {
      pwdMismatch: "! Les mots de passe ne correspondent pas !",
      pwdTooShort: "! Le mot de passe doit contenir au moins 6 caractères.",
      wrongPwd: "! Mot de passe incorrect pour cet e-mail.",
      codeAutoFill: "Code de vérification e-mail :",
      clickToFill: "Cliquer pour remplir",
      resetSent: "✓ Lien de réinitialisation envoyé par e-mail !",
      invalidEmail: "! Veuillez saisir une adresse e-mail réelle et valide.",
      invalidPhone: "! Veuillez saisir un numéro de téléphone mobile valide (ex. +33 6 12 34 56 78).",
      invalidName: "! Veuillez saisir votre nom complet réel.",
      wrongOtpCode: "! Code à 6 chiffres incorrect ! Vérifiez votre boîte e-mail.",
      unregisteredLogin: "! Cet e-mail n'est pas encore inscrit. Veuillez créer un compte et vérifier votre e-mail.",
      alreadyRegistered: "! Un compte existe déjà avec cet e-mail. Connectez-vous.",
      invalidGmail: "! Veuillez saisir une adresse @gmail.com valide."
    },
    it: {
      pwdMismatch: "! Le password non coincidono!",
      pwdTooShort: "! La password deve contenere almeno 6 caratteri.",
      wrongPwd: "! Password errata per questa email.",
      codeAutoFill: "Codice di verifica email:",
      clickToFill: "Clicca per compilare",
      resetSent: "✓ Link di reimpostazione password inviato!",
      invalidEmail: "! Inserisci un indirizzo email reale e valido.",
      invalidPhone: "! Inserisci un numero di cellulare valido (es. +39 333 1234567).",
      invalidName: "! Inserisci il tuo nome e cognome reale.",
      wrongOtpCode: "! Codice a 6 cifre errato! Controlla la tua casella email.",
      unregisteredLogin: "! Questa email non è ancora registrata. Crea prima un account e verifica l'email.",
      alreadyRegistered: "! Esiste già un account con questa email. Accedi.",
      invalidGmail: "! Inserisci un indirizzo @gmail.com valido."
    },
    es: {
      pwdMismatch: "! ¡Las contraseñas no coinciden!",
      pwdTooShort: "! La contraseña debe tener al menos 6 caracteres.",
      wrongPwd: "! Contraseña incorrecta para este correo.",
      codeAutoFill: "Código de verificación por correo:",
      clickToFill: "Clic para autocompletar",
      resetSent: "✓ ¡Enlace de restablecimiento enviado!",
      invalidEmail: "! Introduce un correo electrónico real y válido.",
      invalidPhone: "! Introduce un número de teléfono móvil válido (ej. +34 612 345 678).",
      invalidName: "! Introduce tu nombre completo real.",
      wrongOtpCode: "! ¡Código de 6 dígitos incorrecto! Revisa tu bandeja de correo.",
      unregisteredLogin: "! Este correo aún no está registrado. Crea una cuenta y verifica tu correo primero.",
      alreadyRegistered: "! Ya existe una cuenta con este correo. Inicia sesión.",
      invalidGmail: "! Introduce una dirección @gmail.com válida."
    },
    ro: {
      pwdMismatch: "! Parolele nu coincid!",
      pwdTooShort: "! Parola trebuie să aibă cel puțin 6 caractere.",
      wrongPwd: "! Parolă incorectă pentru acest email înregistrat.",
      codeAutoFill: "Cod verificare Email:",
      clickToFill: "Click pentru completare",
      resetSent: "✓ Link-ul de resetare a parolei a fost trimis pe email!",
      invalidEmail: "! Introdu o adresă de email reală și validă (domeniile temporare/fake sunt blocate).",
      invalidPhone: "! Introdu un număr de telefon valid (ex: +40 722 123 456).",
      invalidName: "! Introdu numele tău complet real (minim 3 caractere).",
      wrongOtpCode: "! Codul din 6 cifre introdus este incorect! Verifică codul primit pe Email.",
      unregisteredLogin: "! Acest cont nu există încă. Creează contul și confirmă adresa de email cu codul din 6 cifre.",
      alreadyRegistered: "! Există deja un cont înregistrat cu acest email. Autentifică-te.",
      invalidGmail: "! Introdu o adresă Google (@gmail.com) reală și validă."
    },
    ru: {
      pwdMismatch: "! Пароли не совпадают!",
      pwdTooShort: "! Пароль должен содержать минимум 6 символов.",
      wrongPwd: "! Неверный пароль для этого email.",
      codeAutoFill: "Код подтверждения Email:",
      clickToFill: "Нажмите для автозаполнения",
      resetSent: "✓ Ссылка для сброса пароля отправлена!",
      invalidEmail: "! Введите действительный реальный email (временные адреса заблокированы).",
      invalidPhone: "! Введите реальный номер мобильного телефона (например, +40 722 123 456).",
      invalidName: "! Введите ваше настоящее полное имя.",
      wrongOtpCode: "! Неверный 6-значный код подтверждения! Проверьте ваш Email.",
      unregisteredLogin: "! Этот email еще не зарегистрирован. Сначала создайте аккаунт и подтвердите Email.",
      alreadyRegistered: "! Аккаунт с таким email уже существует. Войдите.",
      invalidGmail: "! Введите действительный адрес @gmail.com."
    }
  };
  return map[currentLang] || map.en;
}
function handleInlineRegistration(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const name = String(fd.get("name") || "").trim();
  const email = String(fd.get("email") || "").trim();
  const phone = String(fd.get("phone") || "").trim();
  const pass = String(fd.get("password") || "");
  const confirm = String(fd.get("confirmPassword") || "");
  const am = getAuthMsg();
  if (name.length < 3 || /^(test|fake|asdf|qwerty|1234)/i.test(name)) {
    showToast(am.invalidName);
    return;
  }
  if (!isValidRealEmail(email)) {
    showToast(am.invalidEmail);
    return;
  }
  if (!isValidRealPhone(phone)) {
    showToast(am.invalidPhone);
    return;
  }
  if (!pass || pass.length < 6) {
    showToast(am.pwdTooShort || am.pwdMismatch);
    return;
  }
  if (pass !== confirm) {
    showToast(am.pwdMismatch);
    return;
  }
  const emailKey = email.toLowerCase();
  if (accountsDb[emailKey] && !(accountsDb[emailKey].isPlatformSeed || accountsDb[emailKey].isPartnerSeed)) {
    showToast(am.alreadyRegistered);
    switchEnrollTab("signin");
    return;
  }
  startEmailVerification({
    name,
    email,
    password: pass,
    phone,
    country: String(fd.get("country") || detectedIpInfo.countryName || "Romania").trim(),
    prefLang: String(fd.get("prefLang") || currentLang),
    prefCurrency: String(fd.get("prefCurrency") || currentCurrency),
    emailVerified: true,
    phoneVerified: true
  });
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
function fillQuickPostSample(cat) {
  const samples = {
    "cars": {
      eur: 58000,
      have: currentLang === "ro" ? "2022 BMW X5 xDrive45e M-Sport (42.000 km)" : "2022 BMW X5 xDrive45e M-Sport (42,000 km)",
      want: currentLang === "ro" ? "Porsche Macan S / Apartament 2 camere (± diferență)" : "Porsche Macan S / 2-Room Apartment (± cash)",
      loc: currentLang === "ro" ? "București, România" : "Munich, Germany",
      desc: currentLang === "ro" ? "Primul proprietar, istoric complet în reprezentanța BMW, fără accident, pachet M-Sport" : "First owner, full official BMW service history, accident-free, M-Sport package",
      img: "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1000&q=80"
    },
    "real-estate": {
      eur: 195000,
      have: currentLang === "ro" ? "Apartament 3 Camere Modern + Parcare Subterană (86 m²)" : "Modern 3-Room Apartment + Underground Parking (86 m²)",
      want: currentLang === "ro" ? "Casă cu curte / Vilă sau SUV + diferență" : "House with Garden / Villa or Luxury SUV + Cash",
      loc: currentLang === "ro" ? "Cluj-Napoca, România" : "Vienna, Austria",
      desc: currentLang === "ro" ? "Mobilat complet, încălzire în pardoseală, liber de sarcini, pregătit pentru schimb notarial 1:1" : "Fully furnished, underfloor heating, mortgage-free, ready for 1:1 notary deed swap",
      img: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1000&q=80"
    },
    "electronics": {
      eur: 1450,
      have: "Apple iPhone 16 Pro Max 512GB Natural Titanium",
      want: currentLang === "ro" ? "MacBook Pro 16 M3 / iPad Pro M4 + diferență" : "MacBook Pro 16 M3 / iPad Pro M4 + cash balance",
      loc: currentLang === "ro" ? "București, România" : "Zurich, Switzerland",
      desc: currentLang === "ro" ? "100% sănătate baterie, cutie sigilată + factură și garanție Apple 24 luni" : "100% battery health, original box + invoice and 24M Apple warranty",
      img: "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=1000&q=80"
    }
  };
  const s = samples[cat] || samples.cars;
  const catSel = document.getElementById("quickPostCategorySelect");
  const valIn = document.getElementById("quickPostValueInput");
  const currSel = document.getElementById("quickPostCurrencySelect");
  const haveIn = document.getElementById("quickHaveInput");
  const wantIn = document.getElementById("quickWantInput");
  const locIn = document.getElementById("quickLocationInput");
  const descIn = document.getElementById("quickDescInput");
  const photoIn = document.getElementById("quickPhotoUrlInput");
  if (catSel) catSel.value = cat;
  const activeCurr = currSel?.value || currentCurrency;
  if (valIn) valIn.value = String(convertFromEur(s.eur, activeCurr));
  if (haveIn) haveIn.value = s.have;
  if (wantIn) wantIn.value = s.want;
  if (locIn) locIn.value = s.loc;
  if (descIn) descIn.value = s.desc;
  if (photoIn) photoIn.value = s.img;
  onQuickPostPriceChange();
}
function requireAuthForPostingOrProposal(kind = "post", prefillEmail = "") {
  const isBackofficeOpen = Boolean(adminAuthenticated && document.getElementById("adminModal")?.classList.contains("open"));
  if (currentUser || isBackofficeOpen) return true;
  const msgMap = {
    post: {
      ro: "Autentifică-te sau creează un cont pentru a publica anunțul pe profilul tău și a primi propuneri 1:1.",
      en: "Please sign in or create an account to publish your listing under your profile and receive 1:1 proposals.",
      de: "Bitte melden Sie sich an oder erstellen Sie ein Konto, um Ihr Inserat zu veröffentlichen.",
      fr: "Veuillez vous connecter ou créer un compte pour publier votre annonce et recevoir des propositions 1:1.",
      it: "Accedi o crea un account per pubblicare il tuo annuncio e ricevere proposte 1:1.",
      es: "Inicia sesión o crea una cuenta para publicar tu anuncio y recibir propuestas 1:1.",
      ru: "Войдите или создайте аккаунт, чтобы опубликовать объявление и получать предложения 1:1."
    },
    proposal: {
      ro: "Autentifică-te în contul tău pentru a trimite propunerea 1:1 și a deschide chatul direct cu proprietarul.",
      en: "Please sign in to your account to send your 1:1 proposal and open direct chat with the owner.",
      de: "Bitte melden Sie sich an, um Ihren 1:1-Vorschlag zu senden und direkt mit dem Eigentümer zu chatten.",
      fr: "Veuillez vous connecter pour envoyer votre proposition 1:1 et discuter avec le propriétaire.",
      it: "Accedi al tuo account per inviare la proposta 1:1 e chattare con il proprietario.",
      es: "Inicia sesión para enviar tu propuesta 1:1 y chatear con el propietario.",
      ru: "Войдите в аккаунт, чтобы отправить предложение 1:1 и открыть чат с владельцем."
    }
  };
  const group = msgMap[kind] || msgMap.post;
  showToast(group[currentLang] || group.en);
  openAuthModal("login");
  if (prefillEmail && isValidRealEmail(prefillEmail)) {
    const loginEm = document.querySelector("#modalLoginForm input[name='email']");
    const regEm = document.querySelector("#modalRegisterForm input[name='email']");
    if (loginEm && !loginEm.value) loginEm.value = prefillEmail;
    if (regEm && !regEm.value) regEm.value = prefillEmail;
  }
  return false;
}
function handleInlineQuickPost(e) {
  e.preventDefault();
  if (!requireAuthForPostingOrProposal("post")) return;
  if (!canPerformSwapOrPost()) return;
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
  const enteredVal = sanitizeNumericAmount(fd.get("valueEur"), 15000) || 15000;
  const enteredCurr = String(fd.get("valueCurrency") || currentCurrency).toUpperCase();
  const normalizedValueEur = convertToEur(enteredVal, enteredCurr);
  const dealType = fd.get("dealType") || "1to1";
  const titleHave = String(fd.get("titleHave") || "").trim();
  const titleWant = String(fd.get("titleWant") || "").trim() || (dealType === "sale" ? t("dealSaleOnly") : "Direct 1:1 Swap");
  const desc = String(fd.get("desc") || "").trim() || "Verified Condition";
  const customImgUrl = String(fd.get("imageUrl") || "").trim();
  const primaryImage = (customImgUrl.startsWith("http://") || customImgUrl.startsWith("https://"))
    ? customImgUrl
    : (defaultImages[cat] || defaultImages.cars);
  const pool = (typeof CATEGORY_GALLERY_POOLS !== "undefined" && CATEGORY_GALLERY_POOLS[cat]) ? CATEGORY_GALLERY_POOLS[cat] : [];
  const galleryImages = [primaryImage, ...pool.filter(u => u !== primaryImage).slice(0, 2)];
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
    image: primaryImage,
    images: galleryImages,
    specs: desc,
    title: titleHave,
    want: titleWant,
    desc
  };
  offers.unshift(newOffer);
  saveOffersToStorage();
  consumeFreeSwapIfLogged();
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
let pendingRegistrationUser = null;
let verifyTimerInterval = null;
let verifySecondsRemaining = 60;
let generatedVerifyCode = "";
let verifyCodeExpiresAt = 0;
let verifyFailedAttempts = 0;
let socialAuthProvider = "google";
function openAuthModal(mode = "register") {
  currentAuthMode = mode;
  document.getElementById("authModal").classList.add("open");
  document.body.classList.add("modal-open");
  switchAuthTab(mode);
  syncUrlWithRoute(mode === "login" ? "/login" : "/register");
}
function hasAnyOpenModalBackdrop() {
  return Boolean(document.querySelector(".modal-backdrop.open"));
}
function closeAuthModal() {
  document.getElementById("authModal").classList.remove("open");
  if (verifyTimerInterval) {
    clearInterval(verifyTimerInterval);
    verifyTimerInterval = null;
  }
  if (hasAnyOpenModalBackdrop()) {
    document.body.classList.add("modal-open");
    if (document.getElementById("offerModal")?.classList.contains("open") && currentOpenOfferId) {
      syncUrlWithRoute(`/offer/${currentOpenOfferId}`);
    }
  } else {
    document.body.classList.remove("modal-open");
    syncUrlWithRoute(document.body.classList.contains("mobile-started") ? "/start" : "/");
  }
}
let lastOtpDeliveryMode = "sandbox";
function switchAuthTab(mode) {
  currentAuthMode = mode;
  const isReg = mode === "register";
  const isLogin = mode === "login";
  const isVerify = mode === "verify";
  const isReset = mode === "reset";
  const isGoogle = mode === "google";
  if (document.getElementById("authModal")?.classList.contains("open") && (isReg || isLogin)) {
    syncUrlWithRoute(isLogin ? "/login" : "/register", true);
  }
  document.getElementById("authTabRegisterBtn")?.classList.toggle("active", isReg);
  document.getElementById("authTabLoginBtn")?.classList.toggle("active", isLogin);
  const regForm = document.getElementById("modalRegisterForm");
  const loginForm = document.getElementById("modalLoginForm");
  const verifyForm = document.getElementById("modalVerifyForm");
  const resetForm = document.getElementById("modalResetForm");
  const googleForm = document.getElementById("modalGoogleForm");
  if (regForm) regForm.style.display = isReg ? "flex" : "none";
  if (loginForm) loginForm.style.display = isLogin ? "flex" : "none";
  if (verifyForm) verifyForm.style.display = isVerify ? "flex" : "none";
  if (resetForm) resetForm.style.display = isReset ? "flex" : "none";
  if (googleForm) googleForm.style.display = isGoogle ? "flex" : "none";
  const titleEl = document.getElementById("authModalTitle");
  if (titleEl) {
    if (isVerify) {
      titleEl.style.display = "none";
    } else if (isGoogle) {
      titleEl.style.display = "block";
      const isApple = socialAuthProvider === "apple";
      titleEl.textContent = isApple ? t("formAppleBtn") : t("formGoogleBtn");
      const gPromptMap = {
        en: isApple ? "Select your Apple ID to sign in with 1 click:" : "Choose a Google account to continue to ChangeIt4Me:",
        de: isApple ? "Wählen Sie Ihre Apple-ID für den 1-Klick-Login:" : "Google-Konto auswählen, um fortzufahren:",
        fr: isApple ? "Choisissez votre identifiant Apple en 1 clic :" : "Choisissez un compte Google pour continuer :",
        it: isApple ? "Scegli il tuo Apple ID per accedere in 1 clic:" : "Scegli un account Google per continuare:",
        es: isApple ? "Elige tu Apple ID para iniciar sesión en 1 clic:" : "Elige una cuenta de Google para continuar:",
        ro: isApple ? "Alege contul Apple ID pentru autentificare 1-click:" : "Alege contul tău Google pentru autentificare instantă 1-click:",
        ru: isApple ? "Выберите Apple ID для входа в 1 клик:" : "Выберите аккаунт Google для продолжения:"
      };
      const anotherMap = {
        en: isApple ? "or enter another Apple ID email" : "or enter another Gmail address",
        de: isApple ? "oder andere Apple-ID eingeben" : "oder andere Gmail-Adresse eingeben",
        fr: isApple ? "ou utiliser un autre Apple ID" : "ou saisir une autre adresse Gmail",
        it: isApple ? "o inserisci un altro Apple ID" : "o inserisci un altro indirizzo Gmail",
        es: isApple ? "o usa otro Apple ID" : "o introduce otro correo Gmail",
        ro: isApple ? "sau introdu alt email Apple ID" : "sau introdu altă adresă Gmail",
        ru: isApple ? "или введите другой Apple ID" : "или введите другой адрес Gmail"
      };
      const gBtnMap = {
        en: isApple ? "Continue with Apple →" : "Continue with Google →",
        de: isApple ? "Mit Apple fortfahren →" : "Mit Google fortfahren →",
        fr: isApple ? "Continuer avec Apple →" : "Continuer avec Google →",
        it: isApple ? "Continua con Apple →" : "Continua con Google →",
        es: isApple ? "Continuar con Apple →" : "Continuar con Google →",
        ro: isApple ? "Continuă cu Apple →" : "Continuă cu Google →",
        ru: isApple ? "Продолжить с Apple →" : "Продолжить с Google →"
      };
      const gpEl = document.getElementById("googlePromptText");
      if (gpEl) gpEl.textContent = gPromptMap[currentLang] || gPromptMap.en;
      const anotherEl = document.getElementById("socialUseAnotherLabel");
      if (anotherEl) anotherEl.textContent = anotherMap[currentLang] || anotherMap.en;
      const gEmailIn = document.getElementById("googleAuthEmailInput");
      if (gEmailIn) {
        gEmailIn.placeholder = isApple ? "name@icloud.com / Apple ID" : "your.name@gmail.com";
        gEmailIn.value = "";
        gEmailIn.classList.remove("hig-field-valid", "hig-field-invalid");
      }
      const gSubBtn = document.getElementById("googleSubmitBtn");
      if (gSubBtn) gSubBtn.textContent = gBtnMap[currentLang] || gBtnMap.en;
      renderSocialAccountChooserList(isApple);
    } else if (isReset) {
      titleEl.style.display = "block";
      titleEl.textContent = t("authForgotPwd");
      const resetPromptMap = {
        ro: "Introdu adresa de email a contului și alege o parolă nouă:",
        en: "Enter your account email and choose a new password:",
        de: "Geben Sie Ihre Konto-E-Mail-Adresse und ein neues Passwort ein:",
        fr: "Entrez l'e-mail de votre compte et choisissez un nouveau mot de passe :",
        it: "Inserisci l'email del tuo account e scegli una nuova password:",
        es: "Introduce el correo de tu cuenta y elige una nueva contraseña:",
        ru: "Введите email вашего аккаунта и укажите новый пароль:"
      };
      const resetBtnMap = {
        ro: "Resetează parola →",
        en: "Reset Password →",
        de: "Passwort zurücksetzen →",
        fr: "Réinitialiser le mot de passe →",
        it: "Reimposta password →",
        es: "Restablecer contraseña →",
        ru: "Сбросить пароль →"
      };
      const rpEl = document.getElementById("resetPromptText");
      if (rpEl) rpEl.textContent = resetPromptMap[currentLang] || resetPromptMap.en;
      const rbEl = document.getElementById("resetSubmitBtn");
      if (rbEl) rbEl.textContent = resetBtnMap[currentLang] || resetBtnMap.en;
    } else {
      titleEl.style.display = "block";
      const key = isReg ? "authCreateHeading" : "authSignInHeading";
      titleEl.setAttribute("data-i18n", key);
      titleEl.textContent = t(key);
    }
  }
}
async function dispatchOtpCodeToServer(userData, code) {
  if (typeof fetch !== "function") return;
  try {
    const gw = getAuthGatewaysConfig();
    const headers = { "Content-Type": "application/json" };
    if (gw.brevoApiKey) headers["x-brevo-api-key"] = gw.brevoApiKey;
    if (gw.brevoSenderEmail) headers["x-brevo-sender-email"] = gw.brevoSenderEmail;
    if (gw.resendApiKey) headers["x-resend-api-key"] = gw.resendApiKey;
    if (gw.textbeeKey) headers["x-textbee-key"] = gw.textbeeKey;
    if (gw.textbeeDevice) headers["x-textbee-device"] = gw.textbeeDevice;
    if (gw.smsAdvertToken) headers["x-smsadvert-token"] = gw.smsAdvertToken;
    if (gw.twilioSid) headers["x-twilio-sid"] = gw.twilioSid;
    if (gw.twilioToken) headers["x-twilio-token"] = gw.twilioToken;
    if (gw.twilioFrom) headers["x-twilio-from"] = gw.twilioFrom;
    const resp = await fetch("/api/sync", {
      method: "POST",
      headers,
      body: JSON.stringify({
        action: "send_otp",
        email: userData?.email || "",
        phone: userData?.phone || "",
        name: userData?.name || "Member",
        code
      })
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data && data.deliveryMode) {
        lastOtpDeliveryMode = data.deliveryMode;
        renderVerifySentHelper();
      }
      return data;
    }
  } catch (err) { }
  return null;
}
function renderVerifySentHelper() {
  const statusEl = document.getElementById("verifySentStatus");
  if (!statusEl) return;
  const am = getAuthMsg();
  const targetEmail = escapeHtml(pendingRegistrationUser?.email || "email");
  const liveHintMap = {
    ro: "Introdu codul din 6 cifre primit în căsuța ta de email.",
    en: "Enter the 6-digit code received in your email inbox.",
    de: "Geben Sie den 6-stelligen Code aus Ihrem E-Mail-Postfach ein.",
    fr: "Entrez le code à 6 chiffres reçu dans votre boîte e-mail.",
    it: "Inserisci il codice a 6 cifre ricevuto nella tua casella email.",
    es: "Introduce el código de 6 dígitos recibido en tu correo.",
    ru: "Введите 6-значный код, полученный на ваш email."
  };
  const changeEmailMap = {
    ro: "← Modifică adresa de email",
    en: "← Change email address",
    de: "← E-Mail-Adresse ändern",
    fr: "← Modifier l'adresse e-mail",
    it: "← Modifica indirizzo email",
    es: "← Cambiar dirección de correo",
    ru: "← Изменить адрес email"
  };
  const changeEmailBtnHtml = `<div style="margin-top:10px;"><button type="button" onclick="switchAuthTab('register')" style="background:transparent;border:none;color:rgba(236,255,245,0.85);font-size:12px;font-weight:700;text-decoration:underline;cursor:pointer;padding:4px 8px;">${changeEmailMap[currentLang] || changeEmailMap.en}</button></div>`;
  if (lastOtpDeliveryMode === "live") {
    statusEl.innerHTML = `
      <span style="display:block;margin-bottom:4px;">✓ ${t("authCodeSentMsg")} (<strong>${targetEmail}</strong>)</span>
      <span style="font-size:11.5px;color:rgba(236,255,245,0.75);">${liveHintMap[currentLang] || liveHintMap.en}</span>
      ${changeEmailBtnHtml}
    `;
  } else {
    statusEl.innerHTML = `
      <span style="display:block;margin-bottom:8px;">✓ ${t("authCodeSentMsg")} (<strong>${targetEmail}</strong>)</span>
      <button type="button" onclick="autoFillVerificationCode()" style="background:rgba(169,255,202,0.22);border:1px solid #a9ffca;color:#ffffff;padding:6px 14px;border-radius:999px;font-size:12.5px;font-weight:800;cursor:pointer;">
        ${am.codeAutoFill} ${escapeHtml(generatedVerifyCode)} · ${am.clickToFill}
      </button>
      ${changeEmailBtnHtml}
    `;
  }
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
  verifyCodeExpiresAt = Date.now() + 10 * 60 * 1000;
  verifyFailedAttempts = 0;
  lastOtpDeliveryMode = "sandbox";
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
  dispatchOtpCodeToServer(userData, generatedVerifyCode);
  showToast(`✓ ${t("authCodeSentMsg")} (${userData?.email || ""})`);
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
  verifyCodeExpiresAt = Date.now() + 10 * 60 * 1000;
  verifyFailedAttempts = 0;
  renderVerifySentHelper();
  startVerifyCountdown(60);
  dispatchOtpCodeToServer(pendingRegistrationUser, generatedVerifyCode);
  showToast(`✓ ${t("authCodeSentMsg")}`);
}
function handleVerifyEmailCode(e) {
  e.preventDefault();
  const codeInput = document.getElementById("verifyCodeInput");
  const entered = String(codeInput?.value || "").trim();
  const am = getAuthMsg();
  if (!/^\d{6}$/.test(entered)) {
    showToast(`! ${t("authVerifyPlaceholder")}`);
    return;
  }
  if (!pendingRegistrationUser || !generatedVerifyCode || (verifyCodeExpiresAt > 0 && Date.now() > verifyCodeExpiresAt)) {
    showToast(am.wrongOtpCode);
    return;
  }
  if (entered !== String(generatedVerifyCode)) {
    verifyFailedAttempts++;
    if (verifyFailedAttempts >= 5) {
      generatedVerifyCode = "";
    }
    showToast(am.wrongOtpCode);
    if (codeInput) {
      codeInput.value = "";
      codeInput.focus();
    }
    return;
  }
  if (verifyTimerInterval) {
    clearInterval(verifyTimerInterval);
    verifyTimerInterval = null;
  }
  const verifiedPayload = {
    ...pendingRegistrationUser,
    kycVerified: true,
    emailVerified: true,
    phoneVerified: true,
    registeredAt: new Date().toISOString().slice(0, 16).replace("T", " ")
  };
  if (verifiedPayload.isGoogleAuth && verifiedPayload.email) {
    try {
      localStorage.setItem("ci4m_saved_google_user_v1", JSON.stringify({
        name: verifiedPayload.name,
        email: verifiedPayload.email,
        phone: verifiedPayload.phone || ""
      }));
    } catch (err) { }
  }
  if (typeof fetch === "function" && verifiedPayload.email) {
    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify_otp", email: verifiedPayload.email, code: entered })
    }).catch(() => {});
  }
  generatedVerifyCode = "";
  verifyCodeExpiresAt = 0;
  verifyFailedAttempts = 0;
  activateUserAccount(verifiedPayload);
  pendingRegistrationUser = null;
  document.getElementById("modalRegisterForm")?.reset();
  document.querySelector("#enrollAccountPanel form")?.reset();
  document.querySelectorAll("#modalRegisterForm .pill-input, #enrollAccountPanel .pill-input").forEach(el => {
    el.classList.remove("hig-field-valid", "hig-field-invalid");
  });
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
  document.getElementById("authModal")?.classList.add("open");
  document.body.classList.add("modal-open");
  switchAuthTab("reset");
  const resetEmailEl = document.getElementById("resetEmailInput");
  if (resetEmailEl) {
    const existingEmail = document.querySelector("#modalLoginForm input[name='email']")?.value
      || document.querySelector("#enrollSignInPanel input[name='email']")?.value
      || "";
    if (existingEmail && !resetEmailEl.value) resetEmailEl.value = existingEmail;
    setTimeout(() => resetEmailEl.focus(), 60);
  }
}
function handleResetPasswordSubmit(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const email = String(fd.get("email") || "").trim();
  const newPassword = String(fd.get("newPassword") || "");
  const am = getAuthMsg();
  if (!isValidRealEmail(email)) {
    showToast(am.invalidEmail);
    return;
  }
  if (newPassword.length < 6) {
    showToast(am.pwdTooShort || am.pwdMismatch);
    return;
  }
  const emailKey = email.toLowerCase();
  const existing = accountsDb[emailKey];
  if (!existing) {
    showToast(am.unregisteredLogin);
    switchAuthTab("register");
    return;
  }
  startEmailVerification({
    name: existing.name || "Verified Member",
    email,
    password: newPassword,
    phone: existing.phone || "",
    country: existing.country || detectedIpInfo.countryName || "Romania",
    prefLang: existing.prefLang || currentLang,
    prefCurrency: existing.prefCurrency || currentCurrency,
    plan: existing.plan || "starter",
    freeSwaps: typeof existing.freeSwaps === "number" ? existing.freeSwaps : 10
  });
  e.target.reset();
}
function handleModalRegister(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const name = String(fd.get("name") || "").trim();
  const email = String(fd.get("email") || "").trim();
  const phone = String(fd.get("phone") || "").trim();
  const pass = String(fd.get("password") || "");
  const confirm = String(fd.get("confirmPassword") || "");
  const am = getAuthMsg();
  if (name.length < 3 || /^(test|fake|asdf|qwerty|1234)/i.test(name)) {
    showToast(am.invalidName);
    return;
  }
  if (!isValidRealEmail(email)) {
    showToast(am.invalidEmail);
    return;
  }
  if (!isValidRealPhone(phone)) {
    showToast(am.invalidPhone);
    return;
  }
  if (!pass || pass.length < 6) {
    showToast(am.pwdTooShort || am.pwdMismatch);
    return;
  }
  if (pass !== confirm) {
    showToast(am.pwdMismatch);
    return;
  }
  const emailKey = email.toLowerCase();
  if (accountsDb[emailKey] && !(accountsDb[emailKey].isPlatformSeed || accountsDb[emailKey].isPartnerSeed)) {
    showToast(am.alreadyRegistered);
    switchAuthTab("login");
    const loginEmailInput = document.querySelector("#modalLoginForm input[name='email']");
    if (loginEmailInput) loginEmailInput.value = email;
    return;
  }
  startEmailVerification({
    name,
    email,
    password: pass,
    phone,
    country: String(fd.get("country") || detectedIpInfo.countryName || "Romania").trim(),
    prefLang: String(fd.get("prefLang") || currentLang),
    prefCurrency: String(fd.get("prefCurrency") || currentCurrency),
    emailVerified: true,
    phoneVerified: true
  });
}
function handleModalLogin(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const email = String(fd.get("email") || "").trim();
  const password = String(fd.get("password") || "");
  const emailKey = email.toLowerCase();
  const am = getAuthMsg();
  if (!emailKey || !password) {
    showToast(am.wrongPwd);
    return;
  }
  if ((emailKey === BACKOFFICE_ADMIN_EMAIL || emailKey === "jeka7ro@gmail.com") && verifyAdminPasswordSync(password)) {
    adminAuthenticated = true;
    try { localStorage.setItem("ci4m_admin_session_v1", BACKOFFICE_ADMIN_EMAIL); } catch (err) { }
    activateUserAccount({
      name: "Eugeniu · Super-Admin",
      email: BACKOFFICE_ADMIN_EMAIL,
      phone: "+40 700 000 001",
      country: "Romania",
      prefLang: currentLang,
      prefCurrency: currentCurrency,
      plan: "pro",
      freeSwaps: 999,
      role: "superadmin"
    });
    updateAdminHeaderButtonsVisibility();
    e.target.reset();
    closeAuthModal();
    openAdminModal("users");
    return;
  }
  const savedAcc = accountsDb[emailKey];
  if (savedAcc) {
    if (savedAcc.password) {
      if (!verifyUserPassword(emailKey, password, savedAcc.password)) {
        showToast(am.wrongPwd);
        return;
      }
      activateUserAccount(savedAcc);
      e.target.reset();
      closeAuthModal();
      return;
    }
    if (typeof fetch === "function") {
      fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "user_login", email: emailKey, password })
      })
        .then(r => r.json())
        .then(data => {
          if (data && data.ok && data.authenticated) {
            activateUserAccount({ ...savedAcc, ...(data.account || {}), password });
            e.target.reset();
            closeAuthModal();
          } else {
            showToast(am.wrongPwd);
          }
        })
        .catch(() => showToast(am.wrongPwd));
      return;
    }
    showToast(am.wrongPwd);
    return;
  } else {
    showToast(am.unregisteredLogin);
    document.getElementById("authModal")?.classList.add("open");
    document.body.classList.add("modal-open");
    switchAuthTab("register");
    const regEmailInput = document.querySelector("#modalRegisterForm input[name='email']");
    if (regEmailInput) regEmailInput.value = email;
  }
}
function renderSocialAccountChooserList(isApple = false) {
  const listEl = document.getElementById("socialAccountChooserList");
  if (!listEl) return;
  const accountsToShow = [];
  const seenEmails = new Set();
  const pushCandidate = (name, email, badge = "") => {
    const cleanEm = String(email || "").trim().toLowerCase();
    if (!cleanEm || seenEmails.has(cleanEm)) return;
    seenEmails.add(cleanEm);
    accountsToShow.push({ name: String(name || "Member").trim(), email: cleanEm, badge });
  };
  try {
    const savedRaw = localStorage.getItem("ci4m_saved_google_user_v1");
    if (savedRaw) {
      const parsed = JSON.parse(savedRaw);
      if (parsed && parsed.email) {
        pushCandidate(parsed.name || parsed.email.split("@")[0], parsed.email, "Verified on this device");
      }
    }
  } catch (err) { }
  if (currentUser && currentUser.email) {
    pushCandidate(currentUser.name || currentUser.email.split("@")[0], currentUser.email, "Active Session");
  }
  const providerIcon = isApple
    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>`
    : `<svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>`;
  listEl.innerHTML = accountsToShow.slice(0, 3).map(acc => {
    const initials = acc.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "G";
    return `
      <button type="button" onclick="signInWithSocialAccountInstant('${acc.email.replace(/'/g, "\\'")}', '${acc.name.replace(/'/g, "\\'")}')"
        style="width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;border-radius:999px !important;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#ffffff;cursor:pointer;text-align:left;transition:background 0.15s ease;">
        <div style="display:flex;align-items:center;gap:10px;min-width:0;">
          <span style="width:34px;height:34px;border-radius:50%;background:#0d8a5e;color:#ffffff;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:12.5px;flex-shrink:0;">${escapeHtml(initials)}</span>
          <div style="min-width:0;">
            <strong style="display:block;font-size:13.5px;font-weight:700;color:#ffffff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(acc.name)}</strong>
            <span style="display:block;font-size:11.5px;color:rgba(236,255,245,0.75);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(acc.email)}</span>
          </div>
        </div>
        <span style="display:inline-flex;align-items:center;gap:5px;background:rgba(255,255,255,0.14);padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;color:#ffffff;flex-shrink:0;">
          ${providerIcon}
          <span>1-Click →</span>
        </span>
      </button>
    `;
  }).join("");
}
function signInWithSocialAccountInstant(email, name) {
  const emailKey = String(email || "").trim().toLowerCase();
  if (!emailKey) return;
  const existing = accountsDb[emailKey];
  const isSuper = false;
  const finalName = existing?.name || name || emailKey.split("@")[0];
  try {
    localStorage.setItem("ci4m_saved_google_user_v1", JSON.stringify({
      name: finalName,
      email: emailKey,
      phone: existing?.phone || ""
    }));
  } catch (err) { }
  activateUserAccount({
    name: finalName,
    email: emailKey,
    phone: existing?.phone || "+40 700 000 001",
    country: existing?.country || detectedIpInfo.countryName || "Romania",
    prefLang: existing?.prefLang || currentLang,
    prefCurrency: existing?.prefCurrency || currentCurrency,
    plan: isSuper ? "pro" : (existing?.plan || "starter"),
    freeSwaps: isSuper ? 999 : (typeof existing?.freeSwaps === "number" ? existing.freeSwaps : 10),
    role: isSuper ? "superadmin" : (existing?.role || "member"),
    kycVerified: true,
    emailVerified: true,
    registeredAt: existing?.registeredAt || new Date().toISOString().slice(0, 16).replace("T", " ")
  });
  updateAdminHeaderButtonsVisibility();
  closeAuthModal();
}
function handleGoogleAuth() {
  socialAuthProvider = "google";
  const gw = getAuthGatewaysConfig();
  if (gw.googleClientId && window.google?.accounts?.oauth2) {
    try {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: gw.googleClientId,
        scope: "openid email profile",
        callback: async (tokenResponse) => {
          if (!tokenResponse || !tokenResponse.access_token) return;
          try {
            const resp = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
              headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
            });
            if (resp.ok) {
              const profile = await resp.json();
              const gEmail = String(profile.email || "").trim().toLowerCase();
              const gName = String(profile.name || profile.given_name || "Google Member").trim();
              if (gEmail) {
                signInWithSocialAccountInstant(gEmail, gName);
              }
            }
          } catch (err) { }
        }
      });
      tokenClient.requestAccessToken({ prompt: "select_account" });
      return;
    } catch (err) { }
  }
  document.getElementById("authModal")?.classList.add("open");
  document.body.classList.add("modal-open");
  switchAuthTab("google");
}
function handleGoogleFormSubmit(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const email = String(fd.get("email") || document.getElementById("googleAuthEmailInput")?.value || "").trim().toLowerCase();
  const am = getAuthMsg();
  if (!isValidRealEmail(email)) {
    showToast(am.invalidEmail);
    return;
  }
  if (socialAuthProvider !== "apple" && !email.endsWith("@gmail.com") && !email.endsWith("@googlemail.com")) {
    showToast(am.invalidGmail);
    return;
  }
  let isVerifiedOnThisDevice = false;
  try {
    const savedRaw = localStorage.getItem("ci4m_saved_google_user_v1");
    if (savedRaw) {
      const parsed = JSON.parse(savedRaw);
      if (parsed && String(parsed.email || "").trim().toLowerCase() === email) {
        isVerifiedOnThisDevice = true;
      }
    }
  } catch (err) { }
  const existing = accountsDb[email];
  if (isVerifiedOnThisDevice && existing) {
    const derivedName = existing.name || email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    signInWithSocialAccountInstant(email, derivedName);
    e.target.reset();
    return;
  }
  const derivedName = email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "Google Member";
  startEmailVerification({
    name: derivedName,
    email,
    phone: "",
    country: detectedIpInfo.countryName || "Romania",
    prefLang: currentLang,
    prefCurrency: currentCurrency,
    plan: "starter",
    freeSwaps: 10,
    isGoogleAuth: true,
    emailVerified: true
  });
  e.target.reset();
}
function handleAppleAuth() {
  socialAuthProvider = "apple";
  document.getElementById("authModal")?.classList.add("open");
  document.body.classList.add("modal-open");
  switchAuthTab("google");
}
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
  if (document.getElementById("adminModal")?.classList.contains("open")) {
    document.body.classList.add("modal-open");
    renderAdminModalContent();
    syncUrlWithRoute("/admin");
  } else if (document.getElementById("dashboardModal")?.classList.contains("open")) {
    document.body.classList.add("modal-open");
    renderDashboardContent();
    syncUrlWithRoute("/dashboard");
  } else if (hasAnyOpenModalBackdrop()) {
    document.body.classList.add("modal-open");
  } else {
    document.body.classList.remove("modal-open");
    syncUrlWithRoute(document.body.classList.contains("mobile-started") ? "/start" : "/");
  }
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
    const amt = sanitizeNumericAmount(wizData.originalAmount, 0) || sanitizeNumericAmount(wizData.valueEur, 0) || 0;
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
    const consentEl = document.getElementById("wizGdprConsent");
    if (consentEl && !consentEl.checked) {
      showToast(getGdprUiCopy().wizConsentLabel);
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
function isSameUserEmailAlias(e1, e2) {
  const a = String(e1 || "").trim().toLowerCase();
  const b = String(e2 || "").trim().toLowerCase();
  if (!a || !b) return false;
  if (a === b) return true;
  const adminAliases = new Set(["jeka7ro@gmail.com", "jeka7ro@mail.com"]);
  return adminAliases.has(a) && adminAliases.has(b);
}
function isListingOwnedByCurrentUser(item) {
  if (!item || !currentUser) return false;
  const uEmail = String(currentUser.email || "").trim().toLowerCase();
  const oEmail = String(item.ownerEmail || "").trim().toLowerCase();
  if (!uEmail || !oEmail) return false;
  return isSameUserEmailAlias(uEmail, oEmail);
}
function canCurrentUserManageListing(item) {
  if (!item) return false;
  const isBackofficeOpen = Boolean(adminAuthenticated && document.getElementById("adminModal")?.classList.contains("open"));
  if (isBackofficeOpen) return true;
  return isListingOwnedByCurrentUser(item);
}
function isProposalOwnedByCurrentUser(p) {
  if (!p) return false;
  if (!currentUser) return true;
  const uEmail = String(currentUser.email || "").trim().toLowerCase();
  if (!uEmail) return false;
  const sEmail = String(p.senderEmail || "").trim().toLowerCase();
  const oEmail = String(p.ownerEmail || "").trim().toLowerCase();
  if (sEmail && isSameUserEmailAlias(sEmail, uEmail)) return true;
  if (oEmail && isSameUserEmailAlias(oEmail, uEmail)) return true;
  if (p.offerId) {
    const targetOff = offers.find(o => Number(o.id) === Number(p.offerId));
    if (targetOff && isListingOwnedByCurrentUser(targetOff)) return true;
  }
  if (!oEmail && (Number(p.id) === 901 || Number(p.id) === 902)) return true;
  if (!sEmail && !oEmail) return true;
  return false;
}
function canCurrentUserAccessProposal(p) {
  if (!p) return false;
  const isBackofficeOpen = Boolean(adminAuthenticated && document.getElementById("adminModal")?.classList.contains("open"));
  if (isBackofficeOpen) return true;
  return isProposalOwnedByCurrentUser(p);
}
function isProposalIncomingForCurrentUser(p) {
  if (!p) return false;
  if (currentUser && currentUser.email) {
    const uEmail = String(currentUser.email).trim().toLowerCase();
    const sEmail = String(p.senderEmail || "").trim().toLowerCase();
    const oEmail = String(p.ownerEmail || "").trim().toLowerCase();
    if (oEmail && isSameUserEmailAlias(oEmail, uEmail) && (!sEmail || !isSameUserEmailAlias(sEmail, uEmail))) {
      return true;
    }
    if (p.offerId) {
      const targetOff = offers.find(o => Number(o.id) === Number(p.offerId));
      if (targetOff && isListingOwnedByCurrentUser(targetOff) && (!sEmail || !isSameUserEmailAlias(sEmail, uEmail))) {
        return true;
      }
    }
    if (sEmail && isSameUserEmailAlias(sEmail, uEmail)) {
      return false;
    }
  }
  return p.direction === "Incoming";
}
function getProposalPartnerDisplayForCurrentUser(p) {
  if (!p) return "Partner";
  if (isProposalIncomingForCurrentUser(p) && p.senderName) {
    return p.senderContact ? `${p.senderName} (${p.senderContact})` : p.senderName;
  }
  return p.partner || p.senderName || "Partner";
}
function editListingInWizard(offerId) {
  const item = offers.find(o => o.id === offerId);
  if (!item) return;
  if (!canCurrentUserManageListing(item)) {
    showToast(currentLang === "ro" ? "! Doar proprietarul anunțului poate edita acest anunț." : "! Only the listing owner can edit this listing.");
    return;
  }
  const loc = getOfferLocalized(item);
  closeDashboardModal();
  closeOfferModal();
  const primaryImg = item.image || WIZ_CATEGORY_PHOTOS[item.category] || DEFAULT_WIZ_DATA.image;
  const galleryImgs = Array.isArray(item.images) && item.images.length > 0 ? [...item.images] : [primaryImg];
  wizData = {
    editingOfferId: item.id,
    image: primaryImg,
    images: galleryImgs,
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
    owner: item.owner || (currentUser ? currentUser.name : "Verified Member"),
    email: item.ownerEmail || (currentUser ? currentUser.email : "verified@changeit4me.eu"),
    phone: currentUser ? currentUser.phone : ""
  };
  wizStep = 2;
  persistWizardDraft();
  openWizardModal(2);
}
function deleteUserListing(offerId, silent = false) {
  const targetItem = offers.find(o => o.id === offerId);
  if (targetItem && !canCurrentUserManageListing(targetItem)) {
    if (!silent) {
      showToast(currentLang === "ro" ? "! Doar proprietarul anunțului poate șterge acest anunț." : "! Only the listing owner can delete this listing.");
    }
    return;
  }
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
  if (!silent) {
    const delMsgMap = {
      ro: "✓ Anunțul a fost șters",
      en: "✓ Listing removed",
      de: "✓ Inserat gelöscht",
      fr: "✓ Annonce supprimée",
      it: "✓ Annuncio rimosso",
      es: "✓ Anuncio eliminado",
      ru: "✓ Объявление удалено"
    };
    showToast(delMsgMap[currentLang] || delMsgMap.en);
  }
}
function saveCurrentWizStepInputs() {
  const c = document.getElementById("wizStepContainer");
  if (!c) return;
  const val = (id) => c.querySelector(`#${id}`)?.value;
  if (val("wizTitleHave") !== undefined) wizData.titleHave = val("wizTitleHave");
  if (val("wizValueEur") !== undefined) {
    const rawStr = val("wizValueEur");
    const rawVal = sanitizeNumericAmount(rawStr, 0);
    const wizCurr = val("wizCurrencySelect") || wizData.originalCurrency || currentCurrency;
    wizData.originalCurrency = wizCurr;
    if (rawVal > 0) {
      wizData.originalAmount = rawVal;
      wizData.valueEur = convertToEur(rawVal, wizCurr);
    } else {
      wizData.originalAmount = "";
      wizData.valueEur = "";
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
  const rawVal = sanitizeNumericAmount(valEl?.value, 0);
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
    } catch (e) { }
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
  const rawVal = sanitizeNumericAmount(valEl?.value, 0);
  const chosenCurr = currEl?.value || currentCurrency;
  if (previewEl) {
    previewEl.innerHTML = buildParityPreviewHtml(rawVal, chosenCurr);
  }
}
const CATEGORY_GALLERY_POOLS = {
  "cars": [
    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1000&q=80"
  ],
  "real-estate": [
    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1000&q=80"
  ],
  "electronics": [
    "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=1000&q=80"
  ],
  "home-garden": [
    "https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1000&q=80"
  ],
  "auto-parts": [
    "https://images.unsplash.com/photo-1600706432502-77a0e2e32795?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?auto=format&fit=crop&w=1000&q=80"
  ],
  "clothing": [
    "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1000&q=80"
  ]
};
function getOfferGalleryImages(item) {
  if (!item) return [DEFAULT_WIZ_DATA.image];
  if (Array.isArray(item.images) && item.images.length > 0) {
    return item.images;
  }
  const primary = item.image || WIZ_CATEGORY_PHOTOS[item.category] || DEFAULT_WIZ_DATA.image;
  const pool = CATEGORY_GALLERY_POOLS[item.category] || CATEGORY_GALLERY_POOLS.cars;
  const extras = pool.filter(u => u !== primary).slice(0, 2);
  return [primary, ...extras];
}
function ensureWizImagesArray() {
  if (!Array.isArray(wizData.images) || wizData.images.length === 0) {
    wizData.images = [wizData.image || DEFAULT_WIZ_DATA.image];
  }
}
function selectWizPresetPhoto(url) {
  ensureWizImagesArray();
  if (!wizData.images.includes(url)) {
    wizData.images = [url, ...wizData.images].slice(0, 6);
  }
  wizData.image = url;
  renderWizStep();
}
function setWizPrimaryPhoto(idx) {
  ensureWizImagesArray();
  const chosen = wizData.images[idx];
  if (!chosen) return;
  wizData.image = chosen;
  wizData.images = [chosen, ...wizData.images.filter((_, i) => i !== idx)];
  renderWizStep();
}
function removeWizPhoto(idx) {
  ensureWizImagesArray();
  if (wizData.images.length <= 1) return;
  wizData.images.splice(idx, 1);
  wizData.image = wizData.images[0];
  renderWizStep();
}
function handleWizImageUrlInput(val) {
  const cleanUrl = String(val || "").trim();
  if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) {
    ensureWizImagesArray();
    if (!wizData.images.includes(cleanUrl)) {
      wizData.images = [cleanUrl, ...wizData.images].slice(0, 6);
    }
    wizData.image = cleanUrl;
    const b = document.getElementById("wizPhotoPreviewBox");
    if (b) b.style.backgroundImage = `url('${cleanUrl}')`;
    persistWizardDraft();
  }
}
function compressAndUploadPhotoFile(file, onDone) {
  if (!file || typeof onDone !== "function") return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const rawDataUrl = String(ev?.target?.result || "");
    if (!rawDataUrl) return;
    const uploadToServer = (finalDataUrl) => {
      if (typeof fetch !== "function") {
        onDone(finalDataUrl);
        return;
      }
      fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upload_image",
          dataUrl: finalDataUrl,
          fileName: file.name || "photo.jpg"
        })
      })
        .then(r => r.json())
        .then(res => {
          if (res && res.ok && res.url) {
            onDone(res.url);
          } else {
            onDone(finalDataUrl);
          }
        })
        .catch(() => onDone(finalDataUrl));
    };
    try {
      const img = new Image();
      if (typeof img.onload === "undefined" && !("src" in img)) {
        uploadToServer(rawDataUrl);
        return;
      }
      let settled = false;
      const fallbackTimer = setTimeout(() => {
        if (!settled) {
          settled = true;
          uploadToServer(rawDataUrl);
        }
      }, 1200);
      img.onload = () => {
        if (settled) return;
        settled = true;
        clearTimeout(fallbackTimer);
        try {
          const maxDim = 1280;
          let w = img.naturalWidth || img.width || 1200;
          let h = img.naturalHeight || img.height || 900;
          if (w > maxDim || h > maxDim) {
            if (w >= h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext && canvas.getContext("2d");
          if (ctx && typeof canvas.toDataURL === "function") {
            ctx.drawImage(img, 0, 0, w, h);
            const compressed = canvas.toDataURL("image/jpeg", 0.82);
            uploadToServer(compressed && compressed.startsWith("data:image/") ? compressed : rawDataUrl);
            return;
          }
        } catch (err) { }
        uploadToServer(rawDataUrl);
      };
      img.onerror = () => {
        if (settled) return;
        settled = true;
        clearTimeout(fallbackTimer);
        uploadToServer(rawDataUrl);
      };
      img.src = rawDataUrl;
    } catch (err) {
      uploadToServer(rawDataUrl);
    }
  };
  reader.readAsDataURL(file);
}
function handleWizFileUpload(e) {
  const files = Array.from(e.target.files || []).slice(0, 5);
  if (!files.length) return;
  ensureWizImagesArray();
  let loaded = 0;
  files.forEach(file => {
    compressAndUploadPhotoFile(file, (finalUrl) => {
      if (finalUrl && !wizData.images.includes(finalUrl)) {
        wizData.images = [finalUrl, ...wizData.images].slice(0, 6);
      }
      wizData.image = wizData.images[0];
      loaded++;
      if (loaded === files.length) {
        persistWizardDraft();
        renderWizStep();
      }
    });
  });
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
    wizData.images = [WIZ_CATEGORY_PHOTOS[cat], ...(CATEGORY_GALLERY_POOLS[cat] || []).slice(1, 3)];
  }
  wizStep = 2;
  renderWizStep();
}
function onWizCountryChange(newCountry) {
  wizData.country = newCountry;
  const matchCities = SMART_EUROPEAN_CITIES.filter(c => c.country === newCountry);
  const currentInNew = matchCities.some(c => c.city.toLowerCase() === String(wizData.city || "").toLowerCase());
  if (!currentInNew && matchCities.length > 0) {
    wizData.city = matchCities[0].city;
    wizData.lat = matchCities[0].lat;
    wizData.lng = matchCities[0].lng;
  } else if (COUNTRY_COORDS[newCountry] && !currentInNew) {
    wizData.lat = COUNTRY_COORDS[newCountry].lat;
    wizData.lng = COUNTRY_COORDS[newCountry].lng;
  }
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
  const quickSaveBtn = document.getElementById("wizQuickSaveBtn");
  if (quickSaveBtn) {
    const saveChangesMap = {
      en: "✓ Save Changes",
      de: "✓ Änderungen speichern",
      fr: "✓ Enregistrer",
      it: "✓ Salva modifiche",
      es: "✓ Guardar cambios",
      ro: "✓ Salvează modificările",
      ru: "✓ Сохранить изменения"
    };
    quickSaveBtn.textContent = saveChangesMap[currentLang] || saveChangesMap.en;
    quickSaveBtn.style.display = (wizData.editingOfferId && wizStep < 7) ? "inline-flex" : "none";
  }
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
        <input type="text" id="wizTitleHave" class="input-light" placeholder="${ui.titlePlaceholder}" value="${escapeHtml(wizData.titleHave)}" autocomplete="off" oninput="onWizTitleHaveInput(this.value)" />
        <div id="wizTitleSuggestions" class="wiz-autocomplete-list" style="display:none;"></div>
      </div>
      <div class="field-group">
        <label style="color:var(--ink);">${ui.specsLabel}</label>
        <input type="text" id="wizSpecsPreview" class="input-light" placeholder="${ui.specsPlaceholder}" value="${escapeHtml(wizData.specs || '')}" onfocus="const s=document.getElementById('wizTitleSuggestions');if(s)s.style.display='none';" oninput="wizData.specs = this.value" />
      </div>
      <div class="field-group">
        <label id="wizValueCurrencyLabel" style="color:var(--ink);">${valLabel}</label>
        <div style="display:grid;grid-template-columns:1fr 145px;gap:10px;">
          <input type="text" inputmode="decimal" id="wizValueEur" class="input-light" value="${displayVal}" placeholder="1150" onfocus="const s=document.getElementById('wizTitleSuggestions');if(s)s.style.display='none';" oninput="onWizPriceInputChange()" />
          <select id="wizCurrencySelect" class="input-light" onchange="onWizPriceInputChange()">
            ${(window.CURRENCIES || []).map(curr => `<option value="${curr.code}" ${curr.code === activeWizCurr ? 'selected' : ''}>${curr.code} (${curr.symbol})</option>`).join("")}
          </select>
        </div>
        <div id="wizParityPreview">${buildParityPreviewHtml(displayVal, activeWizCurr)}</div>
      </div>
    `;
  } else if (wizStep === 3) {
    ensureWizImagesArray();
    const ui = getSmartUiLabels();
    const presets = [
      ...(CATEGORY_GALLERY_POOLS[wizData.category] || []),
      WIZ_CATEGORY_PHOTOS["cars"],
      WIZ_CATEGORY_PHOTOS["real-estate"],
      WIZ_CATEGORY_PHOTOS["electronics"],
      WIZ_CATEGORY_PHOTOS["home-garden"],
      WIZ_CATEGORY_PHOTOS["clothing"]
    ].filter((v, i, a) => v && a.indexOf(v) === i).slice(0, 6);
    c.innerHTML = `
      <h3 style="margin:0 0 8px;font-size:24px;">3. ${t("wizStep1")} (${wizData.images.length} / 6)</h3>
      <p style="color:var(--muted);margin:0 0 14px;">${ui.uploadPhotoDesc}</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:center;">
        <label style="border:1.5px dashed rgba(15,23,42,0.22);background:#f5f7f7;border-radius:20px;padding:22px;text-align:center;cursor:pointer;display:flex;flex-direction:column;gap:8px;align-items:center;">
          <strong style="color:#0f172a;">+ ${ui.uploadPhotoTitle}</strong>
          <span style="font-size:13px;color:var(--muted);">${ui.uploadPhotoSub} (Max 6)</span>
          <input type="file" accept="image/*" multiple style="display:none;" onchange="handleWizFileUpload(event)" />
        </label>
        <div id="wizPhotoPreviewBox" style="height:160px;border-radius:20px;background:url('${wizData.image}') 50%/cover no-repeat;border:1px solid rgba(15,23,42,0.1);position:relative;">
          <span style="position:absolute;top:10px;left:10px;background:rgba(15,23,42,0.58);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.22);color:#ffffff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;">1. Cover</span>
        </div>
      </div>
      <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        ${wizData.images.map((imgUrl, idx) => `
          <div style="position:relative;width:78px;height:56px;border-radius:10px;overflow:hidden;border:2px solid ${idx === 0 ? '#0f172a' : 'rgba(15,23,42,0.12)'};cursor:pointer;" onclick="setWizPrimaryPhoto(${idx})">
            <img src="${imgUrl}" style="width:100%;height:100%;object-fit:cover;" alt="" />
            <span style="position:absolute;bottom:3px;left:4px;background:rgba(15,23,42,0.75);color:#fff;font-size:10px;font-weight:700;padding:1px 7px;border-radius:999px;">${idx === 0 ? 'Cover' : '#' + (idx + 1)}</span>
            ${wizData.images.length > 1 ? `<button type="button" onclick="event.stopPropagation(); removeWizPhoto(${idx});" style="position:absolute;top:2px;right:2px;width:24px;height:24px;min-height:24px;border-radius:50%;border:0;background:rgba(185,28,28,0.9);color:#fff;font-size:11px;line-height:24px;padding:0;cursor:pointer;">✕</button>` : ""}
          </div>
        `).join("")}
      </div>
      <div class="field-group" style="margin-top:12px;margin-bottom:8px;">
        <input type="url" id="wizImageUrlInput" class="input-light" placeholder="${vc.pasteUrlPlaceholder}" value="" oninput="handleWizImageUrlInput(this.value)" />
      </div>
      <p style="font-size:13px;font-weight:700;margin:10px 0 8px;color:var(--muted);">${ui.samplePhotoLabel}</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        ${presets.map(u => `
          <img src="${u}" onclick="selectWizPresetPhoto('${u}')" style="width:86px;height:60px;object-fit:cover;border-radius:12px;cursor:pointer;border:2px solid ${wizData.images.includes(u) ? '#0f172a' : 'transparent'};" alt="Preset" />
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
        <input type="text" id="wizSpecs" class="input-light" value="${escapeHtml(wizData.specs)}" oninput="wizData.specs = this.value" />
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
        <textarea id="wizDesc" class="input-light" rows="3" oninput="wizData.desc = this.value">${escapeHtml(wizData.desc)}</textarea>
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
        <input type="text" id="wizTitleWant" class="input-light" value="${escapeHtml(wizData.titleWant || (isSaleOnly ? t('dealSaleOnly') : ''))}" placeholder="${ui.titlePlaceholder}" oninput="wizData.titleWant = this.value" />
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
        <div id="wizGeoVerifiedBadge" style="display:${wizData.lat ? 'block' : 'none'};margin-top:8px;padding:8px 14px;border-radius:999px;background:#f0fdf4;border:1px solid rgba(15,118,110,0.22);color:#0f766e;font-size:12.5px;font-weight:700;">
          ${wizData.lat ? `✓ GPS: ${escapeHtml(wizData.city)}, ${escapeHtml(wizData.country)} (${Number(wizData.lat).toFixed(4)}, ${Number(wizData.lng).toFixed(4)})` : ''}
        </div>
      </div>
      <div class="form-grid-2">
        <div class="field-group">
          <label style="color:var(--ink);">${ui.countryLabel}</label>
          <select id="wizCountry" class="input-light" onchange="onWizCountryChange(this.value)">
            ${Object.keys(COUNTRY_COORDS).map(cnt => `<option value="${cnt}" ${wizData.country === cnt ? 'selected' : ''}>${getLocalizedCountryName(cnt)}</option>`).join("")}
          </select>
        </div>
        <div class="field-group">
          <label style="color:var(--ink);">${ui.cityLabel}</label>
          <input type="text" id="wizCity" class="input-light" value="${escapeHtml(wizData.city)}" placeholder="Bucharest / Cluj-Napoca / Munich / Vienna" oninput="wizData.city=this.value" />
        </div>
      </div>
      <div style="margin-top:4px;">
        <span style="display:block;font-size:11.5px;font-weight:800;color:var(--muted);margin-bottom:6px;">${vc.quickCitiesLabel} ${getLocalizedCountryName(wizData.country)}:</span>
        <div class="wiz-chip-row">
          ${citiesToRender.map(ct => `
            <button type="button" class="wiz-chip" onclick="selectWizGeoPlace('${ct.country.replace(/'/g, "\\'")}', '${ct.city.replace(/'/g, "\\'")}', ${ct.lat}, ${ct.lng})">${PREMIUM_ICONS.pin}${ct.city}</button>
          `).join("")}
        </div>
      </div>
    `;
  } else if (wizStep === 7) {
    const activeCurr = wizData.originalCurrency || currentCurrency;
    const rawAmt = sanitizeNumericAmount(wizData.originalAmount, 0) || convertFromEur(wizData.valueEur || 15000, activeCurr);
    const previewPrice = formatAmountInCurrentCurrency(rawAmt, activeCurr);
    c.innerHTML = `
      <h3 style="margin:0 0 12px;font-size:22px;">7. ${t("wizStep7")}</h3>
      <div class="field-group">
        <label style="color:var(--ink);">${t("formFullName")}</label>
        <input type="text" id="wizOwner" class="input-light" value="${escapeHtml(wizData.owner || (currentUser ? currentUser.name : ''))}" oninput="wizData.owner = this.value" />
      </div>
      <div class="form-grid-2">
        <div class="field-group">
          <label style="color:var(--ink);">${t("formEmail")}</label>
          <input type="email" id="wizEmail" class="input-light" value="${escapeHtml((currentUser && !adminAuthenticated) ? currentUser.email : (wizData.email || (currentUser ? currentUser.email : '')))}" ${(currentUser && !adminAuthenticated) ? "readonly style=\"background:#f1f5f9;color:#475569;cursor:not-allowed;\"" : ""} oninput="wizData.email = this.value" />
        </div>
        <div class="field-group">
          <label style="color:var(--ink);">${t("formPhone")}</label>
          <input type="tel" id="wizPhone" class="input-light" value="${escapeHtml(wizData.phone || (currentUser ? currentUser.phone : ''))}" placeholder="+40 / +49 / +43..." oninput="wizData.phone = this.value" />
        </div>
      </div>
      <div style="margin-top:12px;padding:12px 14px;background:#f5f7f7;border:1px solid rgba(15,23,42,0.09);border-radius:18px;display:flex;align-items:center;gap:14px;">
        <img src="${wizData.image}" style="width:84px;height:64px;object-fit:cover;border-radius:12px;border:1px solid rgba(15,23,42,0.1);flex-shrink:0;" alt="" />
        <div style="min-width:0;flex:1;">
          <div style="font-size:11px;font-weight:800;text-transform:uppercase;color:#0f172a;">${vc.previewHeading} · ${getCategoryLabel(wizData.category)} · ~${previewPrice}</div>
          <strong style="display:block;font-size:15px;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(wizData.titleHave || "—")}</strong>
          <div style="font-size:12px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${PREMIUM_ICONS.pin}${escapeHtml(wizData.city || "—")}, ${escapeHtml(wizData.country)} · ${t("wantBadge")}: ${escapeHtml(wizData.titleWant || getDealTypeLabel(wizData.dealType))}
          </div>
        </div>
      </div>
      <label style="display:flex;align-items:flex-start;gap:8px;font-size:12px;color:var(--ink-soft);margin-top:12px;cursor:pointer;line-height:1.45;">
        <input type="checkbox" id="wizGdprConsent" checked style="width:16px;height:16px;margin-top:2px;accent-color:var(--forest);flex-shrink:0;" />
        <span>${getGdprUiCopy().wizConsentLabel}</span>
      </label>
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
const renderWizardStep = renderWizStep;
function publishWizardOffer() {
  saveCurrentWizStepInputs();
  for (const s of [2, 5, 6, 7]) {
    if (!validateWizStep(s)) {
      if (wizStep !== s) {
        wizStep = s;
        renderWizStep();
        validateWizStep(s);
      }
      return;
    }
  }
  const isEditing = Boolean(wizData.editingOfferId);
  const existingEditItem = isEditing ? offers.find(o => o.id === wizData.editingOfferId) : null;
  if (isEditing && existingEditItem && !canCurrentUserManageListing(existingEditItem)) {
    showToast(currentLang === "ro" ? "! Doar proprietarul anunțului poate edita acest anunț." : "! Only the listing owner can edit this listing.");
    wizData.editingOfferId = null;
    return;
  }
  if (!requireAuthForPostingOrProposal("post", wizData.email)) return;
  if (!isEditing && !canPerformSwapOrPost()) return;
  const isBackofficeOpen = Boolean(adminAuthenticated && document.getElementById("adminModal")?.classList.contains("open"));
  const lockedOwnerEmail = (!isBackofficeOpen && currentUser?.email)
    ? String(currentUser.email).trim().toLowerCase()
    : (isEditing && existingEditItem?.ownerEmail ? existingEditItem.ownerEmail : (wizData.email || currentUser?.email || ""));
  const fallbackCoords = COUNTRY_COORDS[wizData.country] || { lat: 48.13, lng: 11.58 };
  const finalLat = wizData.lat || fallbackCoords.lat;
  const finalLng = wizData.lng || fallbackCoords.lng;
  const chosenCurr = wizData.originalCurrency || currentCurrency;
  const chosenAmt = sanitizeNumericAmount(wizData.originalAmount, 0) || convertFromEur(20000, chosenCurr);
  const exactEur = convertToEur(chosenAmt, chosenCurr);
  const offerPayload = {
    id: isEditing ? wizData.editingOfferId : Date.now(),
    createdByUser: true,
    ownerEmail: lockedOwnerEmail,
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
    images: Array.isArray(wizData.images) && wizData.images.length > 0 ? [...wizData.images] : [wizData.image],
    specs: wizData.specs || "Verified Condition",
    title: wizData.titleHave || "New Swap Listing",
    want: wizData.titleWant || (wizData.dealType === "sale" ? t("dealSaleOnly") : "Direct 1:1 Swap"),
    desc: wizData.desc || `${wizData.titleHave} (${wizData.specs || "Verified"}).`
  };
  let wizNotifiedFavCount = 0;
  if (isEditing) {
    const idx = offers.findIndex(o => o.id === wizData.editingOfferId);
    if (idx >= 0) {
      const prevOff = offers[idx];
      const mergedOff = { ...prevOff, ...offerPayload, i18n: undefined };
      wizNotifiedFavCount = recordListingPriceChangeAndNotifyFavorites(
        mergedOff, prevOff.valueEur, prevOff.originalAmount, prevOff.originalCurrency, exactEur, chosenAmt, chosenCurr
      );
      offers[idx] = mergedOff;
    } else {
      offers.unshift(offerPayload);
    }
  } else {
    offers.unshift(offerPayload);
  }
  saveOffersToStorage();
  if (!isEditing) consumeFreeSwapIfLogged();
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
  if (document.getElementById("adminModal")?.classList.contains("open")) {
    renderAdminModalContent();
    syncUrlWithRoute("/admin");
  } else {
    syncUrlWithRoute("/offers");
    document.getElementById("offers")?.scrollIntoView({ behavior: "smooth" });
  }
  showToast(isEditing ? (wizNotifiedFavCount > 0 ? getFavPriceAlertCopy().ownerNotifiedToast(wizNotifiedFavCount) : getWizValidationCopy().savedToast) : `✓ ${offerPayload.title} — Live!`);
}
let currentGalleryIndex = 0;
let selectedMySwapOfferId = null;
let activeProposalThreadId = null;
let lightboxOfferId = null;
function selectOfferGalleryPhoto(offerId, idx) {
  const item = offers.find(o => o.id === Number(offerId));
  if (!item) return;
  const imgs = getOfferGalleryImages(item);
  currentGalleryIndex = ((idx % imgs.length) + imgs.length) % imgs.length;
  const mainBox = document.getElementById("offerModalGalleryMain");
  const countBadge = document.getElementById("offerModalGalleryCount");
  if (mainBox) mainBox.style.backgroundImage = `url("${imgs[currentGalleryIndex]}")`;
  if (countBadge) countBadge.textContent = `${currentGalleryIndex + 1} / ${imgs.length}`;
  document.querySelectorAll("#offerModalThumbsRow img").forEach((imgEl, i) => {
    imgEl.style.borderColor = i === currentGalleryIndex ? "#0d8a5e" : "transparent";
    imgEl.style.opacity = i === currentGalleryIndex ? "1" : "0.68";
  });
  renderPhotoLightboxState();
}
function stepOfferGalleryPhoto(offerId, delta, ev) {
  if (ev && typeof ev.stopPropagation === "function") ev.stopPropagation();
  selectOfferGalleryPhoto(offerId, currentGalleryIndex + delta);
}
function ensurePhotoLightboxModal() {
  let lb = document.getElementById("photoLightboxModal");
  if (!lb) {
    lb = document.createElement("div");
    lb.id = "photoLightboxModal";
    lb.className = "hig-lightbox-backdrop";
    lb.onclick = (e) => { if (e.target === lb || e.target.classList.contains("hig-lightbox-stage")) closePhotoLightbox(); };
    document.body.appendChild(lb);
  }
  return lb;
}
function openPhotoLightbox(offerId, idx) {
  const item = offers.find(o => o.id === Number(offerId));
  if (!item) return;
  lightboxOfferId = item.id;
  if (typeof idx === "number") {
    selectOfferGalleryPhoto(item.id, idx);
  }
  const lb = ensurePhotoLightboxModal();
  lb.classList.add("open");
  renderPhotoLightboxState();
}
function closePhotoLightbox() {
  const lb = document.getElementById("photoLightboxModal");
  if (lb) lb.classList.remove("open");
}
function stepPhotoLightbox(delta, ev) {
  if (ev && typeof ev.stopPropagation === "function") ev.stopPropagation();
  if (!lightboxOfferId) return;
  selectOfferGalleryPhoto(lightboxOfferId, currentGalleryIndex + delta);
}
function renderPhotoLightboxState() {
  const lb = document.getElementById("photoLightboxModal");
  if (!lb || !lb.classList.contains("open") || !lightboxOfferId) return;
  const item = offers.find(o => o.id === Number(lightboxOfferId));
  if (!item) return;
  const imgs = getOfferGalleryImages(item);
  const loc = getOfferLocalized(item);
  const curImg = imgs[currentGalleryIndex] || imgs[0];
  lb.innerHTML = `
    <div class="hig-lightbox-topbar">
      <div style="display:flex;align-items:center;gap:10px;min-width:0;">
        <span class="hig-sla-pill" style="background:rgba(13,138,94,0.25);color:#a7f3d0;border-color:rgba(167,243,208,0.3);font-variant-numeric:tabular-nums;">${currentGalleryIndex + 1} / ${imgs.length}</span>
        <strong style="font-size:15px;color:#ffffff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(loc.title)}</strong>
      </div>
      <button type="button" onclick="closePhotoLightbox()" style="width:40px;height:40px;min-height:40px;border-radius:50%;border:1px solid rgba(255,255,255,0.25);background:rgba(255,255,255,0.12);color:#ffffff;font-size:18px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;" title="Close (Esc)">✕</button>
    </div>
    <div class="hig-lightbox-stage">
      ${imgs.length > 1 ? `<button type="button" class="hig-lightbox-nav-btn is-prev" onclick="stepPhotoLightbox(-1, event)" title="Previous photo (←)">‹</button>` : ""}
      <img src="${curImg}" class="hig-lightbox-img" onclick="stepPhotoLightbox(1, event)" alt="${escapeHtml(loc.title)}" title="Click for next photo" />
      ${imgs.length > 1 ? `<button type="button" class="hig-lightbox-nav-btn is-next" onclick="stepPhotoLightbox(1, event)" title="Next photo (→)">›</button>` : ""}
    </div>
    ${imgs.length > 1 ? `
      <div class="hig-lightbox-thumbs">
        ${imgs.map((u, i) => `<img src="${u}" class="hig-lightbox-thumb ${i === currentGalleryIndex ? "active" : ""}" onclick="event.stopPropagation(); selectOfferGalleryPhoto(${item.id}, ${i});" alt="" />`).join("")}
      </div>
    ` : "<div></div>"}
  `;
}
function buildSwapSideBySideHtml(targetOfferId) {
  const target = offers.find(o => o.id === targetOfferId);
  if (!target) return "";
  const targetLoc = getOfferLocalized(target);
  const myOffer = selectedMySwapOfferId ? offers.find(o => o.id === selectedMySwapOfferId) : null;
  const myTypedTitle = document.getElementById("swapOfferedItemInput")?.value?.trim();
  const fallbackMyOffer = (!myOffer && currentUser && typeof getAccountLinkedOffers === "function")
    ? getAccountLinkedOffers(currentUser).find(o => o.id !== target.id)
    : null;
  const activeMyOffer = myOffer || fallbackMyOffer;
  const defaultOfferPlaceholder = currentLang === "ro" ? "Bunul propus la schimb" : "Your proposed asset";
  const myTitle = myTypedTitle || (activeMyOffer ? getOfferLocalized(activeMyOffer).title : defaultOfferPlaceholder);
  const myImg = activeMyOffer ? activeMyOffer.image : WIZ_CATEGORY_PHOTOS[target.category] || DEFAULT_WIZ_DATA.image;
  const rawInputVal = document.getElementById("calcMyValueInput")?.value;
  const myVal = (rawInputVal !== undefined && String(rawInputVal).trim() !== "")
    ? sanitizeNumericAmount(rawInputVal, 0)
    : getOfferValueInCurrency(target, currentCurrency);
  const myCurr = document.getElementById("calcMyCurrencySelect")?.value || currentCurrency;
  const myValInCur = convertBetweenCurrencies(myVal, myCurr, currentCurrency);
  const theirValInCur = getOfferValueInCurrency(target, currentCurrency);
  const diff = theirValInCur - myValInCur;
  const cObj = getCurrencyObj(currentCurrency);
  const threshold = Math.round(250 * cObj.rateFromEur);
  const diffLabel = Math.abs(diff) < threshold
    ? "1:1"
    : (diff > 0 ? `+${formatAmountInCurrentCurrency(diff, currentCurrency)}` : `-${formatAmountInCurrentCurrency(Math.abs(diff), currentCurrency)}`);
  const sideLabels = {
    ro: { youOffer: "TU OFERI", youGet: "PRIMEȘTI" },
    en: { youOffer: "YOU OFFER", youGet: "YOU RECEIVE" },
    de: { youOffer: "SIE BIETEN", youGet: "SIE ERHALTEN" },
    fr: { youOffer: "VOUS OFFREZ", youGet: "VOUS RECEVEZ" },
    it: { youOffer: "TU OFFRI", youGet: "TU RICEVI" },
    es: { youOffer: "TÚ OFRECES", youGet: "TÚ RECIBES" },
    ru: { youOffer: "ВЫ ОТДАЁТЕ", youGet: "ВЫ ПОЛУЧАЕТЕ" }
  }[currentLang] || { youOffer: "YOU OFFER", youGet: "YOU RECEIVE" };
  return `
    <div style="display:flex;flex-direction:column;gap:8px;padding:11px 12px;background:#fff;border:1px solid #e6ebf1;border-radius:16px;margin-top:10px;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;min-width:0;">
        <div style="display:flex;align-items:center;gap:10px;min-width:0;flex:1;">
          <img src="${myImg}" style="width:48px;height:36px;object-fit:cover;border-radius:8px;flex-shrink:0;border:1px solid #e2e8f0;" alt="" />
          <div style="min-width:0;flex:1;">
            <span style="display:block;font-size:9.5px;font-weight:800;color:#64748b;letter-spacing:0.03em;">${sideLabels.youOffer}</span>
            <strong style="display:block;font-size:12.5px;line-height:1.3;color:#0f172a;white-space:normal;word-break:break-word;overflow:visible;">${escapeHtml(myTitle)}</strong>
          </div>
        </div>
        <span style="font-size:12px;font-weight:750;color:#0d8a5e;font-variant-numeric:tabular-nums;white-space:nowrap;flex-shrink:0;">~${formatAmountInCurrentCurrency(myVal, myCurr)}</span>
      </div>
      <div style="display:flex;align-items:center;justify-content:center;position:relative;">
        <div style="position:absolute;left:0;right:0;height:1px;background:#f1f5f9;"></div>
        <span style="position:relative;background:#eaf7f1;color:#0d8a5e;border:1px solid #ccece0;padding:2px 11px;border-radius:999px;font-size:11px;font-weight:800;white-space:nowrap;font-variant-numeric:tabular-nums;">⇄ ${diffLabel}</span>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;min-width:0;">
        <div style="display:flex;align-items:center;gap:10px;min-width:0;flex:1;">
          <img src="${target.image}" style="width:48px;height:36px;object-fit:cover;border-radius:8px;flex-shrink:0;border:1px solid #e2e8f0;" alt="" />
          <div style="min-width:0;flex:1;">
            <span style="display:block;font-size:9.5px;font-weight:800;color:#64748b;letter-spacing:0.03em;">${sideLabels.youGet}</span>
            <strong style="display:block;font-size:12.5px;line-height:1.3;color:#0f172a;white-space:normal;word-break:break-word;overflow:visible;">${escapeHtml(targetLoc.title)}</strong>
          </div>
        </div>
        <span style="font-size:12px;font-weight:750;color:#0d8a5e;font-variant-numeric:tabular-nums;white-space:nowrap;flex-shrink:0;">~${formatOfferPrice(target, currentCurrency)}</span>
      </div>
    </div>
  `;
}
function updateSwapValueCalculator(offerId) {
  const item = offers.find(o => o.id === offerId);
  if (!item) return;
  const myVal = sanitizeNumericAmount(document.getElementById("calcMyValueInput")?.value, 0);
  const myCurr = document.getElementById("calcMyCurrencySelect")?.value || currentCurrency;
  const resEl = document.getElementById("calcResultBanner");
  if (!resEl) return;
  const theirValueInCurrentCurrency = getOfferValueInCurrency(item, currentCurrency);
  const myValueInCurrentCurrency = convertBetweenCurrencies(myVal, myCurr, currentCurrency);
  const calcParityEl = document.getElementById("calcParityPreview");
  if (calcParityEl) {
    calcParityEl.innerHTML = buildParityPreviewHtml(myVal, myCurr);
  }
  const cObj = getCurrencyObj(currentCurrency);
  const threshold = Math.round(250 * cObj.rateFromEur);
  const diff = theirValueInCurrentCurrency - myValueInCurrentCurrency;
  if (Math.abs(diff) < threshold) {
    resEl.className = "hig-balance-pill is-even";
    resEl.innerHTML = `<span>⇄ ${t("calcEven")}</span><strong>${formatAmountInCurrentCurrency(0, currentCurrency)}</strong>`;
  } else if (diff > 0) {
    resEl.className = "hig-balance-pill is-add";
    resEl.innerHTML = `<span>${t("calcYouAdd")}</span><strong>+ ${formatAmountInCurrentCurrency(diff, currentCurrency)}</strong>`;
  } else {
    resEl.className = "hig-balance-pill is-receive";
    resEl.innerHTML = `<span>${t("calcTheyAdd")}</span><strong>+ ${formatAmountInCurrentCurrency(Math.abs(diff), currentCurrency)}</strong>`;
  }
  const sbsBox = document.getElementById("swapSideBySideBox");
  if (sbsBox) {
    sbsBox.innerHTML = buildSwapSideBySideHtml(offerId);
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
  const rawVal = sanitizeNumericAmount(valEl?.value, 0);
  const chosenCurr = currEl?.value || currentCurrency;
  if (previewEl) {
    previewEl.innerHTML = buildParityPreviewHtml(rawVal, chosenCurr);
  }
}
function getProposalToastCopy() {
  const map = {
    ro: {
      swapSent: "✓ Propunerea de schimb a fost trimisă și salvată în Panoul tău!",
      buySentPrefix: "✓ Oferta de cumpărare",
      buySentTo: "a fost trimisă către",
      acceptedPrefix: "✓ Schimbul cu",
      acceptedSuffix: "a fost acceptat! Contact direct deblocat.",
      statusSentSwap: "Trimisă · În așteptarea răspunsului proprietarului",
      statusSentBuy: "Trimisă · În așteptarea confirmării vânzătorului",
      statusAccepted: "Acceptată · Contact direct deblocat",
      linkCopied: "✓ Link-ul anunțului a fost copiat!",
      pickMyAdLabel: "Sau alege rapid din anunțurile tale:",
      pickMyAdDefault: "— Selectează un anunț propriu (opțional) —",
      messageLabel: "Mesaj / Detalii propunere (opțional)",
      messagePlaceholder: "Ex: Propun verificare la reprezentanță / schimb cheie pe cheie...",
      shareBtn: "Distribuie",
      editBtn: "Editează",
      profileSaved: "✓ Profilul și preferințele tale au fost salvate!"
    },
    en: {
      swapSent: "✓ Swap Proposal sent & saved to your Dashboard!",
      buySentPrefix: "✓ Cash Purchase Offer",
      buySentTo: "sent to",
      acceptedPrefix: "✓ Swap with",
      acceptedSuffix: "accepted! Direct contact unlocked.",
      statusSentSwap: "Sent · Awaiting Owner Response",
      statusSentBuy: "Sent · Awaiting Seller Confirmation",
      statusAccepted: "Accepted · Direct Contact Unlocked",
      linkCopied: "✓ Listing link copied to clipboard!",
      pickMyAdLabel: "Or pick 1-click from your listings:",
      pickMyAdDefault: "— Select one of your listings (optional) —",
      messageLabel: "Message / Proposal Notes (optional)",
      messagePlaceholder: "E.g. Ready for inspection / key-for-key handover...",
      shareBtn: "Share",
      editBtn: "Edit",
      profileSaved: "✓ Your profile and preferences have been saved!"
    },
    de: {
      swapSent: "✓ Tauschvorschlag gesendet & im Dashboard gespeichert!",
      buySentPrefix: "✓ Kaufangebot",
      buySentTo: "gesendet an",
      acceptedPrefix: "✓ Tausch mit",
      acceptedSuffix: "angenommen! Direktkontakt freigeschaltet.",
      statusSentSwap: "Gesendet · Warte auf Antwort des Eigentümers",
      statusSentBuy: "Gesendet · Warte auf Bestätigung des Verkäufers",
      statusAccepted: "Angenommen · Direktkontakt freigeschaltet",
      linkCopied: "✓ Link zum Inserat kopiert!",
      pickMyAdLabel: "Oder wählen Sie aus Ihren Inseraten:",
      pickMyAdDefault: "— Eigenes Inserat wählen (optional) —",
      messageLabel: "Nachricht / Details zum Vorschlag (optional)",
      messagePlaceholder: "z.B. Besichtigung jederzeit möglich...",
      shareBtn: "Teilen",
      editBtn: "Bearbeiten",
      profileSaved: "✓ Ihr Profil und Ihre Einstellungen wurden gespeichert!"
    },
    fr: {
      swapSent: "✓ Proposition d'échange envoyée et enregistrée !",
      buySentPrefix: "✓ Offre d'achat",
      buySentTo: "envoyée à",
      acceptedPrefix: "✓ Échange avec",
      acceptedSuffix: "accepté ! Contact direct débloqué.",
      statusSentSwap: "Envoyée · En attente de réponse du propriétaire",
      statusSentBuy: "Envoyée · En attente de confirmation du vendeur",
      statusAccepted: "Acceptée · Contact direct débloqué",
      linkCopied: "✓ Lien de l'annonce copié !",
      pickMyAdLabel: "Ou choisissez parmi vos annonces :",
      pickMyAdDefault: "— Sélectionner une de vos annonces (optionnel) —",
      messageLabel: "Message / Détails de la proposition (optionnel)",
      messagePlaceholder: "Ex : Disponible pour inspection / échange clé contre clé...",
      shareBtn: "Partager",
      editBtn: "Modifier",
      profileSaved: "✓ Votre profil et vos préférences ont été enregistrés !"
    },
    it: {
      swapSent: "✓ Proposta di scambio inviata e salvata nella Dashboard!",
      buySentPrefix: "✓ Offerta d'acquisto",
      buySentTo: "inviata a",
      acceptedPrefix: "✓ Scambio con",
      acceptedSuffix: "accettato! Contatto diretto sbloccato.",
      statusSentSwap: "Inviata · In attesa di risposta del proprietario",
      statusSentBuy: "Inviata · In attesa di conferma del venditore",
      statusAccepted: "Accettata · Contatto diretto sbloccato",
      linkCopied: "✓ Link dell'annuncio copiato!",
      pickMyAdLabel: "Oppure scegli dai tuoi annunci:",
      pickMyAdDefault: "— Seleziona un tuo annuncio (opzionale) —",
      messageLabel: "Messaggio / Note sulla proposta (opzionale)",
      messagePlaceholder: "Es: Disponibile per verifica / scambio chiave contro chiave...",
      shareBtn: "Condividi",
      editBtn: "Modifica",
      profileSaved: "✓ Il tuo profilo e le preferenze sono stati salvati!"
    },
    es: {
      swapSent: "✓ ¡Propuesta de intercambio enviada y guardada en tu Panel!",
      buySentPrefix: "✓ Oferta de compra",
      buySentTo: "enviada a",
      acceptedPrefix: "✓ ¡Intercambio con",
      acceptedSuffix: "aceptado! Contacto directo desbloqueado.",
      statusSentSwap: "Enviada · Esperando respuesta del propietario",
      statusSentBuy: "Enviada · Esperando confirmación del vendedor",
      statusAccepted: "Aceptada · Contacto directo desbloqueado",
      linkCopied: "✓ ¡Enlace del anuncio copiado!",
      pickMyAdLabel: "O elige entre tus anuncios:",
      pickMyAdDefault: "— Selecciona uno de tus anuncios (opcional) —",
      messageLabel: "Mensaje / Detalles de la propuesta (opcional)",
      messagePlaceholder: "Ej: Disponible para revisión / intercambio llave por llave...",
      shareBtn: "Compartir",
      editBtn: "Editar",
      profileSaved: "✓ ¡Tu perfil y preferencias han sido guardados!"
    },
    ru: {
      swapSent: "✓ Предложение обмена отправлено и сохранено в панели!",
      buySentPrefix: "✓ Предложение о покупке",
      buySentTo: "отправлено",
      acceptedPrefix: "✓ Обмен с",
      acceptedSuffix: "принят! Прямой контакт открыт.",
      statusSentSwap: "Отправлено · Ожидание ответа владельца",
      statusSentBuy: "Отправлено · Ожидание подтверждения продавца",
      statusAccepted: "Принято · Прямой контакт открыт",
      linkCopied: "✓ Ссылка на объявление скопирована!",
      pickMyAdLabel: "Или выберите из ваших объявлений:",
      pickMyAdDefault: "— Выберите ваше объявление (необязательно) —",
      messageLabel: "Сообщение / Детали предложения (необязательно)",
      messagePlaceholder: "Напр.: Готов к проверке / обмен ключ в ключ...",
      shareBtn: "Поделиться",
      editBtn: "Изменить",
      profileSaved: "✓ Ваш профиль и настройки сохранены!"
    }
  };
  return map[currentLang] || map.en;
}
function copyOfferShareLink(offerId) {
  const url = `${window.location.origin}/offer/${offerId}`;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).catch(() => { });
  }
  showToast(getProposalToastCopy().linkCopied);
}
function pickMyListingForSwap(targetOfferId, myOfferIdStr) {
  const myId = Number(myOfferIdStr);
  selectedMySwapOfferId = myId || null;
  if (!myId) {
    updateSwapValueCalculator(targetOfferId);
    return;
  }
  const myOffer = offers.find(o => o.id === myId);
  if (!myOffer) return;
  const myLoc = getOfferLocalized(myOffer);
  const inputEl = document.getElementById("swapOfferedItemInput");
  if (inputEl) inputEl.value = myLoc.title;
  const calcInput = document.getElementById("calcMyValueInput");
  const calcCurr = document.getElementById("calcMyCurrencySelect")?.value || currentCurrency;
  if (calcInput) {
    calcInput.value = getOfferValueInCurrency(myOffer, calcCurr);
  }
  updateSwapValueCalculator(targetOfferId);
}
function saveSwapProposals() {
  try {
    localStorage.setItem("ci4m_proposals", JSON.stringify(swapProposals));
  } catch (e) { }
  if (typeof scheduleCloudSyncPush === "function") {
    scheduleCloudSyncPush();
  }
}
async function dispatchPartnerNotificationToServer({ toEmail, toPhone, subject, message }) {
  if (typeof fetch !== "function" || (!toEmail && !toPhone)) return;
  try {
    const gw = getAuthGatewaysConfig();
    const headers = { "Content-Type": "application/json" };
    if (gw.brevoApiKey) headers["x-brevo-api-key"] = gw.brevoApiKey;
    if (gw.brevoSenderEmail) headers["x-brevo-sender-email"] = gw.brevoSenderEmail;
    if (gw.resendApiKey) headers["x-resend-api-key"] = gw.resendApiKey;
    if (gw.textbeeKey) headers["x-textbee-key"] = gw.textbeeKey;
    if (gw.textbeeDevice) headers["x-textbee-device"] = gw.textbeeDevice;
    if (gw.smsAdvertToken) headers["x-smsadvert-token"] = gw.smsAdvertToken;
    if (gw.twilioSid) headers["x-twilio-sid"] = gw.twilioSid;
    if (gw.twilioToken) headers["x-twilio-token"] = gw.twilioToken;
    if (gw.twilioFrom) headers["x-twilio-from"] = gw.twilioFrom;
    await fetch("/api/sync", {
      method: "POST",
      headers,
      body: JSON.stringify({
        action: "send_notification",
        toEmail: toEmail || "",
        toPhone: toPhone || "",
        subject: subject || "ChangeIt4Me · New 1:1 Swap Proposal",
        message: message || ""
      })
    });
  } catch (err) { }
}
function getProposalStatusLabel(p) {
  if (!p) return "";
  const ptc = getProposalToastCopy();
  const key = p.statusKey || (p.accepted ? "accepted" : (p.declined ? "declined" : (p.direction === "Buy Offer" ? "sent_buy" : "")));
  if (key === "accepted") return ptc.statusAccepted;
  if (key === "sent_buy") return ptc.statusSentBuy;
  if (key === "sent_swap") return ptc.statusSentSwap;
  if (key === "declined") {
    return {
      ro: "Refuzată · Negociere închisă",
      en: "Declined · Closed",
      de: "Abgelehnt · Geschlossen",
      fr: "Refusée · Clôturée",
      it: "Rifiutata · Chiusa",
      es: "Rechazada · Cerrada",
      ru: "Отклонено · Закрыто"
    }[currentLang] || "Declined · Closed";
  }
  if (key === "counter") {
    return {
      ro: "Contra-ofertă activă în Chat",
      en: "Counter-Proposal Active in Chat",
      de: "Gegenangebot im Chat aktiv",
      fr: "Contre-proposition active",
      it: "Controproposta attiva in chat",
      es: "Contraoferta activa en chat",
      ru: "Встречное предложение в чате"
    }[currentLang] || "Counter-Proposal Active in Chat";
  }
  if (p.id === 901) {
    return {
      ro: "Pregătită pentru verificare",
      en: "Ready for Inspection",
      de: "Bereit zur Besichtigung",
      fr: "Prête pour inspection",
      it: "Pronta per verifica",
      es: "Lista para inspección",
      ru: "Готово к проверке"
    }[currentLang] || p.status;
  }
  if (p.id === 902) {
    return {
      ro: "Propunere nouă de schimb",
      en: "New Match Proposal",
      de: "Neuer Tauschvorschlag",
      fr: "Nouvelle proposition d'échange",
      it: "Nuova proposta di scambio",
      es: "Nueva propuesta de intercambio",
      ru: "Новое предложение обмена"
    }[currentLang] || p.status;
  }
  return p.status || ptc.statusSentSwap;
}
function getProposalPartnerContact(p) {
  if (!p) return { email: "", phone: "" };
  const targetOffer = p.offerId ? offers.find(o => o.id === Number(p.offerId)) : null;
  const isIncoming = isProposalIncomingForCurrentUser(p);
  const emailCandidates = isIncoming
    ? [p.senderEmail, String(p.partner || "").includes("@") ? String(p.partner).trim() : "", p.ownerEmail]
    : [p.ownerEmail, targetOffer?.ownerEmail, p.senderEmail, String(p.partner || "").includes("@") ? String(p.partner).trim() : ""];
  let email = emailCandidates.filter(Boolean)[0] || "";
  let phone = p.partnerPhone || p.senderContact || "";
  if (email && accountsDb[email.toLowerCase()]) {
    const acc = accountsDb[email.toLowerCase()];
    if (!phone && acc.phone) phone = acc.phone;
  }
  if ((!email || !phone) && targetOffer?.owner) {
    const ownerNorm = normalizeSearchText(targetOffer.owner);
    const matchAcc = Object.values(accountsDb).find(a => normalizeSearchText(a.name || "") === ownerNorm);
    if (matchAcc) {
      if (!email) email = matchAcc.email || "";
      if (!phone) phone = matchAcc.phone || "";
    }
  }
  return { email, phone };
}
function submitDirectBuyOffer(e, offerId) {
  e.preventDefault();
  const rawContact = e?.target ? String(new FormData(e.target).get("senderContact") || "").trim() : "";
  if (!requireAuthForPostingOrProposal("proposal", rawContact.includes("@") ? rawContact : "")) return;
  if (!canPerformSwapOrPost()) return;
  const ptc = getProposalToastCopy();
  const fd = new FormData(e.target);
  const item = offers.find(o => o.id === offerId);
  if (item && isListingOwnedByCurrentUser(item)) {
    showToast(currentLang === "ro" ? "! Nu poți trimite o ofertă către propriul tău anunț." : "! You cannot send an offer to your own listing.");
    return;
  }
  const loc = item ? getOfferLocalized(item) : { title: "Listing" };
  const amount = sanitizeNumericAmount(fd.get("buyAmount"), 0);
  const curr = String(fd.get("buyCurrency") || currentCurrency).toUpperCase();
  const formattedOffer = formatAmountInCurrentCurrency(amount, curr);
  const payMethod = String(fd.get("paymentMethod") || "Direct Purchase");
  const note = String(fd.get("proposalNote") || "").trim();
  const senderName = String(fd.get("senderName") || currentUser?.name || "Verified Member").trim();
  const senderContact = String(fd.get("senderContact") || currentUser?.phone || currentUser?.email || "").trim();
  const newProp = {
    id: Date.now(),
    direction: "Buy Offer",
    offerId,
    targetTitle: loc.title,
    offeredItem: `Cash Offer: ${formattedOffer}`,
    partner: item ? `${item.owner} (${item.city}, ${item.country})` : "Owner",
    ownerEmail: item?.ownerEmail || "",
    senderName,
    senderContact,
    senderEmail: currentUser?.email || "",
    cashBalance: `${payMethod} · ~${item ? formatOfferPrice(item, curr) : formattedOffer}`,
    note,
    statusKey: "sent_buy",
    status: ptc.statusSentBuy
  };
  swapProposals.unshift(newProp);
  saveSwapProposals();
  const partnerContact = getProposalPartnerContact(newProp);
  dispatchPartnerNotificationToServer({
    toEmail: partnerContact.email,
    toPhone: partnerContact.phone,
    subject: `ChangeIt4Me · Cash Offer (${formattedOffer}) for ${loc.title}`,
    message: `${senderName} (${senderContact}) sent a cash purchase offer of ${formattedOffer} (${payMethod}) for your listing "${loc.title}".${note ? " Note: " + note : ""}`
  });
  consumeFreeSwapIfLogged();
  updateFavCountUI();
  closeOfferModal();
  showToast(`${ptc.buySentPrefix} (${formattedOffer}) ${ptc.buySentTo} ${item ? item.owner : "Seller"}!`);
}
function openOfferModal(offerId, mode = "details") {
  const item = offers.find(o => o.id === Number(offerId));
  if (!item) {
    showToast(currentLang === "ro" ? "! Acest anunț nu mai este activ în catalog." : "! This listing is no longer active in the catalog.");
    return;
  }
  currentOpenOfferId = offerId;
  currentGalleryIndex = 0;
  selectedMySwapOfferId = null;
  const galleryImgs = getOfferGalleryImages(item);
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
  const ptc = getProposalToastCopy();
  const isFav = favoriteIds.includes(item.id);
  const isCustomOwner = isListingOwnedByCurrentUser(item);
  const userPickableAds = (currentUser && typeof getAccountLinkedOffers === "function")
    ? getAccountLinkedOffers(currentUser).filter(o => o.id !== item.id).slice(0, 6)
    : [];
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
  const isFromBackoffice = Boolean(adminAuthenticated && document.getElementById("adminModal")?.classList.contains("open"));
  content.innerHTML = `
    <div class="hig-offer-header">
      <div class="hig-sheet-grabber-zone" onclick="closeOfferModal()" title="Drag down or tap to close">
        <div class="hig-sheet-grabber"></div>
      </div>
      <div class="hig-offer-top-row">
        <span class="hig-offer-loc">${PREMIUM_ICONS.pin}${escapeHtml(item.city)}, ${escapeHtml(item.country)}</span>
        <div class="hig-offer-actions">
          ${isFromBackoffice ? `<button type="button" class="btn btn-dark" style="height:32px;min-height:32px !important;padding:0 12px;font-size:11.5px;border-radius:999px;" onclick="closeOfferModal()">← Backoffice</button>` : ""}
          ${(isCustomOwner || isFromBackoffice) ? `
            <button type="button" class="bo-icon-btn" onclick="openQuickEditListingSheet(${item.id})" title="${escapeHtml(ptc.editBtn)}" aria-label="${escapeHtml(ptc.editBtn)}">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            </button>
            <button type="button" class="bo-icon-btn is-danger" onclick="requestDeleteListing(${item.id})" title="Delete" aria-label="Delete">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
          ` : ""}
          <button type="button" class="bo-icon-btn" onclick="copyOfferShareLink(${item.id})" title="${escapeHtml(ptc.shareBtn)}" aria-label="${escapeHtml(ptc.shareBtn)}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
          </button>
          <button type="button" class="bo-icon-btn" onclick="openReportOfferSheet(${item.id})" title="${escapeHtml(getGdprUiCopy().dsaReportBtn)}" aria-label="${escapeHtml(getGdprUiCopy().dsaReportBtn)}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
          </button>
          <button type="button" id="offerModalFavBtn" class="bo-icon-btn ${isFav ? 'is-fav' : ''}" onclick="toggleFavorite(${item.id})" style="background:${isFav ? '#fff1f2' : '#f1f5f4'};color:${isFav ? '#e11d48' : '#0f172a'};font-size:15px;" title="Favorite" aria-label="Favorite">${isFav ? "♥" : "♡"}</button>
          <span style="width:1px;height:18px;background:rgba(15,23,42,0.12);margin:0 1px;"></span>
          <button type="button" class="bo-icon-btn hig-modal-close-btn" onclick="closeOfferModal()" title="Close" aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
      <div class="hig-offer-sub-row">
        <span class="hig-offer-owner">${mUi.ownerVerified}: <strong>${escapeHtml(item.owner)}</strong> <span class="hig-verified-pill">${mUi.verifiedWord}</span></span>
        <span class="hig-offer-dot">·</span>
        <span class="hig-offer-deal">${escapeHtml(getDealTypeLabel(item.dealType))}</span>
      </div>
    </div>
    <div class="offer-modal-grid">
      <div>
        <div id="offerModalGalleryMain" onclick="openPhotoLightbox(${item.id})" title="Click to open fullscreen photo" style="height:245px;border-radius:20px;background:url('${galleryImgs[0]}') 50%/cover no-repeat;margin-bottom:10px;position:relative;transition:background-image 0.2s ease;cursor:zoom-in;">
          <button type="button" onclick="event.stopPropagation(); openPhotoLightbox(${item.id});" style="position:absolute;top:12px;left:12px;background:rgba(15,23,42,0.62);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.24);color:#fff;padding:4px 11px;height:28px;min-height:28px !important;border-radius:999px;font-size:11.5px;font-weight:650;cursor:pointer;display:inline-flex;align-items:center;gap:5px;" title="Open fullscreen photo">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
            <span>Zoom</span>
          </button>
          ${galleryImgs.length > 1 ? `
            <button type="button" onclick="stepOfferGalleryPhoto(${item.id}, -1, event)" style="position:absolute;top:50%;left:10px;transform:translateY(-50%);width:36px;height:36px;min-height:36px !important;border-radius:50%;border:1px solid rgba(255,255,255,0.3);background:rgba(15,23,42,0.65);backdrop-filter:blur(12px);color:#fff;font-size:18px;font-weight:800;cursor:pointer;z-index:2;" title="Previous photo">‹</button>
            <button type="button" onclick="stepOfferGalleryPhoto(${item.id}, 1, event)" style="position:absolute;top:50%;right:10px;transform:translateY(-50%);width:36px;height:36px;min-height:36px !important;border-radius:50%;border:1px solid rgba(255,255,255,0.3);background:rgba(15,23,42,0.65);backdrop-filter:blur(12px);color:#fff;font-size:18px;font-weight:800;cursor:pointer;z-index:2;" title="Next photo">›</button>
            <span id="offerModalGalleryCount" style="position:absolute;top:12px;right:12px;background:rgba(15,23,42,0.62);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.22);color:#fff;padding:3px 10px;border-radius:999px;font-size:11.5px;font-weight:700;">1 / ${galleryImgs.length}</span>
          ` : ""}
          <span style="position:absolute;bottom:12px;left:12px;right:12px;width:fit-content;max-width:calc(100% - 24px);background:rgba(15,23,42,0.68);color:#ffffff;backdrop-filter:blur(16px) saturate(160%);-webkit-backdrop-filter:blur(16px) saturate(160%);border:1px solid rgba(255,255,255,0.24);padding:6px 13px;border-radius:14px;font-weight:600;font-size:12.5px;line-height:1.3;white-space:normal;word-break:break-word;">
            ${getCategoryLabel(item.category)} · ${valFormatted}${clientBaseNote}
          </span>
        </div>
        ${galleryImgs.length > 1 ? `
          <div id="offerModalThumbsRow" style="display:flex;gap:8px;margin-bottom:12px;overflow-x:auto;">
            ${galleryImgs.map((u, i) => `
              <img src="${u}" onclick="selectOfferGalleryPhoto(${item.id}, ${i})" style="width:68px;height:46px;object-fit:cover;border-radius:10px;cursor:pointer;border:2px solid ${i === 0 ? '#0f172a' : 'transparent'};opacity:${i === 0 ? '1' : '0.68'};flex-shrink:0;" alt="" />
            `).join("")}
          </div>
        ` : ""}
        <h2 style="font-size:20px;font-weight:700;letter-spacing:-0.02em;color:#0f172a;margin:0 0 8px;line-height:1.28;">${escapeHtml(loc.title)}</h2>
        <p style="color:#475569;margin:0 0 14px;font-size:13.5px;line-height:1.48;">${escapeHtml(loc.desc || item.specs)}</p>
        <div class="swap-exchange-box" style="margin-bottom:0;">
          <div class="swap-row">
            <span class="swap-tag have">${t("haveBadge")}</span>
            <span><strong>${escapeHtml(loc.title)}</strong> (${escapeHtml(item.specs)})</span>
          </div>
          <div class="swap-row">
            <span class="swap-tag want">${item.dealType === "sale" ? t("saleBadge") : t("wantBadge")}</span>
            <span style="font-weight:600;color:#0f172a;">${item.dealType === "sale" ? `${t("dealSaleOnly")} · ${valFormatted}` : escapeHtml(loc.want)}</span>
          </div>
        </div>
      </div>
      <div>
        ${isCustomOwner ? `
          <div style="margin-bottom:12px;padding:12px 14px;border-radius:16px;background:#ecfdf5;border:1px solid #a7f3d0;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
            <span style="font-size:12.5px;font-weight:750;color:#065f46;">● ${{ro:"Acesta este anunțul tău activ",en:"This is your active listing",de:"Dies ist Ihr aktives Inserat",fr:"Ceci est votre annonce active",it:"Questo è il tuo annuncio attivo",es:"Este es tu anuncio activo",ru:"Это ваше активное объявление"}[currentLang] || "This is your active listing"}</span>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              <button type="button" class="hig-ws-emerald-btn" style="height:32px;min-height:32px !important;padding:0 12px;font-size:12px;" onclick="openQuickEditListingSheet(${item.id})">✎ ${escapeHtml(ptc.editBtn)}</button>
              <button type="button" class="hig-ws-outline-pill" style="height:32px;min-height:32px !important;padding:0 12px;font-size:12px;cursor:pointer;background:#ffffff;" onclick="closeOfferModal(); openDashboardModal('proposals');">⇄ ${escapeHtml(t("dashTabProposals"))}</button>
            </div>
          </div>
        ` : ""}
        <!-- ACTION MODE SWITCHER: SWAP vs BUY / CASH OFFER -->
        <div class="catalog-pills" style="margin-bottom:12px;display:grid;grid-template-columns:1fr 1fr;width:100%;gap:4px;">
          <button type="button" id="offerTabSwapBtn" class="cat-pill ${!startInBuyMode ? 'active' : ''}" style="justify-content:center;text-align:center;width:100%;" onclick="switchOfferActionTab('swap')">
            ${t("proposeSwapBtn")}
          </button>
          <button type="button" id="offerTabBuyBtn" class="cat-pill ${startInBuyMode ? 'active' : ''}" style="justify-content:center;text-align:center;width:100%;" onclick="switchOfferActionTab('buy')">
            ${t("buyOfferBtn")}
          </button>
        </div>
        <!-- PANEL 1: UNIFIED APPLE HIG 1:1 SWAP PROPOSAL & BALANCE CARD -->
        <div id="offerActionSwapPanel" style="display:${startInBuyMode ? 'none' : 'block'};">
          <form onsubmit="submitDirectSwapProposal(event, ${item.id})" class="hig-action-card">
            <div class="hig-action-card-head">
              <div>
                <strong class="hig-action-title">${t("proposeSwapBtn")}</strong>
                <span class="hig-action-sub">${mUi.zeroFeeDirect}</span>
              </div>
              <span class="hig-price-badge">${getOfferPreviousPriceFormatted(item, currentCurrency) ? `<del style="opacity:0.75;font-weight:500;font-size:11.5px;margin-right:5px;">${getOfferPreviousPriceFormatted(item, currentCurrency)}</del>` : ""}${valFormatted}</span>
            </div>
            <div class="hig-grouped-section">
              <div class="field-group" style="margin-bottom:10px;">
                <label class="hig-field-label">${ptc.pickMyAdLabel}</label>
                <select class="input-light" style="font-size:13px;" onchange="pickMyListingForSwap(${item.id}, this.value)">
                  <option value="">${ptc.pickMyAdDefault}</option>
                  ${userPickableAds.map(ad => {
    const adLoc = getOfferLocalized(ad);
    return `<option value="${ad.id}">${escapeHtml(adLoc.title)} (~${formatOfferPrice(ad, currentCurrency)})</option>`;
  }).join("")}
                </select>
              </div>
              <div class="hig-swap-input-grid" style="display:grid;grid-template-columns:1fr;gap:10px;">
                <div>
                  <label class="hig-field-label">${t("quickTitleHave")}</label>
                  <input type="text" id="swapOfferedItemInput" name="offeredItem" class="input-light" placeholder="${escapeHtml(t('quickHavePlaceholder'))}" required oninput="updateSwapValueCalculator(${item.id})" />
                </div>
                <div>
                  <label class="hig-field-label">${yourValLabel}</label>
                  <div style="display:grid;grid-template-columns:minmax(0, 1fr) 76px;gap:6px;align-items:center;">
                    <input type="text" inputmode="decimal" id="calcMyValueInput" class="input-light" style="padding:8px 14px !important;font-weight:700;font-variant-numeric:tabular-nums;min-width:0;width:100%;" value="${theirValConverted}" oninput="updateSwapValueCalculator(${item.id})" />
                    <select id="calcMyCurrencySelect" class="input-light" style="padding:0 22px 0 9px !important;font-size:12.5px;font-weight:700;width:76px;" onchange="updateSwapValueCalculator(${item.id})">
                      ${(window.CURRENCIES || []).map(curr => `<option value="${curr.code}" ${curr.code === currentCurrency ? 'selected' : ''}>${curr.code}</option>`).join("")}
                    </select>
                  </div>
                </div>
              </div>
              <div id="calcParityPreview">${buildParityPreviewHtml(theirValConverted, currentCurrency)}</div>
              <div class="hig-balance-pill is-even" id="calcResultBanner">
                <span>⇄ ${t("calcEven")}</span><strong>${formatAmountInCurrentCurrency(0, currentCurrency)}</strong>
              </div>
              <div id="swapSideBySideBox">${buildSwapSideBySideHtml(item.id)}</div>
            </div>
            <div class="hig-grouped-section" style="margin-top:10px;">
              <div class="field-group" style="margin-bottom:10px;">
                <label class="hig-field-label">${ptc.messageLabel}</label>
                <textarea name="proposalNote" rows="2" class="input-light" style="min-height:56px !important;height:auto !important;line-height:1.38 !important;padding:9px 14px !important;border-radius:16px !important;resize:vertical;" placeholder="${ptc.messagePlaceholder}"></textarea>
              </div>
              <div class="form-grid-2">
                <div class="field-group" style="margin-bottom:0;">
                  <label class="hig-field-label">${t("formFullName")}</label>
                  <input type="text" name="senderName" class="input-light" required value="${escapeHtml(currentUser ? currentUser.name : '')}" />
                </div>
                <div class="field-group" style="margin-bottom:0;">
                  <label class="hig-field-label">${t("formPhone")} / Email</label>
                  <input type="text" name="senderContact" class="input-light" required value="${escapeHtml(currentUser ? (currentUser.phone || currentUser.email) : '')}" />
                </div>
              </div>
            </div>
            <button type="submit" class="btn btn-mint btn-block hig-submit-btn">
              ${mUi.sendSwapTo} ${escapeHtml(item.owner)} →
            </button>
            <p class="hig-gdpr-footnote">✓ ${getGdprUiCopy().gdprContactNote}</p>
          </form>
        </div>
        <!-- PANEL 2: APPLE HIG DIRECT BUY / CASH OFFER CARD -->
        <div id="offerActionBuyPanel" style="display:${startInBuyMode ? 'block' : 'none'};">
          <form onsubmit="submitDirectBuyOffer(event, ${item.id})" class="hig-action-card">
            <div class="hig-action-card-head">
              <div>
                <strong class="hig-action-title">${t("buyOfferBtn")}</strong>
                <span class="hig-action-sub">${mUi.zeroCommission}</span>
              </div>
              <span class="hig-price-badge">${valFormatted}</span>
            </div>
            <div class="hig-grouped-section">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;flex-wrap:wrap;">
                <label class="hig-field-label" style="margin:0;">${mUi.yourCashOffer}</label>
                <div class="hig-quick-pct-pills">
                  <button type="button" class="hig-pct-pill" onclick="setBuyOfferQuickPct(${item.id}, 0.9)">-10%</button>
                  <button type="button" class="hig-pct-pill" onclick="setBuyOfferQuickPct(${item.id}, 0.95)">-5%</button>
                  <button type="button" class="hig-pct-pill" onclick="setBuyOfferQuickPct(${item.id}, 1)">100%</button>
                </div>
              </div>
              <div style="display:grid;grid-template-columns:minmax(0, 1fr) 102px;gap:8px;align-items:center;">
                <input type="text" inputmode="decimal" id="buyOfferAmountInput" name="buyAmount" class="input-light" style="font-weight:700;font-size:15px;font-variant-numeric:tabular-nums;" value="${theirValConverted}" required oninput="onBuyOfferPriceChange(${item.id})" />
                <select id="buyOfferCurrencySelect" name="buyCurrency" class="input-light" style="font-weight:700;font-size:13px;" onchange="onBuyOfferPriceChange(${item.id})">
                  ${(window.CURRENCIES || []).map(curr => `<option value="${curr.code}" ${curr.code === currentCurrency ? 'selected' : ''}>${curr.code} (${curr.symbol})</option>`).join("")}
                </select>
              </div>
              <div id="buyOfferParityPreview">${buildParityPreviewHtml(theirValConverted, currentCurrency)}</div>
            </div>
            <div class="hig-grouped-section" style="margin-top:10px;">
              <div class="field-group" style="margin-bottom:10px;">
                <label class="hig-field-label">${mUi.paymentPref}</label>
                <select name="paymentMethod" class="input-light">
                  <option value="Bank Transfer / Cash on Handover">${mUi.payOpt1}</option>
                  <option value="Buy Now at Asking Price">${mUi.payOpt2} (${valFormatted})</option>
                  <option value="Notary / Verified Escrow Contract">${mUi.payOpt3}</option>
                </select>
              </div>
              <div class="field-group" style="margin-bottom:10px;">
                <label class="hig-field-label">${ptc.messageLabel}</label>
                <textarea name="proposalNote" rows="2" class="input-light" style="min-height:56px !important;height:auto !important;line-height:1.38 !important;padding:9px 14px !important;border-radius:16px !important;resize:vertical;" placeholder="${ptc.messagePlaceholder}"></textarea>
              </div>
              <div class="form-grid-2">
                <div class="field-group" style="margin-bottom:0;">
                  <label class="hig-field-label">${t("formFullName")}</label>
                  <input type="text" name="senderName" class="input-light" required value="${escapeHtml(currentUser ? currentUser.name : '')}" />
                </div>
                <div class="field-group" style="margin-bottom:0;">
                  <label class="hig-field-label">${t("formPhone")} / Email</label>
                  <input type="text" name="senderContact" class="input-light" required value="${escapeHtml(currentUser ? (currentUser.phone || currentUser.email) : '')}" />
                </div>
              </div>
            </div>
            <button type="submit" class="btn btn-mint btn-block hig-submit-btn">
              ${mUi.sendBuyTo} ${escapeHtml(item.owner)} →
            </button>
            <p class="hig-gdpr-footnote">✓ ${getGdprUiCopy().gdprContactNote}</p>
          </form>
        </div>
      </div>
    </div>
  `;
  modal.classList.add("open");
  document.body.classList.add("modal-open");
  document.body.classList.add("mobile-started");
  if (!document.getElementById("adminModal")?.classList.contains("open")) {
    syncUrlWithRoute(`/offer/${offerId}`);
  }
}
function closeOfferModal() {
  document.getElementById("offerModal").classList.remove("open");
  if (document.getElementById("adminModal")?.classList.contains("open")) {
    document.body.classList.add("modal-open");
    renderAdminModalContent();
    syncUrlWithRoute("/admin");
  } else if (document.getElementById("dashboardModal")?.classList.contains("open")) {
    document.body.classList.add("modal-open");
    renderDashboardContent();
    syncUrlWithRoute("/dashboard");
  } else if (hasAnyOpenModalBackdrop()) {
    document.body.classList.add("modal-open");
  } else {
    document.body.classList.remove("modal-open");
    syncUrlWithRoute(document.body.classList.contains("mobile-started") ? "/start" : "/");
  }
}
function consumeFreeSwapIfLogged() {
  if (currentUser) {
    if (currentUser.plan === "pro") {
      renderUserHeaderState();
      return;
    }
    if (typeof currentUser.freeSwaps === "number" && currentUser.freeSwaps > 0) {
      currentUser.freeSwaps = Math.max(0, currentUser.freeSwaps - 1);
      localStorage.setItem("ci4m_user", JSON.stringify(currentUser));
      const emailKey = String(currentUser.email || "").trim().toLowerCase();
      if (emailKey && accountsDb[emailKey]) {
        accountsDb[emailKey].freeSwaps = currentUser.freeSwaps;
        saveAccountsDb();
      }
      renderUserHeaderState();
    }
  } else {
    guestFreeSwaps = Math.max(0, guestFreeSwaps - 1);
    localStorage.setItem("ci4m_guest_free_swaps", String(guestFreeSwaps));
    renderUserHeaderState();
  }
}
const consumeFreeSwapCredit = consumeFreeSwapIfLogged;
function submitDirectSwapProposal(e, offerId) {
  e.preventDefault();
  const rawContact = e?.target ? String(new FormData(e.target).get("senderContact") || "").trim() : "";
  if (!requireAuthForPostingOrProposal("proposal", rawContact.includes("@") ? rawContact : "")) return;
  if (!canPerformSwapOrPost()) return;
  const ptc = getProposalToastCopy();
  const fd = new FormData(e.target);
  const item = offers.find(o => o.id === offerId);
  if (item && isListingOwnedByCurrentUser(item)) {
    showToast(currentLang === "ro" ? "! Nu poți trimite o propunere de schimb către propriul tău anunț." : "! You cannot send a swap proposal to your own listing.");
    return;
  }
  const loc = item ? getOfferLocalized(item) : { title: "Swap Offer" };
  const bannerEl = document.getElementById("calcResultBanner");
  const calcBanner = String(bannerEl?.innerText || bannerEl?.textContent || "").replace(/\n/g, " ").trim() || "1:1 Key-for-Key";
  const note = String(fd.get("proposalNote") || "").trim();
  const senderName = String(fd.get("senderName") || currentUser?.name || "Verified Member").trim();
  const senderContact = String(fd.get("senderContact") || currentUser?.phone || currentUser?.email || "").trim();
  const offeredTitle = String(fd.get("offeredItem") || "").trim();
  const newProp = {
    id: Date.now(),
    direction: "Sent",
    offerId,
    targetTitle: loc.title,
    offeredItem: offeredTitle,
    partner: item ? `${item.owner} (${item.city}, ${item.country})` : "Owner",
    ownerEmail: item?.ownerEmail || "",
    senderName,
    senderContact,
    senderEmail: currentUser?.email || "",
    cashBalance: calcBanner,
    note,
    statusKey: "sent_swap",
    status: ptc.statusSentSwap
  };
  swapProposals.unshift(newProp);
  saveSwapProposals();
  const partnerContact = getProposalPartnerContact(newProp);
  dispatchPartnerNotificationToServer({
    toEmail: partnerContact.email,
    toPhone: partnerContact.phone,
    subject: `ChangeIt4Me · 1:1 Swap Proposal (${offeredTitle} ⇄ ${loc.title})`,
    message: `${senderName} (${senderContact}) proposed a 1:1 swap: "${offeredTitle}" for your "${loc.title}" (${calcBanner}).${note ? " Note: " + note : ""}`
  });
  consumeFreeSwapIfLogged();
  updateFavCountUI();
  closeOfferModal();
  showToast(ptc.swapSent);
}
function acceptSwapProposal(propId) {
  const p = swapProposals.find(x => x.id === propId);
  const isBackofficeOpen = Boolean(adminAuthenticated && document.getElementById("adminModal")?.classList.contains("open"));
  if (!p || !canCurrentUserAccessProposal(p) || (!isBackofficeOpen && !isProposalIncomingForCurrentUser(p))) {
    showToast(currentLang === "ro" ? "! Doar destinatarul propunerii poate accepta schimbul." : "! Only the proposal recipient can accept this swap.");
    return;
  }
  const ptc = getProposalToastCopy();
  p.statusKey = "accepted";
  p.status = ptc.statusAccepted;
  p.accepted = true;
  p.declined = false;
  saveSwapProposals();
  renderDashboardContent();
  showToast(`${ptc.acceptedPrefix} ${p.partner} ${ptc.acceptedSuffix}`);
}
function declineSwapProposal(propId) {
  const p = swapProposals.find(x => x.id === propId);
  const isBackofficeOpen = Boolean(adminAuthenticated && document.getElementById("adminModal")?.classList.contains("open"));
  if (!p || !canCurrentUserAccessProposal(p) || (!isBackofficeOpen && !isProposalIncomingForCurrentUser(p))) return;
  p.statusKey = "declined";
  p.accepted = false;
  p.declined = true;
  p.status = getProposalStatusLabel(p);
  saveSwapProposals();
  renderDashboardContent();
}
function counterSwapProposal(propId, customCounterText = "") {
  const p = swapProposals.find(x => x.id === propId);
  if (!p || !canCurrentUserAccessProposal(p)) return;
  p.statusKey = "counter";
  p.status = getProposalStatusLabel(p);
  activeProposalThreadId = propId;
  if (customCounterText) {
    appendProposalMessage(propId, customCounterText);
  } else {
    saveSwapProposals();
    renderDashboardContent();
  }
}
function deleteSwapProposal(propId) {
  const targetP = swapProposals.find(x => x.id === propId);
  if (targetP && !canCurrentUserAccessProposal(targetP)) return;
  const numId = Number(propId);
  if (Number.isFinite(numId) && !deletedProposalIds.includes(numId)) {
    deletedProposalIds.push(numId);
    try { localStorage.setItem("ci4m_deleted_proposals_v1", JSON.stringify(deletedProposalIds)); } catch (e) {}
  }
  swapProposals = swapProposals.filter(x => x.id !== propId);
  saveSwapProposals();
  if (typeof scheduleCloudSyncPush === "function") {
    scheduleCloudSyncPush({ deletedProposalIds });
  }
  updateFavCountUI();
  renderDashboardContent();
}
function openDashboardModal(tab = "mylistings") {
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
function saveDashboardProfile(e) {
  e.preventDefault();
  if (!currentUser) return;
  const fd = new FormData(e.target);
  const am = getAuthMsg();
  const nextName = String(fd.get("name") || currentUser.name).trim();
  if (nextName.length < 3 || /^(test|fake|asdf|qwerty|1234)/i.test(nextName)) {
    showToast(am.invalidName);
    return;
  }
  const nextPhone = String(fd.get("phone") || "").trim();
  if (nextPhone && !isValidRealPhone(nextPhone)) {
    showToast(am.invalidPhone);
    return;
  }
  const newPass = String(fd.get("newPassword") || "");
  if (newPass && newPass.length < 6) {
    showToast(am.pwdTooShort || am.pwdMismatch);
    return;
  }
  currentUser.name = nextName;
  currentUser.phone = nextPhone;
  currentUser.country = String(fd.get("country") || currentUser.country).trim();
  const nextLang = String(fd.get("prefLang") || currentLang);
  const nextCurr = String(fd.get("prefCurrency") || currentCurrency);
  currentUser.prefLang = nextLang;
  currentUser.prefCurrency = nextCurr;
  localStorage.setItem("ci4m_user", JSON.stringify(currentUser));
  const emailKey = String(currentUser.email || "").trim().toLowerCase();
  if (emailKey) {
    const existingAcc = accountsDb[emailKey] || {};
    accountsDb[emailKey] = {
      ...existingAcc,
      ...currentUser,
      password: newPass ? hashUserPassword(emailKey, newPass) : (existingAcc.password || "")
    };
    saveAccountsDb();
    let updatedAnyListing = false;
    offers.forEach(o => {
      if (isListingOwnedByCurrentUser(o) && o.owner !== nextName) {
        o.owner = nextName;
        updatedAnyListing = true;
      }
    });
    if (updatedAnyListing) {
      saveOffersToStorage();
      renderOffers();
    }
  }
  if (nextLang !== currentLang) setLanguage(nextLang);
  if (nextCurr !== currentCurrency) setCurrency(nextCurr);
  renderUserHeaderState();
  renderDashboardContent();
  showToast(getProposalToastCopy().profileSaved);
}
function ensureProposalMessages(p) {
  if (!Array.isArray(p.messages) || p.messages.length === 0) {
    const initReplyMap = {
      ro: `Salut! Am văzut propunerea ta (${p.offeredItem} ⇄ ${p.targetTitle}). Putem discuta detaliile și stabili o verificare.`,
      en: `Hi! I saw your proposal (${p.offeredItem} ⇄ ${p.targetTitle}). Let's discuss details and schedule an inspection.`,
      de: `Hallo! Ich habe Ihren Vorschlag (${p.offeredItem} ⇄ ${p.targetTitle}) gesehen. Lassen Sie uns die Details besprechen.`,
      fr: `Bonjour ! J'ai vu votre proposition (${p.offeredItem} ⇄ ${p.targetTitle}). Discutons des détails.`,
      it: `Ciao! Ho visto la tua proposta (${p.offeredItem} ⇄ ${p.targetTitle}). Parliamo dei dettagli.`,
      es: `¡Hola! Vi tu propuesta (${p.offeredItem} ⇄ ${p.targetTitle}). Hablemos de los detalles.`,
      ru: `Здравствуйте! Я увидел ваше предложение (${p.offeredItem} ⇄ ${p.targetTitle}). Давайте обсудим детали.`
    };
    p.messages = [
      {
        sender: "partner",
        author: p.partner.split("(")[0].trim(),
        text: p.note || (initReplyMap[currentLang] || initReplyMap.en),
        time: "10:15"
      }
    ];
  }
  return p.messages;
}
function toggleProposalThread(propId) {
  activeProposalThreadId = activeProposalThreadId === propId ? null : propId;
  renderDashboardContent();
}
function sendProposalMessage(e, propId) {
  e.preventDefault();
  const input = document.getElementById(`propChatInput_${propId}`);
  const text = String(input?.value || "").trim();
  if (!text) return;
  appendProposalMessage(propId, text);
}
const sendProposalChatMessage = sendProposalMessage;
function sendQuickProposalChip(propId, text) {
  appendProposalMessage(propId, text);
}
function appendProposalMessage(propId, text) {
  const p = swapProposals.find(x => x.id === propId);
  if (!p || !canCurrentUserAccessProposal(p)) return;
  ensureProposalMessages(p);
  const nowStr = new Date().toTimeString().slice(0, 5);
  p.messages.push({
    sender: "me",
    senderEmail: currentUser ? String(currentUser.email || "").trim().toLowerCase() : "",
    author: currentUser ? currentUser.name.split(" ")[0] : "Tu",
    text,
    time: nowStr
  });
  saveSwapProposals();
  const partnerContact = getProposalPartnerContact(p);
  dispatchPartnerNotificationToServer({
    toEmail: partnerContact.email,
    toPhone: partnerContact.phone,
    subject: `ChangeIt4Me · New Message regarding ${p.targetTitle}`,
    message: `${currentUser ? currentUser.name : "Swap Partner"}: "${text}" (${p.offeredItem} ⇄ ${p.targetTitle})`
  });
  activeProposalThreadId = propId;
  renderDashboardContent();
  const isDemoSeedProp = Number(p.id) === 901 || Number(p.id) === 902;
  const alreadyAutoReplied = Array.isArray(p.messages) && p.messages.some(m => m.isAutoDemoReply);
  if (isDemoSeedProp && !alreadyAutoReplied) setTimeout(() => {
    const autoReplyMap = {
      ro: "Perfect, sunt de acord! Putem face verificarea și semna Acordul de Schimb 1:1 direct fără comision.",
      en: "Sounds great, I agree! We can do the inspection and sign the 1:1 Swap Agreement with 0% commission.",
      de: "Klingt super, einverstanden! Wir können die Prüfung durchführen und den 1:1-Tauschvertrag unterschreiben.",
      fr: "Parfait, je suis d'accord ! Nous pouvons faire la vérification et signer l'accord d'échange 1:1.",
      it: "Perfetto, sono d'accordo! Possiamo fare la verifica e firmare l'accordo di scambio 1:1.",
      es: "¡Perfecto, estoy de acuerdo! Podemos hacer la revisión y firmar el acuerdo de intercambio 1:1.",
      ru: "Отлично, я согласен! Можем провести проверку и подписать соглашение об обмене 1:1."
    };
    p.messages.push({
      sender: "partner",
      isAutoDemoReply: true,
      author: p.partner.split("(")[0].trim(),
      text: autoReplyMap[currentLang] || autoReplyMap.en,
      time: new Date().toTimeString().slice(0, 5)
    });
    saveSwapProposals();
    if (document.getElementById("dashboardModal")?.classList.contains("open") && currentDashTab === "proposals") {
      renderDashboardContent();
    }
  }, 650);
}
function openSwapAgreementModal(propId) {
  const p = swapProposals.find(x => x.id === propId);
  if (!p || !canCurrentUserAccessProposal(p)) return;
  const content = document.getElementById("guideModalContent");
  if (!content) return;
  const todayStr = new Date().toISOString().slice(0, 10);
  const meStr = currentUser
    ? `${currentUser.name} (${currentUser.email}${currentUser.phone ? " · " + currentUser.phone : ""})`
    : (p.senderName ? `${p.senderName}${p.senderContact ? " (" + p.senderContact + ")" : ""}` : "Verified Member A");
  const contactInfo = getProposalPartnerContact(p);
  const partnerContactSuffix = (contactInfo.email || contactInfo.phone)
    ? ` · ${[contactInfo.email, contactInfo.phone].filter(Boolean).join(" / ")}`
    : "";
  const partnerFullStr = `${p.partner}${partnerContactSuffix}`;
  const isIncoming = p.direction === "Incoming";
  const partyA = isIncoming ? partnerFullStr : meStr;
  const partyB = isIncoming ? meStr : partnerFullStr;
  const agrCopy = {
    ro: {
      badge: "Acord Oficial de Schimb Direct 1:1 · 0% Comision",
      title: "Proces-Verbal / Acord de Schimb Reciproc (1:1)",
      dateLabel: "Data generării",
      partyALabel: "Partea A (Propunător)",
      partyBLabel: "Partea B (Partener)",
      itemALabel: "Bunul oferit de Partea A",
      itemBLabel: "Bunul oferit de Partea B",
      balanceLabel: "Paritate & Diferență agreată",
      clausesTitle: "Clauze de verificare și predare cheie-pe-cheie:",
      c1: "Ambele părți declară că sunt proprietarii de drept ai bunurilor supuse schimbului și că acestea nu sunt grevate de sarcini/datorii ascunse.",
      c2: "Verificarea tehnică/fizică a bunurilor se realizează în prezența ambelor părți înainte de predarea cheie-pe-cheie.",
      c3: "Platforma ChangeIt4Me percepe 0% comision pentru acest schimb direct.",
      printBtn: "Printează / Salvează Acordul PDF"
    },
    en: {
      badge: "Official 1:1 Direct Swap Handover Agreement · 0% Fee",
      title: "1:1 Mutual Swap & Handover Agreement",
      dateLabel: "Date generated",
      partyALabel: "Party A (Proposer)",
      partyBLabel: "Party B (Partner)",
      itemALabel: "Asset offered by Party A",
      itemBLabel: "Asset offered by Party B",
      balanceLabel: "Agreed Parity & Cash Balance",
      clausesTitle: "Inspection & Key-for-Key Handover Clauses:",
      c1: "Both parties confirm rightful ownership of the exchanged assets and declare them free of undisclosed liens or encumbrances.",
      c2: "Physical/technical inspection of both items is completed jointly prior to key-for-key handover.",
      c3: "ChangeIt4Me charges 0% platform commission on this direct exchange.",
      printBtn: "Print / Save Agreement as PDF"
    },
    de: {
      badge: "Offizieller 1:1-Tauschvertrag · 0% Gebühr",
      title: "Gegenseitiger 1:1-Tausch- & Übergabevertrag",
      dateLabel: "Erstellungsdatum",
      partyALabel: "Partei A (Anbieter)",
      partyBLabel: "Partei B (Tauschpartner)",
      itemALabel: "Objekt von Partei A",
      itemBLabel: "Objekt von Partei B",
      balanceLabel: "Vereinbarte Parität & Wertausgleich",
      clausesTitle: "Prüfungs- & Schlüssel-gegen-Schlüssel-Klauseln:",
      c1: "Beide Parteien bestätigen das rechtmäßige Eigentum an den Tauschobjekten sowie die Freiheit von Rechten Dritter.",
      c2: "Die technische/physische Prüfung beider Objekte erfolgt gemeinsam vor der Übergabe.",
      c3: "ChangeIt4Me erhebt 0% Provision für diesen direkten Tausch.",
      printBtn: "Vertrag drucken / als PDF speichern"
    },
    fr: {
      badge: "Accord Officiel d'Échange Direct 1:1 · 0% Commission",
      title: "Contrat d'Échange Réciproque 1:1",
      dateLabel: "Date de génération",
      partyALabel: "Partie A (Proposant)",
      partyBLabel: "Partie B (Partenaire)",
      itemALabel: "Bien proposé par la Partie A",
      itemBLabel: "Bien proposé par la Partie B",
      balanceLabel: "Parité et soulte convenues",
      clausesTitle: "Clauses de vérification et remise clé contre clé :",
      c1: "Les deux parties attestent être les propriétaires légitimes des biens échangés, libres de tout gage ou dette cachée.",
      c2: "L'inspection physique et technique des deux biens est effectuée conjointement avant la remise.",
      c3: "ChangeIt4Me applique 0% de commission sur cet échange direct.",
      printBtn: "Imprimer / Enregistrer en PDF"
    },
    it: {
      badge: "Accordo Ufficiale di Scambio Diretto 1:1 · 0% Commissione",
      title: "Verbale / Accordo di Scambio Reciproco (1:1)",
      dateLabel: "Data di generazione",
      partyALabel: "Parte A (Proponente)",
      partyBLabel: "Parte B (Partner)",
      itemALabel: "Bene offerto dalla Parte A",
      itemBLabel: "Bene offerto dalla Parte B",
      balanceLabel: "Parità e conguaglio concordati",
      clausesTitle: "Clausole di verifica e consegna chiave su chiave:",
      c1: "Entrambe le parti confermano la legittima proprietà dei beni scambiati e l'assenza di vincoli o ipoteche occulte.",
      c2: "La verifica tecnica e fisica dei beni viene effettuata congiuntamente prima della consegna.",
      c3: "ChangeIt4Me applica lo 0% di commissione su questo scambio diretto.",
      printBtn: "Stampa / Salva Accordo in PDF"
    },
    es: {
      badge: "Acuerdo Oficial de Intercambio Directo 1:1 · 0% Comisión",
      title: "Acuerdo de Intercambio Mutuo (1:1)",
      dateLabel: "Fecha de generación",
      partyALabel: "Parte A (Proponente)",
      partyBLabel: "Parte B (Socio)",
      itemALabel: "Bien ofrecido por la Parte A",
      itemBLabel: "Bien ofrecido por la Parte B",
      balanceLabel: "Paridad y diferencia acordadas",
      clausesTitle: "Cláusulas de revisión y entrega llave por llave:",
      c1: "Ambas partes confirman la propiedad legítima de los bienes intercambiados y que están libres de cargas ocultas.",
      c2: "La inspección técnica y física de ambos bienes se realiza conjuntamente antes de la entrega.",
      c3: "ChangeIt4Me cobra 0% de comisión por este intercambio directo.",
      printBtn: "Imprimir / Guardar Acuerdo en PDF"
    },
    ru: {
      badge: "Официальное соглашение о прямом обмене 1:1 · 0% комиссия",
      title: "Акт / Соглашение о взаимном обмене (1:1)",
      dateLabel: "Дата формирования",
      partyALabel: "Сторона А (Инициатор)",
      partyBLabel: "Сторона Б (Партнёр)",
      itemALabel: "Имущество Стороны А",
      itemBLabel: "Имущество Стороны Б",
      balanceLabel: "Согласованный паритет и доплата",
      clausesTitle: "Условия проверки и передачи ключ-в-ключ:",
      c1: "Обе стороны подтверждают законное право собственности на обмениваемые объекты и отсутствие скрытых обременений.",
      c2: "Техническая и физическая проверка обоих объектов проводится совместно перед передачей.",
      c3: "Платформа ChangeIt4Me взимает 0% комиссии за этот прямой обмен.",
      printBtn: "Распечатать / Сохранить в PDF"
    }
  };
  const ac = agrCopy[currentLang] || agrCopy.en;
  content.innerHTML = `
    <button type="button" class="modal-close" style="color:var(--ink);" onclick="closeGuideModal()">✕</button>
    <span style="background:#f1f5f4;color:#0f172a;border:1px solid rgba(15,23,42,0.08);padding:4px 12px;border-radius:999px;font-size:12px;font-weight:700;">${ac.badge}</span>
    <h2 style="font-size:24px;margin:10px 0 6px;">${ac.title}</h2>
    <p style="font-size:12.5px;color:var(--muted);margin:0 0 14px;">ID #CI4M-${p.id} · ${ac.dateLabel}: <strong>${todayStr}</strong></p>
    <div style="background:#f5f7f7;border:1px solid rgba(15,23,42,0.09);border-radius:18px;padding:14px 16px;margin-bottom:14px;display:grid;gap:8px;font-size:13.5px;">
      <div><strong>${ac.partyALabel}:</strong> ${escapeHtml(partyA)}</div>
      <div><strong>${ac.partyBLabel}:</strong> ${escapeHtml(partyB)}</div>
      <hr style="border:0;border-top:1px solid rgba(15,23,42,0.08);margin:4px 0;" />
      <div><strong>${ac.itemALabel}:</strong> ${escapeHtml(p.offeredItem)}</div>
      <div><strong>${ac.itemBLabel}:</strong> ${escapeHtml(p.targetTitle)}</div>
      <div><strong>${ac.balanceLabel}:</strong> <span style="color:#0f172a;font-weight:800;">${escapeHtml(p.cashBalance)}</span></div>
    </div>
    <strong style="display:block;font-size:13.5px;margin-bottom:8px;">${ac.clausesTitle}</strong>
    <ul class="checks" style="margin-bottom:18px;font-size:13px;">
      <li><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="9" fill="#eaf7f1"/><path d="M5 9.2 7.6 12 13 6.5" stroke="#0d8a5e" stroke-width="1.7" stroke-linecap="round"/></svg><span>${ac.c1}</span></li>
      <li><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="9" fill="#eaf7f1"/><path d="M5 9.2 7.6 12 13 6.5" stroke="#0d8a5e" stroke-width="1.7" stroke-linecap="round"/></svg><span>${ac.c2}</span></li>
      <li><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="9" fill="#eaf7f1"/><path d="M5 9.2 7.6 12 13 6.5" stroke="#0d8a5e" stroke-width="1.7" stroke-linecap="round"/></svg><span>${ac.c3}</span></li>
    </ul>
    <button type="button" class="btn btn-mint btn-block" onclick="window.print()">
      ✓ ${ac.printBtn}
    </button>
  `;
  document.getElementById("guideModal").classList.add("open");
  document.body.classList.add("modal-open");
}
const openPrintableSwapAgreement = openSwapAgreementModal;
function deleteWatchlistAlert(alertId) {
  const targetA = watchlistAlerts.find(a => a.id === alertId);
  if (targetA && targetA.email && currentUser?.email && !adminAuthenticated && !isSameUserEmailAlias(targetA.email, currentUser.email)) return;
  const numId = Number(alertId);
  if (Number.isFinite(numId) && !deletedWatchlistIds.includes(numId)) {
    deletedWatchlistIds.push(numId);
    try { localStorage.setItem("ci4m_deleted_watchlist_v1", JSON.stringify(deletedWatchlistIds)); } catch (e) {}
  }
  watchlistAlerts = watchlistAlerts.filter(a => a.id !== alertId);
  saveWatchlistAlerts();
  if (typeof scheduleCloudSyncPush === "function") {
    scheduleCloudSyncPush({ deletedWatchlistIds });
  }
  renderDashboardContent();
}
let currentProposalDirFilter = "all";
function setProposalDirFilter(mode) {
  currentProposalDirFilter = mode || "all";
  renderDashboardContent();
}
function renderDashboardContent() {
  const container = document.getElementById("dashboardBodyContent");
  if (!container) return;
  swapProposals = normalizeSeedProposals(swapProposals);
  const myItems = (currentUser && typeof getAccountLinkedOffers === "function")
    ? getAccountLinkedOffers(currentUser)
    : [];
  const myProposals = swapProposals.filter(p => isProposalOwnedByCurrentUser(p));
  const favOffers = offers.filter(o => favoriteIds.includes(o.id));
  const cMy = document.getElementById("dashCountMyListings");
  const cPr = document.getElementById("dashCountProposals");
  const cFv = document.getElementById("dashCountFavorites");
  if (cMy) cMy.textContent = String(myItems.length);
  if (cPr) cPr.textContent = String(myProposals.length);
  if (cFv) cFv.textContent = String(favOffers.length);
  if (currentUser) {
    const initials = (currentUser.name || "U").split(" ").filter(Boolean).map(p => p[0]).join("").slice(0, 2).toUpperCase();
    const avEl = document.getElementById("dashHeaderAvatar");
    const nmEl = document.getElementById("dashUserNameHeading");
    const sbEl = document.getElementById("dashUserSubline");
    if (avEl) avEl.textContent = initials || "ME";
    if (nmEl) nmEl.textContent = currentUser.name || t("dashTitle");
    if (sbEl) sbEl.textContent = [currentUser.email, currentUser.country].filter(Boolean).join(" · ") || "Verified Member";
  }
  const dashLabelsMap = {
    en: { partner: "Partner", view: "View", edit: "Edit", del: "Delete", accept: "Accept Swap", chat: "Chat", contract: "1:1 Agreement", sendMsg: "Send", chatPlaceholder: "Write a message to your swap partner...", chip1: "Propose technical inspection", chip2: "Accept 1:1 key-for-key", chip3: "When can we meet?", emptyFav: "No saved favorites yet. Click the heart icon on any swap offer card to save it here.", emptyProps: "No active swap proposals yet. Open any listing and click Propose Swap.", incoming: "Incoming Proposal", outgoing: "Sent Proposal", yourAd: "Active · Live", saveBtn: "Save Profile & Preferences", watchlistTitle: "Active Watchlist Alerts", theyOffer: "THEY OFFER", youOffer: "YOU OFFER", forListing: "TARGET LISTING", kpi1: "My Active Listings", kpi2: "Portfolio Value", kpi3: "1:1 Swap Proposals", kpi4: "Saved Favorites", kpi5: "Account Plan" },
    de: { partner: "Partner", view: "Ansehen", edit: "Bearbeiten", del: "Löschen", accept: "Annehmen", chat: "Chat", contract: "1:1-Vertrag", sendMsg: "Senden", chatPlaceholder: "Nachricht an Tauschpartner schreiben...", chip1: "Besichtigung vorschlagen", chip2: "1:1-Tausch annehmen", chip3: "Wann können wir uns treffen?", emptyFav: "Noch keine Favoriten gespeichert.", emptyProps: "Noch keine aktiven Tauschvorschläge.", incoming: "Eingehend", outgoing: "Gesendet", yourAd: "Aktiv · Live", saveBtn: "Profil & Einstellungen speichern", watchlistTitle: "Aktive Suchaufträge", theyOffer: "ANGEBOTEN", youOffer: "IHR ANGEBOT", forListing: "ZIEL-INSERAT", kpi1: "Meine Inserate", kpi2: "Gesamtwert", kpi3: "Tauschvorschläge", kpi4: "Favoriten", kpi5: "Konto-Plan" },
    fr: { partner: "Partenaire", view: "Voir", edit: "Modifier", del: "Supprimer", accept: "Accepter", chat: "Chat", contract: "Accord 1:1", sendMsg: "Envoyer", chatPlaceholder: "Écrire un message au partenaire...", chip1: "Proposer une inspection", chip2: "Accepter l'échange 1:1", chip3: "Quand pouvons-nous nous voir ?", emptyFav: "Aucun favori enregistré.", emptyProps: "Aucune proposition d'échange active.", incoming: "Reçue", outgoing: "Envoyée", yourAd: "Actif · En ligne", saveBtn: "Enregistrer le profil", watchlistTitle: "Alertes Watchlist", theyOffer: "ON VOUS OFFRE", youOffer: "VOUS OFFREZ", forListing: "ANNONCE CIBLE", kpi1: "Mes annonces", kpi2: "Valeur totale", kpi3: "Propositions 1:1", kpi4: "Favoris", kpi5: "Abonnement" },
    it: { partner: "Partner", view: "Vedi", edit: "Modifica", del: "Elimina", accept: "Accetta", chat: "Chat", contract: "Accordo 1:1", sendMsg: "Invia", chatPlaceholder: "Scrivi un messaggio al partner...", chip1: "Proponi verifica tecnica", chip2: "Accetta scambio 1:1", chip3: "Quando possiamo incontrarci?", emptyFav: "Nessun preferito salvato.", emptyProps: "Nessuna proposta di scambio attiva.", incoming: "Ricevuta", outgoing: "Inviata", yourAd: "Attivo · Online", saveBtn: "Salva profilo", watchlistTitle: "Avvisi Watchlist", theyOffer: "TI OFFRONO", youOffer: "TU OFFRI", forListing: "ANNUNCIO", kpi1: "I miei annunci", kpi2: "Valore totale", kpi3: "Proposte 1:1", kpi4: "Preferiti", kpi5: "Piano Account" },
    es: { partner: "Socio", view: "Ver", edit: "Editar", del: "Eliminar", accept: "Aceptar", chat: "Chat", contract: "Acuerdo 1:1", sendMsg: "Enviar", chatPlaceholder: "Escribe un mensaje al socio...", chip1: "Proponer revisión técnica", chip2: "Aceptar intercambio 1:1", chip3: "¿Cuándo podemos vernos?", emptyFav: "Aún no tienes favoritos guardados.", emptyProps: "Aún no hay propuestas activas.", incoming: "Recibida", outgoing: "Enviada", yourAd: "Activo · En línea", saveBtn: "Guardar perfil", watchlistTitle: "Alertas Watchlist", theyOffer: "TE OFRECEN", youOffer: "TÚ OFRECES", forListing: "ANUNCIO OBJETIVO", kpi1: "Mis anuncios", kpi2: "Valor total", kpi3: "Propuestas 1:1", kpi4: "Favoritos", kpi5: "Plan de cuenta" },
    ro: { partner: "Partener", view: "Vezi", edit: "Editează", del: "Șterge", accept: "Acceptă Schimbul", chat: "Mesaje", contract: "Acord 1:1", sendMsg: "Trimite", chatPlaceholder: "Scrie un mesaj partenerului de schimb...", chip1: "Propun verificare tehnică", chip2: "Accept schimbul 1:1", chip3: "Când ne putem vedea?", emptyFav: "Nu ai încă favorite salvate. Apasă pe iconița inimă de pe orice anunț pentru a-l salva aici.", emptyProps: "Nu ai propuneri active. Deschide orice ofertă și apasă pe Propune schimb.", incoming: "Propunere Primită", outgoing: "Propunere Trimisă", yourAd: "Activ · Publicat", saveBtn: "Salvează profilul și preferințele", watchlistTitle: "Alerte Watchlist active", theyOffer: "CE ÎȚI OFERĂ", youOffer: "CE OFERI TU", forListing: "PENTRU ANUNȚUL", kpi1: "Anunțurile Mele", kpi2: "Valoare Portofoliu", kpi3: "Propuneri Schimb", kpi4: "Favorite Salvate", kpi5: "Plan Cont" },
    ru: { partner: "Партнёр", view: "Открыть", edit: "Изменить", del: "Удалить", accept: "Принять", chat: "Чат", contract: "Договор 1:1", sendMsg: "Отправить", chatPlaceholder: "Напишите сообщение партнёру...", chip1: "Предложить проверку", chip2: "Принять обмен 1:1", chip3: "Когда можем встретиться?", emptyFav: "Пока нет сохранённых избранных.", emptyProps: "Пока нет активных предложений обмена.", incoming: "Входящее", outgoing: "Отправленное", yourAd: "Активно", saveBtn: "Сохранить профиль", watchlistTitle: "Уведомления Watchlist", theyOffer: "ВАМ ПРЕДЛАГАЮТ", youOffer: "ВЫ ПРЕДЛАГАЕТЕ", forListing: "ДЛЯ ОБЪЯВЛЕНИЯ", kpi1: "Мои объявления", kpi2: "Стоимость активов", kpi3: "Предложения 1:1", kpi4: "Избранное", kpi5: "Тарифный план" }
  };
  const dl = dashLabelsMap[currentLang] || dashLabelsMap.en;
  const totalPortfolioEur = myItems.reduce((acc, it) => acc + (Number(it.valueEur) || 0), 0);
  const incCount = myProposals.filter(p => isProposalIncomingForCurrentUser(p)).length;
  const outCount = myProposals.length - incCount;
  const isProPlan = Boolean(currentUser && currentUser.plan === "pro");
  const remSwaps = currentUser && typeof currentUser.freeSwaps === "number" ? currentUser.freeSwaps : 10;
  const kpiSubMap = {
    ro: { zeroFee: "0% Comision", inOut: `${incCount} primite · ${outCount} trimise`, ready: "Schimb 1:1", ver: "Verificat ✓", allWord: "Toate" },
    en: { zeroFee: "0% Commission", inOut: `${incCount} in · ${outCount} out`, ready: "1:1 Ready", ver: "Verified ✓", allWord: "All" },
    de: { zeroFee: "0% Provision", inOut: `${incCount} eing. · ${outCount} ges.`, ready: "1:1 Bereit", ver: "Verifiziert ✓", allWord: "Alle" },
    fr: { zeroFee: "0% Commission", inOut: `${incCount} reçues · ${outCount} env.`, ready: "Échange 1:1", ver: "Vérifié ✓", allWord: "Toutes" },
    it: { zeroFee: "0% Commissione", inOut: `${incCount} ric. · ${outCount} inv.`, ready: "Scambio 1:1", ver: "Verificato ✓", allWord: "Tutte" },
    es: { zeroFee: "0% Comisión", inOut: `${incCount} rec. · ${outCount} env.`, ready: "Cambio 1:1", ver: "Verificado ✓", allWord: "Todas" },
    ru: { zeroFee: "0% комиссия", inOut: `${incCount} вх. · ${outCount} исх.`, ready: "Обмен 1:1", ver: "Проверен ✓", allWord: "Все" }
  };
  const ks = kpiSubMap[currentLang] || kpiSubMap.en;
  const kpiRowHtml = `
    <div class="hig-ws-kpi-grid">
      <div class="hig-ws-kpi-card" onclick="switchDashboardTab('mylistings')">
        <div class="hig-ws-kpi-top"><span class="hig-ws-kpi-label">${dl.kpi1}</span><span class="hig-ws-kpi-dot"></span></div>
        <strong class="hig-ws-kpi-val">${myItems.length}</strong>
        <div><span class="hig-sla-pill">${dl.yourAd}</span></div>
      </div>
      <div class="hig-ws-kpi-card" onclick="switchDashboardTab('mylistings')">
        <div class="hig-ws-kpi-top"><span class="hig-ws-kpi-label">${dl.kpi2}</span><span class="hig-ws-kpi-dot"></span></div>
        <strong class="hig-ws-kpi-val">${formatCurrency(totalPortfolioEur, currentCurrency)}</strong>
        <div><span class="hig-sla-pill">${ks.zeroFee}</span></div>
      </div>
      <div class="hig-ws-kpi-card" onclick="switchDashboardTab('proposals')">
        <div class="hig-ws-kpi-top"><span class="hig-ws-kpi-label">${dl.kpi3}</span><span class="hig-ws-kpi-dot"></span></div>
        <strong class="hig-ws-kpi-val">${myProposals.length}</strong>
        <div><span class="hig-sla-pill">${ks.inOut}</span></div>
      </div>
      <div class="hig-ws-kpi-card" onclick="switchDashboardTab('favorites')">
        <div class="hig-ws-kpi-top"><span class="hig-ws-kpi-label">${dl.kpi4}</span><span class="hig-ws-kpi-dot"></span></div>
        <strong class="hig-ws-kpi-val">${favOffers.length}</strong>
        <div><span class="hig-sla-pill">${ks.ready}</span></div>
      </div>
      <div class="hig-ws-kpi-card" onclick="switchDashboardTab('profile')">
        <div class="hig-ws-kpi-top"><span class="hig-ws-kpi-label">${dl.kpi5}</span><span class="hig-ws-kpi-dot"></span></div>
        <strong class="hig-ws-kpi-val">${isProPlan ? "PRO ∞" : `${remSwaps}`}</strong>
        <div><span class="hig-sla-pill">${ks.ver}</span></div>
      </div>
    </div>
  `;
  if (currentDashTab === "mylistings") {
    const emptyMyListingsMsg = {
      ro: "Nu ai publicat încă niciun anunț propriu. Apasă pe butonul de mai jos pentru a publica primul tău anunț de schimb.",
      en: "You haven't published any listings yet. Click the button below to post your first swap listing.",
      de: "Sie haben noch keine eigenen Inserate veröffentlicht.",
      fr: "Vous n'avez pas encore publié d'annonce.",
      it: "Non hai ancora pubblicato alcun annuncio.",
      es: "Aún no has publicado ningún anuncio.",
      ru: "Вы ещё не опубликовали ни одного объявления."
    }[currentLang] || "You haven't published any listings yet.";
    container.innerHTML = `
      ${kpiRowHtml}
      <div class="hig-ws-panel">
        <div class="hig-ws-panel-head">
          <div style="display:flex;align-items:center;gap:10px;">
            <strong style="font-size:15.5px;font-weight:750;color:#0f172a;">${t("dashTabMyListings")}</strong>
            <span class="hig-sla-pill">${myItems.length}</span>
          </div>
          <button type="button" class="hig-ws-emerald-btn" onclick="closeDashboardModal(); resetWizardDraft(); openWizardModal(1);">${t("navPostSwap")}</button>
        </div>
        ${myItems.length === 0 ? `<div style="padding:28px 20px;text-align:center;background:#f8fafc;border-radius:14px;border:1px solid #e6ebf1;"><p style="color:#64748b;margin:0;">${emptyMyListingsMsg}</p></div>` : myItems.map(item => {
      const loc = getOfferLocalized(item);
      return `
            <div class="hig-my-listing-card">
              <div class="hig-my-listing-main">
                <img src="${item.image}" class="hig-my-listing-thumb" onclick="openOfferModal(${item.id}, 'details')" alt="" />
                <div style="min-width:0;flex:1;">
                  <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:5px;">
                    <span class="hig-sla-pill">● ${dl.yourAd}</span>
                    <span style="background:#f1f5f9;color:#334155;font-size:11px;font-weight:650;padding:2px 9px;border-radius:999px;">${escapeHtml(getCategoryLabel(item.category))}</span>
                    <span style="font-size:11.5px;color:#64748b;font-weight:600;font-variant-numeric:tabular-nums;">#${item.id}</span>
                  </div>
                  <div style="display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap;">
                    <strong style="font-size:16.5px;color:#0f172a;cursor:pointer;" onclick="openOfferModal(${item.id}, 'details')">${escapeHtml(loc.title)}</strong>
                    <strong style="font-size:16.5px;color:#0d8a5e;font-variant-numeric:tabular-nums;">${formatOfferPrice(item, currentCurrency)}</strong>
                  </div>
                  <span style="display:block;font-size:12.5px;color:#475569;margin-top:3px;">${escapeHtml(item.specs || "")}</span>
                  <span style="display:block;font-size:12.5px;color:#64748b;margin-top:4px;">${PREMIUM_ICONS.pin}${escapeHtml(item.city)}, ${escapeHtml(item.country)} · <strong style="color:#0f172a;">${t("wantBadge")}:</strong> ${escapeHtml(loc.want)}</span>
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                <button type="button" class="btn btn-login" style="height:34px;padding:0 14px;font-size:12px;" onclick="openOfferModal(${item.id}, 'details')">${escapeHtml(dl.view)}</button>
                <button type="button" class="hig-ws-emerald-btn" onclick="openQuickEditListingSheet(${item.id})">${escapeHtml(dl.edit)}</button>
                <button type="button" class="bo-icon-btn is-danger" onclick="requestDeleteListing(${item.id})" title="${escapeHtml(dl.del)}" aria-label="${escapeHtml(dl.del)}">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </button>
              </div>
            </div>
          `;
    }).join("")}
      </div>
    `;
  } else if (currentDashTab === "proposals") {
    const filteredProps = myProposals.filter(p => {
      const inc = isProposalIncomingForCurrentUser(p);
      if (currentProposalDirFilter === "incoming") return inc;
      if (currentProposalDirFilter === "outgoing") return !inc;
      return true;
    });
    container.innerHTML = `
      ${kpiRowHtml}
      <div class="hig-ws-panel">
        <div class="hig-ws-panel-head">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <strong style="font-size:15.5px;font-weight:750;color:#0f172a;">${t("dashTabProposals")}</strong>
            <span class="hig-sla-pill">${myProposals.length}</span>
          </div>
          <div class="bo-segmented-control">
            <button type="button" class="bo-seg-btn ${currentProposalDirFilter === "all" ? "active" : ""}" onclick="setProposalDirFilter('all')">${ks.allWord} (${myProposals.length})</button>
            <button type="button" class="bo-seg-btn ${currentProposalDirFilter === "incoming" ? "active" : ""}" onclick="setProposalDirFilter('incoming')">${dl.incoming} (${incCount})</button>
            <button type="button" class="bo-seg-btn ${currentProposalDirFilter === "outgoing" ? "active" : ""}" onclick="setProposalDirFilter('outgoing')">${dl.outgoing} (${outCount})</button>
          </div>
        </div>
        ${filteredProps.length === 0 ? `<div style="padding:28px 20px;text-align:center;background:#f8fafc;border-radius:14px;border:1px solid #e6ebf1;"><p style="color:#64748b;margin:0;">${dl.emptyProps}</p></div>` : filteredProps.map(p => {
      const msgs = ensureProposalMessages(p);
      const isThreadOpen = activeProposalThreadId === p.id;
      const statusLabel = getProposalStatusLabel(p);
      const contact = getProposalPartnerContact(p);
      const cleanWaPhone = String(contact.phone || "").replace(/[^\d]/g, "");
      const isIncoming = isProposalIncomingForCurrentUser(p);
      const partnerDisplay = getProposalPartnerDisplayForCurrentUser(p);
      const dirLabel = isIncoming ? dl.incoming : (p.direction === "Buy Offer" ? t("buyOfferBtn") : dl.outgoing);
      const targetOff = p.offerId ? offers.find(o => o.id === Number(p.offerId)) : null;
      const targetImg = p.targetImage || targetOff?.image || "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=600&q=80";
      const offeredImg = p.offeredImage || "https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=600&q=80";
      return `
            <div class="hig-proposal-card">
              <div class="hig-proposal-top">
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                  <span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:999px;background:${isIncoming ? "#0d8a5e" : "#f1f5f9"};color:${isIncoming ? "#ffffff" : "#334155"};border:1px solid ${isIncoming ? "#0b7a53" : "#e2e8f0"};">
                    ${escapeHtml(dirLabel)}
                  </span>
                  <span style="font-size:13px;font-weight:650;color:#0f172a;">${dl.partner}: ${escapeHtml(partnerDisplay)}</span>
                </div>
                <span class="hig-sla-pill" style="${p.declined ? "background:#fff1f2;color:#be123c;border-color:#fecdd3;" : ""}">
                  ${p.declined ? "✕" : "●"} ${escapeHtml(statusLabel)}
                </span>
              </div>
              <div class="hig-proposal-compare">
                <div class="hig-proposal-side">
                  <img src="${offeredImg}" alt="" />
                  <div style="min-width:0;">
                    <span style="display:block;font-size:10px;font-weight:750;color:#64748b;letter-spacing:0.03em;">${isIncoming ? dl.theyOffer : dl.youOffer}</span>
                    <strong style="display:block;font-size:13.5px;color:#0f172a;line-height:1.3;">${escapeHtml(p.offeredItem)}</strong>
                  </div>
                </div>
                <div class="hig-sla-pill" style="padding:5px 12px;font-size:11.5px;font-weight:750;">
                  ⇄ ${escapeHtml(p.cashBalance)}
                </div>
                <div class="hig-proposal-side" style="cursor:pointer;" onclick="if(${Number(p.offerId) || 0}) openOfferModal(${Number(p.offerId)}, 'details');">
                  <img src="${targetImg}" alt="" />
                  <div style="min-width:0;">
                    <span style="display:block;font-size:10px;font-weight:750;color:#64748b;letter-spacing:0.03em;">${dl.forListing}</span>
                    <strong style="display:block;font-size:13.5px;color:#0f172a;line-height:1.3;text-decoration:underline;text-underline-offset:2px;">${escapeHtml(p.targetTitle)}</strong>
                  </div>
                </div>
              </div>
              ${p.note ? `<p style="margin:8px 0 0;font-size:12.5px;color:#475569;">"${escapeHtml(p.note)}"</p>` : ""}
              <div class="hig-proposal-bottom">
                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                  ${contact.email ? `<a href="mailto:${encodeURIComponent(contact.email)}?subject=${encodeURIComponent("ChangeIt4Me 1:1 Swap: " + p.targetTitle)}" class="hig-ws-outline-pill" style="text-decoration:none;height:30px;min-height:30px !important;font-size:11.5px;">✉ ${escapeHtml(contact.email)}</a>` : ""}
                  ${contact.phone ? `<a href="tel:${encodeURIComponent(contact.phone)}" class="hig-ws-outline-pill" style="text-decoration:none;height:30px;min-height:30px !important;font-size:11.5px;">✆ ${escapeHtml(contact.phone)}</a>` : ""}
                  ${cleanWaPhone.length >= 8 ? `<a href="https://wa.me/${cleanWaPhone}" target="_blank" rel="noopener" class="hig-sla-pill" style="text-decoration:none;padding:4px 11px;">WhatsApp →</a>` : ""}
                </div>
                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                  ${isIncoming && !p.accepted ? `<button type="button" class="hig-ws-emerald-btn" onclick="acceptSwapProposal(${p.id})">✓ ${dl.accept}</button>` : ""}
                  <button type="button" class="${isThreadOpen ? "hig-ws-emerald-btn" : "hig-ws-outline-pill"}" style="cursor:pointer;" onclick="toggleProposalThread(${p.id})">${dl.chat} (${msgs.length})</button>
                  <button type="button" class="hig-ws-outline-pill" style="cursor:pointer;" onclick="openSwapAgreementModal(${p.id})">${dl.contract}</button>
                  <button type="button" class="bo-icon-btn is-danger" onclick="requestDeleteProposal(${p.id})" title="${dl.del}" aria-label="${dl.del}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
              </div>
              ${isThreadOpen ? `
                <div style="margin-top:10px;padding:13px;background:#f8fafc;border:1px solid #e6ebf1;border-radius:14px;">
                  <div style="max-height:160px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;margin-bottom:8px;">
                    ${msgs.map(m => {
                      const isMine = (m.senderEmail && currentUser?.email)
                        ? isSameUserEmailAlias(m.senderEmail, currentUser.email)
                        : (m.sender === "me" && !m.senderEmail);
                      return `
                      <div style="align-self:${isMine ? "flex-end" : "flex-start"};max-width:85%;padding:8px 12px;border-radius:14px;font-size:12.5px;background:${isMine ? "#0d8a5e" : "#ffffff"};color:${isMine ? "#ffffff" : "#0f172a"};border:1px solid ${isMine ? "#0b7a53" : "#e2e8f0"};">
                        <strong style="font-size:10.5px;opacity:0.85;display:block;">${escapeHtml(m.author)} · ${escapeHtml(m.time)}</strong>
                        <span>${escapeHtml(m.text)}</span>
                      </div>
                    `;
                    }).join("")}
                  </div>
                  <div class="wiz-chip-row" style="margin-bottom:8px;">
                    <button type="button" class="hig-ws-outline-pill" style="height:28px;min-height:28px !important;font-size:11.5px;cursor:pointer;" onclick="sendQuickProposalChip(${p.id}, '${dl.chip1.replace(/'/g, "\'")}')">+ ${dl.chip1}</button>
                    <button type="button" class="hig-ws-outline-pill" style="height:28px;min-height:28px !important;font-size:11.5px;cursor:pointer;" onclick="sendQuickProposalChip(${p.id}, '${dl.chip2.replace(/'/g, "\'")}')">+ ${dl.chip2}</button>
                    <button type="button" class="hig-ws-outline-pill" style="height:28px;min-height:28px !important;font-size:11.5px;cursor:pointer;" onclick="sendQuickProposalChip(${p.id}, '${dl.chip3.replace(/'/g, "\'")}')">+ ${dl.chip3}</button>
                  </div>
                  <form onsubmit="sendProposalMessage(event, ${p.id})" style="display:flex;gap:8px;">
                    <input type="text" id="propChatInput_${p.id}" class="input-light" placeholder="${dl.chatPlaceholder}" required style="flex:1;height:38px;font-size:13px;" />
                    <button type="submit" class="hig-ws-emerald-btn" style="height:38px;min-height:38px !important;padding:0 16px;">${dl.sendMsg} →</button>
                  </form>
                </div>
              ` : ""}
            </div>
          `;
    }).join("")}
      </div>
    `;
  } else if (currentDashTab === "favorites") {
    const fc = getFavPriceAlertCopy();
    container.innerHTML = `
      ${kpiRowHtml}
      <div class="hig-ws-panel">
        <div class="hig-ws-panel-head">
          <div style="display:flex;align-items:center;gap:10px;">
            <strong style="font-size:15.5px;font-weight:750;color:#0f172a;">${t("dashTabFavorites")}</strong>
            <span class="hig-sla-pill">${favOffers.length}</span>
          </div>
        </div>
        ${favOffers.length === 0 ? `<div style="padding:28px 20px;text-align:center;background:#f8fafc;border-radius:14px;border:1px solid #e6ebf1;"><p style="color:#64748b;margin:0;">${dl.emptyFav}</p></div>` : favOffers.map(item => {
      const loc = getOfferLocalized(item);
      const prevPriceFormatted = getOfferPreviousPriceFormatted(item, currentCurrency);
      const currPriceFormatted = formatOfferPrice(item, currentCurrency);
      const isPriceDrop = prevPriceFormatted && Number(item.valueEur) < Number(item.previousValueEur);
      const priceAlertBanner = prevPriceFormatted ? `
        <div style="margin-top:6px;padding:6px 10px;border-radius:10px;background:${isPriceDrop ? '#ecfdf5' : '#fefce8'};border:1px solid ${isPriceDrop ? '#a7f3d0' : '#fde68a'};color:${isPriceDrop ? '#065f46' : '#92400e'};font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
          <span>● ${isPriceDrop ? fc.badgeDrop : fc.badgeUpdated}: <del style="opacity:0.75;font-weight:500;">${prevPriceFormatted}</del> → <strong>${currPriceFormatted}</strong></span>
        </div>
      ` : "";
      return `
            <div class="hig-my-listing-card">
              <div class="hig-my-listing-main">
                <img src="${escapeHtml(item.image)}" class="hig-my-listing-thumb" onclick="openOfferModal(${item.id}, 'details')" alt="" />
                <div style="min-width:0;flex:1;">
                  <div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;flex-wrap:wrap;">
                    <strong style="font-size:16px;color:#0f172a;cursor:pointer;" onclick="openOfferModal(${item.id}, 'details')">${escapeHtml(loc.title)}</strong>
                    <strong style="font-size:15.5px;color:#0d8a5e;font-variant-numeric:tabular-nums;">${prevPriceFormatted ? `<del style="font-size:12px;color:#94a3b8;font-weight:500;margin-right:6px;">${prevPriceFormatted}</del>` : ""}${currPriceFormatted}</strong>
                  </div>
                  <span style="display:block;font-size:12.5px;color:#64748b;margin-top:4px;">${PREMIUM_ICONS.pin}${escapeHtml(item.city)}, ${escapeHtml(item.country)} · <strong style="color:#0f172a;">${t("wantBadge")}:</strong> ${escapeHtml(loc.want)}</span>
                  ${priceAlertBanner}
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:6px;">
                <button type="button" class="hig-ws-emerald-btn" onclick="openOfferModal(${item.id}, 'propose')">
                  ⇄ ${t("proposeSwapBtn")}
                </button>
                <button type="button" class="bo-icon-btn is-danger" onclick="toggleFavorite(${item.id}); renderDashboardContent();" title="${dl.del}" aria-label="${dl.del}">✕</button>
              </div>
            </div>
          `;
    }).join("")}
      </div>
    `;
  } else if (currentDashTab === "profile") {
    const u = currentUser || { name: "", email: "", phone: "", country: "Romania", prefLang: currentLang, prefCurrency: currentCurrency };
    const myWatchlist = watchlistAlerts.filter(a => !a.email || !u.email || isSameUserEmailAlias(a.email, u.email));
    const alertsHtml = myWatchlist.length > 0 ? `
      <div style="margin-top:16px;">
        <strong style="display:block;font-size:14px;margin-bottom:8px;color:#0f172a;">${dl.watchlistTitle} (${myWatchlist.length})</strong>
        ${myWatchlist.map(a => `
          <div class="dash-list-item" style="padding:10px 14px;">
            <div>
              <strong>${escapeHtml(a.interest)}</strong>
              <span style="font-size:12px;color:#64748b;display:block;">${escapeHtml(a.country)} · ${escapeHtml(a.email)}</span>
            </div>
            <div style="display:flex;gap:6px;">
              <button type="button" class="hig-ws-emerald-btn" onclick="closeDashboardModal(); executeQuickKeywordSearch('${escapeJsStr(a.interest)}')">${dl.view}</button>
              <button type="button" class="bo-icon-btn is-danger" onclick="requestDeleteWatchlistAlert(${a.id})">✕</button>
            </div>
          </div>
        `).join("")}
      </div>
    ` : "";
    const subCopy = getSubscriptionUiCopy();
    const maxSwaps = remSwaps > 10 ? remSwaps : 10;
    const subCardHtml = `
      <div class="hig-ws-panel" style="margin-bottom:16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px;">
          <strong style="font-size:15px;color:#0f172a;">${subCopy.dashCardTitle}</strong>
          <span class="hig-sla-pill">
            ${isProPlan ? subCopy.statusPro : `${subCopy.statusCredits} ${remSwaps} / ${maxSwaps}`}
          </span>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button type="button" class="hig-ws-emerald-btn" onclick="openSubscriptionModal('pack15')">${subCopy.packBtn} (${formatCurrency(9, currentCurrency)})</button>
          <button type="button" class="hig-ws-outline-pill" style="cursor:pointer;" onclick="openSubscriptionModal('pro')">${subCopy.proBtn} (${formatCurrency(19, currentCurrency)}${subCopy.perMonth})</button>
          <button type="button" class="hig-ws-outline-pill" style="cursor:pointer;color:#64748b;" onclick="simulateZeroFreeSwaps()">${subCopy.dashSimulateZeroBtn}</button>
        </div>
      </div>
    `;
    container.innerHTML = `
      ${kpiRowHtml}
      ${subCardHtml}
      <form onsubmit="saveDashboardProfile(event)" class="hig-ws-panel">
        <div class="form-grid-2">
          <div class="field-group">
            <label style="color:#0f172a;font-weight:700;">${t("formFullName")}</label>
            <input type="text" name="name" class="input-light" required value="${escapeHtml(u.name || "")}" />
          </div>
          <div class="field-group">
            <label style="color:#0f172a;font-weight:700;">${t("formEmail")}</label>
            <input type="email" class="input-light" value="${escapeHtml(u.email || "")}" disabled />
          </div>
        </div>
        <div class="form-grid-2">
          <div class="field-group">
            <label style="color:#0f172a;font-weight:700;">${t("formPhone")}</label>
            <input type="tel" name="phone" class="input-light" value="${escapeHtml(u.phone || "")}" placeholder="+40 / +49 / +43..." />
          </div>
          <div class="field-group">
            <label style="color:#0f172a;font-weight:700;">${t("formCountry")}</label>
            <select name="country" class="input-light">
              ${Object.keys(COUNTRY_COORDS).map(cName => `<option value="${cName}" ${u.country === cName ? "selected" : ""}>${getLocalizedCountryName(cName)}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="form-grid-2">
          <div class="field-group">
            <label style="color:#0f172a;font-weight:700;">${t("formPrefLang")}</label>
            <select name="prefLang" class="input-light">
              ${(window.LANGUAGES || []).map(l => `<option value="${l.code}" ${currentLang === l.code ? "selected" : ""}>${l.label || l.name}</option>`).join("")}
            </select>
          </div>
          <div class="field-group">
            <label style="color:#0f172a;font-weight:700;">${t("formPrefCurrency")}</label>
            <select name="prefCurrency" class="input-light">
              ${(window.CURRENCIES || []).map(c => `<option value="${c.code}" ${currentCurrency === c.code ? "selected" : ""}>${c.code} (${c.symbol})</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="field-group" style="margin-bottom:0;">
          <label style="color:#0f172a;font-weight:700;">${t("formPassword")} (${{ro:"opțional — lasă gol pentru a păstra parola actuală",en:"optional — leave blank to keep current password",de:"optional — leer lassen, um aktuelles Passwort zu behalten",fr:"optionnel — laisser vide pour conserver le mot de passe actuel",it:"opzionale — lascia vuoto per mantenere la password attuale",es:"opcional — dejar vacío para mantener la contraseña actual",ru:"необязательно — оставьте пустым, чтобы сохранить текущий пароль"}[currentLang] || "optional"})</label>
          <input type="password" name="newPassword" class="input-light" minlength="6" placeholder="••••••••" autocomplete="new-password" />
        </div>
        <button type="submit" class="hig-ws-emerald-btn" style="margin-top:16px;width:100%;height:42px !important;justify-content:center;font-size:13.5px;">
          ✓ ${dl.saveBtn}
        </button>
      </form>
      ${alertsHtml}
      <div class="hig-ws-panel" style="margin-top:16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
          <strong style="font-size:14.5px;color:#0f172a;">${getGdprUiCopy().rightsTitle}</strong>
          <span class="hig-sla-pill">EU Reg. 2016/679</span>
        </div>
        <p style="margin:0 0 12px;font-size:12.5px;color:#64748b;line-height:1.45;">${getGdprUiCopy().rightsSub}</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button type="button" class="hig-ws-outline-pill" style="cursor:pointer;" onclick="openGdprPreferencesModal()">${getGdprUiCopy().consentPrefsBtn}</button>
          <button type="button" class="hig-ws-emerald-btn" onclick="exportUserGdprData()">↓ ${getGdprUiCopy().exportBtn}</button>
          <button type="button" class="hig-ws-outline-pill" style="cursor:pointer;color:#e11d48;border-color:#fecdd3;" onclick="requestDeleteGdprAccount()">✕ ${getGdprUiCopy().deleteAccBtn}</button>
        </div>
      </div>
    `;
  }
}
function openGuideModal(guideKey) {
  const g = window.GUIDES_DATA[guideKey];
  if (!g) return;
  const title = g.title[currentLang] || g.title.en;
  const lines = Array.isArray(g.items)
    ? g.items
    : (g.items && (g.items[currentLang] || g.items.en)) || [];
  const badgeMap = {
    ro: "Ghid & Regulament Oficial ChangeIt4Me",
    en: "ChangeIt4Me Official Guide & Checklist",
    de: "Offizieller ChangeIt4Me Leitfaden",
    fr: "Guide Officiel ChangeIt4Me",
    it: "Guida Ufficiale ChangeIt4Me",
    es: "Guía Oficial ChangeIt4Me",
    ru: "Официальное руководство ChangeIt4Me"
  };
  const content = document.getElementById("guideModalContent");
  content.innerHTML = `
    <button type="button" class="modal-close" style="color:var(--ink);" onclick="closeGuideModal()">✕</button>
    <span style="background:#0d8a5e;color:#ffffff;padding:4px 12px;border-radius:999px;font-size:12px;font-weight:700;">${badgeMap[currentLang] || badgeMap.en}</span>
    <h2 style="font-size:26px;margin:12px 0 18px;">${title}</h2>
    <ul class="checks" style="margin-bottom:22px;">
      ${lines.map(line => `
        <li>
          <svg width="20" height="20" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="9" fill="#eaf7f1"/><path d="M5 9.2 7.6 12 13 6.5" stroke="#0d8a5e" stroke-width="1.7" stroke-linecap="round"/></svg>
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
  if (hasAnyOpenModalBackdrop()) {
    document.body.classList.add("modal-open");
  } else {
    document.body.classList.remove("modal-open");
  }
}
function handleWatchlistSubmit(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const interest = String(fd.get("interest") || "").trim();
  const country = String(fd.get("country") || "Europe").trim();
  const email = String(fd.get("email") || (currentUser ? currentUser.email : "")).trim();
  if (email && !isValidRealEmail(email)) {
    showToast(getAuthMsg().invalidEmail);
    return;
  }
  if (interest) {
    watchlistAlerts.unshift({
      id: Date.now(),
      interest,
      country,
      email
    });
    saveWatchlistAlerts();
  }
  const wlMsgMap = {
    ro: `✓ Alertă Watchlist activată pentru „${interest}” în ${country}!`,
    en: `✓ Watchlist alert activated for "${interest}" in ${country}!`,
    de: `✓ Suchauftrag aktiviert für „${interest}“ in ${country}!`,
    fr: `✓ Alerte activée pour « ${interest} » (${country}) !`,
    it: `✓ Avviso attivato per "${interest}" in ${country}!`,
    es: `✓ ¡Alerta activada para "${interest}" en ${country}!`,
    ru: `✓ Уведомление активировано для «${interest}» (${country})!`
  };
  const msg = wlMsgMap[currentLang] || wlMsgMap.en;
  const note = document.getElementById("watchlistNote");
  if (note) {
    note.textContent = msg;
  }
  showToast(msg);
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
  box.innerHTML += `<div class="chat-bubble user">${escapeHtml(text)}</div>`;
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
            <div style="font-weight:700;font-size:12.5px;color:var(--forest);">${escapeHtml(loc.title)}</div>
            <div style="font-size:11.5px;color:var(--muted);">${escapeHtml(item.city)} · ~${formatOfferPrice(item, currentCurrency)} ${isAi ? `· <span style="color:#0a5c46;font-weight:700;">${escapeHtml(reason || cr.aiTag)}</span>` : ""}</div>
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
let lastUndoSnapshot = null;
function showToast(message, undoOption = null) {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const el = document.createElement("div");
  el.className = "toast";
  const span = document.createElement("span");
  span.textContent = message;
  el.appendChild(span);
  if (undoOption && typeof undoOption.onUndo === "function") {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "toast-undo-btn";
    btn.textContent = undoOption.label || (currentLang === "ro" ? "↺ Anulează" : "↺ Undo");
    btn.onclick = () => {
      undoOption.onUndo();
      el.remove();
    };
    el.appendChild(btn);
  }
  container.appendChild(el);
  setTimeout(() => {
    el.remove();
  }, undoOption ? 6500 : 4200);
}
let pendingAppleConfirmCallback = null;
function closeAppleSheetModal() {
  const modal = document.getElementById("appleSheetModal");
  if (modal) modal.classList.remove("open");
  pendingAppleConfirmCallback = null;
  const anyOtherOpen = ["adminModal", "offerModal", "wizardModal", "dashboardModal", "guideModal", "authModal"]
    .some(id => document.getElementById(id)?.classList.contains("open"));
  if (!anyOtherOpen) {
    document.body.classList.remove("modal-open");
  }
}
function executeAppleConfirmSheetAction() {
  const fn = pendingAppleConfirmCallback;
  closeAppleSheetModal();
  if (typeof fn === "function") fn();
}
function openAppleDestructiveConfirmSheet({ title, subtitle, confirmLabel, cancelLabel, onConfirm }) {
  const modal = document.getElementById("appleSheetModal");
  const card = document.getElementById("appleSheetCard");
  const content = document.getElementById("appleSheetContent");
  if (!modal || !content) {
    if (typeof onConfirm === "function") onConfirm();
    return;
  }
  if (card) card.classList.add("hig-alert-mode");
  pendingAppleConfirmCallback = onConfirm;
  const defCancel = cancelLabel || (currentLang === "ro" ? "Anulează" : "Cancel");
  const defConfirm = confirmLabel || (currentLang === "ro" ? "Șterge" : "Delete");
  content.innerHTML = `
    <div style="text-align:center;padding:4px 4px 8px;">
      <div style="width:44px;height:44px;border-radius:50%;background:#ffe4e6;color:#e11d48;display:inline-flex;align-items:center;justify-content:center;font-weight:900;font-size:20px;margin-bottom:10px;">!</div>
      <h3 style="margin:0 0 8px;font-size:18px;font-weight:800;color:#071d1a;">${title}</h3>
      <p style="margin:0 0 18px;font-size:13.5px;color:#475569;line-height:1.45;">${subtitle || ""}</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <button type="button" class="hig-btn-cancel" style="height:44px;" onclick="closeAppleSheetModal()">${defCancel}</button>
        <button type="button" class="hig-btn-destructive" style="height:44px;" onclick="executeAppleConfirmSheetAction()">${defConfirm}</button>
      </div>
    </div>
  `;
  modal.classList.add("open");
  document.body.classList.add("modal-open");
}
function requestDeleteListing(offerId) {
  const item = offers.find(o => o.id === Number(offerId));
  if (!item) return;
  if (!canCurrentUserManageListing(item)) {
    showToast(currentLang === "ro" ? "! Doar proprietarul anunțului poate șterge acest anunț." : "! Only the listing owner can delete this listing.");
    return;
  }
  const loc = getOfferLocalized(item);
  const snapshot = { ...item };
  const isRo = currentLang === "ro";
  openAppleDestructiveConfirmSheet({
    title: isRo ? `Ștergi anunțul #${item.id}?` : `Delete Listing #${item.id}?`,
    subtitle: isRo
      ? `Anunțul „${loc.title}” (${item.city}, ${item.country}) va fi eliminat din catalog. Poți anula acțiunea imediat după ștergere.`
      : `"${loc.title}" (${item.city}, ${item.country}) will be removed from the active catalog. You can undo this action immediately after.`,
    confirmLabel: isRo ? "Șterge Anunțul" : "Delete Listing",
    cancelLabel: isRo ? "Anulează" : "Cancel",
    onConfirm: () => {
      deleteUserListing(item.id, true);
      if (document.getElementById("offerModal")?.classList.contains("open") && currentOpenOfferId === item.id) {
        closeOfferModal();
      }
      if (document.getElementById("adminModal")?.classList.contains("open")) {
        renderAdminModalContent();
      }
      showToast(isRo ? `✓ Anunțul #${snapshot.id} a fost șters` : `✓ Listing #${snapshot.id} deleted`, {
        label: isRo ? "↺ Anulează" : "↺ Undo",
        onUndo: () => {
          deletedOfferIds = deletedOfferIds.filter(id => id !== snapshot.id);
          if (!offers.some(o => o.id === snapshot.id)) {
            offers.unshift(snapshot);
          }
          saveOffersToStorage();
          renderOffers();
          renderMapPinsAndPanel();
          if (document.getElementById("dashboardModal")?.classList.contains("open")) renderDashboardContent();
          if (document.getElementById("adminModal")?.classList.contains("open")) renderAdminModalContent();
          showToast(isRo ? `✓ Anunțul „${loc.title}” a fost restaurat` : `✓ Listing "${loc.title}" restored`);
        }
      });
    }
  });
}
function requestAdminDeleteAccount(emailKey) {
  if (!adminAuthenticated) return;
  const k = String(emailKey || "").toLowerCase();
  const acc = accountsDb[k];
  if (!acc || k === BACKOFFICE_ADMIN_EMAIL) return;
  const snapshot = { ...acc };
  openAppleDestructiveConfirmSheet({
    title: `Delete User Account?`,
    subtitle: `Remove "${acc.name}" (${acc.email}) from the registered accounts database? You can undo this immediately from the notification banner.`,
    confirmLabel: "Delete Account",
    cancelLabel: "Cancel",
    onConfirm: () => {
      adminDeleteAccount(k, true);
      showToast(`✓ Account removed: ${snapshot.name}`, {
        label: "↺ Undo",
        onUndo: () => {
          accountsDb[k] = snapshot;
          saveAccountsDb();
          if (typeof scheduleCloudSyncPush === "function") {
            scheduleCloudSyncPush({ accounts: { [k]: snapshot }, forceRestoreAccount: true });
          }
          if (document.getElementById("adminModal")?.classList.contains("open")) renderAdminModalContent();
          showToast(`✓ Restored account: ${snapshot.name}`);
        }
      });
    }
  });
}
function requestDeleteProposal(propId) {
  const p = swapProposals.find(x => x.id === Number(propId));
  if (!p || !canCurrentUserAccessProposal(p)) return;
  const snapshot = { ...p };
  const isRo = currentLang === "ro";
  openAppleDestructiveConfirmSheet({
    title: isRo ? "Ștergi propunerea de schimb?" : "Remove Swap Proposal?",
    subtitle: `${p.offeredItem} ⇄ ${p.targetTitle} (${p.partner})`,
    confirmLabel: isRo ? "Șterge Propunerea" : "Remove Proposal",
    cancelLabel: isRo ? "Anulează" : "Cancel",
    onConfirm: () => {
      deleteSwapProposal(p.id);
      if (document.getElementById("adminModal")?.classList.contains("open")) renderAdminModalContent();
      showToast(isRo ? "✓ Propunerea a fost ștearsă" : "✓ Swap proposal removed", {
        label: isRo ? "↺ Anulează" : "↺ Undo",
        onUndo: () => {
          swapProposals.unshift(snapshot);
          swapProposals = normalizeSeedProposals(swapProposals);
      localStorage.setItem("ci4m_proposals", JSON.stringify(swapProposals));
          updateFavCountUI();
          if (document.getElementById("dashboardModal")?.classList.contains("open")) renderDashboardContent();
          if (document.getElementById("adminModal")?.classList.contains("open")) renderAdminModalContent();
          showToast(isRo ? "✓ Propunerea a fost restaurată" : "✓ Swap proposal restored");
        }
      });
    }
  });
}
function requestDeleteWatchlistAlert(alertId) {
  const a = watchlistAlerts.find(x => x.id === Number(alertId));
  if (!a) return;
  const snapshot = { ...a };
  const isRo = currentLang === "ro";
  openAppleDestructiveConfirmSheet({
    title: isRo ? "Ștergi alerta Watchlist?" : "Remove Watchlist Alert?",
    subtitle: `${a.interest} (${a.country} · ${a.email})`,
    confirmLabel: isRo ? "Șterge Alerta" : "Remove Alert",
    cancelLabel: isRo ? "Anulează" : "Cancel",
    onConfirm: () => {
      deleteWatchlistAlert(a.id);
      showToast(isRo ? "✓ Alerta Watchlist a fost ștearsă" : "✓ Watchlist alert removed", {
        label: isRo ? "↺ Anulează" : "↺ Undo",
        onUndo: () => {
          watchlistAlerts.unshift(snapshot);
          saveWatchlistAlerts();
          if (document.getElementById("dashboardModal")?.classList.contains("open")) renderDashboardContent();
          showToast(isRo ? "✓ Alerta Watchlist a fost restaurată" : "✓ Watchlist alert restored");
        }
      });
    }
  });
}
function requestDeleteGdprAccount() {
  const isRo = currentLang === "ro";
  openAppleDestructiveConfirmSheet({
    title: isRo ? "Ștergi definitiv contul și datele (GDPR Art. 17)?" : "Erase Account & Personal Data (GDPR Art. 17)?",
    subtitle: isRo
      ? "Toate datele profilului tău, anunțurile publicate și propunerile asociate vor fi șterse conform Dreptului la Ștergere (Art. 17 GDPR)."
      : "Your profile, published listings, and swap proposals will be permanently erased in compliance with GDPR Art. 17 (Right to Erasure).",
    confirmLabel: isRo ? "Șterge Contul" : "Erase Account",
    cancelLabel: isRo ? "Anulează" : "Cancel",
    onConfirm: () => {
      deleteUserGdprAccount();
    }
  });
}
function openQuickEditListingSheet(offerId) {
  const item = offers.find(o => o.id === Number(offerId));
  if (!item) return;
  if (!canCurrentUserManageListing(item)) {
    showToast(currentLang === "ro" ? "! Doar proprietarul anunțului poate edita acest anunț." : "! Only the listing owner can edit this listing.");
    return;
  }
  const loc = getOfferLocalized(item);
  const modal = document.getElementById("appleSheetModal");
  const card = document.getElementById("appleSheetCard");
  const content = document.getElementById("appleSheetContent");
  if (!modal || !content) {
    editListingInWizard(offerId);
    return;
  }
  if (card) card.classList.remove("hig-alert-mode");
  const activeCurr = item.originalCurrency || currentCurrency || "EUR";
  const displayAmt = item.originalAmount || getOfferValueInCurrency(item, activeCurr);
  const cats = ["cars", "real-estate", "electronics", "home-garden", "auto-parts", "clothing"];
  const isBoOpen = Boolean(adminAuthenticated && document.getElementById("adminModal")?.classList.contains("open"));
  const qeLang = isBoOpen ? "en" : currentLang;
  const qeCopyMap = {
    ro: { cancel: "Anulează", editTitle: `Editează Anunțul #${item.id}`, save: "Salvează", titleHave: "Titlu (Ce oferi)", cat: "Categorie", val: "Valoare Estimată", curr: "Monedă", deal: "Tip Tranzacție", want: "Ce dorești la schimb", city: "Oraș", country: "Țară", specs: "Specificații & Detalii cheie", desc: "Descriere", photo: "Fotografie principală (Încarcă sau URL)", upload: "Încarcă…", ownerName: "Nume Proprietar", ownerEmail: "Email Proprietar", delBtn: "Șterge Anunțul…", wizBtn: "Deschide în 7-Step Wizard…" },
    en: { cancel: "Cancel", editTitle: `Edit Listing #${item.id}`, save: "Save Changes", titleHave: "Title (What You Have)", cat: "Category", val: "Estimated Value", curr: "Currency", deal: "Deal Type", want: "What You Want in Return", city: "City", country: "Country", specs: "Specifications & Highlights", desc: "Description", photo: "Cover Photo (Upload or URL)", upload: "Upload…", ownerName: "Owner Name", ownerEmail: "Owner Email", delBtn: "Delete Listing…", wizBtn: "7-Step Wizard…" },
    de: { cancel: "Abbrechen", editTitle: `Inserat #${item.id} bearbeiten`, save: "Speichern", titleHave: "Titel (Was Sie bieten)", cat: "Kategorie", val: "Geschätzter Wert", curr: "Währung", deal: "Tauschart", want: "Was Sie im Tausch suchen", city: "Stadt", country: "Land", specs: "Technische Daten & Merkmale", desc: "Beschreibung", photo: "Titelbild (Hochladen oder URL)", upload: "Hochladen…", ownerName: "Name des Eigentümers", ownerEmail: "E-Mail des Eigentümers", delBtn: "Inserat löschen…", wizBtn: "7-Schritte-Assistent…" },
    fr: { cancel: "Annuler", editTitle: `Modifier l'annonce #${item.id}`, save: "Enregistrer", titleHave: "Titre (Ce que vous offrez)", cat: "Catégorie", val: "Valeur estimée", curr: "Devise", deal: "Type d'échange", want: "Ce que vous souhaitez en échange", city: "Ville", country: "Pays", specs: "Caractéristiques & points forts", desc: "Description", photo: "Photo principale (Téléverser ou URL)", upload: "Téléverser…", ownerName: "Nom du propriétaire", ownerEmail: "E-mail du propriétaire", delBtn: "Supprimer l'annonce…", wizBtn: "Assistant 7 étapes…" },
    it: { cancel: "Annulla", editTitle: `Modifica annuncio #${item.id}`, save: "Salva modifiche", titleHave: "Titolo (Cosa offri)", cat: "Categoria", val: "Valore stimato", curr: "Valuta", deal: "Tipo di scambio", want: "Cosa cerchi in cambio", city: "Città", country: "Paese", specs: "Specifiche e dettagli principali", desc: "Descrizione", photo: "Foto principale (Carica o URL)", upload: "Carica…", ownerName: "Nome proprietario", ownerEmail: "Email proprietario", delBtn: "Elimina annuncio…", wizBtn: "Procedura in 7 passi…" },
    es: { cancel: "Cancelar", editTitle: `Editar anuncio #${item.id}`, save: "Guardar cambios", titleHave: "Título (Lo que ofreces)", cat: "Categoría", val: "Valor estimado", curr: "Moneda", deal: "Tipo de trato", want: "Lo que buscas a cambio", city: "Ciudad", country: "País", specs: "Especificaciones y detalles", desc: "Descripción", photo: "Foto principal (Subir o URL)", upload: "Subir…", ownerName: "Nombre del propietario", ownerEmail: "Correo del propietario", delBtn: "Eliminar anuncio…", wizBtn: "Asistente de 7 pasos…" },
    ru: { cancel: "Отмена", editTitle: `Изменить объявление #${item.id}`, save: "Сохранить", titleHave: "Название (Что вы предлагаете)", cat: "Категория", val: "Оценочная стоимость", curr: "Валюта", deal: "Тип сделки", want: "Что вы ищете взамен", city: "Город", country: "Страна", specs: "Характеристики и детали", desc: "Описание", photo: "Главное фото (Загрузить или URL)", upload: "Загрузить…", ownerName: "Имя владельца", ownerEmail: "Email владельца", delBtn: "Удалить объявление…", wizBtn: "Мастер из 7 шагов…" }
  };
  const qc = qeCopyMap[qeLang] || qeCopyMap.en;
  content.innerHTML = `
    <form onsubmit="handleQuickEditListingSubmit(event, ${item.id})">
      <div class="hig-sheet-toolbar">
        <button type="button" class="hig-btn-cancel" onclick="closeAppleSheetModal()">${qc.cancel}</button>
        <h3 class="hig-sheet-title">${qc.editTitle}</h3>
        <button type="submit" class="hig-btn-save">${qc.save}</button>
      </div>
      <div style="display:grid;gap:12px;">
        <div>
          <label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:4px;">${qc.titleHave}</label>
          <input type="text" name="title" required value="${escapeHtml(item.title || loc.title || "")}" class="input-light" style="height:40px;font-size:13.5px;" />
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;">
          <div>
            <label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:4px;">${qc.cat}</label>
            <select name="category" class="input-light" style="height:40px;font-size:13px;">
              ${cats.map(cat => `<option value="${cat}" ${item.category === cat ? 'selected' : ''}>${getCategoryLabel(cat)}</option>`).join("")}
            </select>
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:4px;">${qc.val}</label>
            <input type="text" inputmode="decimal" name="amount" required value="${displayAmt}" class="input-light" style="height:40px;font-size:13.5px;" />
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:4px;">${qc.curr}</label>
            <select name="currency" class="input-light" style="height:40px;font-size:13px;">
              ${(window.CURRENCIES || []).map(c => `<option value="${c.code}" ${c.code === activeCurr ? 'selected' : ''}>${c.code} (${c.symbol})</option>`).join("")}
            </select>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;">
          <div>
            <label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:4px;">${qc.deal}</label>
            <select name="dealType" class="input-light" style="height:40px;font-size:13px;">
              <option value="1to1" ${item.dealType === '1to1' ? 'selected' : ''}>${t("deal1to1")}</option>
              <option value="cash" ${item.dealType === 'cash' ? 'selected' : ''}>${t("dealCashAdd")}</option>
              <option value="either" ${item.dealType === 'either' ? 'selected' : ''}>${t("dealSwapOrSale")}</option>
              <option value="sale" ${item.dealType === 'sale' ? 'selected' : ''}>${t("dealSaleOnly")}</option>
            </select>
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:4px;">${qc.want}</label>
            <input type="text" name="want" required value="${escapeHtml(item.want || loc.want || "")}" class="input-light" style="height:40px;font-size:13.5px;" />
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div>
            <label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:4px;">${qc.city}</label>
            <input type="text" name="city" required value="${escapeHtml(item.city || "Bucharest")}" class="input-light" style="height:40px;font-size:13.5px;" />
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:4px;">${qc.country}</label>
            <select name="country" class="input-light" style="height:40px;font-size:13px;">
              ${Object.keys(COUNTRY_COORDS).map(cnt => `<option value="${cnt}" ${item.country === cnt ? 'selected' : ''}>${getLocalizedCountryName(cnt)}</option>`).join("")}
            </select>
          </div>
        </div>
        <div>
          <label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:4px;">${qc.specs}</label>
          <input type="text" name="specs" value="${escapeHtml(item.specs || "")}" class="input-light" style="height:40px;font-size:13px;" />
        </div>
        <div>
          <label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:4px;">${qc.desc}</label>
          <textarea name="desc" rows="2" class="input-light" style="font-size:13px;">${escapeHtml(item.desc || loc.desc || "")}</textarea>
        </div>
        <div>
          <label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:4px;">${qc.photo}</label>
          <div style="display:flex;gap:8px;align-items:center;">
            <img id="quickEditPhotoThumb" src="${escapeHtml(item.image || "")}" style="width:40px;height:40px;border-radius:10px;object-fit:cover;border:1px solid #cbd5e1;flex-shrink:0;" alt="" />
            <input type="text" id="quickEditPhotoInput" name="image" value="${escapeHtml(item.image || "")}" class="input-light" style="height:40px;font-size:12.5px;flex:1;" oninput="const th=document.getElementById('quickEditPhotoThumb');if(th&&this.value)th.src=this.value;" />
            <label class="hig-btn-cancel" style="height:40px;display:inline-flex;align-items:center;padding:0 14px;font-size:12px;white-space:nowrap;cursor:pointer;margin:0;">
              ${qc.upload}
              <input type="file" accept="image/*" style="display:none;" onchange="handleQuickEditPhotoUpload(event)" />
            </label>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div>
            <label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:4px;">${qc.ownerName}</label>
            <input type="text" name="owner" value="${escapeHtml(item.owner || "")}" class="input-light" style="height:40px;font-size:13px;" />
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:4px;">${qc.ownerEmail}</label>
            <input type="email" name="ownerEmail" value="${escapeHtml(item.ownerEmail || currentUser?.email || "")}" ${isBoOpen ? "" : "readonly disabled"} class="input-light" style="height:40px;font-size:13px;${isBoOpen ? "" : "opacity:0.72;cursor:not-allowed;"}" />
          </div>
        </div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:18px;padding-top:14px;border-top:1px solid rgba(12,44,40,0.12);flex-wrap:wrap;">
        <button type="button" class="hig-btn-destructive-outline" onclick="closeAppleSheetModal(); requestDeleteListing(${item.id});">${qc.delBtn}</button>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button type="button" class="hig-btn-cancel" onclick="closeAppleSheetModal(); editListingInWizard(${item.id});">${qc.wizBtn}</button>
        </div>
      </div>
    </form>
  `;
  modal.classList.add("open");
  document.body.classList.add("modal-open");
}
function handleQuickEditPhotoUpload(e) {
  const file = e?.target?.files?.[0];
  if (!file) return;
  compressAndUploadPhotoFile(file, (finalUrl) => {
    if (!finalUrl) return;
    const inp = document.getElementById("quickEditPhotoInput");
    const thumb = document.getElementById("quickEditPhotoThumb");
    if (inp) inp.value = finalUrl;
    if (thumb) thumb.src = finalUrl;
  });
}
function exportFullBackofficeBackupJson() {
  if (!adminAuthenticated) return;
  const backup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    accounts: accountsDb,
    userOffers: offers.filter(o => o.createdByUser || o.id > 100000 || o.editedByUser),
    proposals: swapProposals,
    watchlist: watchlistAlerts,
    deletedOfferIds
  };
  try {
    const jsonStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `changeit4me-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL && URL.revokeObjectURL(url), 1000);
  } catch (err) { }
  showToast("✓ Full Database Backup (.json) downloaded!");
}
function importFullBackofficeBackupJson(e) {
  if (!adminAuthenticated) return;
  const file = e?.target?.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(String(ev?.target?.result || "{}"));
      applyMergedCloudState(data);
      pushCloudDatabaseSync({ forceSync: true });
      renderAdminModalContent();
      showToast("✓ Database Backup restored & synced to Cloud!");
    } catch (err) {
      showToast("! Invalid JSON backup file.");
    }
  };
  reader.readAsText(file);
}
function handleQuickEditListingSubmit(e, offerId) {
  e.preventDefault();
  const item = offers.find(o => o.id === Number(offerId));
  if (!item) return;
  if (!canCurrentUserManageListing(item)) {
    showToast(currentLang === "ro" ? "! Doar proprietarul anunțului poate edita acest anunț." : "! Only the listing owner can edit this listing.");
    return;
  }
  const fd = new FormData(e.target);
  const title = String(fd.get("title") || item.title).trim();
  const category = String(fd.get("category") || item.category);
  const rawAmt = sanitizeNumericAmount(fd.get("amount"), item.valueEur || 15000);
  const curr = String(fd.get("currency") || item.originalCurrency || currentCurrency).toUpperCase();
  const valueEur = convertToEur(rawAmt, curr);
  const dealType = String(fd.get("dealType") || item.dealType || "1to1");
  const want = String(fd.get("want") || item.want).trim();
  const city = String(fd.get("city") || item.city).trim();
  const country = String(fd.get("country") || item.country).trim();
  const specs = String(fd.get("specs") || item.specs).trim();
  const desc = String(fd.get("desc") || item.desc).trim();
  const imgUrl = String(fd.get("image") || item.image).trim();
  const isBackofficeOpen = Boolean(adminAuthenticated && document.getElementById("adminModal")?.classList.contains("open"));
  const owner = String(fd.get("owner") || item.owner).trim();
  const ownerEmail = isBackofficeOpen
    ? String(fd.get("ownerEmail") || item.ownerEmail || "").trim()
    : String(item.ownerEmail || currentUser?.email || "").trim();
  const prevValueEur = item.valueEur;
  const prevOrigAmt = item.originalAmount;
  const prevOrigCurr = item.originalCurrency;
  const parsedLoc = parseSmartLocationString(`${city}, ${country}`);
  Object.assign(item, {
    title,
    category,
    originalAmount: rawAmt,
    originalCurrency: curr,
    valueEur,
    dealType,
    want,
    city,
    country,
    lat: parsedLoc.lat || item.lat,
    lng: parsedLoc.lng || item.lng,
    specs,
    desc,
    image: imgUrl || item.image,
    images: imgUrl ? [imgUrl, ...(Array.isArray(item.images) ? item.images.filter(u => u !== imgUrl) : [])] : item.images,
    owner,
    ownerEmail,
    createdByUser: true,
    i18n: undefined
  });
  const notifiedFavCount = recordListingPriceChangeAndNotifyFavorites(
    item, prevValueEur, prevOrigAmt, prevOrigCurr, valueEur, rawAmt, curr
  );
  saveOffersToStorage();
  closeAppleSheetModal();
  renderOffers();
  renderMapPinsAndPanel();
  if (document.getElementById("offerModal")?.classList.contains("open") && currentOpenOfferId === item.id) {
    openOfferModal(item.id, "details");
  }
  if (document.getElementById("dashboardModal")?.classList.contains("open")) {
    renderDashboardContent();
  }
  if (document.getElementById("adminModal")?.classList.contains("open")) {
    renderAdminModalContent();
  }
  showToast(notifiedFavCount > 0 ? getFavPriceAlertCopy().ownerNotifiedToast(notifiedFavCount) : getWizValidationCopy().savedToast);
}
function openAdminEditUserSheet(emailKey) {
  if (!adminAuthenticated) return;
  const k = String(emailKey || "").toLowerCase();
  const acc = accountsDb[k];
  if (!acc) return;
  const modal = document.getElementById("appleSheetModal");
  const card = document.getElementById("appleSheetCard");
  const content = document.getElementById("appleSheetContent");
  if (!modal || !content) return;
  if (card) card.classList.remove("hig-alert-mode");
  content.innerHTML = `
    <form onsubmit="handleAdminEditUserSubmit(event, '${k.replace(/'/g, "\\'")}')">
      <div class="hig-sheet-toolbar">
        <button type="button" class="hig-btn-cancel" onclick="closeAppleSheetModal()">Cancel</button>
        <h3 class="hig-sheet-title">Edit Account · ${escapeHtml(acc.name || k)}</h3>
        <button type="submit" class="hig-btn-save">Save Changes</button>
      </div>
      <div style="display:grid;gap:12px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div>
            <label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:4px;">Full Name</label>
            <input type="text" name="name" required value="${escapeHtml(acc.name || "")}" class="input-light" style="height:40px;font-size:13.5px;" />
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:4px;">Email Address</label>
            <input type="email" value="${escapeHtml(acc.email || k)}" disabled class="input-light" style="height:40px;font-size:13.5px;opacity:0.75;" />
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;">
          <div>
            <label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:4px;">Phone Number</label>
            <input type="tel" name="phone" value="${escapeHtml(acc.phone || "")}" class="input-light" style="height:40px;font-size:13.5px;" />
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:4px;">City</label>
            <input type="text" name="city" value="${escapeHtml(acc.city || "Bucharest")}" class="input-light" style="height:40px;font-size:13.5px;" />
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:4px;">Country</label>
            <select name="country" class="input-light" style="height:40px;font-size:13px;">
              ${Object.keys(COUNTRY_COORDS).map(cnt => `<option value="${cnt}" ${(acc.country || "Romania") === cnt ? 'selected' : ''}>${cnt}</option>`).join("")}
            </select>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div>
            <label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:4px;">Subscription Plan</label>
            <select name="plan" class="input-light" style="height:40px;font-size:13.5px;">
              <option value="starter" ${(!acc.plan || acc.plan === 'starter') ? 'selected' : ''}>Starter (10 Free Swaps)</option>
              <option value="pack" ${acc.plan === 'pack' ? 'selected' : ''}>+15 Swaps Pack (€9)</option>
              <option value="pro" ${acc.plan === 'pro' ? 'selected' : ''}>PRO Unlimited (€19)</option>
            </select>
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:700;color:#334155;margin-bottom:4px;">Available Swap Credits</label>
            <input type="number" name="freeSwaps" min="0" max="9999" value="${acc.freeSwaps ?? 10}" class="input-light" style="height:40px;font-size:13.5px;" />
          </div>
        </div>
      </div>
      ${acc.role !== "superadmin" ? `
        <div style="display:flex;align-items:center;justify-content:flex-start;gap:10px;margin-top:18px;padding-top:14px;border-top:1px solid rgba(12,44,40,0.12);">
          <button type="button" class="hig-btn-destructive-outline" onclick="closeAppleSheetModal(); requestAdminDeleteAccount('${k.replace(/'/g, "\\'")}');">Delete Account…</button>
        </div>
      ` : ""}
    </form>
  `;
  modal.classList.add("open");
  document.body.classList.add("modal-open");
}
function handleAdminEditUserSubmit(e, emailKey) {
  if (!adminAuthenticated) return;
  e.preventDefault();
  const k = String(emailKey || "").toLowerCase();
  const acc = accountsDb[k];
  if (!acc) return;
  const fd = new FormData(e.target);
  acc.name = String(fd.get("name") || acc.name).trim();
  acc.phone = String(fd.get("phone") || acc.phone || "").trim();
  acc.city = String(fd.get("city") || acc.city || "Bucharest").trim();
  acc.country = String(fd.get("country") || acc.country || "Romania").trim();
  acc.plan = String(fd.get("plan") || acc.plan || "starter");
  const enteredCredits = Number(fd.get("freeSwaps"));
  acc.freeSwaps = acc.plan === "pro" ? 999 : (Number.isFinite(enteredCredits) ? enteredCredits : 10);
  if (currentUser && String(currentUser.email || "").toLowerCase() === k) {
    Object.assign(currentUser, acc);
    localStorage.setItem("ci4m_user", JSON.stringify(currentUser));
    renderUserHeaderState();
  }
  saveAccountsDb();
  closeAppleSheetModal();
  if (document.getElementById("adminModal")?.classList.contains("open")) {
    renderAdminModalContent();
  }
  showToast(`✓ Saved changes for ${acc.name}`);
}
const BACKOFFICE_ADMIN_EMAIL = "jeka7ro@mail.com";
const BACKOFFICE_ADMIN_PASS_HASH = "4106b4f2be492e957124b0687c3cb0781df5505e82f5946794d200201c3b63d4";
let adminAuthenticated = (() => {
  try {
    return localStorage.getItem("ci4m_admin_session_v1") === BACKOFFICE_ADMIN_EMAIL;
  } catch (e) {
    return false;
  }
})();
let adminLoginErrorMsg = "";
let currentAdminTab = "users";
let adminListingFilterMode = "all";
let adminUsersFilterMode = "all";
let adminListingSearchQuery = "";
const INITIAL_TEST_REGISTRATIONS_AND_OFFERS = {
  accounts: [
    {
      id: "USR-9001",
      name: "Alexandru Ionescu",
      email: "alex.ionescu@test.ro",
      phone: "+40 722 300 100",
      country: "Romania",
      city: "Bucharest",
      prefLang: "ro",
      prefCurrency: "EUR",
      plan: "pro",
      freeSwaps: 999,
      kycVerified: true,
      isTestRegistration: true,
      registeredAt: "2026-11-11 10:14"
    },
    {
      id: "USR-9002",
      name: "Elena Popa",
      email: "elena.popa@test.ro",
      phone: "+40 744 500 200",
      country: "Romania",
      city: "Cluj-Napoca",
      prefLang: "ro",
      prefCurrency: "RON",
      plan: "pro",
      freeSwaps: 999,
      kycVerified: true,
      isTestRegistration: true,
      registeredAt: "2026-11-11 11:05"
    },
    {
      id: "USR-9003",
      name: "Mihai Rădulescu",
      email: "mihai.radulescu@test.ro",
      phone: "+40 755 800 300",
      country: "Romania",
      city: "Timișoara",
      prefLang: "ro",
      prefCurrency: "EUR",
      plan: "pack",
      freeSwaps: 22,
      kycVerified: true,
      isTestRegistration: true,
      registeredAt: "2026-11-11 11:48"
    },
    {
      id: "USR-9004",
      name: "Cristian Dumitrescu",
      email: "cristian.dumitrescu@test.ro",
      phone: "+40 731 940 410",
      country: "Romania",
      city: "Constanța",
      prefLang: "ro",
      prefCurrency: "EUR",
      plan: "starter",
      freeSwaps: 8,
      kycVerified: true,
      isTestRegistration: true,
      registeredAt: "2026-11-11 12:20"
    },
    {
      id: "USR-9005",
      name: "Ana-Maria Stan",
      email: "anamaria.stan@test.md",
      phone: "+373 69 412 880",
      country: "Moldova",
      city: "Chișinău",
      prefLang: "ro",
      prefCurrency: "EUR",
      plan: "pack",
      freeSwaps: 19,
      kycVerified: true,
      isTestRegistration: true,
      registeredAt: "2026-11-11 13:02"
    },
    {
      id: "USR-9006",
      name: "Radu Marinescu",
      email: "radu.marinescu@test.ro",
      phone: "+40 766 210 900",
      country: "Romania",
      city: "Brașov",
      prefLang: "ro",
      prefCurrency: "RON",
      plan: "starter",
      freeSwaps: 9,
      kycVerified: true,
      isTestRegistration: true,
      registeredAt: "2026-11-11 13:38"
    },
    {
      id: "USR-9007",
      name: "Tudor Munteanu",
      email: "tudor.munteanu@test.ro",
      phone: "+40 723 880 110",
      country: "Romania",
      city: "Bucharest",
      prefLang: "ro",
      prefCurrency: "EUR",
      plan: "pro",
      freeSwaps: 999,
      kycVerified: true,
      isTestRegistration: true,
      registeredAt: "2026-11-23 15:10"
    },
    {
      id: "USR-9008",
      name: "Andreea Dragomir",
      email: "andreea.dragomir@test.ro",
      phone: "+40 745 910 220",
      country: "Romania",
      city: "Bucharest",
      prefLang: "ro",
      prefCurrency: "EUR",
      plan: "pro",
      freeSwaps: 999,
      kycVerified: true,
      isTestRegistration: true,
      registeredAt: "2026-11-23 15:12"
    },
    {
      id: "USR-9009",
      name: "Vlad Iancu",
      email: "vlad.iancu@test.ro",
      phone: "+40 751 440 330",
      country: "Romania",
      city: "Cluj-Napoca",
      prefLang: "ro",
      prefCurrency: "EUR",
      plan: "pack",
      freeSwaps: 24,
      kycVerified: true,
      isTestRegistration: true,
      registeredAt: "2026-11-23 15:14"
    }
  ],
  listings: [
    {
      id: 950111,
      createdByUser: true,
      ownerEmail: "jeka7ro@gmail.com",
      category: "cars",
      country: "Romania",
      city: "Bucharest",
      lat: 44.4612,
      lng: 26.0945,
      valueEur: 185000,
      originalAmount: 185000,
      originalCurrency: "EUR",
      dealType: "either",
      owner: "Eugeniu Cazmal",
      verified: true,
      matchScore: 99,
      image: "https://images.unsplash.com/photo-1520031441872-265e4ff70366?auto=format&fit=crop&w=1000&q=80",
      images: [
        "https://images.unsplash.com/photo-1520031441872-265e4ff70366?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80"
      ],
      specs: "2024 · 6,800 km · 4.0 V8 Biturbo 585 HP · AMG Night Package Magno · Carbon Interior",
      title: "2024 Mercedes-AMG G 63 Magno · Performance Edition",
      want: "Penthouse / Villa in Bucharest or Porsche 911 Turbo S",
      desc: "Personal vehicle registered in Bucharest. First owner, full official warranty, open to 1:1 swap or direct sale.",
      i18n: {
        ro: { title: "2024 Mercedes-AMG G 63 Magno · Performance Edition", want: "Penthouse / Vilă în București sau Porsche 911 Turbo S", desc: "Autoturism personal înmatriculat în București. Primul proprietar, garanție oficială, deschis la schimb 1:1 sau vânzare." },
        de: { title: "2024 Mercedes-AMG G 63 Magno · Performance Edition", want: "Penthouse / Villa in Bukarest oder Porsche 911 Turbo S", desc: "Privatfahrzeug aus erster Hand mit Werksgarantie, offen für 1:1-Tausch oder Direktverkauf." },
        fr: { title: "2024 Mercedes-AMG G 63 Magno · Performance Edition", want: "Penthouse / Villa à Bucarest ou Porsche 911 Turbo S", desc: "Véhicule personnel première main sous garantie officielle, ouvert à l'échange 1:1." },
        it: { title: "2024 Mercedes-AMG G 63 Magno · Performance Edition", want: "Attico / Villa a Bucarest o Porsche 911 Turbo S", desc: "Veicolo personale unico proprietario con garanzia ufficiale, disponibile per scambio 1:1." },
        es: { title: "2024 Mercedes-AMG G 63 Magno · Performance Edition", want: "Ático / Villa en Bucarest o Porsche 911 Turbo S", desc: "Vehículo personal único propietario con garantía oficial, abierto a intercambio 1:1." },
        ru: { title: "2024 Mercedes-AMG G 63 Magno · Performance Edition", want: "Пентхаус / Вилла в Бухаресте или Porsche 911 Turbo S", desc: "Личный автомобиль, первый владелец, официальная гарантия, обмен 1:1 или продажа." }
      }
    },
    {
      id: 950107,
      createdByUser: true,
      ownerEmail: "tudor.munteanu@test.ro",
      category: "cars",
      country: "Romania",
      city: "Bucharest",
      lat: 44.4518,
      lng: 26.0892,
      valueEur: 94500,
      originalAmount: 94500,
      originalCurrency: "EUR",
      dealType: "cash",
      owner: "Tudor Munteanu",
      verified: true,
      matchScore: 99,
      image: "https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=1000&q=80",
      images: [
        "https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1000&q=80"
      ],
      specs: "2024 · 11,500 km · 571 HP AWD · Panoramic Glass Roof · Burmester 3D",
      title: "2024 Porsche Taycan 4S Cross Turismo · Performance Battery Plus",
      want: "3-Room Penthouse in Bucharest / Cluj-Napoca or Mercedes-AMG G63",
      desc: "Registered by Tudor Munteanu in Bucharest. Official Porsche Pipera warranty until 2028, PPF full body protection.",
      i18n: {
        ro: { title: "2024 Porsche Taycan 4S Cross Turismo · Performance Battery Plus", want: "Penthouse 3 camere în București / Cluj-Napoca sau Mercedes-AMG G63", desc: "Înregistrat de Tudor Munteanu în București. Garanție oficială Porsche Pipera până în 2028, folie PPF integrală." },
        de: { title: "2024 Porsche Taycan 4S Cross Turismo · Performance Battery Plus", want: "3-Zimmer-Penthouse in Bukarest / Cluj-Napoca oder Mercedes-AMG G63", desc: "Inseriert von Tudor Munteanu. Offizielle Porsche-Garantie bis 2028, Voll-PPF-Schutzfolie." },
        fr: { title: "2024 Porsche Taycan 4S Cross Turismo · Performance Battery Plus", want: "Penthouse 3 pièces à Bucarest / Cluj-Napoca ou Mercedes-AMG G63", desc: "Enregistré par Tudor Munteanu. Garantie officielle Porsche jusqu'en 2028, protection PPF intégrale." },
        it: { title: "2024 Porsche Taycan 4S Cross Turismo · Performance Battery Plus", want: "Attico 3 locali a Bucarest / Cluj-Napoca o Mercedes-AMG G63", desc: "Registrato da Tudor Munteanu. Garanzia ufficiale Porsche fino al 2028, pellicola PPF integrale." },
        es: { title: "2024 Porsche Taycan 4S Cross Turismo · Performance Battery Plus", want: "Ático de 3 habitaciones en Bucarest / Cluj-Napoca o Mercedes-AMG G63", desc: "Registrado por Tudor Munteanu. Garantía oficial Porsche hasta 2028, protección PPF completa." },
        ru: { title: "2024 Porsche Taycan 4S Cross Turismo · Performance Battery Plus", want: "3-комнатный пентхаус в Бухаресте / Клуже или Mercedes-AMG G63", desc: "Размещено Тудором Мунтяну. Официальная гарантия Porsche до 2028 года, полная бронепленка PPF." }
      }
    },
    {
      id: 950108,
      createdByUser: true,
      ownerEmail: "andreea.dragomir@test.ro",
      category: "real-estate",
      country: "Romania",
      city: "Bucharest",
      lat: 44.7012,
      lng: 26.1631,
      valueEur: 420000,
      originalAmount: 420000,
      originalCurrency: "EUR",
      dealType: "either",
      owner: "Andreea Dragomir",
      verified: true,
      matchScore: 99,
      image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1000&q=80",
      images: [
        "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80"
      ],
      specs: "4 Bedrooms · 240 m² Usable · 950 m² Lakefront Plot · Smart Home KNX",
      title: "Lakefront Modern Villa with Private Dock & Heated Pool (240 m²)",
      want: "Central Apartment in Vienna / Munich or 2 Apartments in Bucharest + Difference",
      desc: "Registered by Andreea Dragomir. Direct lake access with private boat pontoon, heated infinity pool, solar + heat pump.",
      i18n: {
        ro: { title: "Vilă Modernă pe Malul Lacului cu Ponton Privat & Piscină Încălzită (240 m²)", want: "Apartament central în Viena / München sau 2 Apartamente în București + diferență", desc: "Înregistrat de Andreea Dragomir. Deschidere directă la lac cu ponton privat, piscină încălzită, sistem Smart Home KNX." },
        de: { title: "Moderne Villa am See mit eigenem Steg & beheiztem Pool (240 m²)", want: "Zentrale Wohnung in Wien / München oder 2 Wohnungen in Bukarest + Ausgleich", desc: "Inseriert von Andreea Dragomir. Direkter Seezugang mit Privatsteg, beheizter Pool, KNX Smart Home." },
        fr: { title: "Villa Moderne au Bord du Lac avec Ponton Privé & Piscine Chauffée (240 m²)", want: "Appartement central à Vienne / Munich ou 2 Appartements à Bucarest + soulte", desc: "Enregistré par Andreea Dragomir. Accès direct au lac avec ponton privé, piscine chauffée, domotique KNX." },
        it: { title: "Villa Moderna sul Lago con Pontile Privato e Piscina Riscaldata (240 m²)", want: "Appartamento centrale a Vienna / Monaco o 2 Appartamenti a Bucarest + conguaglio", desc: "Registrato da Andreea Dragomir. Accesso diretto al lago con pontile privato, piscina riscaldata, domotica KNX." },
        es: { title: "Villa Moderna Frente al Lago con Muelle Privado y Piscina Climatizada (240 m²)", want: "Piso céntrico en Viena / Múnich o 2 Pisos en Bucarest + diferencia", desc: "Registrado por Andreea Dragomir. Acceso directo al lago con embarcadero privado, piscina climatizada, domótica KNX." },
        ru: { title: "Современная вилла у озера с частным причалом и подогреваемым бассейном (240 м²)", want: "Квартира в центре Вены / Мюнхена или 2 квартиры в Бухаресте + доплата", desc: "Размещено Андреей Драгомир. Прямой выход к озеру с причалом, подогреваемый бассейн, умный дом KNX." }
      }
    },
    {
      id: 950109,
      createdByUser: true,
      ownerEmail: "vlad.iancu@test.ro",
      category: "electronics",
      country: "Romania",
      city: "Cluj-Napoca",
      lat: 46.7745,
      lng: 23.6198,
      valueEur: 3450,
      originalAmount: 3450,
      originalCurrency: "EUR",
      dealType: "1to1",
      owner: "Vlad Iancu",
      verified: true,
      matchScore: 99,
      image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1000&q=80",
      images: [
        "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=1000&q=80"
      ],
      specs: "M3 Max 16-Core CPU / 40-Core GPU · 64GB RAM · 2TB SSD · AppleCare+",
      title: "Apple MacBook Pro 16\" M3 Max (64GB RAM / 2TB SSD) Space Black",
      want: "Leica Q2 / Q3 Full-Frame Camera or Gaming Workstation RTX 4090",
      desc: "Registered by Vlad Iancu in Cluj-Napoca. Only 9 battery cycles, original box, invoice and active AppleCare+ protection.",
      i18n: {
        ro: { title: "Apple MacBook Pro 16\" M3 Max (64GB RAM / 2TB SSD) Space Black", want: "Cameră Full-Frame Leica Q2 / Q3 sau Stație Grafică RTX 4090", desc: "Înregistrat de Vlad Iancu în Cluj-Napoca. Doar 9 cicluri de încărcare, cutie originală, factură și AppleCare+ activ." },
        de: { title: "Apple MacBook Pro 16\" M3 Max (64GB RAM / 2TB SSD) Space Black", want: "Leica Q2 / Q3 Vollformatkamera oder RTX 4090 Workstation", desc: "Inseriert von Vlad Iancu. Nur 9 Ladezyklen, Originalverpackung, Rechnung und aktives AppleCare+." },
        fr: { title: "Apple MacBook Pro 16\" M3 Max (64 Go RAM / 2 To SSD) Noir Sidéral", want: "Appareil Photo Leica Q2 / Q3 ou Station RTX 4090", desc: "Enregistré par Vlad Iancu. Seulement 9 cycles de batterie, boîte d'origine, facture et AppleCare+ actif." },
        it: { title: "Apple MacBook Pro 16\" M3 Max (64GB RAM / 2TB SSD) Nero Siderale", want: "Fotocamera Leica Q2 / Q3 o Workstation RTX 4090", desc: "Registrato da Vlad Iancu. Solo 9 cicli di carica, scatola originale, fattura e AppleCare+ attivo." },
        es: { title: "Apple MacBook Pro 16\" M3 Max (64GB RAM / 2TB SSD) Negro Espacial", want: "Cámara Leica Q2 / Q3 o Estación de Trabajo RTX 4090", desc: "Registrado por Vlad Iancu. Solo 9 ciclos de batería, caja original, factura y AppleCare+ activo." },
        ru: { title: "Apple MacBook Pro 16\" M3 Max (64 ГБ ОЗУ / 2 ТБ SSD) Space Black", want: "Камера Leica Q2 / Q3 или рабочая станция RTX 4090", desc: "Размещено Владом Янку. Всего 9 циклов батареи, оригинальная коробка, чек и активный AppleCare+." }
      }
    },
    {
      id: 950110,
      createdByUser: true,
      ownerEmail: "tudor.munteanu@test.ro",
      category: "clothing",
      country: "Romania",
      city: "Timișoara",
      lat: 45.7537,
      lng: 21.2257,
      valueEur: 13800,
      originalAmount: 13800,
      originalCurrency: "EUR",
      dealType: "either",
      owner: "Tudor Munteanu",
      verified: true,
      matchScore: 99,
      image: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=1000&q=80",
      images: [
        "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1000&q=80"
      ],
      specs: "41mm Oystersteel · Black Cerachrom Bezel · Box, Papers & 5-Year Warranty",
      title: "Rolex Submariner Date 41mm Oystersteel (Ref. 126610LN · Full Set)",
      want: "Compact Electric City Car (MINI Cooper SE / VW ID.3) or Omega + Cash",
      desc: "Registered by Tudor Munteanu. Purchased from authorized Rolex Boutique, full set with NFC warranty card and box.",
      i18n: {
        ro: { title: "Rolex Submariner Date 41mm Oystersteel (Ref. 126610LN · Full Set)", want: "Mașină electrică de oraș (MINI Cooper SE / VW ID.3) sau Omega + diferență", desc: "Înregistrat de Tudor Munteanu. Achiziționat din reprezentanță autorizată Rolex, set complet cu card NFC și cutie." },
        de: { title: "Rolex Submariner Date 41mm Oystersteel (Ref. 126610LN · Full Set)", want: "Kompaktes Elektroauto (MINI Cooper SE / VW ID.3) oder Omega + Aufpreis", desc: "Inseriert von Tudor Munteanu. Aus autorisierter Rolex-Boutique, Full-Set mit NFC-Garantiekarte und Box." },
        fr: { title: "Rolex Submariner Date 41mm Oystersteel (Réf. 126610LN · Full Set)", want: "Citadine électrique (MINI Cooper SE / VW ID.3) ou Omega + soulte", desc: "Enregistré par Tudor Munteanu. Achetée en boutique officielle Rolex, full set avec carte de garantie NFC." },
        it: { title: "Rolex Submariner Date 41mm Oystersteel (Ref. 126610LN · Full Set)", want: "Citycar elettrica (MINI Cooper SE / VW ID.3) o Omega + conguaglio", desc: "Registrato da Tudor Munteanu. Acquistato presso concessionario ufficiale Rolex, full set con card NFC." },
        es: { title: "Rolex Submariner Date 41mm Oystersteel (Ref. 126610LN · Full Set)", want: "Coche eléctrico urbano (MINI Cooper SE / VW ID.3) u Omega + diferencia", desc: "Registrado por Tudor Munteanu. Comprado en boutique oficial Rolex, set completo con tarjeta NFC y caja." },
        ru: { title: "Rolex Submariner Date 41mm Oystersteel (Ref. 126610LN · Полный комплект)", want: "Городской электромобиль (MINI Cooper SE / VW ID.3) или Omega + доплата", desc: "Размещено Тудором Мунтяну. Куплены у официального дилера Rolex, полный комплект с картой гарантии NFC." }
      }
    },
    {
      id: 950101,
      createdByUser: true,
      ownerEmail: "alex.ionescu@test.ro",
      category: "cars",
      country: "Romania",
      city: "Bucharest",
      lat: 44.4268,
      lng: 26.1025,
      valueEur: 62000,
      originalAmount: 62000,
      originalCurrency: "EUR",
      dealType: "1to1",
      owner: "Alexandru Ionescu",
      verified: true,
      matchScore: 99,
      image: "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1000&q=80",
      images: ["https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1000&q=80"],
      specs: "2023 · 28,000 km · 3.0 Hybrid xDrive · M-Sport Package · Full BMW Warranty",
      title: "2023 BMW X5 xDrive45e M-Sport · Bucharest",
      want: "2-3 Bedroom Apartment in Bucharest / Cluj or Porsche Cayenne",
      desc: "Registered by Alexandru Ionescu in Bucharest. Single owner, full official BMW service history.",
      i18n: {
        ro: { title: "2023 BMW X5 xDrive45e M-Sport · București", want: "Apartament 2-3 camere în București / Cluj sau Porsche Cayenne", desc: "Înregistrat de Alexandru Ionescu în București. Primul proprietar, istoric complet în reprezentanța BMW." },
        de: { title: "2023 BMW X5 xDrive45e M-Sport · Bukarest", want: "2-3 Zimmer Wohnung in Bukarest / Cluj oder Porsche Cayenne", desc: "Inseriert von Alexandru Ionescu. Erstbesitz, lückenlose offizielle BMW-Servicehistorie." },
        fr: { title: "2023 BMW X5 xDrive45e M-Sport · Bucarest", want: "Appartement 2-3 pièces à Bucarest / Cluj ou Porsche Cayenne", desc: "Enregistré par Alexandru Ionescu. Première main, historique complet concession BMW." },
        it: { title: "2023 BMW X5 xDrive45e M-Sport · Bucarest", want: "Appartamento 2-3 locali a Bucarest / Cluj o Porsche Cayenne", desc: "Registrato da Alexandru Ionescu. Unico proprietario, storico tagliandi ufficiale BMW." },
        es: { title: "2023 BMW X5 xDrive45e M-Sport · Bucarest", want: "Piso de 2-3 habitaciones en Bucarest / Cluj o Porsche Cayenne", desc: "Registrado por Alexandru Ionescu. Único propietario, historial oficial completo BMW." },
        ru: { title: "2023 BMW X5 xDrive45e M-Sport · Бухарест", want: "2-3 комнатная квартира в Бухаресте / Клуже или Porsche Cayenne", desc: "Размещено Александру Ионеску. Один владелец, полная официальная сервисная история BMW." }
      }
    },
    {
      id: 950102,
      createdByUser: true,
      ownerEmail: "elena.popa@test.ro",
      category: "real-estate",
      country: "Romania",
      city: "Cluj-Napoca",
      lat: 46.7712,
      lng: 23.6236,
      valueEur: 185000,
      originalAmount: 185000,
      originalCurrency: "EUR",
      dealType: "either",
      owner: "Elena Popa",
      verified: true,
      matchScore: 99,
      image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1000&q=80",
      images: ["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1000&q=80"],
      specs: "3 Rooms · 84 m² + 14 m² Terrace · Underground Parking · Central Cluj",
      title: "Modern 3-Room Apartment + Underground Parking · Cluj-Napoca",
      want: "House with Garden or Apartment in Bucharest / Vienna (± cash difference)",
      desc: "Registered by Elena Popa. Premium finishes, clear title deed, ready for direct 1:1 swap.",
      i18n: {
        ro: { title: "Apartament Modern 3 Camere + Parcare Subterană · Cluj-Napoca", want: "Casă cu curte sau Apartament în București / Viena (± diferență)", desc: "Înregistrat de Elena Popa. Finisaje premium, acte la zi, pregătit pentru schimb direct 1:1." },
        de: { title: "Moderne 3-Zimmer-Wohnung + Tiefgarage · Cluj-Napoca", want: "Haus mit Garten oder Wohnung in Bukarest / Wien (± Wertausgleich)", desc: "Inseriert von Elena Popa. Hochwertige Ausstattung, lastenfrei, bereit für 1:1-Tausch." },
        fr: { title: "Appartement Moderne 3 Pièces + Parking Souterrain · Cluj-Napoca", want: "Maison avec jardin ou Appartement à Bucarest / Vienne (± soulte)", desc: "Enregistré par Elena Popa. Finitions haut de gamme, libre de charges, prêt pour échange 1:1." },
        it: { title: "Moderno Appartamento Trilocale + Garage · Cluj-Napoca", want: "Casa con giardino o Appartamento a Bucarest / Vienna (± conguaglio)", desc: "Registrato da Elena Popa. Finiture di pregio, pronto per scambio diretto 1:1." },
        es: { title: "Piso Moderno de 3 Habitaciones + Garaje Subterráneo · Cluj-Napoca", want: "Casa con jardín o Piso en Bucarest / Viena (± diferencia)", desc: "Registrado por Elena Popa. Acabados premium, libre de cargas, listo para intercambio 1:1." },
        ru: { title: "Современная 3-комнатная квартира + подземный паркинг · Клуж-Напока", want: "Дом с садом или квартира в Бухаресте / Вене (± доплата)", desc: "Размещено Еленой Попа. Премиальная отделка, готова к прямому обмену 1:1." }
      }
    },
    {
      id: 950103,
      createdByUser: true,
      ownerEmail: "mihai.radulescu@test.ro",
      category: "electronics",
      country: "Romania",
      city: "Timișoara",
      lat: 45.7489,
      lng: 21.2087,
      valueEur: 1380,
      originalAmount: 1380,
      originalCurrency: "EUR",
      dealType: "1to1",
      owner: "Mihai Rădulescu",
      verified: true,
      matchScore: 99,
      image: "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=1000&q=80",
      images: ["https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=1000&q=80"],
      specs: "512GB · Natural Titanium · 100% Battery Health · Box & Invoice",
      title: "Apple iPhone 16 Pro Max 512GB · Timisoara",
      want: "MacBook Pro 16 M3 / iPad Pro M4",
      desc: "Registered by Mihai Radulescu in Timisoara. Mint 10/10 condition with 24-month warranty.",
      i18n: {
        ro: { title: "Apple iPhone 16 Pro Max 512GB · Timișoara", want: "MacBook Pro 16 M3 / iPad Pro M4", desc: "Înregistrat de Mihai Rădulescu în Timișoara. Stare 10/10, cutie și garanție 24 luni." },
        de: { title: "Apple iPhone 16 Pro Max 512GB · Timișoara", want: "MacBook Pro 16 M3 / iPad Pro M4", desc: "Inseriert von Mihai Rădulescu. Neuwertiger Zustand 10/10 mit 24 Monaten Garantie." },
        fr: { title: "Apple iPhone 16 Pro Max 512GB · Timișoara", want: "MacBook Pro 16 M3 / iPad Pro M4", desc: "Enregistré par Mihai Rădulescu. État neuf 10/10 avec garantie 24 mois." },
        it: { title: "Apple iPhone 16 Pro Max 512GB · Timișoara", want: "MacBook Pro 16 M3 / iPad Pro M4", desc: "Registrato da Mihai Rădulescu. Condizioni pari al nuovo 10/10 con garanzia 24 mesi." },
        es: { title: "Apple iPhone 16 Pro Max 512GB · Timișoara", want: "MacBook Pro 16 M3 / iPad Pro M4", desc: "Registrado por Mihai Rădulescu. Estado impecable 10/10 con 24 meses de garantía." },
        ru: { title: "Apple iPhone 16 Pro Max 512GB · Тимишоара", want: "MacBook Pro 16 M3 / iPad Pro M4", desc: "Размещено Михаем Рэдулеску. Идеальное состояние 10/10, гарантия 24 месяца." }
      }
    },
    {
      id: 950104,
      createdByUser: true,
      ownerEmail: "cristian.dumitrescu@test.ro",
      category: "cars",
      country: "Romania",
      city: "Constanța",
      lat: 44.1598,
      lng: 28.6348,
      valueEur: 58500,
      originalAmount: 58500,
      originalCurrency: "EUR",
      dealType: "cash",
      owner: "Cristian Dumitrescu",
      verified: true,
      matchScore: 99,
      image: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1000&q=80",
      images: ["https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1000&q=80"],
      specs: "2022 · 39,000 km · GLE 350de 4MATIC Plug-in Hybrid · AMG Line",
      title: "2022 Mercedes-Benz GLE 350de 4MATIC AMG Line · Constanta",
      want: "2-Room Apartment in Mamaia Nord / Brasov or Compact SUV + difference",
      desc: "Registered by Cristian Dumitrescu. Authorized dealer purchase, full Mercedes-Benz service history.",
      i18n: {
        ro: { title: "2022 Mercedes-Benz GLE 350de 4MATIC AMG Line · Constanța", want: "Apartament 2 camere în Mamaia Nord / Brașov sau SUV compact + diferență", desc: "Înregistrat de Cristian Dumitrescu. Achiziționat din reprezentanță, istoric complet Mercedes-Benz." },
        de: { title: "2022 Mercedes-Benz GLE 350de 4MATIC AMG Line · Constanța", want: "2-Zimmer-Wohnung in Mamaia Nord / Brașov oder Kompakt-SUV + Aufpreis", desc: "Inseriert von Cristian Dumitrescu. Vertragshändler-Fahrzeug mit lückenloser Mercedes-Benz Historie." },
        fr: { title: "2022 Mercedes-Benz GLE 350de 4MATIC AMG Line · Constanța", want: "Appartement 2 pièces à Mamaia Nord / Brașov ou SUV compact + soulte", desc: "Enregistré par Cristian Dumitrescu. Achat concession officielle, historique complet Mercedes-Benz." },
        it: { title: "2022 Mercedes-Benz GLE 350de 4MATIC AMG Line · Costanza", want: "Appartamento bilocale a Mamaia Nord / Brașov o SUV compatto + conguaglio", desc: "Registrato da Cristian Dumitrescu. Acquisto concessionaria ufficiale, storico completo Mercedes-Benz." },
        es: { title: "2022 Mercedes-Benz GLE 350de 4MATIC AMG Line · Constanza", want: "Piso de 2 habitaciones en Mamaia Nord / Brașov o SUV compacto + diferencia", desc: "Registrado por Cristian Dumitrescu. Compra en concesionario oficial, historial completo Mercedes-Benz." },
        ru: { title: "2022 Mercedes-Benz GLE 350de 4MATIC AMG Line · Констанца", want: "2-комнатная квартира в Мамая-Норд / Брашове или компактный SUV + доплата", desc: "Размещено Кристианом Думитреску. Покупка у официального дилера, полная история Mercedes-Benz." }
      }
    },
    {
      id: 950105,
      createdByUser: true,
      ownerEmail: "anamaria.stan@test.md",
      category: "real-estate",
      country: "Moldova",
      city: "Chișinău",
      lat: 47.0105,
      lng: 28.8638,
      valueEur: 210000,
      originalAmount: 210000,
      originalCurrency: "EUR",
      dealType: "1to1",
      owner: "Ana-Maria Stan",
      verified: true,
      matchScore: 99,
      image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=80",
      images: ["https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=80"],
      specs: "4 Rooms · 142 m² · Valea Morilor Park View · 2 Underground Parking Spots",
      title: "4-Room Luxury Penthouse (142 m²) · Central Chisinau",
      want: "3-4 Room Apartment in Bucharest / Iasi or House + cash difference",
      desc: "Registered by Ana-Maria Stan in Chisinau. Custom-furnished, available for direct key-for-key swap.",
      i18n: {
        ro: { title: "Penthouse de Lux 4 Camere (142 m²) · Centru Chișinău", want: "Apartament 3-4 camere în București / Iași sau Casă + diferență", desc: "Înregistrat de Ana-Maria Stan în Chișinău. Mobilat la comandă, disponibil pentru schimb direct cheie-pe-cheie." },
        de: { title: "4-Zimmer-Luxus-Penthouse (142 m²) · Zentrum Chișinău", want: "3-4 Zimmer Wohnung in Bukarest / Iași oder Haus + Wertausgleich", desc: "Inseriert von Ana-Maria Stan. Maßgefertigte Einrichtung, verfügbar für direkten 1:1-Tausch." },
        fr: { title: "Penthouse de Luxe 4 Pièces (142 m²) · Centre Chișinău", want: "Appartement 3-4 pièces à Bucarest / Iași ou Maison + soulte", desc: "Enregistré par Ana-Maria Stan. Meublé sur mesure, disponible pour échange direct clé contre clé." },
        it: { title: "Attico di Lusso 4 Locali (142 m²) · Centro Chișinău", want: "Appartamento 3-4 locali a Bucarest / Iași o Casa + conguaglio", desc: "Registrato da Ana-Maria Stan. Arredato su misura, disponibile per scambio diretto 1:1." },
        es: { title: "Ático de Lujo de 4 Habitaciones (142 m²) · Centro Chișinău", want: "Piso de 3-4 habitaciones en Bucarest / Iași o Casa + diferencia", desc: "Registrado por Ana-Maria Stan. Amueblado a medida, disponible para intercambio directo 1:1." },
        ru: { title: "Роскошный пентхаус 4 комнаты (142 м²) · Центр Кишинёва", want: "3-4 комнатная квартира в Бухаресте / Яссах или дом + доплата", desc: "Размещено Аной-Марией Стан в Кишинёве. Дизайнерская мебель, доступен для прямого обмена 1:1." }
      }
    },
    {
      id: 950106,
      createdByUser: true,
      ownerEmail: "radu.marinescu@test.ro",
      category: "real-estate",
      country: "Romania",
      city: "Brașov",
      lat: 45.6427,
      lng: 25.5887,
      valueEur: 145000,
      originalAmount: 145000,
      originalCurrency: "EUR",
      dealType: "either",
      owner: "Radu Marinescu",
      verified: true,
      matchScore: 99,
      image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1000&q=80",
      images: ["https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1000&q=80"],
      specs: "4 Rooms · 125 m² Usable · 800 m² Land Plot · Solar Panels · Bran-Brasov",
      title: "A-Frame Mountain Chalet (800 m² Plot) · Brasov / Bran",
      want: "Apartment in Bucharest / Brasov or 2022+ SUV with cash difference",
      desc: "Registered by Radu Marinescu. Turnkey mountain chalet with high rental yield, open to 1:1 swap.",
      i18n: {
        ro: { title: "Cabană Montană A-Frame (Teren 800 m²) · Brașov / Bran", want: "Apartament în București / Brașov sau SUV 2022+ cu diferență", desc: "Înregistrat de Radu Marinescu. Cabană la cheie cu randament turistic ridicat, deschis la schimb 1:1." },
        de: { title: "A-Frame Berg-Chalet (800 m² Grundstück) · Brașov / Bran", want: "Wohnung in Bukarest / Brașov oder SUV ab 2022 mit Wertausgleich", desc: "Inseriert von Radu Marinescu. Schlüsselfertiges Berg-Chalet mit hoher Mietrendite, offen für 1:1-Tausch." },
        fr: { title: "Chalet de Montagne A-Frame (Terrain 800 m²) · Brașov / Bran", want: "Appartement à Bucarest / Brașov ou SUV 2022+ avec soulte", desc: "Enregistré par Radu Marinescu. Chalet clé en main à haut rendement locatif, ouvert à l'échange 1:1." },
        it: { title: "Chalet di Montagna A-Frame (Terreno 800 m²) · Brașov / Bran", want: "Appartamento a Bucarest / Brașov o SUV 2022+ con conguaglio", desc: "Registrato da Radu Marinescu. Chalet chiavi in mano ad alta resa, disponibile per scambio 1:1." },
        es: { title: "Chalet de Montaña A-Frame (Parcela 800 m²) · Brașov / Bran", want: "Piso en Bucarest / Brașov o SUV 2022+ con diferencia", desc: "Registrado por Radu Marinescu. Chalet llave en mano de alta rentabilidad, abierto a intercambio 1:1." },
        ru: { title: "Горное шале A-Frame (участок 800 м²) · Брашов / Бран", want: "Квартира в Бухаресте / Брашове или SUV 2022+ с доплатой", desc: "Размещено Раду Маринеску. Готовое горное шале с высокой доходностью, открыт к обмену 1:1." }
      }
    }
  ]
};
function ensurePlatformAccountsAndTestRegistrations() {
  let dbChanged = false;
  let offersChanged = false;
  const adminKey = BACKOFFICE_ADMIN_EMAIL.toLowerCase();
  if (!accountsDb[adminKey]) {
    accountsDb[adminKey] = {
      id: "ADM-0001",
      name: "Eugeniu · Super-Admin",
      email: BACKOFFICE_ADMIN_EMAIL,
      phone: "+40 700 000 001",
      country: "Romania",
      city: "Bucharest",
      prefLang: "ro",
      prefCurrency: "EUR",
      plan: "pro",
      freeSwaps: 999,
      kycVerified: true,
      role: "superadmin",
      registeredAt: "2026-11-01 09:00"
    };
    dbChanged = true;
  } else if (accountsDb[adminKey].password) {
    delete accountsDb[adminKey].password;
    dbChanged = true;
  }
  INITIAL_TEST_REGISTRATIONS_AND_OFFERS.accounts.forEach(acc => {
    const k = acc.email.toLowerCase();
    if (!accountsDb[k]) {
      accountsDb[k] = { ...acc };
      dbChanged = true;
    } else {
      accountsDb[k].isTestRegistration = true;
      if (!accountsDb[k].registeredAt) accountsDb[k].registeredAt = acc.registeredAt;
      if (!accountsDb[k].city) accountsDb[k].city = acc.city;
      if (!accountsDb[k].id) accountsDb[k].id = acc.id;
    }
  });
  // 3. Ensure all 30 European Partner Accounts from INITIAL_OFFERS exist in accountsDb & link ownerEmail
  const phonePrefixByCountry = {
    "Romania": "+40 72",
    "Germany": "+49 17",
    "Austria": "+43 66",
    "Switzerland": "+41 79",
    "France": "+33 61",
    "Italy": "+39 34",
    "Spain": "+34 62",
    "United Kingdom": "+44 77",
    "Moldova": "+373 69"
  };
  (window.INITIAL_OFFERS || []).forEach((off, idx) => {
    const rawOwner = String(off.owner || `Member ${off.id}`).trim();
    const cleanSlug = normalizeSearchText(rawOwner).replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "") || `member.${off.id}`;
    const domainMap = {
      "Romania": "changeit4me.ro",
      "Germany": "changeit4me.de",
      "Austria": "changeit4me.at",
      "Switzerland": "changeit4me.ch",
      "France": "changeit4me.fr",
      "Italy": "changeit4me.it",
      "Spain": "changeit4me.es",
      "United Kingdom": "changeit4me.co.uk",
      "Moldova": "changeit4me.md"
    };
    const email = off.ownerEmail || `${cleanSlug}@${domainMap[off.country] || "changeit4me.eu"}`;
    off.ownerEmail = email;
    const liveMatch = offers.find(o => o.id === off.id);
    if (liveMatch && !liveMatch.ownerEmail) {
      liveMatch.ownerEmail = email;
    }
    const emailKey = email.toLowerCase();
    if (!accountsDb[emailKey]) {
      const pref = phonePrefixByCountry[off.country] || "+40 72";
      const planPool = ["pro", "pack", "starter"];
      const chosenPlan = planPool[idx % planPool.length];
      accountsDb[emailKey] = {
        id: `USR-${1000 + off.id}`,
        name: rawOwner,
        email,
        phone: `${pref}${String(1000000 + idx * 23456).slice(0, 7)}`,
        country: off.country || "Romania",
        city: off.city || "Bucharest",
        prefLang: off.country === "Romania" || off.country === "Moldova" ? "ro" : "en",
        prefCurrency: off.originalCurrency || "EUR",
        plan: chosenPlan,
        freeSwaps: chosenPlan === "pro" ? 999 : (chosenPlan === "pack" ? 18 : 7),
        kycVerified: true,
        isPartnerSeed: true,
        registeredAt: `2026-11-0${(idx % 9) + 1} ${10 + (idx % 10)}:30`
      };
      dbChanged = true;
    }
  });
  // 4. Ensure the 6 Member Listings (#950101 - #950106) are present in offers (unless deleted or edited by user)
  [...INITIAL_TEST_REGISTRATIONS_AND_OFFERS.listings].reverse().forEach(tOff => {
    if (deletedOfferIds.includes(tOff.id)) return;
    const existingIdx = offers.findIndex(o => o.id === tOff.id);
    if (existingIdx < 0) {
      offers.unshift({ ...tOff });
      offersChanged = true;
    } else if (!offers[existingIdx].i18n && offers[existingIdx].title === tOff.title) {
      offers[existingIdx].i18n = tOff.i18n;
      offersChanged = true;
    }
  });
  if (dbChanged) saveAccountsDb();
  if (offersChanged) saveOffersToStorage();
}
ensurePlatformAccountsAndTestRegistrations();
function updateAdminHeaderButtonsVisibility() {
  const show = Boolean(adminAuthenticated || (currentUser && String(currentUser.email || "").toLowerCase() === BACKOFFICE_ADMIN_EMAIL));
  const hBtn = document.getElementById("headerAdminBtn");
  const mBtn = document.getElementById("mobileAdminBtn");
  const dBtn = document.getElementById("dashAdminBtn");
  if (hBtn) hBtn.style.display = show ? "inline-flex" : "none";
  if (mBtn) mBtn.style.display = show ? "block" : "none";
  if (dBtn) dBtn.style.display = show ? "inline-flex" : "none";
}
let cloudSyncReady = false;
let cloudSyncPendingTimer = null;
let cloudSyncInFlight = false;
let cloudSyncLastState = {
  connected: true,
  backend: "api-sync",
  lastSyncAt: "Live",
  error: ""
};
let liveSyncChannel = null;
try {
  if (typeof BroadcastChannel === "function") {
    liveSyncChannel = new BroadcastChannel("ci4m_live_sync_v1");
  }
} catch (e) { }
function getSupabaseClientConfig() {
  try {
    const raw = localStorage.getItem("ci4m_supabase_cfg_v1");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.url && parsed.key) {
        return { url: String(parsed.url).trim(), key: String(parsed.key).trim() };
      }
    }
  } catch (e) { }
  return { url: "", key: "" };
}
function saveSupabaseClientConfig(e) {
  if (e) e.preventDefault();
  const url = String(document.getElementById("boSupabaseUrlInput")?.value || "").trim();
  const key = String(document.getElementById("boSupabaseKeyInput")?.value || "").trim();
  try {
    if (url && key) {
      localStorage.setItem("ci4m_supabase_cfg_v1", JSON.stringify({ url, key }));
      showToast("✓ Supabase Cloud credentials saved — syncing...");
    } else {
      localStorage.removeItem("ci4m_supabase_cfg_v1");
      showToast("✓ Switched to built-in /api/sync Cloud Store");
    }
  } catch (err) { }
  pushCloudDatabaseSync({ forceSync: true }).then(() => pullCloudDatabaseSync(false));
}
function buildCloudSyncHeaders() {
  const headers = { "Content-Type": "application/json" };
  const sb = getSupabaseClientConfig();
  if (sb.url && sb.key) {
    headers["x-supabase-url"] = sb.url;
    headers["x-supabase-key"] = sb.key;
  }
  return headers;
}
function scheduleCloudSyncPush(extraPayload = null) {
  if (!cloudSyncReady) return;
  try {
    if (liveSyncChannel) {
      liveSyncChannel.postMessage({ type: "ci4m_state_changed", ts: Date.now() });
    }
  } catch (e) { }
  if (cloudSyncPendingTimer) clearTimeout(cloudSyncPendingTimer);
  cloudSyncPendingTimer = setTimeout(() => {
    pushCloudDatabaseSync(extraPayload);
  }, 180);
}
async function pushCloudDatabaseSync(extraPayload = null) {
  if (!cloudSyncReady || typeof fetch !== "function") return;
  const userCreatedOrEdited = offers.filter(o => o.createdByUser || o.id > 100000);
  const payload = {
    actorEmail: currentUser ? String(currentUser.email || "").trim().toLowerCase() : "",
    adminSession: Boolean(adminAuthenticated),
    accounts: accountsDb,
    userOffers: userCreatedOrEdited,
    proposals: swapProposals,
    watchlist: watchlistAlerts,
    deletedOfferIds,
    ...(extraPayload && typeof extraPayload === "object" ? extraPayload : {})
  };
  try {
    const resp = await fetch("/api/sync", {
      method: "POST",
      headers: buildCloudSyncHeaders(),
      body: JSON.stringify(payload)
    });
    if (resp && resp.ok) {
      const data = await resp.json();
      if (data && data.ok) {
        cloudSyncLastState = {
          connected: true,
          backend: data.backend || "api-sync",
          lastSyncAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          error: ""
        };
        applyMergedCloudState(data);
      }
    }
  } catch (err) {
    cloudSyncLastState.error = "Offline / Local fallback";
  }
}
function applyMergedCloudState(remote) {
  if (!remote || typeof remote !== "object") return false;
  let changed = false;
  if (Array.isArray(remote.deletedOfferIds)) {
    remote.deletedOfferIds.forEach(id => {
      const numId = Number(id);
      if (Number.isFinite(numId) && !deletedOfferIds.includes(numId)) {
        deletedOfferIds.push(numId);
        changed = true;
      }
    });
  }
  if (remote.accounts && typeof remote.accounts === "object") {
    Object.entries(remote.accounts).forEach(([k, acc]) => {
      if (!acc || typeof acc !== "object") return;
      const emailKey = String(acc.email || k || "").trim().toLowerCase();
      if (!emailKey) return;
      if (Array.isArray(remote.deletedAccountEmails) && remote.deletedAccountEmails.includes(emailKey)) return;
      const existing = accountsDb[emailKey];
      if (!existing || JSON.stringify(existing) !== JSON.stringify({ ...existing, ...acc })) {
        accountsDb[emailKey] = { ...(existing || {}), ...acc };
        changed = true;
      }
    });
  }
  if (remote.authGateways && typeof remote.authGateways === "object") {
    if (remote.authGateways.brevoApiKey) serverConfiguredGateways.brevo = true;
    if (remote.authGateways.resendApiKey) serverConfiguredGateways.resend = true;
    if (remote.authGateways.textbeeKey) serverConfiguredGateways.textbee = true;
    if (remote.authGateways.smsAdvertToken) serverConfiguredGateways.smsAdvert = true;
    if (remote.authGateways.twilioToken) serverConfiguredGateways.twilio = true;
    try {
      const localGw = getAuthGatewaysConfig();
      const mergedGw = { ...localGw };
      Object.entries(remote.authGateways).forEach(([gk, gv]) => {
        const s = String(gv || "").trim();
        if (s && !s.startsWith("•••") && !/^\*+$/.test(s)) {
          mergedGw[gk] = s;
        }
      });
      localStorage.setItem("ci4m_auth_gateways_v1", JSON.stringify(mergedGw));
    } catch (err) { }
  }
  if (Array.isArray(remote.userOffers)) {
    const delSet = new Set(deletedOfferIds.map(Number));
    remote.userOffers.forEach(rOff => {
      if (!rOff || !rOff.id) return;
      const oid = Number(rOff.id);
      if (delSet.has(oid)) return;
      const idx = offers.findIndex(o => Number(o.id) === oid);
      if (idx === -1) {
        offers.unshift(rOff);
        changed = true;
      } else if (JSON.stringify(offers[idx]) !== JSON.stringify({ ...offers[idx], ...rOff })) {
        offers[idx] = { ...offers[idx], ...rOff };
        changed = true;
      }
    });
  }
  if (Array.isArray(remote.proposals)) {
    const delPropSet = new Set(deletedProposalIds.map(Number));
    remote.proposals.forEach(p => {
      if (!p || !p.id) return;
      const pid = Number(p.id);
      if (delPropSet.has(pid)) return;
      const idx = swapProposals.findIndex(x => Number(x.id) === pid);
      if (idx === -1) {
        swapProposals.unshift(p);
        changed = true;
      } else if (JSON.stringify(swapProposals[idx]) !== JSON.stringify({ ...swapProposals[idx], ...p })) {
        swapProposals[idx] = { ...swapProposals[idx], ...p };
        changed = true;
      }
    });
  }
  if (Array.isArray(remote.watchlist)) {
    const delWlSet = new Set(deletedWatchlistIds.map(Number));
    const existingWlIds = new Set(watchlistAlerts.map(w => Number(w.id)));
    remote.watchlist.forEach(w => {
      if (w && w.id && !delWlSet.has(Number(w.id)) && !existingWlIds.has(Number(w.id))) {
        watchlistAlerts.unshift(w);
        changed = true;
      }
    });
  }
  if (changed) {
    try {
      localStorage.setItem("ci4m_accounts_db", JSON.stringify(accountsDb));
      localStorage.setItem("ci4m_offers_v4", JSON.stringify(offers));
      localStorage.setItem("ci4m_user_offers_v1", JSON.stringify(offers.filter(o => o.createdByUser || o.id > 100000)));
      localStorage.setItem("ci4m_deleted_offers_v1", JSON.stringify(deletedOfferIds));
      swapProposals = normalizeSeedProposals(swapProposals);
      localStorage.setItem("ci4m_proposals", JSON.stringify(swapProposals));
      localStorage.setItem("ci4m_watchlist_alerts", JSON.stringify(watchlistAlerts));
    } catch (e) { }
    renderOffers();
    renderMapPinsAndPanel();
    if (typeof checkAndNotifyFavoritePriceChangesForCurrentUser === "function") checkAndNotifyFavoritePriceChangesForCurrentUser(true);
    if (document.getElementById("adminModal")?.classList.contains("open")) {
      const searchFocused = document.activeElement && document.activeElement.id === "adminListingSearchInput";
      if (!searchFocused) renderAdminModalContent();
    }
  }
  return changed;
}
async function pullCloudDatabaseSync(silent = true) {
  if (typeof fetch !== "function" || cloudSyncInFlight) return;
  cloudSyncInFlight = true;
  try {
    const resp = await fetch("/api/sync", {
      method: "GET",
      headers: buildCloudSyncHeaders()
    });
    if (resp && resp.ok) {
      const data = await resp.json();
      if (data && data.ok) {
        cloudSyncLastState = {
          connected: true,
          backend: data.backend || "api-sync",
          lastSyncAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          error: ""
        };
        const remoteAccCount = data.accounts ? Object.keys(data.accounts).length : 0;
        if (remoteAccCount === 0 && Object.keys(accountsDb).length > 0) {
          cloudSyncInFlight = false;
          await pushCloudDatabaseSync();
          if (!silent) showToast("✓ Cloud Database initialized & synced");
          if (document.getElementById("adminModal")?.classList.contains("open")) renderAdminModalContent();
          return;
        }
        applyMergedCloudState(data);
        if (!silent) {
          showToast(`✓ Cloud Sync complete (${Object.keys(accountsDb).length} users · ${offers.length} listings)`);
          if (document.getElementById("adminModal")?.classList.contains("open")) renderAdminModalContent();
        }
      }
    }
  } catch (err) {
    cloudSyncLastState.error = "Local mode";
  } finally {
    cloudSyncInFlight = false;
  }
}
function initCloudSyncEngine() {
  cloudSyncReady = true;
  pullCloudDatabaseSync(true).then(() => {
    pushCloudDatabaseSync();
  });
  if (liveSyncChannel) {
    liveSyncChannel.onmessage = () => {
      pullCloudDatabaseSync(true);
    };
  }
  window.addEventListener("storage", (ev) => {
    if (!ev || !ev.key) return;
    if (["ci4m_accounts_db", "ci4m_offers_v4", "ci4m_user_offers_v1", "ci4m_proposals"].includes(ev.key)) {
      try {
        if (ev.key === "ci4m_accounts_db" && ev.newValue) {
          accountsDb = { ...accountsDb, ...JSON.parse(ev.newValue) };
        }
        if (ev.key === "ci4m_offers_v4" && ev.newValue) {
          offers = JSON.parse(ev.newValue);
        }
        if (ev.key === "ci4m_proposals" && ev.newValue) {
          swapProposals = JSON.parse(ev.newValue);
        }
      } catch (e) { }
      renderOffers();
      if (document.getElementById("adminModal")?.classList.contains("open")) {
        renderAdminModalContent();
      }
    }
  });
  setInterval(() => {
    if (document.getElementById("adminModal")?.classList.contains("open")) {
      pullCloudDatabaseSync(true);
    }
  }, 10000);
}
function openAdminModal(tab = "users") {
  ensurePlatformAccountsAndTestRegistrations();
  currentAdminTab = tab || "users";
  closeAllModalsSilently();
  document.body.classList.add("mobile-started");
  document.getElementById("adminModal")?.classList.add("open");
  document.body.classList.add("modal-open");
  renderAdminModalContent();
  syncUrlWithRoute("/admin");
  pullCloudDatabaseSync(true);
}
function closeAdminModal() {
  document.getElementById("adminModal")?.classList.remove("open");
  document.body.classList.remove("modal-open");
  syncUrlWithRoute(document.body.classList.contains("mobile-started") ? "/start" : "/");
}
function handleAdminBackofficeLogin(e) {
  if (e) e.preventDefault();
  const emailIn = document.getElementById("adminLoginEmailInput");
  const passIn = document.getElementById("adminLoginPassInput");
  const remIn = document.getElementById("adminRememberMeCheck");
  const email = String(emailIn ? emailIn.value : "").trim().toLowerCase();
  const pass = String(passIn ? passIn.value : "").trim();
  const rememberMe = remIn ? Boolean(remIn.checked) : true;
  if ((email === BACKOFFICE_ADMIN_EMAIL || email === "jeka7ro@gmail.com") && verifyAdminPasswordSync(pass)) {
    adminAuthenticated = true;
    adminLoginErrorMsg = "";
    try {
      if (rememberMe) {
        localStorage.setItem("ci4m_admin_session_v1", BACKOFFICE_ADMIN_EMAIL);
        localStorage.setItem("ci4m_admin_remember_v1", JSON.stringify({
          email: BACKOFFICE_ADMIN_EMAIL,
          remember: true
        }));
      } else {
        localStorage.removeItem("ci4m_admin_session_v1");
        localStorage.removeItem("ci4m_admin_remember_v1");
      }
    } catch (err) { }
    if (typeof fetch === "function") {
      fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "admin_login", email, password: pass })
      }).catch(() => { });
    }
    updateAdminHeaderButtonsVisibility();
    renderAdminModalContent();
    showToast("✓ Signed in to ChangeIt4Me Backoffice");
  } else {
    adminLoginErrorMsg = "Invalid email or password.";
    renderAdminModalContent();
  }
}
function logoutAdminBackoffice() {
  adminAuthenticated = false;
  adminLoginErrorMsg = "";
  try {
    localStorage.removeItem("ci4m_admin_session_v1");
  } catch (e) { }
  updateAdminHeaderButtonsVisibility();
  renderAdminModalContent();
  showToast("✓ Signed out of Backoffice");
}
function switchAdminTab(tab) {
  currentAdminTab = tab;
  renderAdminModalContent();
}
function setAdminListingsFilter(mode) {
  adminListingFilterMode = mode;
  renderAdminModalContent();
}
function setAdminUsersFilter(mode) {
  adminUsersFilterMode = mode;
  renderAdminModalContent();
}
function onAdminSearchInput(val) {
  adminListingSearchQuery = String(val || "");
  renderAdminModalContent();
  const input = document.getElementById("adminListingSearchInput");
  if (input) {
    input.focus();
    const len = input.value.length;
    try { input.setSelectionRange(len, len); } catch (e) { }
  }
}
function publishAdminWizardDraftNow() {
  if (!wizData || !String(wizData.titleHave || "").trim()) return;
  const fallbackCoords = COUNTRY_COORDS[wizData.country] || { lat: 44.4268, lng: 26.1025 };
  const chosenCurr = wizData.originalCurrency || currentCurrency;
  const chosenAmt = sanitizeNumericAmount(wizData.originalAmount, 0) || sanitizeNumericAmount(wizData.valueEur, 0) || 15000;
  const exactEur = convertToEur(chosenAmt, chosenCurr);
  const newOffer = {
    id: Date.now(),
    createdByUser: true,
    ownerEmail: wizData.email || currentUser?.email || "alex.ionescu@test.ro",
    category: wizData.category || "cars",
    country: wizData.country || "Romania",
    city: wizData.city || "Bucharest",
    lat: wizData.lat || fallbackCoords.lat,
    lng: wizData.lng || fallbackCoords.lng,
    valueEur: exactEur,
    originalAmount: chosenAmt,
    originalCurrency: chosenCurr,
    dealType: wizData.dealType || "1to1",
    owner: wizData.owner || currentUser?.name || "Verified Member",
    verified: true,
    matchScore: 99,
    image: wizData.image || DEFAULT_WIZ_DATA.image,
    images: Array.isArray(wizData.images) && wizData.images.length > 0 ? [...wizData.images] : [wizData.image || DEFAULT_WIZ_DATA.image],
    specs: wizData.specs || "Verified Condition",
    title: wizData.titleHave,
    want: wizData.titleWant || "Direct 1:1 Swap",
    desc: wizData.desc || wizData.titleHave
  };
  offers.unshift(newOffer);
  saveOffersToStorage();
  wizStep = 1;
  wizData = { ...DEFAULT_WIZ_DATA };
  persistWizardDraft();
  renderOffers();
  renderMapPinsAndPanel();
  renderAdminModalContent();
  showToast(`✓ Published: ${newOffer.title}`);
}
function restoreDeletedOffersFromAdmin() {
  if (!adminAuthenticated) return;
  deletedOfferIds = [];
  localStorage.setItem("ci4m_deleted_offers_v1", "[]");
  ensurePlatformAccountsAndTestRegistrations();
  const existingIds = new Set(offers.map(o => o.id));
  (window.INITIAL_OFFERS || []).forEach(baseOff => {
    if (!existingIds.has(baseOff.id)) {
      offers.push(baseOff);
    }
  });
  saveOffersToStorage();
  if (typeof scheduleCloudSyncPush === "function") scheduleCloudSyncPush({ clearDeletedOffers: true });
  renderOffers();
  renderMapPinsAndPanel();
  renderAdminModalContent();
  showToast("✓ Restored archived listings");
}
function seedAdminTestRegistrationsAndOffers() {
  deletedOfferIds = deletedOfferIds.filter(id => id < 950100 || id > 950199);
  INITIAL_TEST_REGISTRATIONS_AND_OFFERS.accounts.forEach(acc => {
    const k = acc.email.toLowerCase();
    accountsDb[k] = { ...(accountsDb[k] || {}), ...acc };
  });
  saveAccountsDb();
  [...INITIAL_TEST_REGISTRATIONS_AND_OFFERS.listings].reverse().forEach(tOff => {
    const existingIdx = offers.findIndex(o => o.id === tOff.id);
    if (existingIdx >= 0) {
      offers.splice(existingIdx, 1);
    }
    offers.unshift({ ...tOff });
  });
  saveOffersToStorage();
  updateFavCountUI();
  renderOffers();
  renderMapPinsAndPanel();
  renderAdminModalContent();
}
function handleAdminCreateQuickAccount(e) {
  if (!adminAuthenticated) return;
  if (e) e.preventDefault();
  const name = String(document.getElementById("boNewUserName")?.value || "").trim();
  const email = String(document.getElementById("boNewUserEmail")?.value || "").trim();
  const phone = String(document.getElementById("boNewUserPhone")?.value || "").trim();
  const city = String(document.getElementById("boNewUserCity")?.value || "Bucharest").trim();
  const plan = String(document.getElementById("boNewUserPlan")?.value || "starter");
  if (!name || !email) return;
  const emailKey = email.toLowerCase();
  accountsDb[emailKey] = {
    id: `USR-${Math.floor(1000 + Math.random() * 8999)}`,
    name,
    email,
    phone: phone || "+40 722 000 000",
    country: "Romania",
    city,
    prefLang: currentLang,
    prefCurrency: currentCurrency,
    plan,
    freeSwaps: plan === "pro" ? 999 : (plan === "pack" ? 25 : 10),
    kycVerified: true,
    isTestRegistration: true,
    registeredAt: new Date().toISOString().slice(0, 16).replace("T", " ")
  };
  saveAccountsDb();
  renderAdminModalContent();
  showToast(`✓ User created: ${name} (${email})`);
}
function adminDeleteAccount(emailKey, silent = false) {
  if (!adminAuthenticated) return;
  const k = String(emailKey || "").toLowerCase();
  if (!k || k === BACKOFFICE_ADMIN_EMAIL) return;
  const name = accountsDb[k]?.name || k;
  delete accountsDb[k];
  saveAccountsDb();
  if (typeof scheduleCloudSyncPush === "function") scheduleCloudSyncPush({ deletedAccountEmails: [k] });
  renderAdminModalContent();
  if (!silent) showToast(`✓ Account removed: ${name}`);
}
function adminLoginAsUser(emailKey) {
  if (!adminAuthenticated) return;
  const acc = accountsDb[String(emailKey || "").toLowerCase()];
  if (!acc) return;
  activateUserAccount(acc);
  renderAdminModalContent();
  showToast(`✓ Switched session to ${acc.name}`);
}
function adminGrantUserSwaps(emailKey, mode) {
  if (!adminAuthenticated) return;
  const key = String(emailKey || "").toLowerCase();
  const acc = accountsDb[key];
  if (!acc) return;
  if (mode === "pro") {
    acc.plan = "pro";
    acc.freeSwaps = 999;
  } else {
    acc.freeSwaps = (Number(acc.freeSwaps) || 0) + 10;
  }
  accountsDb[key] = acc;
  saveAccountsDb();
  if (currentUser && String(currentUser.email || "").toLowerCase() === key) {
    currentUser.plan = acc.plan;
    currentUser.freeSwaps = acc.freeSwaps;
    localStorage.setItem("ci4m_user", JSON.stringify(currentUser));
    renderUserHeaderState();
  }
  renderAdminModalContent();
  showToast(`✓ Updated account: ${acc.name}`);
}
function adminFilterOffersByUser(queryText) {
  adminListingSearchQuery = String(queryText || "");
  adminListingFilterMode = "all";
  currentAdminTab = "listings";
  renderAdminModalContent();
}
function getAccountLinkedOffers(acc) {
  if (!acc) return [];
  const emailKey = String(acc.email || "").trim().toLowerCase();
  if (!emailKey) return [];
  return offers.filter(o => {
    const oEmail = String(o.ownerEmail || "").trim().toLowerCase();
    if (oEmail) return isSameUserEmailAlias(oEmail, emailKey);
    return Boolean(o.owner && normalizeSearchText(o.owner) === normalizeSearchText(acc.name || ""));
  });
}
function renderAdminModalContent() {
  const container = document.getElementById("adminBodyContent");
  if (!container) return;
  const prevBoScrollTop = container.querySelector(".bo-content-scroll")?.scrollTop || 0;
  ensurePlatformAccountsAndTestRegistrations();
  if (!adminAuthenticated) {
    let savedAdminCreds = { email: "", pass: "", remember: true };
    try {
      const rawRem = localStorage.getItem("ci4m_admin_remember_v1");
      if (rawRem) {
        const parsed = JSON.parse(rawRem);
        if (parsed && parsed.remember) {
          savedAdminCreds = {
            email: String(parsed.email || ""),
            pass: String(parsed.pass || ""),
            remember: true
          };
        }
      }
    } catch (err) { }
    container.innerHTML = `
      <div class="bo-login-screen">
        <div class="bo-login-card">
          <div style="display:flex;flex-direction:column;align-items:center;text-align:center;margin-bottom:24px;">
            <div class="logo" style="display:inline-flex;flex-direction:column;align-items:center;gap:10px;color:#ffffff;">
              <svg width="52" height="52" viewBox="0 0 32 32" fill="none" aria-hidden="true" style="box-shadow:0 0 0 2px rgba(255,255,255,0.28), 0 10px 28px rgba(0,0,0,0.35);border-radius:50%;">
                <circle cx="16" cy="16" r="16" fill="#0d8a5e"></circle>
                <path d="M10 16a6 6 0 0 1 10.2-4.2" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round"></path>
                <path d="M22 16a6 6 0 0 1-10.2 4.2" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round"></path>
                <path d="M19.2 9.2 20.6 12.4 17.4 12" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
                <path d="M12.8 22.8 11.4 19.6 14.6 20" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
              </svg>
              <div>
                <strong style="display:block;font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;">ChangeIt4Me</strong>
                <span style="display:block;font-size:12px;font-weight:600;color:#ffffff;letter-spacing:0.04em;text-transform:uppercase;margin-top:2px;">Backoffice</span>
              </div>
            </div>
            <h2 style="font-size:18px;font-weight:700;color:#d8ece8;margin:14px 0 0;">Sign in</h2>
          </div>
          ${adminLoginErrorMsg ? `
            <div style="margin-bottom:14px;padding:10px 13px;border-radius:10px;background:rgba(239,68,68,0.18);border:1px solid rgba(248,113,113,0.45);color:#fecaca;font-size:12.5px;font-weight:600;">
              ${adminLoginErrorMsg}
            </div>
          ` : ""}
          <form onsubmit="handleAdminBackofficeLogin(event)" autocomplete="on" style="display:grid;gap:14px;">
            <div>
              <label for="adminLoginEmailInput" style="display:block;font-size:12px;font-weight:700;color:#d1e7e3;margin-bottom:6px;">Email</label>
              <input type="email" id="adminLoginEmailInput" name="email" autocomplete="username" required placeholder="Email"
                value="${savedAdminCreds.email.replace(/"/g, '&quot;')}"
                style="width:100%;height:44px;padding:9px 18px;line-height:1.25;border-radius:999px;border:1px solid rgba(169,255,202,0.28);background:rgba(5,20,18,0.75);color:#fff;font-size:14px;outline:none;" />
            </div>
            <div>
              <label for="adminLoginPassInput" style="display:block;font-size:12px;font-weight:700;color:#d1e7e3;margin-bottom:6px;">Password</label>
              <div style="position:relative;">
                <input type="password" id="adminLoginPassInput" name="password" autocomplete="current-password" required placeholder="Password"
                  value="${savedAdminCreds.pass.replace(/"/g, '&quot;')}"
                  style="width:100%;height:44px;padding:9px 44px 9px 18px;line-height:1.25;border-radius:999px;border:1px solid rgba(169,255,202,0.28);background:rgba(5,20,18,0.75);color:#fff;font-size:14px;outline:none;" />
                <button type="button" onclick="togglePasswordVisibility('adminLoginPassInput', this)"
                  style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:transparent;border:0;color:#ffffff;cursor:pointer;padding:4px;" aria-label="Show password">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              </div>
            </div>
            <label style="display:inline-flex;align-items:center;gap:8px;cursor:pointer;user-select:none;font-size:13px;font-weight:600;color:#cfe3df;margin-top:2px;">
              <input type="checkbox" id="adminRememberMeCheck" ${savedAdminCreds.remember ? 'checked' : ''}
                style="width:16px;height:16px;accent-color:#ffffff;cursor:pointer;margin:0;" />
              <span>Remember me</span>
            </label>
            <button type="submit" class="bo-btn bo-btn-mint" style="height:44px;font-size:14px;font-weight:800;border-radius:999px !important;margin-top:4px;">
              Sign in →
            </button>
          </form>
          <div style="margin-top:16px;padding-top:14px;border-top:1px solid rgba(169,255,202,0.14);display:flex;justify-content:center;">
            <button type="button" class="bo-btn" style="background:transparent;border-color:rgba(255,255,255,0.2);color:#cfe3df;font-size:12px;" onclick="closeAdminModal()">
              ← Back to ChangeIt4Me
            </button>
          </div>
        </div>
      </div>
    `;
    return;
  }
  const allAccountsMap = { ...accountsDb };
  if (currentUser && currentUser.email) {
    const k = currentUser.email.toLowerCase();
    allAccountsMap[k] = { ...(allAccountsMap[k] || {}), ...currentUser };
  }
  const accountsList = Object.values(allAccountsMap).sort((a, b) => {
    const aRecent = Boolean(a.isTestRegistration || (!a.isPartnerSeed && a.role !== "superadmin"));
    const bRecent = Boolean(b.isTestRegistration || (!b.isPartnerSeed && b.role !== "superadmin"));
    if (aRecent !== bRecent) return aRecent ? -1 : 1;
    if (aRecent && bRecent) {
      const regCmp = String(b.registeredAt || "").localeCompare(String(a.registeredAt || ""));
      if (regCmp !== 0) return regCmp;
    }
    if (a.role === "superadmin" && b.role !== "superadmin") return -1;
    if (b.role === "superadmin" && a.role !== "superadmin") return 1;
    return String(a.name || "").localeCompare(String(b.name || ""));
  });
  const recentAccountsCount = accountsList.filter(a => a.isTestRegistration || (!a.isPartnerSeed && a.role !== "superadmin")).length;
  const proAccountsCount = accountsList.filter(a => a.plan === "pro").length;
  const packAccountsCount = accountsList.filter(a => a.plan === "pack").length;
  const userCreatedOffers = offers
    .filter(o => o.createdByUser || o.id > 100000)
    .sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
  const totalGmvEur = offers.reduce((acc, o) => acc + (Number(o.valueEur) || 0), 0);
  const totalGmvFormatted = formatAmountInCurrentCurrency(convertFromEur(totalGmvEur, currentCurrency), currentCurrency);
  const hasWizDraft = Boolean(wizData && String(wizData.titleHave || "").trim());
  const tabTitles = {
    overview: "Overview",
    users: "Users & Accounts",
    listings: "Catalog Listings",
    proposals: "Swap Proposals",
    billing: "Subscriptions & Plans",
    compliance: "GDPR & Compliance"
  };
  const activeTitle = tabTitles[currentAdminTab] || tabTitles.users;
  let mainModuleHtml = "";
  if (currentAdminTab === "users") {
    let filteredUsers = [...accountsList];
    if (adminUsersFilterMode === "test") {
      filteredUsers = filteredUsers.filter(a => a.isTestRegistration || (!a.isPartnerSeed && a.role !== "superadmin"));
    } else if (adminUsersFilterMode === "pro") {
      filteredUsers = filteredUsers.filter(a => a.plan === "pro");
    } else if (adminUsersFilterMode === "pack") {
      filteredUsers = filteredUsers.filter(a => a.plan === "pack");
    } else if (adminUsersFilterMode === "starter") {
      filteredUsers = filteredUsers.filter(a => !a.plan || a.plan === "starter");
    }
    if (adminListingSearchQuery.trim()) {
      const qNorm = normalizeSearchText(adminListingSearchQuery);
      filteredUsers = filteredUsers.filter(a => {
        const hay = normalizeSearchText(`${a.id || ""} ${a.name || ""} ${a.email || ""} ${a.phone || ""} ${a.city || ""} ${a.country || ""} ${a.plan || ""}`);
        return hay.includes(qNorm);
      });
    }
    mainModuleHtml = `
      <div class="bo-card" style="padding:16px 20px;">
        <form onsubmit="handleAdminCreateQuickAccount(event)" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:12px;align-items:end;">
          <div>
            <label style="display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:6px;">Full name</label>
            <input type="text" id="boNewUserName" required placeholder="Full name" class="input-light" style="font-size:13px;" />
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:6px;">Email</label>
            <input type="email" id="boNewUserEmail" required placeholder="Email address" class="input-light" style="font-size:13px;" />
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:6px;">Phone</label>
            <input type="text" id="boNewUserPhone" placeholder="+40 / +49 / +43..." class="input-light" style="font-size:13px;" />
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:6px;">City</label>
            <input type="text" id="boNewUserCity" placeholder="City" class="input-light" style="font-size:13px;" />
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:6px;">Plan</label>
            <select id="boNewUserPlan" class="input-light" style="font-size:13px;">
              <option value="starter">Starter (10 Free)</option>
              <option value="pack">+15 Swaps Pack (€9)</option>
              <option value="pro">PRO Unlimited (€19)</option>
            </select>
          </div>
          <button type="submit" class="bo-btn bo-btn-primary" style="height:42px;font-size:13px;">+ Add User</button>
        </form>
      </div>
      <div class="bo-card bo-table-card">
        <div class="bo-card-toolbar">
          <div class="bo-segmented-control" role="tablist" aria-label="Filter users">
            <button type="button" class="bo-seg-btn ${adminUsersFilterMode === 'all' ? 'active' : ''}" onclick="setAdminUsersFilter('all')">
              All (${accountsList.length})
            </button>
            <button type="button" class="bo-seg-btn ${adminUsersFilterMode === 'test' ? 'active' : ''}" onclick="setAdminUsersFilter('test')">
              Recent Signups (${recentAccountsCount})
            </button>
            <button type="button" class="bo-seg-btn ${adminUsersFilterMode === 'pro' ? 'active' : ''}" onclick="setAdminUsersFilter('pro')">
              PRO (${proAccountsCount})
            </button>
            <button type="button" class="bo-seg-btn ${adminUsersFilterMode === 'pack' ? 'active' : ''}" onclick="setAdminUsersFilter('pack')">
              Pack +15 (${packAccountsCount})
            </button>
            <button type="button" class="bo-seg-btn ${adminUsersFilterMode === 'starter' ? 'active' : ''}" onclick="setAdminUsersFilter('starter')">
              Starter (${accountsList.length - proAccountsCount - packAccountsCount})
            </button>
          </div>
          <span style="font-size:12.5px;color:#64748b;font-weight:600;font-variant-numeric:tabular-nums;">${filteredUsers.length} users</span>
        </div>
        <div class="bo-table-wrap">
          <table class="bo-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Contact</th>
                <th>Location</th>
                <th>Plan & Credits</th>
                <th>Listings</th>
                <th>Joined</th>
                <th style="text-align:right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filteredUsers.map(acc => {
      const emailKey = String(acc.email || "").toLowerCase();
      const linkedOffers = getAccountLinkedOffers(acc);
      const isSuper = acc.role === "superadmin";
      const isActiveUser = Boolean(currentUser && String(currentUser.email || "").toLowerCase() === emailKey);
      const initials = String(acc.name || "U").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
      const planBadge = acc.plan === "pro"
        ? `<span class="bo-badge bo-badge-pro">PRO ∞</span>`
        : acc.plan === "pack"
          ? `<span class="bo-badge bo-badge-pack">Pack · ${acc.freeSwaps ?? 15} left</span>`
          : `<span class="bo-badge bo-badge-starter">Starter · ${acc.freeSwaps ?? 10}/10</span>`;
      return `
                  <tr>
                    <td>
                      <div style="display:flex;align-items:center;gap:11px;">
                        <span class="bo-avatar ${isSuper ? 'is-super' : ''}">${initials}</span>
                        <div style="min-width:0;">
                          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                            <strong style="font-size:13.5px;font-weight:650;color:#0f172a;">${escapeHtml(acc.name || "Member")}</strong>
                            ${isSuper ? `<span class="bo-badge bo-badge-pro" style="font-size:10px;padding:1px 7px;">Admin</span>` : ""}
                            ${isActiveUser ? `<span class="bo-badge bo-badge-active" style="font-size:10px;padding:1px 7px;">Active</span>` : ""}
                          </div>
                          <span style="font-size:11.5px;color:#64748b;">${escapeHtml(acc.id || "USR-1000")} · Verified</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong style="display:block;font-size:12.5px;font-weight:600;color:#0f172a;">${escapeHtml(acc.email || "—")}</strong>
                      <span style="font-size:11.5px;color:#64748b;font-variant-numeric:tabular-nums;">${escapeHtml(acc.phone || "—")}</span>
                    </td>
                    <td>
                      <strong style="display:block;font-size:12.5px;font-weight:600;color:#0f172a;">${escapeHtml(acc.city || "Bucharest")}</strong>
                      <span style="font-size:11.5px;color:#64748b;">${escapeHtml(acc.country || "Romania")}</span>
                    </td>
                    <td>${planBadge}</td>
                    <td>
                      ${linkedOffers.length === 0 ? `<span style="font-size:12px;color:#94a3b8;">No listings</span>` : `
                        <div style="display:flex;flex-direction:column;gap:5px;align-items:flex-start;">
                          ${linkedOffers.map(lo => {
        const fullTitle = getOfferLocalized(lo).title;
        return `
                            <button type="button" class="bo-listing-pill" title="${escapeHtml(fullTitle)}"
                              onclick="openOfferModal(${lo.id}, 'details')">
                              <span class="bo-listing-pill-id">#${lo.id}</span>
                              <span class="bo-listing-pill-title">${escapeHtml(fullTitle)}</span>
                            </button>
                          `;
      }).join("")}
                        </div>
                      `}
                    </td>
                    <td><span style="font-size:12px;color:#64748b;font-variant-numeric:tabular-nums;">${escapeHtml((acc.registeredAt || "2026-11-11").split(" ")[0])}</span></td>
                    <td style="text-align:right;">
                      <div class="bo-row-actions">
                        <button type="button" class="bo-icon-btn" onclick="openAdminEditUserSheet('${emailKey.replace(/'/g, "\\'")}')" title="Edit user" aria-label="Edit user">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                        </button>
                        <button type="button" class="bo-icon-btn" onclick="adminLoginAsUser('${emailKey.replace(/'/g, "\\'")}')" title="Sign in as user" aria-label="Sign in as user">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                        </button>
                        ${!isSuper ? `
                          <button type="button" class="bo-icon-btn is-danger" onclick="requestAdminDeleteAccount('${emailKey.replace(/'/g, "\\'")}')" title="Delete account" aria-label="Delete account">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                          </button>
                        ` : ""}
                      </div>
                    </td>
                  </tr>
                `;
    }).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } else if (currentAdminTab === "listings") {
    const draftBannerHtml = hasWizDraft ? `
      <div class="bo-card" style="background:#fefce8;border-color:#fde047;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;">
        <div>
          <span style="background:#fef08a;color:#854d0e;font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;">Unpublished Draft (Step ${wizStep}/7)</span>
          <strong style="display:block;font-size:15px;color:#0f172a;margin-top:4px;">${escapeHtml(wizData.titleHave)} · ${escapeHtml(wizData.city || wizData.country || "Europe")}</strong>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button type="button" class="bo-btn bo-btn-primary" onclick="publishAdminWizardDraftNow()">Publish Now</button>
          <button type="button" class="bo-btn bo-btn-secondary" onclick="openWizardModal(${wizStep || 2});">Open in Wizard</button>
        </div>
      </div>
    ` : "";
    let listToShow = [...offers].sort((a, b) => {
      const aCustom = (a.createdByUser || a.id > 100000) ? 1 : 0;
      const bCustom = (b.createdByUser || b.id > 100000) ? 1 : 0;
      if (bCustom !== aCustom) return bCustom - aCustom;
      if (aCustom && bCustom) return (Number(b.id) || 0) - (Number(a.id) || 0);
      return 0;
    });
    if (adminListingFilterMode === "user") {
      listToShow = listToShow.filter(o => o.createdByUser || o.id > 100000);
    } else if (adminListingFilterMode === "seed") {
      listToShow = listToShow.filter(o => !(o.createdByUser || o.id > 100000));
    } else if (["cars", "real-estate", "electronics", "home-garden", "auto-parts", "clothing"].includes(adminListingFilterMode)) {
      listToShow = listToShow.filter(o => o.category === adminListingFilterMode);
    }
    if (adminListingSearchQuery.trim()) {
      listToShow = listToShow.filter(o => matchesSmartSearchQuery(o, adminListingSearchQuery));
    }
    mainModuleHtml = `
      ${draftBannerHtml}
      <div class="bo-card bo-table-card">
        <div class="bo-card-toolbar">
          <div class="bo-segmented-control" role="tablist" aria-label="Filter listings">
            <button type="button" class="bo-seg-btn ${adminListingFilterMode === 'all' ? 'active' : ''}" onclick="setAdminListingsFilter('all')">
              All (${offers.length})
            </button>
            <button type="button" class="bo-seg-btn ${adminListingFilterMode === 'user' ? 'active' : ''}" onclick="setAdminListingsFilter('user')">
              New Member Ads (${userCreatedOffers.length})
            </button>
            <button type="button" class="bo-seg-btn ${adminListingFilterMode === 'cars' ? 'active' : ''}" onclick="setAdminListingsFilter('cars')">
              Cars
            </button>
            <button type="button" class="bo-seg-btn ${adminListingFilterMode === 'real-estate' ? 'active' : ''}" onclick="setAdminListingsFilter('real-estate')">
              Real Estate
            </button>
            <button type="button" class="bo-seg-btn ${adminListingFilterMode === 'electronics' ? 'active' : ''}" onclick="setAdminListingsFilter('electronics')">
              Electronics
            </button>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
            ${deletedOfferIds.length > 0 ? `<button type="button" class="bo-btn bo-btn-secondary" onclick="restoreDeletedOffersFromAdmin()">↺ Restore (${deletedOfferIds.length})</button>` : ""}
            <button type="button" class="bo-btn bo-btn-primary" onclick="resetWizardDraft(); openWizardModal(1);">+ New Listing</button>
          </div>
        </div>
        <div class="bo-table-wrap">
          <table class="bo-table">
            <thead>
              <tr>
                <th>Listing</th>
                <th>Category & Specs</th>
                <th>Want in Return</th>
                <th>Value (${currentCurrency})</th>
                <th>Owner</th>
                <th>Location</th>
                <th style="text-align:right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${listToShow.map(item => {
      const loc = getOfferLocalized(item);
      const cleanSpecs = String(item.specs || "")
        .split("·")
        .map(s => s.trim())
        .filter(Boolean)
        .slice(0, 3)
        .join(" · ");
      const formattedPrice = formatOfferPrice(item, currentCurrency);
      const eurSubline = currentCurrency !== "EUR"
        ? `<span style="display:block;font-size:11px;color:#64748b;font-variant-numeric:tabular-nums;">€${Number(item.valueEur || 0).toLocaleString("en-US")}</span>`
        : "";
      return `
                  <tr>
                    <td style="min-width:250px;max-width:310px;">
                      <div style="display:flex;align-items:center;gap:12px;">
                        <img src="${item.image}" style="width:52px;height:38px;object-fit:cover;border-radius:8px;flex-shrink:0;border:1px solid rgba(15,23,42,0.08);" alt="" />
                        <div style="min-width:0;">
                          <strong style="display:block;font-size:13.5px;font-weight:650;color:#0f172a;line-height:1.3;">${escapeHtml(loc.title)}</strong>
                          <span style="display:inline-block;font-size:11px;font-weight:600;color:#64748b;margin-top:2px;font-variant-numeric:tabular-nums;">#${item.id}</span>
                        </div>
                      </div>
                    </td>
                    <td style="min-width:170px;max-width:230px;">
                      <strong style="display:block;font-size:12.5px;font-weight:600;color:#0f172a;">${escapeHtml(getCategoryLabel(item.category))}</strong>
                      <span style="display:block;font-size:11.5px;color:#64748b;line-height:1.35;margin-top:2px;">${escapeHtml(cleanSpecs)}</span>
                    </td>
                    <td style="min-width:210px;max-width:280px;">
                      <span class="bo-badge bo-badge-deal">${escapeHtml(getDealTypeLabel(item.dealType))}</span>
                      <span style="display:block;font-size:12px;color:#334155;line-height:1.35;margin-top:4px;">${escapeHtml(loc.want)}</span>
                    </td>
                    <td style="white-space:nowrap;">
                      <strong style="font-size:13.5px;font-weight:700;color:#0f172a;font-variant-numeric:tabular-nums;">${formattedPrice}</strong>
                      ${eurSubline}
                    </td>
                    <td>
                      <strong style="display:block;font-size:12.5px;font-weight:600;color:#0f172a;">${escapeHtml(item.owner || "Verified Member")}</strong>
                      <button type="button" class="bo-owner-link" onclick="adminListingSearchQuery='${(item.ownerEmail || item.owner || "").replace(/'/g, "\\'")}'; switchAdminTab('users');">
                        ${escapeHtml(item.ownerEmail || "View account")}
                      </button>
                    </td>
                    <td>
                      <strong style="display:block;font-size:12.5px;font-weight:600;color:#0f172a;">${escapeHtml(item.city)}</strong>
                      <span style="font-size:11.5px;color:#64748b;">${escapeHtml(item.country)}</span>
                    </td>
                    <td style="text-align:right;">
                      <div class="bo-row-actions">
                        <button type="button" class="bo-icon-btn" onclick="openOfferModal(${item.id}, 'details')" title="View listing" aria-label="View listing">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                        <button type="button" class="bo-icon-btn" onclick="openQuickEditListingSheet(${item.id})" title="Edit listing" aria-label="Edit listing">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                        </button>
                        <button type="button" class="bo-icon-btn is-danger" onclick="requestDeleteListing(${item.id})" title="Delete listing" aria-label="Delete listing">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
    }).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } else if (currentAdminTab === "overview") {
    const catStats = ["cars", "real-estate", "electronics", "home-garden", "auto-parts", "clothing"].map(cat => {
      const items = offers.filter(o => o.category === cat);
      const sumEur = items.reduce((s, o) => s + (Number(o.valueEur) || 0), 0);
      return { cat, label: getCategoryLabel(cat), count: items.length, sumEur };
    });
    mainModuleHtml = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(360px,100%),1fr));gap:18px;">
        <div class="bo-card bo-table-card">
          <div class="bo-card-toolbar">
            <strong style="font-size:15px;font-weight:700;color:#0f172a;">Recent Users</strong>
            <button type="button" class="bo-btn bo-btn-secondary" onclick="switchAdminTab('users')">View All (${accountsList.length}) →</button>
          </div>
          <div class="bo-table-wrap">
            <table class="bo-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email & City</th>
                  <th>Plan</th>
                  <th style="text-align:right;"></th>
                </tr>
              </thead>
              <tbody>
                ${accountsList.slice(0, 6).map(acc => `
                  <tr>
                    <td><strong style="font-weight:650;color:#0f172a;">${escapeHtml(acc.name)}</strong></td>
                    <td><span style="color:#0f172a;font-weight:500;">${escapeHtml(acc.email)}</span><br/><span style="font-size:11.5px;color:#64748b;">${escapeHtml(acc.city || "Bucharest")}, ${escapeHtml(acc.country)}</span></td>
                    <td><span class="bo-badge ${acc.plan === 'pro' ? 'bo-badge-pro' : acc.plan === 'pack' ? 'bo-badge-pack' : 'bo-badge-starter'}">${(acc.plan || "starter").toUpperCase()}</span></td>
                    <td style="text-align:right;">
                      <div class="bo-row-actions">
                        <button type="button" class="bo-icon-btn" onclick="openAdminEditUserSheet('${(acc.email || "").toLowerCase().replace(/'/g, "\\'")}')" title="Edit user" aria-label="Edit user">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                        </button>
                        <button type="button" class="bo-icon-btn" onclick="adminFilterOffersByUser('${(acc.email || "").replace(/'/g, "\\'")}')" title="View user listings" aria-label="View user listings">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>
        <div class="bo-card bo-table-card">
          <div class="bo-card-toolbar">
            <strong style="font-size:15px;font-weight:700;color:#0f172a;">Recent Listings</strong>
            <button type="button" class="bo-btn bo-btn-secondary" onclick="setAdminListingsFilter('user'); switchAdminTab('listings');">View All (${offers.length}) →</button>
          </div>
          <div class="bo-table-wrap">
            <table class="bo-table">
              <thead>
                <tr>
                  <th>Listing</th>
                  <th>Owner</th>
                  <th>Value</th>
                  <th style="text-align:right;"></th>
                </tr>
              </thead>
              <tbody>
                ${userCreatedOffers.slice(0, 6).map(item => `
                  <tr>
                    <td style="max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${escapeHtml(getOfferLocalized(item).title)}"><strong style="color:#64748b;font-weight:600;">#${item.id}</strong> · <strong style="color:#0f172a;font-weight:650;">${escapeHtml(getOfferLocalized(item).title)}</strong></td>
                    <td><span style="color:#0f172a;font-weight:600;">${escapeHtml(item.owner)}</span><br/><span style="font-size:11.5px;color:#64748b;">${escapeHtml(item.ownerEmail || "")}</span></td>
                    <td><strong style="font-variant-numeric:tabular-nums;color:#0f172a;">${formatOfferPrice(item, currentCurrency)}</strong></td>
                    <td style="text-align:right;">
                      <div class="bo-row-actions">
                        <button type="button" class="bo-icon-btn" onclick="openOfferModal(${item.id}, 'details')" title="View listing" aria-label="View listing">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                        <button type="button" class="bo-icon-btn" onclick="openQuickEditListingSheet(${item.id})" title="Edit listing" aria-label="Edit listing">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div class="bo-card bo-table-card">
        <div class="bo-card-toolbar">
          <strong style="font-size:15px;font-weight:700;color:#0f172a;">Catalog Breakdown by Category (${offers.length} Listings · ${totalGmvFormatted})</strong>
        </div>
        <div class="bo-table-wrap">
          <table class="bo-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Listings</th>
                <th>Share</th>
                <th>Volume (${currentCurrency})</th>
                <th style="text-align:right;"></th>
              </tr>
            </thead>
            <tbody>
              ${catStats.map(cs => {
      const pct = offers.length > 0 ? Math.round((cs.count / offers.length) * 100) : 0;
      return `
                  <tr>
                    <td><strong style="color:#0f172a;font-weight:650;">${escapeHtml(cs.label)}</strong></td>
                    <td style="font-variant-numeric:tabular-nums;">${cs.count}</td>
                    <td>
                      <div style="display:flex;align-items:center;gap:10px;">
                        <div style="width:110px;height:7px;background:#e2e8f0;border-radius:999px;overflow:hidden;">
                          <div style="width:${pct}%;height:100%;background:#0f172a;border-radius:999px;"></div>
                        </div>
                        <span style="font-size:12px;font-weight:600;color:#475569;font-variant-numeric:tabular-nums;">${pct}%</span>
                      </div>
                    </td>
                    <td><strong style="font-variant-numeric:tabular-nums;color:#0f172a;">${formatAmountInCurrentCurrency(convertFromEur(cs.sumEur, currentCurrency), currentCurrency)}</strong></td>
                    <td style="text-align:right;">
                      <button type="button" class="bo-icon-btn" onclick="setAdminListingsFilter('${cs.cat}'); switchAdminTab('listings');" title="View category" aria-label="View category">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
                      </button>
                    </td>
                  </tr>
                `;
    }).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } else if (currentAdminTab === "proposals") {
    mainModuleHtml = `
      <div class="bo-card bo-table-card">
        <div class="bo-card-toolbar">
          <strong style="font-size:15px;font-weight:700;color:#0f172a;">Active 1:1 Swap Proposals (${swapProposals.length})</strong>
        </div>
        <div class="bo-table-wrap">
          <table class="bo-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Direction</th>
                <th>Offered ⇄ Requested</th>
                <th>Partner</th>
                <th>Balance</th>
                <th>Status</th>
                <th style="text-align:right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${swapProposals.map(p => `
                <tr>
                  <td><strong style="font-variant-numeric:tabular-nums;color:#0f172a;">#CI4M-${p.id}</strong></td>
                  <td><span class="bo-badge bo-badge-deal">${escapeHtml(p.direction)}</span></td>
                  <td><strong style="color:#0f172a;font-weight:650;">${escapeHtml(p.offeredItem)}</strong> ⇄ ${escapeHtml(p.targetTitle)}</td>
                  <td>${escapeHtml(p.partner)}</td>
                  <td><strong style="color:#0f172a;font-variant-numeric:tabular-nums;">${escapeHtml(p.cashBalance)}</strong></td>
                  <td><span style="color:#059669;font-weight:650;">● ${escapeHtml(getProposalStatusLabel(p))}</span></td>
                  <td style="text-align:right;">
                    <div class="bo-row-actions">
                      ${p.offerId ? `
                        <button type="button" class="bo-icon-btn" onclick="openOfferModal(${p.offerId}, 'details')" title="View listing" aria-label="View listing">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                      ` : ""}
                      <button type="button" class="bo-icon-btn" onclick="openSwapAgreementModal(${p.id})" title="1:1 Swap Agreement PDF" aria-label="1:1 Swap Agreement PDF">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                      </button>
                      <button type="button" class="bo-icon-btn is-danger" onclick="requestDeleteProposal(${p.id})" title="Delete proposal" aria-label="Delete proposal">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } else if (currentAdminTab === "billing") {
    const gwCfg = getAuthGatewaysConfig();
    const stripeActive = Boolean(gwCfg.stripeSecretKey || serverConfiguredGateways.stripe || gwCfg.stripePack15Url || gwCfg.stripeProMonthlyUrl);
    mainModuleHtml = `
      <div class="bo-card">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px;flex-wrap:wrap;">
          <div>
            <span style="background:${stripeActive ? '#dcfce7' : '#f1f5f9'};color:${stripeActive ? '#065f46' : '#475569'};padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;">● ${stripeActive ? 'Stripe Checkout Live Active' : 'Stripe Checkout & Payment Links (Apple Pay / Google Pay / Card)'}</span>
            <h3 style="margin:6px 0 2px;font-size:16px;font-weight:700;color:#0f172a;">Stripe Monetization (€9 Pack +15 Swaps · €19/mo PRO · €149/yr PRO)</h3>
            <p style="margin:0;font-size:12.5px;color:#64748b;">Paste your <strong>Stripe Secret Key</strong> (automatic Checkout Session with <code>?stripe_success=...</code> return webhook) or direct <strong>Stripe Payment Links</strong>.</p>
          </div>
        </div>
        <form onsubmit="saveAuthGatewaysConfig(event)" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;align-items:end;">
          <div>
            <label style="display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:6px;">Stripe Secret Key (sk_live_... / sk_test_...)</label>
            <input type="password" id="boStripeSecretKeyInput" placeholder="${serverConfiguredGateways.stripe ? '•••••••• (Configured on Server)' : 'sk_live_...'}" value="${(gwCfg.stripeSecretKey || (serverConfiguredGateways.stripe ? '••••••••' : '')).replace(/"/g, '&quot;')}" class="input-light" style="font-size:12.5px;" />
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:6px;">+15 Swaps Pack (€9) Link</label>
            <input type="url" id="boStripePack15UrlInput" placeholder="https://buy.stripe.com/..." value="${(gwCfg.stripePack15Url || '').replace(/"/g, '&quot;')}" class="input-light" style="font-size:12.5px;" />
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:6px;">PRO Monthly (€19/mo) Link</label>
            <input type="url" id="boStripeProMonthlyUrlInput" placeholder="https://buy.stripe.com/..." value="${(gwCfg.stripeProMonthlyUrl || '').replace(/"/g, '&quot;')}" class="input-light" style="font-size:12.5px;" />
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:6px;">PRO Yearly (€149/yr) Link</label>
            <input type="url" id="boStripeProYearlyUrlInput" placeholder="https://buy.stripe.com/..." value="${(gwCfg.stripeProYearlyUrl || '').replace(/"/g, '&quot;')}" class="input-light" style="font-size:12.5px;" />
          </div>
          <button type="submit" class="bo-btn bo-btn-primary" style="height:42px;">Save Stripe Config</button>
        </form>
      </div>
      <div class="bo-card bo-table-card">
        <div class="bo-card-toolbar">
          <strong style="font-size:15px;font-weight:700;color:#0f172a;">Subscriptions & Swap Credits</strong>
        </div>
        <div class="bo-table-wrap">
          <table class="bo-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Plan</th>
                <th>Available Swaps</th>
                <th>Country</th>
                <th style="text-align:right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${accountsList.slice(0, 15).map(acc => {
      const emailKey = String(acc.email || "").toLowerCase();
      return `
                  <tr>
                    <td><strong style="color:#0f172a;font-weight:650;">${escapeHtml(acc.name)}</strong> · <span style="color:#64748b;">${escapeHtml(acc.email)}</span></td>
                    <td><span class="bo-badge ${acc.plan === 'pro' ? 'bo-badge-pro' : acc.plan === 'pack' ? 'bo-badge-pack' : 'bo-badge-starter'}">${(acc.plan || "starter").toUpperCase()}</span></td>
                    <td style="font-variant-numeric:tabular-nums;">${acc.plan === "pro" ? "Unlimited (∞)" : `${acc.freeSwaps ?? 10} swaps`}</td>
                    <td>${escapeHtml(acc.country || "Romania")}</td>
                    <td style="text-align:right;">
                      <div class="bo-row-actions">
                        <button type="button" class="bo-btn bo-btn-secondary" onclick="adminGrantUserSwaps('${emailKey.replace(/'/g, "\\'")}', 'add10')">+10 Swaps</button>
                        <button type="button" class="bo-btn bo-btn-primary" onclick="adminGrantUserSwaps('${emailKey.replace(/'/g, "\\'")}', 'pro')">Activate PRO ∞</button>
                      </div>
                    </td>
                  </tr>
                `;
    }).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } else if (currentAdminTab === "compliance") {
    const sbCfg = getSupabaseClientConfig();
    const gwCfg = getAuthGatewaysConfig();
    mainModuleHtml = `
      <div class="bo-card">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;flex-wrap:wrap;">
          <div>
            <span class="hig-sla-pill">● Cloud Sync Engine (${cloudSyncLastState.backend.toUpperCase()})</span>
            <h3 style="margin:6px 0 2px;font-size:16px;font-weight:700;color:#0f172a;">Central Cloud Database & Cross-Device Sync (/api/sync)</h3>
            <p style="margin:0;font-size:12.5px;color:#64748b;">All accounts, listings, and 1:1 proposals registered on any phone or computer sync automatically to the central database.</p>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button type="button" class="bo-btn bo-btn-primary" onclick="pullCloudDatabaseSync(false)">↻ Sync Cloud Now</button>
            <button type="button" class="bo-btn bo-btn-secondary" onclick="exportFullBackofficeBackupJson()">↓ Backup JSON</button>
            <label class="bo-btn bo-btn-secondary" style="cursor:pointer;margin:0;">
              ↑ Restore JSON
              <input type="file" accept=".json,application/json" style="display:none;" onchange="importFullBackofficeBackupJson(event)" />
            </label>
          </div>
        </div>
        <form onsubmit="saveSupabaseClientConfig(event)" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;align-items:end;margin-top:12px;padding-top:12px;border-top:1px solid #f1f5f9;">
          <div>
            <label style="display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:5px;">Optional Supabase URL (or leave blank for built-in /api/sync)</label>
            <input type="url" id="boSupabaseUrlInput" placeholder="https://your-project.supabase.co" value="${sbCfg.url.replace(/"/g, '&quot;')}" class="input-light" style="font-size:13px;" />
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:5px;">Optional Supabase Key (Anon / Service Key)</label>
            <input type="password" id="boSupabaseKeyInput" placeholder="eyJhbGciOi..." value="${sbCfg.key.replace(/"/g, '&quot;')}" class="input-light" style="font-size:13px;" />
          </div>
          <button type="submit" class="bo-btn bo-btn-primary" style="height:42px;">Save Cloud Config</button>
        </form>
      </div>
      <div class="bo-card">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px;flex-wrap:wrap;">
          <div>
            <span style="background:${(gwCfg.brevoApiKey || serverConfiguredGateways.brevo) ? '#dcfce7' : '#e6f4f1'};color:${(gwCfg.brevoApiKey || serverConfiguredGateways.brevo) ? '#065f46' : '#0c2c28'};padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;">● ${(gwCfg.brevoApiKey || serverConfiguredGateways.brevo) ? `Brevo Email Verification Active (${gwCfg.brevoSenderEmail || 'jeka7ro@gmail.com'})` : 'Brevo Email Verification & Notifications'}</span>
            <h3 style="margin:6px 0 2px;font-size:16px;font-weight:700;color:#0f172a;">Email Verification (Brevo SMTP API) & Google OAuth 2.0</h3>
            <p style="margin:0;font-size:12.5px;color:#64748b;">Your <strong>Brevo API Key</strong> is active in the central database and sends real 6-digit email verification codes and 1:1 swap notifications.</p>
          </div>
          <button type="button" class="bo-btn bo-btn-primary" onclick="testAuthGatewaysLive()">Test Email Delivery</button>
        </div>
        <form onsubmit="saveAuthGatewaysConfig(event)" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;align-items:end;">
          <div>
            <label style="display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:6px;">Brevo API Key (xkeysib-...)</label>
            <input type="password" id="boBrevoApiKeyInput" placeholder="${serverConfiguredGateways.brevo ? '•••••••• (Configured on Server — Live)' : 'xkeysib-xxxxxxxxxxxxxxxx'}" value="${(gwCfg.brevoApiKey || (serverConfiguredGateways.brevo ? '••••••••' : '')).replace(/"/g, '&quot;')}" class="input-light" style="font-size:13px;" />
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:6px;">Verified Sender Email</label>
            <input type="email" id="boBrevoSenderInput" placeholder="jeka7ro@gmail.com" value="${(gwCfg.brevoSenderEmail || "jeka7ro@gmail.com").replace(/"/g, '&quot;')}" class="input-light" style="font-size:13px;" />
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:6px;">Google OAuth Client ID (Optional)</label>
            <input type="text" id="boGoogleClientIdInput" placeholder="xxxx.apps.googleusercontent.com" value="${gwCfg.googleClientId.replace(/"/g, '&quot;')}" class="input-light" style="font-size:13px;" />
          </div>
          <button type="submit" class="bo-btn bo-btn-primary" style="height:42px;">Save Email Config</button>
        </form>
      </div>
      <div class="bo-card bo-table-card">
        <div class="bo-card-toolbar">
          <h3 style="margin:0;font-size:15px;font-weight:700;color:#0f172a;">EU GDPR (Reg. 2016/679), ePrivacy & DSA Compliance</h3>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button type="button" class="bo-btn bo-btn-secondary" onclick="exportUserGdprData()">Export GDPR JSON (Art. 20)</button>
            <button type="button" class="bo-btn bo-btn-ghost" onclick="openGdprPreferencesModal();">Consent Preferences</button>
          </div>
        </div>
        <div class="bo-table-wrap">
          <table class="bo-table">
            <thead>
              <tr>
                <th>Module</th>
                <th>Coverage</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><strong style="color:#0f172a;">Cloud Sync API (/api/sync)</strong></td><td>Centralized Multi-Device Accounts, Listings & Proposals Sync</td><td><span style="color:#059669;font-weight:700;">● Active (${cloudSyncLastState.lastSyncAt})</span></td></tr>
              <tr><td><strong style="color:#0f172a;">Karpathy Engineering Guidelines</strong></td><td>Think Before Coding · Simplicity First · Surgical Changes · Goal-Driven Verification (.agents/skills/karpathy-guidelines)</td><td><span style="color:#059669;font-weight:700;">● Active</span></td></tr>
              <tr><td><strong style="color:#0f172a;">Apple HIG & Liquid Glass Skill</strong></td><td>2-Layer Liquid Glass Discipline · 44pt/28pt Touch Targets · Reduced Motion & Contrast (.agents/skills/apple-design)</td><td><span style="color:#059669;font-weight:700;">● Active</span></td></tr>
              <tr><td><strong style="color:#0f172a;">Ruflo / Ruflow SPARC Meta-Harness</strong></td><td>5-Phase Quality Gates: Specification · Pseudocode · Architecture · Refinement · Completion (.agents/skills/ruflo-sparc)</td><td><span style="color:#059669;font-weight:700;">● Active (100/100)</span></td></tr>
              <tr><td><strong style="color:#0f172a;">SPA Build & Routing</strong></td><td>JS Syntax, DOM Integrity & Vercel Rewrites</td><td><span style="color:#059669;font-weight:700;">● Active</span></td></tr>
              <tr><td><strong style="color:#0f172a;">Form & Numeric Validation</strong></td><td>Resilient decimal & currency parsing across 7 currencies</td><td><span style="color:#059669;font-weight:700;">● Active</span></td></tr>
              <tr><td><strong style="color:#0f172a;">1:1 Parity & Billing</strong></td><td>EUR/USD/RON/MDL/RUB/GBP/CHF + 10 Free Swaps / PRO Plans</td><td><span style="color:#059669;font-weight:700;">● Active</span></td></tr>
              <tr><td><strong style="color:#0f172a;">GDPR Art. 15, 17, 20 & DSA</strong></td><td>Data Access, Right to Erasure, JSON Portability & Listing Reports</td><td><span style="color:#059669;font-weight:700;">● Active</span></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
  container.innerHTML = `
    <div class="bo-workspace">
      <!-- LEFT WHITE SIDEBAR (Screen 2 Style) -->
      <aside class="bo-sidebar">
        <div style="padding:16px 12px;">
          <div class="hig-ws-brand" onclick="closeAdminModal()" style="cursor:pointer;">
            <span class="hig-ws-brand-icon">
              <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
                <path d="M10 16a6 6 0 0 1 10.2-4.2M22 16a6 6 0 0 1-10.2 4.2" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round"/>
                <path d="M19.2 9.2 20.6 12.4 17.4 12M12.8 22.8 11.4 19.6 14.6 20" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            <div>
              <strong style="display:block;font-size:15px;font-weight:800;color:#0f172a;letter-spacing:-0.02em;">ChangeIt4Me</strong>
              <span style="display:block;font-size:11px;font-weight:600;color:#0d8a5e;">Backoffice Live</span>
            </div>
          </div>
          <div style="display:grid;gap:4px;">
            <button type="button" class="bo-nav-btn ${currentAdminTab === 'overview' ? 'active' : ''}" onclick="switchAdminTab('overview')">
              <span class="hig-ws-nav-left"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg><span>Overview</span></span>
            </button>
            <button type="button" class="bo-nav-btn ${currentAdminTab === 'users' ? 'active' : ''}" onclick="switchAdminTab('users')" id="adminTabUsersBtn">
              <span class="hig-ws-nav-left"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg><span>Users (CRM)</span></span>
              <span class="bo-nav-badge">${accountsList.length}</span>
            </button>
            <button type="button" class="bo-nav-btn ${currentAdminTab === 'listings' ? 'active' : ''}" onclick="switchAdminTab('listings')" id="adminTabListingsBtn">
              <span class="hig-ws-nav-left"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg><span>Catalog Listings</span></span>
              <span class="bo-nav-badge">${offers.length}</span>
            </button>
            <button type="button" class="bo-nav-btn ${currentAdminTab === 'proposals' ? 'active' : ''}" onclick="switchAdminTab('proposals')" id="adminTabProposalsBtn">
              <span class="hig-ws-nav-left"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10l5-5 5 5"/><path d="M17 14l-5 5-5-5"/></svg><span>Swap Proposals</span></span>
              <span class="bo-nav-badge">${swapProposals.length}</span>
            </button>
            <button type="button" class="bo-nav-btn ${currentAdminTab === 'billing' ? 'active' : ''}" onclick="switchAdminTab('billing')">
              <span class="hig-ws-nav-left"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg><span>Subscriptions</span></span>
            </button>
            <button type="button" class="bo-nav-btn ${currentAdminTab === 'compliance' ? 'active' : ''}" onclick="switchAdminTab('compliance')">
              <span class="hig-ws-nav-left"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg><span>GDPR & Settings</span></span>
            </button>
          </div>
        </div>
        <div class="bo-sidebar-footer">
          <button type="button" class="bo-btn bo-sidebar-action-primary" onclick="resetWizardDraft(); openWizardModal(1);">
            + New Listing
          </button>
          <div style="display:grid;grid-template-columns:1fr auto;gap:6px;">
            <button type="button" class="bo-btn bo-sidebar-action-quiet" onclick="closeAdminModal()">
              ← Back to Site
            </button>
            <button type="button" class="bo-btn bo-sidebar-action-signout" onclick="logoutAdminBackoffice()">
              Sign out
            </button>
          </div>
        </div>
      </aside>
      <!-- MAIN WORKSPACE -->
      <main class="bo-main">
        <header class="bo-topbar">
          <h1 style="font-size:18px;font-weight:700;letter-spacing:-0.02em;color:#0f172a;margin:0;">${activeTitle}</h1>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <button type="button" class="bo-btn bo-sync-pill" onclick="pullCloudDatabaseSync(false)" title="Sync live accounts & listings from Cloud (/api/sync)">
              <span class="bo-sync-dot"></span>
              <span>Cloud Sync (${cloudSyncLastState.lastSyncAt})</span>
            </button>
            <input type="search" id="adminListingSearchInput" class="input-light bo-topbar-search"
              placeholder="Search user, email, ID, city..."
              value="${adminListingSearchQuery.replace(/"/g, '&quot;')}"
              oninput="onAdminSearchInput(this.value)" />
            <select class="input-light bo-topbar-select" onchange="setCurrency(this.value, true); renderAdminModalContent();" aria-label="Currency">
              ${(window.CURRENCIES || []).map(c => `<option value="${c.code}" ${c.code === currentCurrency ? 'selected' : ''}>${c.code}</option>`).join("")}
            </select>
            <button type="button" class="bo-icon-btn" style="width:36px;height:36px;min-height:36px;" onclick="closeAdminModal()" title="Close Backoffice" aria-label="Close Backoffice">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </header>
        <div class="bo-content-scroll">
          <div class="hig-ws-kpi-grid">
            <div class="hig-ws-kpi-card" onclick="setAdminUsersFilter('all'); switchAdminTab('users');">
              <div class="hig-ws-kpi-top"><span class="hig-ws-kpi-label">Registered users</span><span class="hig-ws-kpi-dot"></span></div>
              <strong class="hig-ws-kpi-val">${accountsList.length}</strong>
              <div><span class="hig-sla-pill">+${recentAccountsCount} Recent</span></div>
            </div>
            <div class="hig-ws-kpi-card" onclick="setAdminListingsFilter('all'); switchAdminTab('listings');">
              <div class="hig-ws-kpi-top"><span class="hig-ws-kpi-label">Active listings</span><span class="hig-ws-kpi-dot"></span></div>
              <strong class="hig-ws-kpi-val">${offers.length}</strong>
              <div><span class="hig-sla-pill">Live Catalog</span></div>
            </div>
            <div class="hig-ws-kpi-card" onclick="setAdminListingsFilter('all'); switchAdminTab('listings');">
              <div class="hig-ws-kpi-top"><span class="hig-ws-kpi-label">Catalog volume</span><span class="hig-ws-kpi-dot"></span></div>
              <strong class="hig-ws-kpi-val">${totalGmvFormatted}</strong>
              <div><span class="hig-sla-pill">0% Commission</span></div>
            </div>
            <div class="hig-ws-kpi-card" onclick="switchAdminTab('billing');">
              <div class="hig-ws-kpi-top"><span class="hig-ws-kpi-label">PRO & paid plans</span><span class="hig-ws-kpi-dot"></span></div>
              <strong class="hig-ws-kpi-val">${proAccountsCount + packAccountsCount}</strong>
              <div><span class="hig-sla-pill">Active Plans</span></div>
            </div>
            <div class="hig-ws-kpi-card" onclick="switchAdminTab('proposals');">
              <div class="hig-ws-kpi-top"><span class="hig-ws-kpi-label">Swap proposals</span><span class="hig-ws-kpi-dot"></span></div>
              <strong class="hig-ws-kpi-val">${swapProposals.length}</strong>
              <div><span class="hig-sla-pill">1:1 Direct</span></div>
            </div>
          </div>
          ${mainModuleHtml}
        </div>
      </main>
    </div>
  `;
  const nextBoScrollEl = container.querySelector(".bo-content-scroll");
  if (nextBoScrollEl && prevBoScrollTop > 0) {
    nextBoScrollEl.scrollTop = prevBoScrollTop;
  }
}
document.addEventListener("DOMContentLoaded", () => {
  ensurePlatformAccountsAndTestRegistrations();
  initCloudSyncEngine();
  checkStripeCheckoutReturnUrl();
  updateAdminHeaderButtonsVisibility();
  initLanguageDropdown();
  initCurrencyDropdown();
  initWorldMap();
  initGdprBanner();
  detectLanguageByGeoIP(false);
  syncLiveExchangeRates();
  initScrollRevealAnimations();
  animateLiveMemberCount();
  const initialRoute = getRouteFromUrlOrStorage();
  if (initialRoute && initialRoute !== "/") {
    navigateToPageRoute(initialRoute, true);
  }
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
  const header = document.getElementById("header");
  if (typeof window.addEventListener === "function") window.addEventListener("scroll", () => {
    header.classList.toggle("scrolled", window.scrollY > 8);
  }, { passive: true });
  const slider = document.getElementById("storySlider");
  const progress = document.getElementById("sliderProgress");
  if (slider && progress) {
    slider.addEventListener("scroll", () => {
      const max = slider.scrollWidth - slider.clientWidth;
      const ratio = max > 0 ? slider.scrollLeft / max : 0;
      progress.style.width = `${30 + 70 * ratio}%`;
    }, { passive: true });
  }
  const mobileBtn = document.getElementById("mobileMenuBtn");
  const mobilePanel = document.getElementById("mobilePanel");
  if (mobileBtn && mobilePanel) {
    mobileBtn.addEventListener("click", () => {
      const open = mobilePanel.classList.toggle("open");
      mobileBtn.setAttribute("aria-expanded", String(open));
    });
  }
  // Apple HIG Hierarchical Escape (Esc) Dismissal (sheets.md & alerts.md › Provide alternative ways to cancel)
  document.addEventListener("keydown", (ev) => {
    const lbOpen = document.getElementById("photoLightboxModal")?.classList.contains("open");
    const offerOpen = document.getElementById("offerModal")?.classList.contains("open");
    if ((ev.key === "ArrowRight" || ev.key === "ArrowLeft") && (lbOpen || offerOpen)) {
      const activeTag = document.activeElement?.tagName;
      if (activeTag !== "INPUT" && activeTag !== "TEXTAREA" && activeTag !== "SELECT") {
        ev.preventDefault();
        const targetId = lbOpen ? lightboxOfferId : currentOpenOfferId;
        if (targetId) selectOfferGalleryPhoto(targetId, currentGalleryIndex + (ev.key === "ArrowRight" ? 1 : -1));
        return;
      }
    }
    if (ev.key !== "Escape") return;
    if (lbOpen) {
      ev.preventDefault();
      closePhotoLightbox();
    } else if (document.getElementById("appleSheetModal")?.classList.contains("open")) {
      ev.preventDefault();
      closeAppleSheetModal();
    } else if (document.getElementById("guideModal")?.classList.contains("open")) {
      ev.preventDefault();
      closeGuideModal();
    } else if (document.getElementById("authModal")?.classList.contains("open")) {
      ev.preventDefault();
      closeAuthModal();
    } else if (document.getElementById("wizardModal")?.classList.contains("open")) {
      ev.preventDefault();
      closeWizardModal();
    } else if (document.getElementById("offerModal")?.classList.contains("open")) {
      ev.preventDefault();
      closeOfferModal();
    } else if (document.getElementById("adminModal")?.classList.contains("open")) {
      ev.preventDefault();
      closeAdminModal();
    } else if (document.getElementById("dashboardModal")?.classList.contains("open")) {
      ev.preventDefault();
      closeDashboardModal();
    } else if (document.getElementById("chatDock")?.classList.contains("is-open")) {
      ev.preventDefault();
      toggleChatDock();
    }
  });
});
function updateMobileBottomTabBarUI() {
  const labelsMap = {
    ro: { offers: "Anunțuri", cats: "Categorii", post: "Home", map: "Hartă", account: currentUser ? "Contul Meu" : "Cont" },
    en: { offers: "Explore", cats: "Categories", post: "Home", map: "Map", account: currentUser ? "My Account" : "Account" },
    de: { offers: "Angebote", cats: "Kategorien", post: "Home", map: "Karte", account: "Konto" },
    fr: { offers: "Annonces", cats: "Catégories", post: "Accueil", map: "Carte", account: "Compte" },
    it: { offers: "Annunci", cats: "Categorie", post: "Home", map: "Mappa", account: "Profilo" },
    es: { offers: "Anuncios", cats: "Categorías", post: "Inicio", map: "Mapa", account: "Cuenta" },
    ru: { offers: "Объявления", cats: "Категории", post: "Главная", map: "Карта", account: "Профиль" }
  };
  const l = labelsMap[currentLang] || labelsMap.en;
  const setTxt = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  setTxt("mobTabOffersLabel", l.offers);
  setTxt("mobTabCatsLabel", l.cats);
  setTxt("mobTabPostLabel", l.post);
  setTxt("mobTabMapLabel", l.map);
  setTxt("mobTabAccountLabel", l.account);
  const badge = document.getElementById("mobTabAccountBadge");
  if (badge) {
    if (!currentUser) {
      badge.hidden = true;
      badge.textContent = "";
      badge.style.display = "none";
    } else {
      const count = Array.isArray(swapProposals) ? swapProposals.filter(p => isProposalOwnedByCurrentUser(p)).length : 0;
      if (count > 0) {
        badge.hidden = false;
        badge.textContent = String(count);
        badge.style.display = "inline-flex";
      } else {
        badge.hidden = true;
        badge.textContent = "";
        badge.style.display = "none";
      }
    }
  }
}
function navigateMobileTab(tabKey) {
  document.querySelectorAll("#mobileBottomTabBar .hig-tabbar-item").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-mob-tab") === tabKey);
  });
  if (typeof closeAllModalsSilently === "function") {
    closeAllModalsSilently();
  }
  if (typeof closeMobileMenu === "function") {
    closeMobileMenu();
  }
  if (tabKey === "offers") {
    document.getElementById("offers")?.scrollIntoView({ behavior: "smooth", block: "start" });
  } else if (tabKey === "categories") {
    document.getElementById("categories")?.scrollIntoView({ behavior: "smooth", block: "start" });
  } else if (tabKey === "home" || tabKey === "post") {
    if (typeof exitMobileStartScreen === "function") exitMobileStartScreen();
    if (typeof window !== "undefined" && typeof window.scrollTo === "function") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    document.getElementById("top")?.scrollIntoView({ behavior: "smooth", block: "start" });
  } else if (tabKey === "map") {
    document.getElementById("world")?.scrollIntoView({ behavior: "smooth", block: "start" });
  } else if (tabKey === "account") {
    if (currentUser) {
      openDashboardModal("mylistings");
    } else {
      openAuthModal("login");
    }
  }
}
function initAppleSheetSwipeToDismiss() {
  if (typeof document === "undefined" || typeof document.addEventListener !== "function") return;
  let activeModal = null;
  let activeCard = null;
  let closeFn = null;
  let startY = 0;
  let startX = 0;
  let currentDeltaY = 0;
  let dragging = false;
  const resolveSheetTarget = (target) => {
    if (!target || typeof target.closest !== "function") return null;
    const isGrabberOrHeader = target.closest(".hig-sheet-grabber-zone, .hig-sheet-grabber, .hig-offer-header, .wiz-header, .hig-sheet-toolbar");
    const modal = target.closest("#offerModal.open, #wizardModal.open, #guideModal.open, #appleSheetModal.open");
    if (!modal) return null;
    if (!isGrabberOrHeader && modal.scrollTop > 2) return null;
    if (target.closest("button, a, input, select, textarea, label")) return null;
    const card = modal.querySelector(".modal-card, .hig-sheet-card");
    if (!card) return null;
    let fn = null;
    if (modal.id === "offerModal") fn = closeOfferModal;
    else if (modal.id === "wizardModal") fn = closeWizardModal;
    else if (modal.id === "guideModal") fn = closeGuideModal;
    else if (modal.id === "appleSheetModal") fn = closeAppleSheetModal;
    return fn ? { modal, card, fn } : null;
  };
  document.addEventListener("touchstart", (e) => {
    if (!e.touches || e.touches.length !== 1) return;
    const info = resolveSheetTarget(e.target);
    if (!info) return;
    activeModal = info.modal;
    activeCard = info.card;
    closeFn = info.fn;
    startY = e.touches[0].clientY;
    startX = e.touches[0].clientX;
    currentDeltaY = 0;
    dragging = false;
  }, { passive: true });
  document.addEventListener("touchmove", (e) => {
    if (!activeCard || !activeModal || !e.touches || e.touches.length !== 1) return;
    const dy = e.touches[0].clientY - startY;
    const dx = e.touches[0].clientX - startX;
    if (!dragging) {
      if (dy > 10 && dy > Math.abs(dx) * 1.2 && activeModal.scrollTop <= 2) {
        dragging = true;
      } else if (Math.abs(dx) > 12 || dy < -8) {
        activeCard = null;
        return;
      } else {
        return;
      }
    }
    if (dragging && dy > 0) {
      currentDeltaY = dy;
      activeCard.style.transition = "none";
      activeCard.style.transform = `translateY(${Math.min(dy, 420)}px)`;
      activeCard.style.opacity = String(Math.max(0.45, 1 - dy / 420));
    }
  }, { passive: true });
  const finishSwipe = () => {
    if (!activeCard) return;
    const cardRef = activeCard;
    const fnRef = closeFn;
    const dy = currentDeltaY;
    const wasDragging = dragging;
    activeCard = null;
    activeModal = null;
    closeFn = null;
    dragging = false;
    currentDeltaY = 0;
    if (!wasDragging) return;
    if (dy > 62 && typeof fnRef === "function") {
      cardRef.style.transition = "transform 170ms cubic-bezier(0.22, 1, 0.36, 1), opacity 170ms ease";
      cardRef.style.transform = "translateY(100%)";
      cardRef.style.opacity = "0";
      setTimeout(() => {
        cardRef.style.transition = "";
        cardRef.style.transform = "";
        cardRef.style.opacity = "";
        fnRef();
      }, 150);
    } else {
      cardRef.style.transition = "transform 200ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease";
      cardRef.style.transform = "translateY(0)";
      cardRef.style.opacity = "1";
      setTimeout(() => {
        cardRef.style.transition = "";
        cardRef.style.transform = "";
        cardRef.style.opacity = "";
      }, 200);
    }
  };
  document.addEventListener("touchend", finishSwipe, { passive: true });
  document.addEventListener("touchcancel", finishSwipe, { passive: true });
}
initAppleSheetSwipeToDismiss();
function initMobileTabBarScrollBehavior() {
  if (typeof window === "undefined" || typeof document === "undefined" || typeof document.addEventListener !== "function") return;
  let lastWinY = 0;
  let lastModalY = 0;
  let lockUntil = 0;
  const setBarHidden = (hide) => {
    const now = Date.now();
    if (now < lockUntil) return;
    const bar = document.getElementById("mobileBottomTabBar");
    if (!bar) return;
    const isHidden = bar.classList.contains("is-scroll-hidden");
    if (hide && !isHidden) {
      bar.classList.add("is-scroll-hidden");
      lockUntil = now + 220;
    } else if (!hide && isHidden) {
      bar.classList.remove("is-scroll-hidden");
      lockUntil = now + 220;
    }
  };
  const getWinScrollY = () => Math.max(
    0,
    Number(window.scrollY || window.pageYOffset || document.documentElement?.scrollTop || document.body?.scrollTop || 0)
  );
  if (typeof window.addEventListener === "function") {
    window.addEventListener("scroll", () => {
      const curY = getWinScrollY();
      const dy = curY - lastWinY;
      if (curY <= 30) {
        setBarHidden(false);
      } else if (dy > 18 && curY > 60) {
        setBarHidden(true);
        lastWinY = curY;
      } else if (dy < -14) {
        setBarHidden(false);
        lastWinY = curY;
      }
      if (Math.abs(dy) > 18 || curY <= 30) {
        lastWinY = curY;
      }
    }, { passive: true });
  }
  document.addEventListener("scroll", (e) => {
    const t = e && e.target;
    if (!t || !t.classList || !t.classList.contains("modal-backdrop")) return;
    const curY = Math.max(0, Number(t.scrollTop || 0));
    const dy = curY - lastModalY;
    if (curY <= 24) {
      setBarHidden(false);
    } else if (dy > 18 && curY > 50) {
      setBarHidden(true);
      lastModalY = curY;
    } else if (dy < -14) {
      setBarHidden(false);
      lastModalY = curY;
    }
    if (Math.abs(dy) > 18 || curY <= 24) {
      lastModalY = curY;
    }
  }, { capture: true, passive: true });
  document.addEventListener("focusin", (e) => {
    const t = e && e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) {
      document.getElementById("mobileBottomTabBar")?.classList.add("is-scroll-hidden");
    }
  }, { passive: true });
  document.addEventListener("focusout", () => {
    setTimeout(() => {
      const a = document.activeElement;
      if (!a || (a.tagName !== "INPUT" && a.tagName !== "TEXTAREA" && a.tagName !== "SELECT")) {
        document.getElementById("mobileBottomTabBar")?.classList.remove("is-scroll-hidden");
      }
    }, 120);
  }, { passive: true });

}
initMobileTabBarScrollBehavior();
if (typeof updateMobileBottomTabBarUI === 'function') updateMobileBottomTabBarUI();
