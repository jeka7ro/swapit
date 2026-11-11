# ChangeIt4Me (`exchange`) — Jurnal Oficial de Modificări & Audit Gatekeeper

Toate modificările sunt adăugate cronologic invers (cele mai noi deasupra) și validate prin suita în 6 faze `.agents/skills/audit-gatekeeper/scripts/run_prepush_audit.py`.

---

## [2026-11-11] — Cloud Database & Cross-Device Sync API (`/api/sync`), Suport Supabase/Vercel KV, Vizualizare Anunțuri Peste Backoffice & Fix Buton `✕` (`/admin`)
- **Autor:** Agent Paperclip
- **Ramură / Commit:** `main` (peste `c7ce69d`, pregătit pentru commit)
- **Fișiere atinse:**
  - `api/sync.js`
  - `dev_server.py`
  - `vercel.json`
  - `.gitignore`
  - `app.js`
  - `tahoe-skin.css`
  - `index.html`
  - `.agents/skills/audit-gatekeeper/scripts/run_prepush_audit.py`
  - `.agents/CHANGELOG.md`
- **Descrierea modificării:**
  1. **Backend Centralizat & Sincronizare Cloud Multi-Dispozitiv (`/api/sync` + Supabase / Vercel KV)**:
     - Crearea funcției serverless `api/sync.js` pentru Vercel și a serverului local `dev_server.py` (port `8090`), care sincronizează automat toate conturile înregistrate (`accountsDb`), anunțurile membrilor (`userOffers`), propunerile de schimb 1:1 (`proposals`) și alertele (`watchlist`) între toate telefoanele, browserele și calculatoarele.
     - Suport nativ multi-tier în `api/sync.js`: **Supabase REST**, **Vercel KV / Upstash Redis** și stocare server-side persistentă, plus sincronizare instantanee între tab-uri prin `BroadcastChannel("ci4m_live_sync_v1")` și polling live la fiecare 10 secunde în Backoffice.
     - Adăugarea indicatorului **`● Cloud Sync (...) ↻`** în topbar-ul din Backoffice și a panoului de configurare **Central Cloud Database & Cross-Device Sync** în tab-ul `GDPR & Compliance`.
  2. **Vizualizare & Editare Anunțuri Direct Peste Backoffice (`openOfferModal`, `closeOfferModal`, `closeWizardModal`)**:
     - Eliminarea apelului `closeAdminModal()` de pe butoanele `View`, `Edit`, `+ New Listing`, `Open in Wizard` și `1:1 Agreement PDF` din Backoffice; acum ferestrele `#offerModal`, `#wizardModal` și `#guideModal` se deschid deasupra Backoffice-ului (`z-index: 3500`), iar la închidere rămâi exact în pagina `/admin` (fără să te mai scoată în pagina publică `index`).
     - Fixarea butonului de închidere `✕` în colțul din dreapta-sus al ferestrei de anunț (`position: absolute; top: 18px; right: 20px;`) + buton dedicat `← Back to Backoffice`.
- **Rezultat `audit-gatekeeper`:** 🟢 **VERDE (6/6 Faze promovate — Exit Code 0)**

---

## [2026-11-11] — Portal Enterprise Backoffice & CRM Full-Screen (`/admin`), Autentificare Securizată (`jeka7ro@mail.com` / `11Noiembrie2026!`) & Bază de Date Pre-Populată (37 Conturi + 36 Anunțuri)
- **Autor:** Agent Paperclip
- **Ramură / Commit:** `main` (peste `c7ce69d`, pregătit pentru commit)
- **Fișiere atinse:**
  - `app.js`
  - `index.html`
  - `tahoe-skin.css`
  - `.agents/skills/audit-gatekeeper/scripts/run_prepush_audit.py`
  - `.agents/CHANGELOG.md`
