# ChangeIt4Me (`exchange`) — Agent Architecture & Audit Gatekeeper Rules

## 1. Prezentare Proiect
- **Aplicație**: ChangeIt4Me — Platformă Europeană de Schimb Direct 1:1 (Key-for-Key) și Vânzare Directă.
- **Locație Workspace**: `/Users/eugeniucazmal/Downloads/dev_office/exchange` (interzis accesul în afara acestui director).
- **Arhitectură**:
  - `index.html`: Structura SPA, 6 ferestre modale (`#authModal`, `#wizardModal`, `#offerModal`, `#guideModal`, `#dashboardModal`, `#adminModal`), banner GDPR (`#gdprConsentBanner`) și secțiunea de tarifare `#pricing`.
  - `app.js`: Logica aplicației (autentificare, 7-Step Wizard, formular Quick Post, calculator paritate 1:1, chat negociere 1-la-1, acord 1:1 printabil, sistem monetizare 10 schimburi gratuite + pachete +15 / abonament PRO ∞, conformitate GDPR/ePrivacy/DSA, sanitizare numerică rezilientă `sanitizeNumericAmount`).
  - `i18n.js`: Dicționare complete în 7 limbi (`en`, `de`, `fr`, `it`, `es`, `ro`, `ru`) și 7 monede (`EUR`, `USD`, `RON`, `MDL`, `RUB`, `GBP`, `CHF`).
  - `data.js`: Oferte inițiale (`INITIAL_OFFERS`) și cele 6 ghiduri/documente legale (`GUIDES_DATA`: `car-offer`, `home-swap`, `meet-and-check`, `terms-of-use`, `privacy-policy`, `cookies-policy`).
  - `styles.css` & `tahoe-skin.css`: Sistemul vizual + macOS Tahoe Native Skin (`tabular-nums`, zero scroll orizontal mobil).
  - `vercel.json`: Configurație rutare SPA pentru Vercel.

## 2. Reguli Obligatorii la Fiecare Sesiune
1. **Inițializare Sesiune**:
   - Citește `.agents/CHANGELOG.md` (ultimele 10 intrări) și `.agents/AGENTS.md`.
   - Rulează `git status --short` și `git log -5 --oneline`.
2. **Protecție Date (100% READ-ONLY în Teste)**:
   - Este **STRICT INTERZIS** să modifici datele reale din baza de date / stocarea persistentă prin scripturi de test (`db.commit()` în teste este interzis; toate testele rulează în sandbox VM izolat în memorie).
3. **Audit Gatekeeper în 6 Faze înainte de Commit / Push**:
   - Rulează obligatoriu `python3 .agents/skills/audit-gatekeeper/scripts/run_prepush_audit.py`.
   - Cele 6 faze verificate automat:
     - **Faza 1**: Compilare & Sintaxă (`node -c app.js i18n.js data.js`, validare `vercel.json`, integritate DOM în `index.html`).
     - **Faza 2**: Reziliența Formularelor la câmpuri goale `""`, virgule zecimale `,` (`"15.500,50"`, `"15000,50"`), spații și inputuri incomplete fără `NaN` sau erori 422.
     - **Faza 3**: Calcule financiare și teste etalon de business (conversii exacte în 7 monede, paritate 1:1, 10 schimburi gratuite → paywall la `0` → pachet `+15` → abonament `PRO ∞`).
     - **Faza 4**: Integritatea datelor, izolare multi-user în `accountsDb` și conformitate GDPR (Art. 15, 17, 20) & DSA.
     - **Faza 5**: Securitate — zero `alert()`/`confirm()`/`prompt()` native, zero emoji-uri pictografice (`[\u{1F300}-\u{1FAFF}]`), zero secrete expuse, zero `db.commit()` în scripturi de test.
     - **Faza 6**: Consistență UI/UX, butoane de închidere/acțiune valide și macOS Tahoe Skin (`tahoe-skin.css`).
4. **Jurnalizare Obligatorie în `.agents/CHANGELOG.md`**:
   - După fiecare modificare aplicată, adaugă o intrare nouă deasupra celor existente în `.agents/CHANGELOG.md` cu `Autor: Agent Paperclip`, descrierea modificării, fișierele atinse, ramura/commit-ul și rezultatul `audit-gatekeeper`.

