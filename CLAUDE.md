@AGENTS.md

# Move in Paris — Contexte projet (CLAUDE.md)

> Ce fichier est lu automatiquement à chaque session Claude Code. Il sert de mémoire institutionnelle du projet.

## 1. Le business

**Move in Paris** : agence parisienne de location meublée corporate et gestion locative. Fondée en 2018. Adresse : 26 rue de l'Étoile, 75017 Paris. Tel +33 1 45 20 06 03.

### Trois audiences cibles
1. **Propriétaires** parisiens (priorité acquisition actuelle)
2. **Entreprises** (DRH, Office Managers de grands groupes — clients corporate)
3. **Locataires** (cadres expatriés, consultants en mission, dirigeants)

### Modèle économique (CRITIQUE pour comms et SEO)
- **Service 100 % gratuit pour le propriétaire**, toujours, quelle que soit la durée
- **Court / moyen terme (≤ 12 mois)** : 0 € pour locataire entreprise aussi, pas de dépôt de garantie
- **Long terme (> 12 mois)** : 12,5 % HT du loyer annuel à charge de l'entreprise locataire + 2 mois de dépôt de garantie reversés intégralement au propriétaire bailleur
- Bail société (Code civil 1714-1762) en format par défaut
- Assistance technique 7j/7 incluse — bénéfice indirect au propriétaire

### Métriques clés (à jour 2026-04)
- 52 appartements au catalogue (Paris 8e, 16e, 17e, La Défense, Neuilly principalement)
- +200 entreprises clientes
- 117 000+ nuits gérées
- 4,8/5 sur 61 avis Google
- > 95 % de taux d'occupation moyen

### Clients corporate confirmés (utilisables publiquement sur le site)
L'Oréal, LVMH, AXA, Sanofi, Goldman Sachs, BNP Paribas, Deloitte, EY.

**⚠️ DISCRÉTION** : ces noms restent **sur le site uniquement**. **Pas de citation sur Google Business Profile, Facebook ou autres plateformes tierces** (relation directe avec ces concurrents qui les ont aussi comme clients). Sur Google/FB, on parle de « grandes entreprises du CAC 40, banques d'affaires, cabinets de conseil internationaux » sans nommer.

### Concurrents directs (NE PAS attaquer publiquement)
Paris Attitude, Lodgis, My Flat in Paris, Paris Corporate Housing, Flex Living. Marché de niche, tout le monde se connaît, on partage des clients. **Pas de pages comparatives** publiques (suppr. en mai 2026, c'était une mauvaise idée). On préfère des pages méthodologiques neutres ("comment choisir une agence corporate housing").

## 2. Stack technique

- **Framework** : Next.js 15 App Router (voir AGENTS.md — version avec breaking changes vs ce que tu connais peut-être)
- **Hébergement** : Vercel (auto-deploy depuis main GitHub)
- **Domaine** : www.move-in-paris.com
- **Repo** : github.com/Vincent075/move-in-paris
- **i18n** : custom (src/i18n/), 2 locales : `fr` (default) + `en`. Switching via cookie `locale`. **Pas d'auto-detect Accept-Language** (cassait l'expérience). Hook `usePickField()` pour les champs bilingues des appartements.

### Variables d'environnement (Vercel + .env.local pour scripts)
- `ANTHROPIC_API_KEY` — clé Claude API (auto-traduction des appartements via Claude Haiku 4.5)
- `GITHUB_TOKEN` — admin → API → modifie apartments.json sur GitHub
- `ADMIN_PASSWORD` — protège /api/admin-auth, /api/apartment, /api/apartment-update
- `RESEND_API_KEY` — pour les emails transactionnels (Resend)
- DNS migré vers Vercel courant 2026 (avant : OVH/WordPress).

### Auto-traduction des appartements (système important)
Quand l'admin ajoute/modifie un appart via /admin :
1. POST /api/apartment ou PUT /api/apartment-update
2. Le serveur appelle `translateApartment()` (lib/translate.ts) avec Claude Haiku
3. Le prompt inclut le champ `bedrooms` comme **source de vérité** (PAS calculer pieces - 1, certains apparts ont double salon)
4. Title/description/floor/features sont traduits en EN
5. Sauvegarde dans GitHub
6. Si traduction échoue, retourne `translationWarning` au front (admin voit le souci)