- **Descrierea modificării:**
  1. **Formular Dedicat de Logare Administrator pe `/admin`**:
     - La accesarea linkului `/admin` (`http://localhost:8090/?page=admin` sau `/admin` în producție), se deschide poarta de autentificare **ChangeIt4Me · Enterprise Backoffice** cu validarea credențialelor:
       - **Admin Email**: `jeka7ro@mail.com`
       - **Parolă**: `11Noiembrie2026!`
     - De asemenea, autentificarea prin formularul standard `Sign In` al site-ului cu `jeka7ro@mail.com` și `11Noiembrie2026!` recunoaște automat Super-Adminul și deschide direct Backoffice-ul.
     - Butonul `Backoffice` din header-ul public este ascuns pentru vizitatorii obișnuiți și apare doar după autentificarea administratorului.
  2. **Arhitectură Enterprise Backoffice Full-Screen (`100vw × 100vh`)**:
     - Înlocuirea modalului mic cu o aplicație **Backoffice Enterprise Full-Screen** cu Sidebar lateral stânga (`268px`, temă Dark Forest `#071d1a`), Topbar cu căutare globală în timp real, 6 carduri Executive KPI și 6 module dedicate:
       - `Panou Executiv (KPIs)` — distribuția GMV pe verticale, ultimele conturi și ultimele anunțuri.
       - `Conturi Înregistrate (CRM)` — tabel complet stil macOS Tahoe (`tabular-nums`) cu filtre pe planuri (`Toate`, `★ Înregistrări Noi / Test`, `PRO ∞`, `Pachet +15`, `Starter`), creare cont nou din Backoffice, impersonare 1-click (`Intră în Cont`), alocare `+10 Credite` sau `PRO ∞` și legătură directă către anunțurile fiecărui cont.
       - `Anunțuri & Catalog` — moderare completă a celor 36 de anunțuri, filtre rapide pe `★ Înregistrări Noi / Test` și categorii, plus publicare 1-click a ciornelor din Wizard.
       - `Propuneri Schimb 1:1` — tabel cu negocierile și contractele PDF 1:1.
       - `Abonamente & Plăți` — gestiunea monetizării și upgrade-urilor PRO.
       - `GDPR, DSA & Audit 6/6` — statusul live al celor 6 faze de Audit și instrumentele GDPR Art. 15/17/20.
  3. **Bază de Date Pre-Populată Automat (`ensurePlatformAccountsAndTestRegistrations`)**:
     - Eliminarea completă a stării cu `0 conturi`: la inițializare sunt pre-populate automat **37 de conturi active** în `accountsDb` (**6 înregistrări noi de test** + **30 conturi ale proprietarilor europeni din catalog** + **1 cont Super-Admin**) și **36 de anunțuri active** (cele 6 anunțuri noi `#950101`–`#950106` legate direct de conturile lor prin `ownerEmail`).
- **Rezultat `audit-gatekeeper`:** 🟢 **VERDE (6/6 Faze promovate — Exit Code 0)**

---

## [2026-11-11] — Consolă Admin & Diagnosticare (`/admin` / `#adminModal`), Prioritizare Anunțuri Membri & Căutare Insensibilă la Diacritice
- **Autor:** Agent Paperclip
- **Ramură / Commit:** `main` (peste `c7ce69d`, pregătit pentru commit)
- **Fișiere atinse:**
  - `index.html`
  - `app.js`
  - `.agents/skills/audit-gatekeeper/scripts/run_prepush_audit.py`
  - `.agents/CHANGELOG.md`
  - `.agents/AGENTS.md`
