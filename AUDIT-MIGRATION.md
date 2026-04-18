# Audit migration move-in-paris.com (WordPress) → Next.js

**Date** : 18 avril 2026
**Domaine** : move-in-paris.com (CMS WordPress, hébergement OVH)
**Cible** : nouveau site Next.js (déployé sur Vercel via repo `Vincent075/move-in-paris`)

---

## 🔍 Résumé de l'audit

| Élément | État | Commentaire |
|---|---|---|
| Sitemap.xml | ❌ Inexistant | Pas de `/sitemap.xml`, `/sitemap_index.xml`, `/wp-sitemap.xml` |
| robots.txt | ✅ Présent | Contenu minimal (juste `Disallow: /wp-admin/`) |
| Plugin SEO Yoast/RankMath | ❌ Probablement absent | Sinon sitemap auto-généré |
| Google Search Console | ⚠️ Incertain | Utilisateur "très léger sur SEO" |
| Backlinks externes identifiés | 🟡 Limités | Quelques mentions naturelles, pas de campagne active |
| Avis Google | À vérifier | Plusieurs reviews mentionnés |
| Domaine âge | ✅ 8 ans | **Excellent capital** automatiquement transféré |

---

## 📋 Liste exhaustive des URLs détectées

### Pages institutionnelles (à mapper en 301)

| Ancienne URL | Nouvelle URL | Type |
|---|---|---|
| `/` | `/` | Identique |
| `/nos-appartements/` | `/nos-appartements` | Identique (sans slash final) |
| `/our-apartments/?lang=en` | `/nos-appartements` | EN intégré |
| `/a-propos/` | `/a-propos` | Identique |
| `/proprietaires/` | `/proprietaires` | Identique |
| `/proposer-mon-appartement/` | `/proposer-mon-appartement` | Identique |
| `/our-contact/` | `/contact` | Différent |
| `/contact/` | `/contact` | Identique |
| `/conditions-generales-dutilisation/` | `/cgu` | Différent — IMPORTANT à rediriger |
| `/mentions-legales/` | `/mentions-legales` | Identique |
| `/politique-de-confidentialite/` | `/politique-de-confidentialite` | Identique |
| `/faq/` | `/faq` | Identique |
| `/blog/` | `/blog` | Identique |

### Pages catégories de quartiers (à mapper)

`/property-city/[slug]/` → `/nos-appartements` (avec filtre optionnel)

Quartiers détectés : 1er-20e arrondissements + Neuilly, Levallois, Boulogne, Saint-Cloud, Puteaux, Sèvres.

### Pages individuelles d'appartements

**Pattern ancien** : `/property/[slug]/` (~120 appartements)
**Pattern nouveau** : `/appartement/[slug]/`

Liste complète des slugs anciens identifiés (à mapper individuellement) :

