## [2026-04-17] — Audit Fluxuri Utilizator Nelogat vs. Logat: Propuneri, Publicare, Filtru Favorite, Banner Proprietar & Schimbare Parolă din Profil (`?v=121`–`?v=122`)
- **Autor**: Agent Paperclip
- **Descriere modificare**:
  1. **Protecție Utilizator Nelogat la Trimiterea Propunerilor 1:1 / Cumpărare Directă (`submitDirectSwapProposal`, `submitDirectBuyOffer`)**:
     - Când un vizitator nelogat apasă pe *„Trimite Propunere de Schimb 1:1”* sau *„Trimite Ofertă de Cumpărare”* din interiorul `#offerModal`, aplicația nu mai creează o propunere orfană (`senderEmail: ""`) fără cont și fără acces la chat, ci deschide `#authModal` **deasupra** anunțului (`z-index: 4500 > 3500`), păstrând textul introdus. După logare, reîmprospătează automat `#offerModal` cu datele utilizatorului și lista anunțurilor sale proprii în dropdown-ul de schimb.
  2. **Protecție Utilizator Nelogat la Publicarea unui Anunț (`handleInlineQuickPost`, `publishWizardOffer` Pasul 7) și la Filtrul „♥ Salvate” (`filterByCategory("favs")`)**:
     - Publicarea prin Quick Post sau Pasul 7 din Wizard cere acum autentificarea în cont (`requireAuthForPostingOrProposal`), păstrând draftul completat și pre-completând emailul în `#authModal`, astfel încât niciun anunț să nu mai poată fi publicat orfan (`ownerEmail: ""`).
     - La Pasul 7 din Wizard, pentru utilizatorii autentificați, câmpul `#wizEmail` este blocat `readonly` pe adresa verificată a contului.
     - Apăsarea pilulei *„♥ Salvate”* din catalog ca vizitator nelogat deschide direct `#authModal("login")`.
  3. **Banner Proprietar în `#offerModal` (`isCustomOwner`)**:
     - Când proprietarul își deschide propriul anunț în `#offerModal`, vede un banner clar (*„● Acesta este anunțul tău activ”*) cu butoane directe 1-click pentru **✎ Editează Anunțul** și **⇄ Propuneri Primite**.
  4. **Profil & Setări (`saveDashboardProfile`) — Schimbare Parolă Opțională, Validare Telefon & Sincronizare Nume pe Anunțurile Active**:
     - Adăugat câmp opțional pentru schimbarea parolei direct din tabul *Profil & Setări* (criptat cu `hashUserPassword` SHA-256).
     - Validat telefonul prin `isValidRealPhone` și sincronizat automat noul nume (`o.owner`) pe toate anunțurile active deținute de utilizator.
  5. **Re-randare Live la Schimbarea Limbii / Monedei (`setLanguage`, `setCurrency`)**:
     - Dacă `#adminModal` sau `#authModal` este deschis în momentul schimbării limbii/monedei, conținutul lor se re-randează instant în noua limbă/monedă.
- **Fișiere atinse**: `app.js`, `index.html`, `.agents/CHANGELOG.md`
- **Rezultat `audit-gatekeeper`**: `6/6 FAZE VERDE` + `10/10 Viewports Mobile/Tablet/PC Desktop PASS (0 issues)`

