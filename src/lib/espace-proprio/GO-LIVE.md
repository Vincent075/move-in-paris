# Espace Propriétaire · Checklist GO-LIVE

État actuel : auth magic link fonctionnelle, données servies par le provider **mock**
(données fictives). La connexion aux vraies données Airtable se fait en ~10 minutes,
sans toucher au code.

## Au go de Vincent (après la livraison Tech Tribe du 17/07/2026)

### 1. Variables d'environnement Vercel (Settings → Environment Variables)

| Variable | Valeur | Rôle |
|---|---|---|
| `PORTAL_SESSION_SECRET` | déjà posée (32+ chars aléatoires) | Signature des sessions et magic links |
| `PORTAL_DATA_SOURCE` | `mock` → passer à **`airtable`** | L'interrupteur du go-live |
| `AIRTABLE_PORTAL_PAT` | PAT **lecture seule** (scopes `data.records:read` + `schema.bases:read`, base Move in Paris uniquement) | Accès données |
| `AIRTABLE_PORTAL_BASE` | `appcLt70GQiR1FAbT` (défaut dans le code) | Base Tech Tribe |
| `PORTAL_TEST_EMAILS` | supprimer ou laisser (utile pour la démo) | Comptes de test du mode mock |

Puis **Redeploy** (Deployments → ⋯ → Redeploy) pour prendre les env vars.

### 2. Vérifications en recette (le code a des hypothèses à confirmer)

- [ ] Valeurs exactes des single-selects `Statut` (Réservations : libellé "Annulée" ?
      Interventions : "Terminée" ?) → constantes `STATUTS_*` dans `provider.ts`
- [ ] Libellé exact du select `Facturable à` sur Interventions : le filtre des factures
      visibles par le proprio cherche "propri" (provider.ts) → ajuster si autre libellé
- [ ] Le reporting annuel Excel (AUTO-19) est-il archivé dans la table Documents avec
      `Propriétaire lié` renseigné ? Sinon le proprio ne le verra pas dans son coffre-fort
- [ ] Le lookup `Email propriétaire` sur Appartements est bien rempli pour chaque appart
- [ ] Champ `Email` renseigné sur chaque fiche Propriétaires (c'est la clé de connexion)
- [ ] `Contrat signé` (PDF) déposé sur les fiches Propriétaires (bouton Consulter du contrat)
- [ ] Tester avec UN propriétaire réel avant d'annoncer : son email → login → vérifier
      qu'il ne voit QUE ses appartements, et que Consulter ouvre bien contrat / documents /
      factures artisan (route /api/espace-proprio/document, contrôle de propriété serveur)

### 3. Prérequis juridiques avant d'inviter les proprios (voir CLAUDE.md workspace)

- [ ] CGU du portail propriétaire
- [ ] Mention du partage de données d'occupation dans le contrat propriétaire (AUTO-22)

## Sécurité / RGPD (implémenté)

- Magic link 15 min, signé HMAC-SHA256, réponse neutre (pas d'énumération d'emails)
- Session cookie httpOnly + secure, 30 jours
- **Whitelist de champs** sur Occupants : `Civilité` + `Nom complet` UNIQUEMENT
  (jamais passeport, naissance, nationalité, téléphone) · ne pas étendre sans revue
- Nom de l'occupant affiché uniquement pendant son séjour, historique anonymisé
- Connexions loguées (logs Vercel) + "Dernière connexion" affichée à l'utilisateur

## Améliorations V1.1 (backlog, non bloquantes)

- Timeline "La vie de votre bien" branchée (union Résas + Ménages + Interventions + Documents)
- Switcher multi-appartements actif (V1 : premier appartement)
- Nom du prestataire d'intervention (lookup table Externe)
- Liens de téléchargement des documents (URLs présignées S3)
- Magic link à usage strictement unique (nécessite un store type Vercel KV)
- Rate limiting distribué (Vercel KV)