```
property/2687-2
property/5-rue-de-bassano-paris-16
property/8-rue-doslo-paris-18eme
property/9-boulevard-pereire-paris-17eme
property/12-rue-carrier-belleuse-paris-15
property/53-boulevard-richard-wallace-92800-puteaux
property/149-boulevard-malesherbes-paris-17eme
property/avenue-de-clichy-paris-17eme
property/avenue-de-lobservatoire-paris-14eme
property/avenue-de-madrid-92200-neuilly-seine
property/avenue-de-president-wilson-92300-levallois-perret
property/avenue-de-wagram-paris-17eme
property/avenue-de-wagram-paris-17eme-2
property/avenue-de-wagram-paris-17eme-3
property/avenue-du-roule-92200-neuilly-seine
property/avenue-du-roule-92200-neuilly-seine-2
property/avenue-marcel-proust-paris-16eme
property/avenue-parmentier-paris-11eme
property/avenue-paul-doumer-paris-16eme
property/boulevard-bourdon-92200-neuilly-seine
property/boulevard-edgard-quinet-paris-14
property/boulevard-flandrin-paris-16eme
property/commandant-riviere-paris-8th
property/grande-rue-92310-sevres
property/quai-louis-bleriot-paris-16eme
property/rue-alfred-roll-paris-17eme
property/rue-anatole-france-levallois-perret
property/rue-belidor-paris-17
property/rue-belidor-paris-17eme
property/rue-belzunce-paris-10eme
property/rue-bernoulli-paris-8eme
property/rue-beautreillis-paris-4eme
property/rue-boissiere-paris-16eme
property/rue-brey-paris-17eme
property/rue-cambaceres-paris-8eme
property/rue-chateaudun-paris-9eme
property/rue-daboukir-paris-2
property/rue-darmenonville-92200-neuilly-seine
property/rue-de-bassano-3
property/rue-de-bassano-paris-16-2
property/rue-de-bassano-paris-16th
property/rue-de-berri-paris-8eme
property/rue-de-calais-paris-9eme
property/rue-de-chaillot-paris-16eme
property/rue-de-chazelle-paris-17eme
property/rue-de-la-croix-nivert-paris-15
property/rue-de-la-croix-nivert-paris-15eme
property/rue-de-la-pompe-paris-16
property/rue-de-la-terrasse
property/rue-de-letoile-paris-17eme
property/rue-de-letoile-paris-17eme-2
property/rue-de-lille-paris-7eme
property/rue-de-lisbonne-paris-8eme
property/rue-de-lisly-paris-8
property/rue-de-paradis-paris-10eme
property/rue-de-pompe-paris-16eme-3
property/rue-de-rome-paris-17eme
property/rue-de-tcoqueville-paris-17eme
property/rue-de-vezelay-paris-8eme
property/rue-des-acacias-paris-17eme
property/rue-des-acacias-paris-17eme-2
property/rue-des-acacias-paris-17eme-3
property/rue-des-acacias-paris-17eme-5
property/rue-des-dames-paris-17eme
property/rue-des-lyonnais-paris-5eme
property/rue-des-petits-carreaux-paris-2
property/rue-des-renaudes-paris-17eme
property/rue-descombes-paris-17eme
property/rue-descombes-paris-17eme-2
property/rue-du-cardinal-lemoine-paris-5eme
property/rue-du-chateau-92200-neuilly-seine
property/rue-du-dobropol-paris-17
property/rue-du-faubourg-saint-honore-paris-8eme
property/rue-du-fer-a-moulin-paris-5eme
property/rue-du-general-foy-paris-17eme
property/rue-du-general-foy-paris-8eme
property/rue-du-general-foy-paris-8eme-2
property/rue-du-ranelagh-paris-16
property/rue-fremicourt-paris-15eme
property/rue-georges-bizet-paris-16
property/rue-georges-bizet-paris-16eme
property/rue-georges-bizet-paris-16eme-3
property/rue-georges-bizet-paris-16eme-6
property/rue-georges-ville-paris-16eme
property/rue-guersant-paris-17eme
property/rue-gustave-courbet-paris-16eme
property/rue-jean-goujon-paris-8
property/rue-laugier-paris-17eme
property/rue-laugier-paris-17eme-2
property/rue-legendre-paris-17eme
property/rue-marboeuf-paris-8eme
property/rue-molitor
property/rue-montorgueil-paris-1er
property/rue-nollet-paris-17eme
property/rue-paul-sauniere-paris-16
property/rue-pergolese-paris-16eme
property/rue-perronet-92200-neuilly-seine
property/rue-petrarque-paris-16eme
property/rue-pierre-charron-paris-8eme
property/rue-pierre-demours-paris-17eme
property/rue-pierre-semard-paris-9
property/rue-quentin-bauchard-paris-16
property/rue-raffet-paris-16eme
property/rue-raspail-92300-levallois-perret
property/rue-rennequin-paris-17eme
property/rue-roque-de-fillol-92800-puteaux
property/rue-sadi-carnot-92800-puteaux
property/rue-saint-didier-paris-16
property/rue-saint-severin-paris-5
property/rue-sainte-apolline-paris-2
property/rue-sauffroy-paris-17eme
property/rue-singer-paris-16eme
property/rue-vernicquet-paris-17eme
property/rue-victor-daix-92200-neuilly-seine
property/rue-viete-paris-17eme
property/rue-vitruves-paris-20
property/villa-boissiere-paris-16eme
property/villa-dancourt-paris-18-montmartre
property/villa-montretout-92210-saint-cloud
```

**Total** : ~120 appartements anciens.

### Pages /property-city/ (catégories quartiers)

```
property-city/2nd-arrondissement
property-city/18e-arrondissement
property-city/paris
... (probablement 1 page par arrondissement et par ville banlieue)
```

---

## 🎯 Stratégie de redirection 301

### Principe général

Toutes les anciennes URLs doivent retourner un **HTTP 301 (Moved Permanently)** vers la nouvelle URL équivalente. Sans 301, vous perdez :
- Les rankings existants sur ces URLs (Google les voit comme 404)
- Les backlinks pointant vers ces URLs (jus SEO perdu)
- L'expérience utilisateur (visiteur qui suit un lien externe → 404 = bounce)

### Implémentation Next.js

Deux options :

**Option A — `next.config.ts`** (recommandé pour ce volume)

```ts
const redirects = async () => [
  // Pages institutionnelles
  { source: "/our-apartments", destination: "/nos-appartements", permanent: true },
  { source: "/our-contact", destination: "/contact", permanent: true },
  { source: "/conditions-generales-dutilisation", destination: "/cgu", permanent: true },

  // Quartiers (pattern matching)
  { source: "/property-city/:slug", destination: "/nos-appartements", permanent: true },

  // Appartements 1:1 (à compléter au cas par cas selon le mapping vers les nouveaux slugs)
  { source: "/property/rue-de-bassano-paris-16th", destination: "/appartement/2-pieces-chaillot-paris-16e", permanent: true },
  { source: "/property/rue-des-dames-paris-17eme", destination: "/appartement/2-pieces-batignolles-paris-17e", permanent: true },
  // ... ~120 lignes

  // Fallback — toute URL /property/* non mappée → /nos-appartements
  { source: "/property/:slug", destination: "/nos-appartements", permanent: true },

  // Lang param fallback
  { source: "/:path*", has: [{ type: "query", key: "lang", value: "en" }], destination: "/:path*", permanent: true },
];

export default { redirects };
```

