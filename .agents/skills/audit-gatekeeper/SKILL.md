---
name: audit-gatekeeper
description: Suita de Audit Gatekeeper în 6 faze (Cloudflare Security & Business Audit) pentru ChangeIt4Me. Rulează obligatoriu înainte de orice commit sau push.
---

# Audit Gatekeeper (6-Phase Cloudflare Security & Business Audit)

## Utilizare
Rulează din rădăcina proiectului (`/Users/eugeniucazmal/Downloads/dev_office/exchange`):

```bash
python3 .agents/skills/audit-gatekeeper/scripts/run_prepush_audit.py
```

## Cele 6 Faze ale Auditului
1. **Faza 1 — Compilare, Sintaxă & Integritate Configurație**:
   - Verifică sintaxa JavaScript (`node -c`) pentru `app.js`, `i18n.js`, `data.js`.
   - Verifică validitatea `vercel.json` și prezența regulilor de servire pentru `styles.css`, `tahoe-skin.css`, `app.js`, `i18n.js`, `data.js`.
   - Verifică structura `index.html` și prezența tuturor containerelor modale și a butoanelor de închidere.
2. **Faza 2 — Reziliența Formularelor (Câmpuri Goale `""` / Virgule `,` / Inputuri Malformate)**:
   - Testează în sandbox VM `sanitizeNumericAmount`, `convertToEur`, `convertFromEur`, `convertBetweenCurrencies`, `parseSmartLocationString`, `handleInlineQuickPost`, `validateWizStep`, `submitDirectSwapProposal`, `submitDirectBuyOffer`, `handleWatchlistSubmit` cu valori `""`, `"15.500,50"`, `"15,000"`, `"   "`, `null` fără erori sau `NaN`.
3. **Faza 3 — Calcule Financiare & Teste Etalon de Business**:
   - Verifică paritatea valutară pe toate cele 7 monede (`EUR`, `USD`, `RON`, `MDL`, `RUB`, `GBP`, `CHF`), calculatorul de diferență 1:1 și fluxul complet de monetizare (10 schimburi gratuite la înregistrare → blocare paywall la `0` schimburi → deblocare cu Pachet `+15` sau Abonament `PRO ∞`).
4. **Faza 4 — Integritatea Datelor, Izolare Multi-User & Conformitate GDPR/DSA (100% Read-Only)**:
   - Verifică integritatea `INITIAL_OFFERS` și `GUIDES_DATA` în toate cele 7 limbi (`en`, `de`, `fr`, `it`, `es`, `ro`, `ru`), izolarea conturilor în `accountsDb`, exportul datelor personale (`exportUserGdprData` Art. 15/20), ștergerea completă a contului (`deleteUserGdprAccount` Art. 17) și raportarea DSA (`reportOfferListing`).
5. **Faza 5 — Securitate, Zero `alert()`/`confirm()`, Zero Emoji-uri Pictografice & Zero Secrete**:
   - Scanează codul sursă pentru interzicerea `alert(`, `confirm(`, `prompt(`, a cheilor/secretelor expuse, a apelurilor `db.commit()` în teste și a emoji-urilor pictografice (`[\u{1F300}-\u{1FAFF}]`).
6. **Faza 6 — Audit UI/UX & macOS Tahoe Native Skin**:
   - Verifică prezența și încărcarea `tahoe-skin.css` (`tabular-nums`, fonturi native Apple HIG, protecție overflow mobil).