## [2026-04-17] — Fix Ierarhie `z-index` Ferestre Modale (`#authModal` deasupra `#offerModal`) + Auto-Salvare la Favorite după Logare (`?v=120`)
- **Autor**: Agent Paperclip
- **Descriere modificare**:
  1. **Ierarhie Strictă pe 8 Niveluri `z-index` pentru Ferestre Modale & Notificări (`tahoe-skin.css`, `styles.css`)**:
     - Rezolvat bug-ul în care, atunci când un utilizator nelogat deschidea un anunț (`#offerModal`, `z-index: 3500`) și apăsa pe inimioară (`toggleFavorite`), fereastra de autentificare (`#authModal`) avea același `z-index: 3500` dar se afla mai sus în DOM (`index.html:1614` vs `1928`), deschizându-se **sub** fereastra anunțului (`#offerModal`), iar notificarea `.toast-container` avea `z-index: 100` (tot în spatele modalului).
     - Stabilit ierarhia strictă: `#dashboardModal.open` (`2500`) < `#adminModal.open` (`3000`) < `#offerModal.open` (`3500`) < `#wizardModal.open` (`3600`) < `#authModal.open` (`4500`) < `#guideModal.open` (`4650`, pentru citirea Termenilor/GDPR sau Paywall din interiorul oricărui modal) < `#appleSheetModal.open` (`4750`) < `.hig-lightbox-backdrop.open` (`4850`) < `.toast-container` (`9999`, cu `pointer-events: none` pentru a nu bloca click-urile).
  2. **Auto-Salvare la Favorite Imediat După Autentificare (`pendingFavoriteOfferId` în `app.js`)**:
     - Când un vizitator nelogat apasă pe inimioara `♡` (din card sau din interiorul `#offerModal`), `toggleFavorite` memorează `pendingFavoriteOfferId = offerId` și deschide `#authModal` **deasupra** anunțului.
     - Imediat după autentificare (`activateUserAccount`), anunțul este adăugat automat la `favoriteIds`, `#offerModal` rămâne deschis dedesubt (`hasAnyOpenModalBackdrop()`), iar inimioara din `#offerModal` (`#offerModalFavBtn`) devine automat roșie (`♥`).
  3. **Test E2E Matematic (`elementFromPoint` & `getComputedStyle(zIndex)`) în `run_mobile_cdp_audit.js` (6D)**:
     - Verifică în Chrome Headless că la apăsarea inimioarei din `#offerModal` ca vizitator nelogat, `authZ (4500) > offerZ (3500)`, `toastZ (9999) > authZ (4500)`, `document.elementFromPoint` la centrul ecranului lovește `#authModal` (nu `#offerModal`), iar după logare `#offerModal` rămâne deschis cu inimioara activată `♥`.
- **Fișiere atinse**: `tahoe-skin.css`, `styles.css`, `app.js`, `index.html`, `.agents/skills/webapp-testing/scripts/run_mobile_cdp_audit.js`, `.agents/CHANGELOG.md`
- **Rezultat `audit-gatekeeper`**: `6/6 FAZE VERDE` + `10/10 Viewports Mobile/Tablet/PC Desktop PASS (0 issues)`

## [2026-04-17] — Verificare & Întărire Creare Manuală Cont + Gate Obligatoriu OTP Email Înainte de Activare (`?v=119`)
- **Autor**: Agent Paperclip
- **Descriere modificare**:
  1. **Verificare Email cu Cod din 6 Cifre ÎNAINTE de Crearea Contului (`startEmailVerification` -> `handleVerifyEmailCode`)**:
     - Confirmat și blindat fluxul în care la apăsarea butonului *„Înregistrare”* (`handleModalRegister` / `handleInlineRegistration`), contul **NU** este creat în `accountsDb` și sesiunea `currentUser` rămâne `null`. Datele sunt păstrate doar în `pendingRegistrationUser`, se trimite codul din 6 cifre pe email (prin `/api/sync` -> `action: "send_otp"` / Brevo SMTP / Resend, valabil 10 minute, maxim 5 încercări), și **abia după introducerea codului corect din 6 cifre** în `handleVerifyEmailCode` se apelează `activateUserAccount(verifiedPayload)` și se consumă OTP-ul pe server (`action: "verify_otp"`).
  2. **Păstrarea Flag-urilor de Verificare la Crearea Contului Nou (`activateUserAccount`)**:
     - Fixat un bug în `activateUserAccount(userData)` unde pentru un cont nou (`existingAcc === null`), câmpurile `emailVerified: true`, `kycVerified: true`, `phoneVerified: true` și `registeredAt` din `verifiedPayload` nu erau copiate în `currentUser` și `accountsDb[emailKey]`.
  3. **Validare Live și Mesaje Separate pentru Parolă (`pwdTooShort` vs `pwdMismatch`) + Buton „← Modifică adresa de email”**:
     - Separat eroarea de parolă prea scurtă (`< 6` caractere -> `am.pwdTooShort` tradus în toate cele 7 limbi) de eroarea de neconcordanță între parolă și confirmare (`am.pwdMismatch`).
     - Extins `validateLiveAuthField` pe toate cele 5 câmpuri ale formularului manual (`name`, `email`, `phone`, `password`, `confirmPassword`) și păstrat formularul neșters până la validarea codului din 6 cifre, adăugând butonul `← Modifică adresa de email` pe ecranul OTP.
  4. **Test E2E Automatizat în `run_mobile_cdp_audit.js` (6C)**:
     - Testează în Chrome Headless respingerea parolei `< 6` caractere, respingerea parolelor diferite, absența contului în `accountsDb` înainte de introducerea codului OTP, respingerea unui cod OTP greșit, crearea contului cu parolă criptată `sha256$` și `10` schimburi gratuite doar după codul OTP corect, și autentificarea manuală ulterioară cu parola.