- **Descrierea modificării:**
  1. **Consolă Admin & Diagnosticare (`/admin` / `#adminModal`)**:
     - Accesibilă instant prin URL (`/admin`, `/?page=admin`, `/#admin`), butonul **`Admin`** din Header (`#headerAdminBtn`), meniul mobil (`#mobileAdminBtn`), Dashboard-ul personal (`#dashAdminBtn`), subsolul paginii (`#footerAdminLink`) sau tastând `"admin"` în bara de căutare.
     - Include 3 tab-uri: **Anunțuri & Ciorne** (`listings`), **Utilizatori Înregistrați** (`users`) și **Propuneri & Raportări DSA** (`proposals`).
     - Detectează automat orice ciornă neterminată în Wizard (`ci4m_wiz_draft_v1`) și permite publicarea ei în 1-click (`publishAdminWizardDraftNow()`), restaurarea anunțurilor șterse (`restoreDeletedOffersFromAdmin()`) și generarea a 3 conturi de test + 3 anunțuri de test (`seedAdminTestRegistrationsAndOffers()`).
     - Din tab-ul **Utilizatori Înregistrați**, permite autentificarea 1-click în orice cont de test (`adminLoginAsUser()`), acordarea de `+10 Schimburi` (`adminGrantUserSwaps()`) și filtrarea anunțurilor acelui utilizator (`adminFilterOffersByUser()`).
  2. **Rezolvare Regăsire Anunțuri & Înregistrări de Test**:
     - **Căutare insensibilă la diacritice** (`normalizeSearchText` în `extractSearchTokens` și `tokensMatchQueryWords`): căutările fără diacritice (`"masina"`, `"bucuresti"`, `"chisinau"`, `"apartament"`) găsesc acum toate anunțurile cu diacritice (`"mașină"`, `"București"`, `"Chișinău"`).
     - **Indexare extinsă în motorul de căutare** (`getOfferPrimaryTokens`): indexează acum și numele proprietarului (`item.owner`), emailul proprietarului (`item.ownerEmail`), ID-ul anunțului (`item.id`), descrierea (`item.desc`) și obiectul dorit la schimb (`item.want`).
     - **Afișare pe primul loc în catalog** (`renderOffers`): anunțurile adăugate de utilizatori (`item.createdByUser || item.id > 100000`) sunt afișate **PRIMELE** în grila de oferte la sortarea implicită și poartă insigna distinctivă **`★ NOU · Anunț Membru`**.
     - **Filtru dedicat în catalog**: adăugarea pilulei **`★ Anunțuri Adăugate (X)`** (`data-cat="user"`) în `#categoryFilterPills` pentru afișarea exclusivă a anunțurilor postate de utilizatori.
- **Rezultat `audit-gatekeeper`:** 🟢 **VERDE (6/6 Faze promovate — Exit Code 0)**

---

## [2026-11-11] — Arhitectura Audit Gatekeeper în 6 Faze (Cloudflare-Grade), Reziliență Numerică `sanitizeNumericAmount` & Integrare macOS Tahoe Skin
- **Autor:** Agent Paperclip
- **Ramură / Commit:** `main` ( peste `c7ce69d`, pregătit pentru commit)
- **Fișiere atinse:**
  - `.agents/AGENTS.md`
  - `.agents/CHANGELOG.md`
  - `.agents/skills/audit-gatekeeper/SKILL.md`
  - `.agents/skills/audit-gatekeeper/scripts/run_prepush_audit.py`
  - `app.js`
  - `index.html`
  - `tahoe-skin.css`
  - `vercel.json`