Script de retraduction batch : `node scripts/retranslate-all-apartments.mjs --force` (lit `.env.local`).

## 3. SEO — état mai 2026

### Stratégie validée
**Niche-first plutôt que broad term.** On ne peut pas battre Lodgis ou Airbnb sur "location meublée Paris" (autorité de domaine 60+, impossible à 6 mois). On gagne sur **"location meublée société à Paris"** + variantes long-tail.

### Pages stratégiques en place
- Homepage `/` (FR par défaut, default-locale fix May 2026)
- Hub société : `/location-meublee-entreprise` (mégapage, FAQPage + Service + BreadcrumbList schemas)
- 5 pages quartier : `/location-meublee-entreprise-{paris-8e,paris-16e,paris-17e,la-defense,neuilly}` (chacune unique, 2000 mots, FAQ × 5, schemas)
- Article pilier : `/blog/guide-bail-societe-paris-2026` (3800 mots, voix éditoriale humaine, anti-AI-detect)
- 14 articles blog au total
- llms.txt pour citations AI search (ChatGPT, Perplexity, Claude)

### Schemas en place
- RealEstateAgent + AggregateRating (4.8/61) sur layout root
- FAQPage sur landing société + 5 quartier pages
- Service + BreadcrumbList sur landing société
- BlogPosting + BreadcrumbList sur articles

