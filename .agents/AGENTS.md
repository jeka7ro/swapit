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
     - **Faza 6**: Consistență UI/UX, butoane de închidere/acțiune valide, macOS Tahoe Skin (`tahoe-skin.css`), prezența și aplicarea skill-urilor `karpathy-guidelines` și `apple-design`.
4. **Jurnalizare Obligatorie în `.agents/CHANGELOG.md`**:
   - După fiecare modificare aplicată, adaugă o intrare nouă deasupra celor existente în `.agents/CHANGELOG.md` cu `Autor: Agent Paperclip`, descrierea modificării, fișierele atinse, ramura/commit-ul și rezultatul `audit-gatekeeper`.

## 3. Reguli de Inginerie Andrej Karpathy (`.agents/skills/karpathy-guidelines/SKILL.md`)
Toate modificările de cod din proiect respectă obligatoriu cele 4 principii din `multica-ai/andrej-karpathy-skills`:
1. **Think Before Coding (Gândește înainte să scrii cod)**:
   - Nu presupune pe tăcute. Expune explicit ipotezele și compromisurile (tradeoffs). Dacă o cerință are mai multe interpretări, prezintă-le și cere clarificare.
2. **Simplicity First (Simplitatea pe primul loc)**:
   - Scrie codul minim și clar care rezolvă problema. Fără abstractizări premature, fără arhitecturi speculative sau opțiuni necerute. Dacă 200 de linii pot fi scrise curat în 50, rescrie-le.
3. **Surgical Changes (Modificări chirurgicale)**:
   - Atinge doar codul strict necesar cerinței. Nu modifica formatarea, comentariile sau codul adiacent care funcționează. Fiecare linie din `git diff` trebuie să răspundă direct cerinței utilizatorului.
4. **Goal-Driven Execution (Execuție orientată pe obiective verificabile)**:
   - Definește criteriul de succes înainte de implementare și verifică fiecare modificare prin teste automate (`run_prepush_audit.py` în 6 faze).

## 4. Apple Human Interface Guidelines & Liquid Glass (`.agents/skills/apple-design/SKILL.md`)
Orice componentă UI/UX, fereastră modală, tabel sau stil din `tahoe-skin.css`, `styles.css`, `index.html` și `app.js` respectă regulile din `dickwu/apple-design-skill`:
1. **Cele 8 Principii Apple Design (Iunie 2026 — `design-principles.md`)**:
   - *Purpose*, *Agency*, *Responsibility*, *Familiarity*, *Flexibility*, *Simplicity*, *Craft*, *Delight*.
2. **Disciplina Liquid Glass pe 2 Straturi (`references/hig/liquid-glass.md`)**:
   - **Functional Layer (Stratul Funcțional Plutitor)**: Header-ul (`.header`), barele de navigare, ferestrele modale/sheets (`.glass-auth-modal`, `.bo-login-card`, `.modal`, `.chat-dock`), antetele sticky de tabel (`thead th`) și notificările toast folosesc materialul **Liquid Glass** (`backdrop-filter: blur(24px) saturate(140%)`, contur specular `1px` și adaptare la luminozitate).
   - **Content Layer (Stratul de Conținut)**: Cardurile de anunțuri (`.offer-card`), panourile Backoffice (`.bo-card`, `.bo-kpi-card`) și tabelele de date folosesc suprafețe opace curate — **niciodată nu se suprapune sticlă peste sticlă în stratul de conținut**.
3. **Accesibilitate Critică (Lens 1 — `references/hig/accessibility.md`)**:
   - Ținte tactile de minim `44x44px` pe mobil/touch și `28x28px` pe desktop.
   - Contrast text `>= 4.5:1` pentru corp de text și `>= 3:1` pentru titluri, cifre tabelare (`font-variant-numeric: tabular-nums`).
   - Inel de focus vizibil la navigarea din tastatură (`:focus-visible`) și suport complet pentru `@media (prefers-reduced-motion: reduce)`, `@media (prefers-reduced-transparency: reduce)` și `@media (prefers-contrast: more)`.

## 5. Metodologia Ruflo / Ruflow SPARC & Meta-Harness (`.agents/skills/ruflo-sparc/SKILL.md`)
Orice funcționalitate nouă sau modificare arhitecturală urmează fluxul în 5 porți de calitate din `ruvnet/ruflo` & `henryalouf/ruflow`:
1. **S — Specification**: Definirea clară a cerințelor, criteriilor de acceptare și cazurilor limită.
2. **P — Pseudocode**: Schițarea logicii și a fluxului de date înainte de modificarea codului.
3. **A — Architecture**: Verificarea impactului în `index.html`, `app.js`, `i18n.js`, `data.js`, `api/sync.js` și `tahoe-skin.css`.
4. **R — Refinement**: Implementare chirurgicală (TDD) cu teste automate în sandbox.
5. **C — Completion**: Verificare finală prin suita `audit-gatekeeper` în 6 faze (Meta-Harness Readiness Score `100/100`) și jurnalizare în `.agents/CHANGELOG.md`.