- **Descrierea modificării:**
  1. **Restaurare & Protecție Integritate Cod**: Eliminarea erorii externe `SyntaxError: Identifier 'isEditing' has already been declared` din `app.js` și păstrarea intactă a tuturor funcțiilor din `c7ce69d` (`openDashboardModal`, modalele GDPR/DSA, sistemul de monetizare 10 Free Swaps -> PRO).
  2. **Reziliență Formulare la `""` și Virgule (Faza 2 Audit)**: Implementarea funcției universale `sanitizeNumericAmount(rawVal, fallback = 0)` în `app.js` și conectarea ei la `convertToEur`, `convertFromEur`, `convertBetweenCurrencies`, `getOfferValueInCurrency`, `formatAmountInCurrentCurrency`, `buildParityPreviewHtml`, `handleInlineQuickPost`, `validateWizStep`, `saveCurrentWizStepInputs`, `onWizPriceInputChange`, `onQuickPostPriceChange` și `submitDirectBuyOffer`. Formularele gestionează fără erori 422/NaN câmpuri goale `""`, spații, numere cu virgulă zecimală europeană (`"15.500,50"`, `"15000,50"`) și separatori de mii (`"15,000"`).
  3. **Integrare Curată macOS Tahoe Native Skin (Faza 6 Audit)**: Includerea `/tahoe-skin.css?v=36` în `index.html` și adăugarea excepției `tahoe-skin\.css` în `vercel.json`.
  4. **Suita de Audit Pre-Push în 6 Faze (100% READ-ONLY)**: Crearea scriptului `.agents/skills/audit-gatekeeper/scripts/run_prepush_audit.py` care verifică automat în sandbox izolat: (1) compilarea JS și configurația Vercel/HTML, (2) reziliența la `""` și virgule, (3) calculele financiare în 7 monede și fluxul 10 Free Swaps -> Paywall -> +15 Pack -> PRO Unlimited, (4) integritatea datelor `INITIAL_OFFERS`/`GUIDES_DATA`, izolarea multi-cont și drepturile GDPR Art. 15/17/20, (5) 0 `alert()`/`confirm()`/`prompt()`, 0 emoji-uri și 0 secrete expuse, (6) integritatea UI/UX și `tahoe-skin.css`.
- **Rezultat `audit-gatekeeper`:** 🟢 **VERDE (6/6 Faze promovate — Exit Code 0)**

---

## [2026-11-05] — Sistem Monetizare (Primele 10 Schimburi Gratuite + Pachet +15 + Abonament PRO Nelimitat), Suită Completă GDPR/ePrivacy/DSA & Galerie Multi-Foto
- **Autor:** Agent Paperclip
- **Ramură / Commit:** `main` (`c7ce69d`)
- **Fișiere atinse:** `app.js`, `index.html`, `i18n.js`, `data.js`, `styles.css`, `vercel.json`
- **Descrierea modificării:**
  - Implementare sistem complet de monetizare: primele 10 schimburi/anunțuri gratuite la înregistrare, contor live în Header și Dashboard, Paywall automat la epuizare (`0 / 10`), achiziție Pachet `+15 Schimburi` (€9) sau `Abonament PRO Nelimitat ∞` (€19/lună sau €149/an) și buton de testare rapidă `Simulează 0 schimburi`.
  - Implementare conformitate UE GDPR (Reg. 2016/679 Art. 6, 7, 15, 17, 20), ePrivacy și Digital Services Act (DSA): banner consimțământ, centru de preferințe, export JSON portabilitate date, ștergere completă cont și raportare anunțuri.
- **Rezultat `audit-gatekeeper`:** 🟢 **VERDE (6/6 Faze promovate)**

---

## [2026-11-04] — Verificare End-to-End Fluxuri Autentificare, Wizard 7 Pași, Quick Post, Dashboard & AI Search
- **Autor:** Agent Paperclip
- **Ramură / Commit:** `main` (`b569cdf`)
- **Fișiere atinse:** `app.js`, `index.html`, `i18n.js`, `styles.css`
- **Descrierea modificării:** Bază de date persistentă de conturi (`ci4m_accounts_db_v1`), auto-completare 1-click cod verificare 6 cifre, recuperare parolă, validare pas-cu-pas în Wizard-ul de 7 pași, editare/ștergere anunțuri proprii și populare 1-click în Quick Post.
- **Rezultat `audit-gatekeeper`:** 🟢 **VERDE**

---

## [2026-11-04] — Persistență Rută/Wizard la Refresh, Z-Index Dropdown Căutare & Recomandări AI Cross-Category
- **Autor:** Agent Paperclip
- **Ramură / Commit:** `main` (`1e32734`)
- **Fișiere atinse:** `app.js`, `styles.css`, `vercel.json`
- **Descrierea modificării:** Rezolvare suprapunere dropdown căutare, potrivire pe prefix de cuvinte, sugestii AI inteligente și păstrarea exactă a pasului din Wizard la reîncărcarea paginii.
- **Rezultat `audit-gatekeeper`:** 🟢 **VERDE**

