# Livret SEO — Move in Paris

État des lieux complet du référencement, ce qui a été fait, ce qui reste à faire.

**Objectif** : ranker top 3 sur "location meublée Paris", "location corporate Paris", "location appartement société", "bail mobilité", "bail Code Civil", et autres mots-clés métier.

---

## ✅ Ce qui a été fait (côté code)

### 1. Fondations techniques

- **`sitemap.ts` dynamique** — toutes les URLs (statiques + appartements + landing pages) générées automatiquement, exposé sur `/sitemap.xml`
- **`robots.ts`** — autorise tout sauf `/admin` et `/api`, pointe vers le sitemap
- **Canonical URLs** sur toutes les pages clés (évite le duplicate content)
- **Hreflang partiel** : `og:locale:alternate` dans le layout (vrai hreflang nécessite refactor URL `/fr/` `/en/`)

### 2. Métadonnées on-page optimisées

- **Titles enrichis** avec mots-clés ciblés sur chaque page
  - Home : `Location meublée à Paris — Corporate & expatriés | Move in Paris`
  - `/nos-appartements` : `Location meublée à Paris — Appartements meublés haut de gamme`
  - Page appartement : `Location meublée Paris 17e — 2 Pièces Batignolles, 40m²`
- **Meta descriptions** enrichies avec keywords + CTA
- **H1 enrichi** sur pages appartement avec eyebrow doré "LOCATION MEUBLÉE À PARIS XXE"
- **Open Graph + Twitter cards** soignés (prévisualisations LinkedIn, WhatsApp, X, Facebook)

### 3. Schema.org / JSON-LD (rich snippets Google)

- **`RealEstateAgent`** sur le layout (toutes pages) — brand recognition
- **`Apartment`** sur chaque page appartement — surface, pièces, chambres, salles de bain, adresse
- **`BreadcrumbList`** sur chaque page appartement — navigation Google
- **`FAQPage`** sur `/faq` (31 Q&R) ET sur les 5 landing pages SEO — déclenche les rich snippets accordéon dans la SERP (énorme gain CTR)

### 4. UX immersif sur 9 pages clés

Pages avec hero plein écran + header transparent :
- `/` (homepage)
- `/nos-appartements` (avec search bar à cheval)
- `/a-propos`
- `/proprietaires`
- `/estimation`
- `/appartement/[slug]` (chaque appartement, mobile + desktop avec thumbs en overlay filigrane)
- 5 nouvelles landing pages SEO (cf. ci-dessous)

### 5. Landing pages SEO dédiées (cœur de la stratégie de ranking)

5 pages longues (1500-2500 mots), chacune ciblant 1 mot-clé principal + plusieurs secondaires, structure H1/H2/H3, FAQ + JSON-LD, maillage interne :

| URL | Mot-clé principal | Mots-clés secondaires |
|---|---|---|
| `/location-corporate-paris` | location corporate Paris | corporate housing, appartement entreprise Paris |
| `/location-meublee-entreprise` | location appartement société | bail société, location meublée SAS, facturation entreprise |
| `/bail-mobilite-paris` | bail mobilité Paris | loi ELAN, bail mobilité étudiant, durée 1-10 mois |
| `/code-civil-bail-meuble` | bail location meublée Code Civil | articles 1714 1762, logement de fonction |
| `/location-meublee-expatrie-paris` | location expatrié Paris | cadre international Paris, relocation, école internationale |

### 6. Maillage interne

- Section "Nos expertises" dans le footer pointant vers les 5 landing pages
- Liens croisés entre les landing pages (chaque page renvoie vers les 4 autres)
- Liens contextuels dans le contenu (ex : `/code-civil-bail-meuble` mentionné dans `/location-corporate-paris`)
- Liens vers `/nos-appartements` et `/contact` depuis chaque landing

### 7. URL structure clean

- Slugs descriptifs (ex : `/appartement/2-pieces-batignolles-paris-17e`)
- Pas de paramètres GET inutiles
- Pas de cannibalisation interne
- Profondeur maximum 2 niveaux

### 8. Conformité RGPD/CNIL