- **Fișiere atinse**: `app.js`, `index.html`, `.agents/skills/webapp-testing/scripts/run_mobile_cdp_audit.js`, `.agents/CHANGELOG.md`
- **Rezultat `audit-gatekeeper`**: `6/6 FAZE VERDE` + `10/10 Viewports Mobile/Tablet/PC Desktop PASS (0 issues)`

# ChangeIt4Me (`exchange`) — Jurnal Oficial de Modificări & Audit Gatekeeper

Toate modificările sunt adăugate cronologic invers (cele mai noi deasupra) și validate prin suita în 6 faze `.agents/skills/audit-gatekeeper/scripts/run_prepush_audit.py`.

---

## [2026-11-22] — Integrare & Aplicare Skill-uri `andrej-karpathy-skills` (`karpathy-guidelines`), `apple-design-skill` (`apple-design` HIG + Liquid Glass) & `ruflow` (`ruflo-sparc` Meta-Harness)
- **Autor:** Agent Paperclip
- **Ramură / Commit:** `main` (peste `2cfdc77`, pregătit pentru commit)
- **Fișiere atinse:**
  - `.agents/skills/karpathy-guidelines/SKILL.md`
  - `.agents/skills/apple-design/SKILL.md` (+ `references/hig/*.md`, `GEMINI.md`, `AGENTS.md`)
  - `.agents/skills/ruflo-sparc/SKILL.md` (+ `scripts/`)
  - `.agents/AGENTS.md`
  - `tahoe-skin.css`
  - `app.js`
  - `api/sync.js`
   - `dev_server.py`
  - `supabase_schema.sql`
  - `index.html`
  - `.agents/skills/audit-gatekeeper/scripts/run_prepush_audit.py`
  - `.agents/CHANGELOG.md`