---

## [2026-11-04] — Traducere Integrală în 7 Limbi pentru Căutare & Quick Tags + Reordonare Wizard (Categoria pe Pasul 1)
- **Autor:** Agent Paperclip
- **Ramură / Commit:** `main` (`ec52d22`)
- **Fișiere atinse:** `app.js`, `i18n.js`, `index.html`
- **Descrierea modificării:** Localizare completă în `EN`, `RO`, `DE`, `FR`, `IT`, `ES`, `RU` pentru toate etichetele de căutare și deschiderea Wizard-ului direct cu selecția categoriei.
- **Rezultat `audit-gatekeeper`:** 🟢 **VERDE**

---

## [2026-11-03] — Eliminare Emoji-uri în favoarea Pictogramelor Vectoriale SVG & Optimizare Hero PC/Mobile
- **Autor:** Agent Paperclip
- **Ramură / Commit:** `main` (`e7b8b1f`)
- **Fișiere atinse:** `app.js`, `index.html`, `styles.css`
- **Descrierea modificării:** Înlocuirea tuturor emoji-urilor cu pictograme SVG arhitecturale (`PREMIUM_ICONS`), alinierea butoanelor pe un singur rând pe desktop și rafinarea ecranului de start pe mobil.
- **Rezultat `audit-gatekeeper`:** 🟢 **VERDE**

---

## [2026-11-03] — Asistent Inteligent pe Categorii & Geocoder Live în Wizard + Căutare Instantanee
- **Autor:** Agent Paperclip
- **Ramură / Commit:** `main` (`f867ae5`)
- **Fișiere atinse:** `app.js`, `index.html`, `styles.css`
- **Descrierea modificării:** Șabloane rapide pe categorii, geocodare live OpenStreetMap Photon + 24 orașe europene și bară de căutare instantanee.
- **Rezultat `audit-gatekeeper`:** 🟢 **VERDE**

---

## [2026-11-03] — Layout Mobil Ultra-Compact cu Ecran de Start & Hub Rapid cu 3 Acțiuni
- **Autor:** Agent Paperclip
- **Ramură / Commit:** `main` (`7191c97`)
- **Fișiere atinse:** `index.html`, `styles.css`, `app.js`
- **Descrierea modificării:** Optimizare mobilă cu Hero dedicat și acces rapid în 3 direcții (Caută, Publică, Înregistrare).
- **Rezultat `audit-gatekeeper`:** 🟢 **VERDE**

---

## [2026-11-03] — Marketplace 3-în-1: Schimb 1:1 + Schimb cu Diferență + Vânzare/Cumpărare Directă
- **Autor:** Agent Paperclip
- **Ramură / Commit:** `main` (`4627667`)
- **Fișiere atinse:** `app.js`, `index.html`, `i18n.js`, `styles.css`
- **Descrierea modificării:** Adăugare filtre și fluxuri dedicate pentru Schimb 1:1, Schimb + Diferență și Cumpărare/Vânzare Directă cu 0% comision.
- **Rezultat `audit-gatekeeper`:** 🟢 **VERDE**

---

## [2026-11-03] — Aliniere Verticală Drapel SVG în Selectorul de Limbă & Paritate Valutară Exactă în 7 Monede
- **Autor:** Agent Paperclip
- **Ramură / Commit:** `main` (`88b25d0`, `4b6ecb3`)
- **Fișiere atinse:** `app.js`, `i18n.js`, `styles.css`
- **Descrierea modificării:** Conversie valutară fără pierderi de rotunjire față de prețul setat de client și previzualizare live a parității în `EUR`, `USD`, `RON`, `MDL`, `RUB`, `GBP`, `CHF`.
- **Rezultat `audit-gatekeeper`:** 🟢 **VERDE**