- **Bannière cookies pro** : 3 boutons (Accepter / Refuser / Personnaliser), 3 catégories (essentiel / analytics / marketing), conforme délibération CNIL 2020-2022
- Helper `getStoredConsent()` exporté pour conditionner le futur chargement de Google Analytics
- Choix sauvegardé en localStorage avec timestamp pour audit
- Formulaires déjà conformes (consentement explicite à chaque envoi)

---

## ⏳ Ce qu'il reste à faire (côté code)

Par ordre de priorité.

### 🔥 Priorité 1 — Avant la mise en prod

1. **Photos en `<img>` Next.js + alt SEO**
   Actuellement les photos d'appartement sont en CSS `background-image` (invisibles pour Google Images). Conversion en `<Image>` Next.js avec attribut `alt` descriptif unique par photo (ex : "Salon haussmannien 2 pièces Batignolles 40m²").
   **Impact** : 20-30 % de trafic Google Images potentiel dans l'immobilier.
   **Effort** : 1-2h.

2. **AggregateRating schema (étoiles dorées Google)**
   Vous avez 4,8/5 sur Google d'après le contenu. Ajouter le schema `AggregateRating` + `Review` fait apparaître les **étoiles dorées** sous chaque résultat.
   **Impact** : +30 % CTR moyen, signal d'autorité fort.
   **Effort** : 30 min — nécessite simplement le nombre d'avis et la note moyenne.

3. **Apartment schema enrichi**
   Ajouter à chaque appartement : `geo` (latitude/longitude), `priceRange` (même "sur demande"), `petsAllowed`, `numberOfBathroomsTotal`. Plus le schema est riche, plus Google comprend.
   **Impact** : meilleur ranking sur recherches longue traîne géolocalisées.
   **Effort** : 30 min code + ajout coordonnées GPS dans `apartments.json` (1 min par apt).

4. **Internal linking : appartements similaires en bas de page appart**
   Bloc "Voir d'autres appartements 2 pièces à Paris 17e" avec 3 cartes recommandées.
   **Impact** : booste l'autorité interne, augmente temps passé, pages par session.
   **Effort** : 45 min.

### 🟡 Priorité 2 — Peut attendre la mise en prod

5. **True hreflang FR/EN**
   Refactorer en `/fr/...` et `/en/...` (au lieu de cookies). Permet à Google d'indexer les deux versions.
   **Impact** : ouvre le marché EN (cadres internationaux searches en anglais).
   **Effort** : 2-3h (refactor des URLs + redirections + middleware).

6. **Performance Core Web Vitals**
   Audit Lighthouse, optimisation LCP/CLS/FID. Probablement déjà bon mais à mesurer.
   **Impact** : 5-10 % de boost de ranking + meilleure UX mobile.
   **Effort** : 1-2h après audit.

7. **Article seed sur le blog**
   Quelques articles "evergreen" 2000+ mots ciblant les long-tail (ex : "guide complet location meublée Paris 16e", "comment louer un appartement à Paris depuis l'étranger"). Plus le blog est dense au lancement, plus Google indexe vite.
   **Effort** : 30 min par article (rédaction Claude + intégration).
   **Note** : routine de blog automatisée déjà programmée chaque lundi 9h sur Mac de bureau.

### 🟢 Priorité 3 — Optimisations continues

8. Schémas additionnels : `BreadcrumbList` sur toutes les pages (pas seulement appartements), `LocalBusiness` enrichi
9. Page-level keywords : créer 1 landing par arrondissement (`/location-meublee-paris-16e`, `/17e`, etc.) — long-tail très efficace
10. Glossary pages (LMNP, micro-BIC, IRL...) pour capter le trafic juridique long-tail

---

## 🌐 Ce qu'il reste à faire (hors code, côté marketing/business)

### À faire DÈS la mise en prod sur move-in-paris.com

1. **Google Search Console**
   - Créer compte Search Console
   - Vérifier propriété de move-in-paris.com (via DNS TXT ou fichier HTML)
   - Soumettre `https://www.move-in-paris.com/sitemap.xml`
   - Vérifier l'indexation page par page (peut prendre 1-4 semaines)
   - Surveiller les erreurs d'exploration et les Core Web Vitals