- **Descrierea modificării:**
  1. **Instalare și Activare Skill `karpathy-guidelines` (`https://github.com/multica-ai/andrej-karpathy-skills`) & `ruflo-sparc` (`https://github.com/henryalouf/ruflow`)**:
     - Instalarea `.agents/skills/karpathy-guidelines/SKILL.md` și `.agents/skills/ruflo-sparc/SKILL.md` în workspace și codificarea celor 4 principii Karpathy (**Think Before Coding**, **Simplicity First**, **Surgical Changes**, **Goal-Driven Execution**) și a celor 5 faze Ruflo SPARC (**Specification**, **Pseudocode**, **Architecture**, **Refinement**, **Completion**) în `.agents/AGENTS.md`.
  2. **Instalare și Aplicare Skill `apple-design` (`https://github.com/dickwu/apple-design-skill`)**:
     - Instalarea `.agents/skills/apple-design/SKILL.md` împreună cu cele 123 de pagini oficiale Apple HIG (`references/hig/*.md` și ghidul curat `references/hig/liquid-glass.md`).
     - Implementarea disciplinei **Apple Liquid Glass pe 2 straturi** în `tahoe-skin.css`:
       - **Functional Layer** (`.header`, `.glass-auth-modal`, `.bo-login-card`, `.modal`, `.chat-dock`, `.toast`, `thead th`): material `Liquid Glass Regular` (`backdrop-filter: blur(24px) saturate(140%)` + contur specular `inset 0 1px 0 rgba(255,255,255,0.22)`).
       - **Content Layer** (`.offer-card`, `.bo-card`, `.bo-kpi-card`, `.bo-table-wrap`): suprafețe opace curate, fără suprapunere de sticlă peste sticlă (`liquid-glass.md › Review checklist #1 & #2`).
     - Implementarea **Apple HIG Lens 1 (Accesibilitate Critică)** în `tahoe-skin.css`: inel de focus pentru tastatură (`:focus-visible`), ținte tactile `44x44px` pe mobil/touch (`--hig-hit-mobile: 44px`) și `28x28px` pe desktop, `font-size: 16px` pe inputuri mobile (prevenire auto-zoom iOS Safari), plus suport nativ pentru `@media (prefers-reduced-motion: reduce)`, `@media (prefers-reduced-transparency: reduce)` și `@media (prefers-contrast: more)`.
     - **Aplicare Completă Apple HIG pe Toate Cardurile, Ferestrele, Formularele, Pop-up-urile, Acțiunile Edit și Delete (`#offerModal`, `#appleSheetModal`, `.swap-card`) & Audit Multi-Agent Cap-Coadă (Design, Securitate, Funcționalitate, Comunicare & i18n)**:
       - **Optimizare Mobil iOS HIG pe Toate Dimensiunile de Ecrane (`320px`–`768px`), Grabber Swipe-to-Dismiss, Bară iOS Tab Bar Jos (`#mobileBottomTabBar`), Eliminare Trunchiere Texte în `#offerModal` & Text Alb `#ffffff` pe Cardul `.plan.dark` și Toate Butoanele/Etichetele Verzi (`?v=107`)**: ascunderea `#mobileQuickHub` pe mobil și afișarea directă a cardului Hero cu fotografia la începutul paginii + bară iOS Spotlight (`width: 100%; min-width: 0; flex: 1 1 0%`) + 1 singur buton CTA principal full-width (`buttons.md` › 1 prominent button per view, fără tăiere pe ecrane de `320px`–`430px`), urmat imediat de `#categories` și `#offers`; adăugarea **barei de navigare iOS Liquid Glass în partea de jos pe mobil (`#mobileBottomTabBar` — `tab-bars.md`)** cu 5 tab-uri (`Anunțuri`, `Categorii`, `+ Adaugă`, `Hartă`, `Contul Meu` + badge roșu `#mobTabAccountBadge` afișat exclusiv când utilizatorul este autentificat) traduse în 7 limbi; transformarea liniei de sus (`.hig-sheet-grabber-zone` / `.hig-sheet-grabber` — `sheets.md`) într-un **grabber interactiv real** care închide fereastra când tragi cu degetul în jos (`initAppleSheetSwipeToDismiss` cu animație `translateY` după deget) sau când apeși pe el; fixarea butonului de închidere `✕` în colțul din dreapta-sus pe primul rând (`.hig-offer-top-row`); constrângerea grilelor CSS la `minmax(0, 1fr)` și `#dealModePills` cu scroll orizontal fluid pe mobil pentru zero depășiri pe orice lățime de telefon; actualizarea favicon-ului (`<link rel="icon">`) cu logo-ul curent `#0d8a5e` + săgeți albe `#ffffff`; compactarea `#gdprConsentBanner` într-o bară-pilulă de `44px` pe un singur rând pe mobil; repararea scroll-ului nativ pe iOS Safari în `#offerModal`, `#wizardModal` și `#guideModal`; eliminarea oricărei trunchieri de text în `#offerModal` și text alb `#ffffff` pe toate rândurile `#plan3List li`, prețul `#planPricePro` și toate butoanele/etichetele verzi.
       - **Optimizare Mobil iOS HIG pe Toate Dimensiunile de Ecrane (`320px`–`768px`), Grabber Swipe-to-Dismiss, Bară iOS Tab Bar Jos (`#mobileBottomTabBar`), Eliminare Trunchiere Texte în `#offerModal` & Text Alb `#ffffff` pe Cardul `.plan.dark` și Toate Butoanele/Etichetele Verzi (`?v=107`)**: ascunderea `#mobileQuickHub` pe mobil și afișarea directă a cardului Hero cu fotografia la începutul paginii + bară iOS Spotlight (`width: 100%; min-width: 0; flex: 1 1 0%`) + 1 singur buton CTA principal full-width (`buttons.md` › 1 prominent button per view, fără tăiere pe ecrane de `320px`–`430px`), urmat imediat de `#categories` și `#offers`; adăugarea **barei de navigare iOS Liquid Glass în partea de jos pe mobil (`#mobileBottomTabBar` — `tab-bars.md`)** cu 5 tab-uri (`Anunțuri`, `Categorii`, `+ Adaugă`, `Hartă`, `Contul Meu` + badge roșu `#mobTabAccountBadge` afișat exclusiv când utilizatorul este autentificat) traduse în 7 limbi; transformarea liniei de sus (`.hig-sheet-grabber-zone` / `.hig-sheet-grabber` — `sheets.md`) într-un **grabber interactiv real** care închide fereastra când tragi cu degetul în jos (`initAppleSheetSwipeToDismiss` cu animație `translateY` după deget) sau când apeși pe el; fixarea butonului de închidere `✕` în colțul din dreapta-sus pe primul rând (`.hig-offer-top-row`); constrângerea grilelor CSS la `minmax(0, 1fr)` și `#dealModePills` cu scroll orizontal fluid pe mobil pentru zero depășiri pe orice lățime de telefon; actualizarea favicon-ului (`<link rel="icon">`) cu logo-ul curent `#0d8a5e` + săgeți albe `#ffffff`; compactarea `#gdprConsentBanner` într-o bară-pilulă de `44px` pe un singur rând pe mobil; repararea scroll-ului nativ pe iOS Safari în `#offerModal`, `#wizardModal` și `#guideModal`; eliminarea oricărei trunchieri de text în `#offerModal` și text alb `#ffffff` pe toate rândurile `#plan3List li`, prețul `#planPricePro` și toate butoanele/etichetele verzi.
       - **Apple Store Catalog Cards (`.swap-card`), Fereastra de Detalii (`#offerModal` / `openOfferModal`), Pagina Personală a Clientului (`/dashboard`), Backoffice (`/admin`) & Toate Modalele (`?v=81`)**: eliminarea celor 6 etichete aglomerate de pe fotografiile cardurilor și înlocuirea cu o singură pilulă `Clear Liquid Glass` stânga-sus + butonul circular de favorite dreapta-sus (`.swap-fav-btn.is-fav` alb cu inimă roșie Apple `#e11d48`), preț cu cifre tabelare inline (`swap-card-price-inline`), înlocuirea celor 6 pilule gri de paritate valutară din `#offerModal` cu un droplist Apple HIG compact pe un singur rând (`.hig-parity-bar` + `.hig-parity-select`), **Galerie Foto Full-Screen Apple Quick Look (`#photoLightboxModal` / `openPhotoLightbox`) cu butoane `Prev (‹)` / `Next (›)`, miniaturi și navigare din săgețile tastaturii (`←` / `→` / `Esc`)**, unificarea cardurilor `Propose Swap` și `Buy / Cash Offer` (`.hig-action-card` + pilule rapide `-10%`, `-5%`, `100%`), **transformarea Dashboard-ului personal din pop-up într-o Pagină Personală Full-Screen a Clientului (`/dashboard`) cu Sidebar Alb în Stânga (`238px`), Topbar Alb, 5 Carduri KPI cu pilule SLA `#eaf7f1` și Carduri Vizuale pentru `My Listings` (inclusiv `#950111` *2024 Mercedes-AMG G 63 Magno*) și `Swap Proposals` (`THEY OFFER ⇄ TARGET LISTING`)**, unificarea întregii palete de culori pe **Apple Emerald `#0d8a5e` cu text alb `#ffffff` și Soft Emerald `#eaf7f1`** (zero `#a9ffca` neon), **restricționarea strictă a acțiunilor Edit & Delete (`isListingOwnedByCurrentUser` / `canCurrentUserManageListing`) exclusiv la proprietarul real al anunțului logat sau la Super-Admin în Backoffice (`/admin`)**, plus **redesign-ul complet Apple HIG al Backoffice-ului (`/admin`) cu Sidebar Alb, iconițe SF Symbols și butoane-iconiță rotunde (`.bo-icon-btn`, `34x34px`)**, selector **Google & Apple Sign-In 1-Click (`renderSocialAccountChooserList`)**, adăugarea anunțurilor noi (`#950107`–`#950111`) cu traduceri în 7 limbi și integrarea live **Brevo Email Verification (`api/sync.js`, `dev_server.py`)**.
       - **Securitate, Hash-uire SHA-256 Parole, Stripe Checkout, Compresie & Upload Cloud Imagini și Schema Supabase (`api/sync.js`, `dev_server.py`, `app.js`, `supabase_schema.sql`)**: eliminarea parolei admin în clar din `app.js` în favoarea verificării criptografice SHA-256 (`BACKOFFICE_ADMIN_PASS_HASH` + `action: "admin_login"`), hash-uirea automată SHA-256 cu salt (`sha256$...`) a tuturor parolelor utilizatorilor pe client și server (`hashUserPassword` / `hashUserPasswordServer` + `action: "user_login"`), integrarea **Stripe Checkout** (`action: "create_checkout_session"` + Payment Links + auto-creditare la întoarcerea pe `?stripe_success=pack15|pro_monthly|pro_yearly`), compresia automată HTML5 Canvas a fotografiilor încărcate la max `1280px` (`image/jpeg 0.82`) + upload pe server (`action: "upload_image"` servit din `/uploads/...` sau Cloudinary) și schema SQL completă `supabase_schema.sql` pentru tabela `public.ci4m_state`.
       - **Funcționalități, Comunicare 1-la-1 & i18n în 7 Limbi / 7 Monede**: parsare rezilientă cu `sanitizeNumericAmount` pentru sume cu virgulă zecimală în calculatorul 1:1, oferta cash, filtrul de preț și wizard (`type="text" inputmode="decimal"`), butoane directe de contact cu 1 click (`✉ Email`, `✆ Telefon / SMS`, `WhatsApp`) în propunerile de schimb și în Acordul 1:1 printabil, traduceri complete `i18n` în 7 limbi pentru primele 6 anunțuri ale membrilor (`#950101`–`#950106`), remedierea selectorului de limbă din Dashboard (`l.label || l.name`) și afișarea dinamică a creditelor (`remSwaps / maxSwaps`) după activarea pachetului `+15 Swaps`.
       - **Apple HIG Single-View Quick-Edit Sheets (`sheets.md` & `entering-data.md`)**: `openQuickEditListingSheet(offerId)` (pentru editarea rapidă într-o singură fereastră a oricărui anunț din Backoffice, Dashboard sau `#offerModal`, cu bară Apple Sheet `Cancel` | `Edit Listing #...` | `Save Changes` + buton `7-Step Wizard…` și încărcare directă de fotografii din dispozitiv), `openAdminEditUserSheet(emailKey)` (pentru editarea conturilor din Backoffice) și butonul `✓ Save Changes` direct în footer-ul `#wizardModal` pe orice pas în modul Edit.
       - **Apple HIG Destructive Confirmation Sheets + Toast Undo (`alerts.md`, `buttons.md`, `undo-and-redo.md`)**: `openAppleDestructiveConfirmSheet()` activat pe toate acțiunile de ștergere (`requestDeleteListing`, `requestAdminDeleteAccount`, `requestDeleteProposal`, `requestDeleteWatchlistAlert`, `requestDeleteGdprAccount`), cu buton `Cancel` în stânga, buton roșu distructiv `Delete` în dreapta și buton **`↺ Undo` (`Anulează`)** direct în notificarea Toast pentru restaurare cu 1 click.
       - **Validare Dinamică Live în Formulare & Navigare Ierarhică `Escape` (`Esc`)**: `validateLiveAuthField()` pentru feedback vizual instantaneu pe câmpurile Email/Telefon și închiderea ierarhică cu tasta `Esc` doar a ferestrei/sheet-ului activ de deasupra (`#appleSheetModal` → `#offerModal` / `#wizardModal` → `#adminModal`).
  3. **Verificare Automată în Audit Gatekeeper (Faza 4 & Faza 6)**:
     - Extinderea `phase_6_ui_ux_and_tahoe_skin()` în `.agents/skills/audit-gatekeeper/scripts/run_prepush_audit.py` pentru a valida automat prezența și integritatea ambelor skill-uri (`karpathy-guidelines` și `apple-design`) și a regulilor Apple HIG / Liquid Glass din `tahoe-skin.css`.