**Option B — `middleware.ts`** (si besoin de logique conditionnelle plus poussée)

### Mapping appartements anciens → nouveaux

Pour chaque ancien appartement, deux cas :

1. **L'appartement existe encore** → redirige vers son nouveau slug `/appartement/[new-slug]`
2. **L'appartement n'existe plus** (loué, retiré) → redirige vers `/nos-appartements` (catalogue)

⚠️ **À faire au moment de la migration** : compléter le mapping en croisant la liste ci-dessus avec les appartements présents dans le nouveau `apartments.json`.

---

## 🔗 Backlinks détectés (recherche Google publique)

L'audit basique via Google search n'a pas révélé de backlinks puissants évidents. Pour un audit complet :

1. **Outils gratuits** :
   - Ahrefs Backlink Checker (gratuit, 100 backlinks max)
   - Ubersuggest (gratuit limité)
   - Google Search Console > Liens (une fois GSC configuré)

2. **Outils payants** (si vous voulez investir) :
   - Ahrefs : 99 €/mois
   - Semrush : 99 €/mois
   - Majestic : 50 €/mois

L'utilisateur ayant indiqué être "très léger en SEO" jusqu'ici, les backlinks sont probablement principalement organiques (clients satisfaits, partenaires occasionnels). C'est OK — on peut construire une vraie stratégie post-migration.

---

## 📋 Procédure de migration (le jour J)

### Avant la bascule DNS

1. ✅ Préparer le `next.config.ts` avec toutes les redirections 301
2. ✅ Tester en local que les redirections fonctionnent (localhost:3000/property/xxx → /nos-appartements)
3. ✅ Vérifier que tous les appartements sont bien migrés sur le nouveau site
4. ✅ Faire un dump complet du WordPress actuel (BDD + uploads via FTP)
5. ✅ Créer le sous-domaine `ancien.move-in-paris.com` pour l'ancien site (avec robots.txt `Disallow: /` pour éviter le duplicate content)

### Bascule DNS

1. Sur OVH > Zone DNS de move-in-paris.com :
   - Modifier le record `A` ou `CNAME` pour pointer vers Vercel
   - Vercel donnera l'IP exacte à utiliser (`76.76.21.21` par défaut, ou un CNAME `cname.vercel-dns.com`)
2. Sur Vercel > projet move-in-paris > Settings > Domains :
   - Ajouter `move-in-paris.com` ET `www.move-in-paris.com`
   - Vercel gère automatiquement le SSL (Let's Encrypt)
3. Attendre la propagation DNS (5 min à 48h selon TTL — généralement 1h)

### Après la bascule

1. **Google Search Console** :
   - Créer un compte (gratuit) sur https://search.google.com/search-console
   - Ajouter la propriété `https://www.move-in-paris.com` (Domain property recommandée pour couvrir toutes les variantes)
   - Vérifier propriété via DNS TXT record (preuve la plus stable)
   - Soumettre le sitemap : `https://www.move-in-paris.com/sitemap.xml`

2. **Notification "Change of Address"** dans GSC (si vous avez une ancienne propriété GSC) :
   - Ce n'est pas votre cas si pas de GSC actif → skip cette étape
   - Sinon : Settings > Change of address

3. **Test des redirections 301** :
   - Outil : https://httpstatus.io/ — coller l'ancienne URL, vérifier que ça retourne 301 → nouvelle URL
   - Tester au moins : `/our-contact`, `/conditions-generales-dutilisation`, 5 anciens `/property/...`

4. **Mise à jour Google Business Profile** :
   - Vérifier que l'URL est bien `https://www.move-in-paris.com`
   - Mettre à jour adresse si elle a changé (35 rue Davioud vs 26 rue de l'Étoile — à confirmer)

5. **Surveillance pendant 30 jours** :
   - GSC > Couverture : surveiller les erreurs d'exploration, les pages indexées
   - GSC > Performances : suivre l'évolution des clics et impressions
   - Google Analytics (à mettre en place avec consentement RGPD via la bannière cookies déjà en place)

---

## ⚠️ Pièges classiques à éviter

1. **Oublier de rediriger `/wp-content/uploads/...`** — si des images sont liées depuis l'extérieur, elles deviennent 404 sans redirection
2. **Rediriger en chaîne** (URL A → URL B → URL C) — Google déteste, perte de jus à chaque saut. Toujours rediriger en direct A → C
3. **Utiliser des 302 au lieu de 301** — 302 = temporaire, ne transfère pas l'autorité. Utiliser 301 partout
4. **Désactiver le sous-domaine `ancien.` sans noindex** — Google indexerait le contenu en double = duplicate content
5. **Ne pas mettre à jour le sitemap après migration** — Google continue à chercher les anciennes pages

---

*Audit généré automatiquement le 18 avril 2026 par Claude.*