2. **Migration depuis l'ancien WordPress** (CRITIQUE — ne PAS rater)
   - Lister toutes les URLs actuelles de move-in-paris.com (via screaming frog ou export WP)
   - Établir le **mapping 301** : ancienne URL → nouvelle URL Next.js
   - Configurer les redirections dans `next.config.ts` ou `middleware.ts`
   - Garder un site WordPress de backup (sur sous-domaine `ancien.move-in-paris.com` avec `noindex`)
   - Notifier Google via "Change of address" dans Search Console

3. **Google Business Profile (GMB)**
   - Compléter à 100 % : nom, adresse (26 rue de l'Étoile, 75017), téléphone, horaires, services, photos pro
   - Importer les avis Google existants
   - Publier des "Posts GMB" hebdomadaires (annonces, conseils, nouveautés)
   - **Impact local SEO majeur** sur les recherches "agence location meublée Paris"

### À faire dans les 1-3 mois post-mise en prod

4. **Stratégie backlinks** (LE différenciateur pour ranker top 3)
   - **Chambres de commerce franco-X** : Franco-Britannique, Franco-Américaine, Franco-Allemande, Franco-Japonaise — fiches partenaire avec lien
   - **Sites RH expat** : expatica.com, internations.org, justlanded.com, paris-anglo.com — articles invités ou listings premium
   - **Écoles internationales** : American School of Paris, British School of Paris, Lycée International, École Bilingue — partenariats logement
   - **Presse spécialisée** : Le Figaro Immobilier, Capital, Les Echos Patrimoine, Forbes France — communiqués + tribunes
   - **Annuaires de qualité** : Pages Jaunes Pro, Yelp, Trustpilot, Google Maps
   - **Cabinets de conseil RH/relocation** : Crown Worldwide, Cartus, Sirva, Santa Fe — accords de partenariat

5. **Avis Google massifs**
   - Email automatique post-séjour à chaque locataire/propriétaire avec lien direct vers le formulaire d'avis Google
   - Objectif : passer de N avis actuels à 100+ en 6 mois
   - **Volume + récence + note moyenne 4,5+** = signal de ranking énorme

6. **Contenu blog hebdomadaire** (déjà automatisé chaque lundi)
   - Vérifier la qualité SEO de chaque article (1500+ mots, titre H2/H3, mots-clés ciblés, maillage interne, image avec alt)
   - Mesurer les positions de chaque article via Search Console après 1 mois

7. **Mesure et itération**
   - Compte Google Analytics (avec consentement RGPD via la bannière déjà en place)
   - Compte Search Console pour voir les Search Queries qui remontent
   - Outil tier 1 type Ahrefs / Semrush / Sistrix (39-99 €/mois) pour suivi positions concurrents

---

## 📊 Timeline réaliste de ranking

| Délai post-mise en prod | Résultat attendu |
|---|---|
| **0-4 semaines** | Indexation complète par Google, premiers positionnements (50-150) sur les requêtes longue traîne |
| **1-3 mois** | Top 30 sur "bail mobilité Paris", "bail Code Civil", "location appartement société" |
| **3-6 mois** | Top 10 sur "location corporate Paris", "location meublée expatrié Paris", landing pages SEO indexées avec rich snippets FAQ |
| **6-12 mois** | Top 5 sur les requêtes long-tail, top 10-20 sur "location meublée Paris" si backlinks bien menés |
| **12-24 mois** | Top 3 sur "location meublée Paris" si stratégie complète maintenue (contenu + backlinks + avis) |

---

## 🎯 Prochaine action recommandée

Avant la mise en prod sur move-in-paris.com :
1. Finir d'ajouter tous les appartements sur le site
2. Demander à Move in Paris de faire **Photos en `<img>` + alt SEO** (priorité 1, levier le plus gros restant)
3. Demander à Move in Paris d'ajouter **AggregateRating schema** avec votre vraie note Google
4. Préparer le **mapping de redirections 301** depuis l'ancien WordPress

Le jour de la mise en prod :
1. Bascule DNS vers Vercel
2. Soumission immédiate à Google Search Console
3. Mise à jour Google Business Profile

Vous serez parmi les sites les mieux optimisés techniquement de votre marché. La conquête du top 3 dépend ensuite à 70 % du off-page (backlinks, avis, signaux d'autorité).

---

*Livret généré le 18 avril 2026 — Move in Paris*