- **Rezultat Audit Gatekeeper:** `6/6 FAZE VERDE` (`python3 .agents/skills/audit-gatekeeper/scripts/run_prepush_audit.py`).

---

## [2026-11-11] — Validare Anti-Fake Email & Telefon, Confirmare Strictă Cod OTP 6 Cifre (Email Resend + SMS Twilio) & Autentificare Automată cu Google / Gmail (`OAuth 2.0`)
- **Autor:** Agent Paperclip
- **Ramură / Commit:** `main` (peste `2cfdc77`, pregătit pentru commit)
- **Fișiere atinse:**
  - `index.html`
  - `app.js`
  - `api/sync.js`
  - `dev_server.py`
  - `.agents/skills/audit-gatekeeper/scripts/run_prepush_audit.py`
  - `.agents/CHANGELOG.md`
- **Descrierea modificării:**
  1. **Câmp Obligatoriu de Telefon + Filtru Anti-Fake (`isValidRealEmail` & `isValidRealPhone`)**:
     - Adăugarea câmpului obligatoriu `input[name="phone"]` în ambele formulare de înregistrare (`#modalRegisterForm` și `#enrollAccountPanel`) din `index.html`.
     - Implementarea `isValidRealEmail()` în `app.js` (blochează 20+ domenii de email temporare/burner precum `mailinator.com`, `tempmail.com`, `10minutemail.com`, `yopmail.com`, `fake.com`, etc. și adresele repetitive) și `isValidRealPhone()` (validează numere mobile reale de 9–15 cifre și respinge secvențele false precum `0700000000`, `111111111`, `123456789`).
  2. **Confirmare Strictă prin Cod OTP din 6 Cifre (Email + SMS) & Blocare Login Conturi Neverificate**:
     - Repararea `handleVerifyEmailCode()` în `app.js` astfel încât să verifice strict `entered === String(generatedVerifyCode)` (respingând orice cod greșit) și integrarea trimiterii codului OTP prin `POST /api/sync` (`action: "send_otp"` / `action: "verify_otp"`) cu suport nativ pentru **Resend Email API** și **Twilio SMS API**.
     - Repararea `handleModalLogin()` astfel încât un email neînregistrat să nu mai poată intra fără verificare, ci să fie redirecționat către înregistrare + confirmare cod OTP.
  3. **Logare Automată cu Google / Gmail (`handleGoogleAuth` + Google Identity Services OAuth 2.0)**:
     - Înlocuirea vechiului demo din `handleGoogleAuth()` cu integrarea oficială **Google Identity Services (`accounts.google.com/gsi/client`)** + formularul verificat `#modalGoogleForm` pentru conturi `@gmail.com` și memorarea contului Gmail verificat pentru logare cu 1 click.
     - Adăugarea panoului **Google OAuth 2.0, Email OTP (Resend) & SMS OTP (Twilio)** în Backoffice (`/admin` → `GDPR & Compliance`).
- **Rezultat Audit Gatekeeper:** `6/6 FAZE VERDE` (`python3 .agents/skills/audit-gatekeeper/scripts/run_prepush_audit.py`).

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