### Fixes critiques récents
- Sitemap inclut maintenant les articles blog (avant : 0 article découvert par Google)
- Default locale FR (pas d'auto-detect navigateur)
- Canonical sur toutes les pages stratégiques
- Meta descriptions optimisées (≤ 160 chars, différenciateurs : 100% gratuit propriétaire, +200 clients corporate)
- Favicon proper M monogram doré, multi-tailles (favicon.ico, icon.png 192px, apple-icon.png 180px)

### Ce qui reste à faire
- **Backlinks** (priorité #1 maintenant) : Cercle Magellan, AmCham Paris, Welcome to France, presse RH (Décideurs, Les Echos Solutions), partenariats relocators
- **100+ avis Google** via emails post-séjour automatisés
- **Email nurture** : 3 séquences (propriétaires, entreprises B2B, post-séjour) — voir livret `/Users/pierreattali/Documents/_Livrets/Livret-Email-Nurture-Move-in-Paris.docx`
- Possible IT/ES si trafic GSC justifie (à monitorer)

## 4. Composants & patterns clés

### Composants importants à connaître
- `SEOLanding.tsx` : template landing page (intro + highlights + sections + FAQ + CTA + relatedLinks). Utilisé par /location-meublee-entreprise et les 5 quartier.
- `QuartierLanding.tsx` : wrapper pour les 5 pages quartier, prend une `QuartierConfig` en prop.
- `BailDureesTable.tsx` : tableau différenciation court/moyen/long terme (12,5% HT + 2 mois DG long terme uniquement).
- `BailComparisonTable.tsx` : tableau bail société vs mobilité vs Code civil.
- `TrustStripB2B.tsx` : bandeau noir avec 4 stats + logos clients (200, 117k nuits, 95%, 4,8/5).
- `CorporateCallout.tsx` : bloc home → /location-meublee-entreprise.

### Charte graphique
- **Noir** `#0D0D0D` (noir-deep)
- **Or** `#C5A059` (gold-light) ou `#A68659` (gold du logo PNG, légèrement plus chaud)
- **Crème** `#F5F0EB` (blanc-chaud)
- **Gris** `#6B6B6B` (gris)
- Police titres : Playfair Display (serif)
- Police corps : Inter (sans)
- **Pas d'emoji dans les contenus** — luxe parisien, retenue. Préf utilisateur explicite.

## 5. Préférences utilisateur (Vincent)

- **Zero-risk preference** : préfère plafonner le gain plutôt que risquer une régression visuelle sur sites en prod
- **Owner-focused communication** (la com doit aussi attirer les propriétaires, pas que les locataires/entreprises)
- **Aucun emoji dans les livrables** (descriptions Google, signatures, articles, etc.)
- **Discrétion** sur Google/FB pour les noms de clients corporate
- **Préfère** itérer en preview live plutôt que commit aveugle

## 6. Communication marketing

### Slogan officiel
**"The art of Parisian living"** (anglais — utilisé dans toutes les langues, signal luxe à la Hermès/Cartier).

### Descriptions plateformes (à jour mai 2026)
- **Google Business Profile** : 738 chars, orientée propriétaires, mentionne CAC 40 / banques / conseil sans citer de noms
- **Facebook** : 3 champs (description courte 250, longue 740, story 1050), même approche
- **Instagram bio** : 138 chars, orientée propriétaires, lien estimation
- **Site (homepage)** : title FR `Location meublée Paris — Société & expatriés | Move in Paris`, description 157 chars avec différenciateurs

### Signatures email (4 personnes)
**Approche image-only** (V5, mai 2026) car Outlook Mac casse trop les signatures HTML pures.

Chaque personne a :
- Une image PNG rendue de la signature visuelle (`/public/email/signatures/sig-{name}.png`, 1100x332 retina)
- Un HTML simple : `<a><img></a>` + ligne texte cliquable (téléphone, email, web) en dessous

Les 4 personnes :
- Benjamin Amouyal — benjamin@move-in-paris.com — +33 6 63 19 84 80
- Vincent Boutoustous — vincent@move-in-paris.com — +33 6 13 47 31 35
- Guillaume Formery — guillaume@move-in-paris.com — +33 7 71 07 51 14
- Stéphane Mederres — stephane@move-in-paris.com — +33 6 59 98 43 11

Fichiers HTML : `/Users/pierreattali/Documents/move-in-paris-signatures/` + miroir hébergé sur `/public/team-signatures/`.

Pour ajouter un nouveau collaborateur : éditer `/tmp/gen_signatures_v5_image.py` → ajouter la personne → relancer le rendu PNG (Playwright) → générer HTML → copier dans /public/team-signatures.

## 7. Outils MCP / scripts utiles

- `/seo-audit`, `/seo-geo`, `/seo-local`, `/seo-page` (skills claude-seo)
- `/ads-*` (skills claude-ads)
- Skills marketing (cold-email, page-cro, marketing-psychology, etc.)
- Scripts maison : `scripts/retranslate-all-apartments.mjs` (Claude API)
- Skill claude-seo a un venv Python à `/Users/pierreattali/.claude/skills/seo/.venv/` avec PIL, Playwright, cairosvg installés

## 8. Domaines de la session 2026-04 → 2026-05 (résumé)

Massif :
- 5 pages quartier société + article pilier 3800 mots + 14 articles blog
- Schema complet (FAQPage, Service, BreadcrumbList, AggregateRating)
- llms.txt
- Favicon Google
- 52 appartements traduits proprement en EN
- Auto-traduction renforcée (bedrooms canonical)
- Default locale FR
- Descriptions Google/FB/Insta refaites
- 4 signatures email (V5 image)
- Pages comparatives concurrents créées puis SUPPRIMÉES (mauvaise idée)
- Bail société court/moyen/long terme + 12,5% HT + 2 mois DG (info clé sur landing + quartier)
- Pillar article anti-AI-detect

Apprentissages session :
- Outlook Mac casse les CSS borders → utiliser des images PNG pour les séparateurs (ou tout en image)
- Anthropic auto-révoque les clés API détectées en chat → ne JAMAIS coller la clé dans Claude
- Le bedrooms field doit être canonique (4 pièces ≠ toujours 3 chambres)
- "L'art d'habiter Paris" en EN ("The art of Parisian living") fait luxe partout
- Niche "société" > broad "meublé Paris" pour MIP en 2026 (autorité domaine encore jeune)
