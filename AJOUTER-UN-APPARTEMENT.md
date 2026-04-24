# Comment ajouter un nouvel appartement

## Étape 1 : Créer le dossier photos

Dans le dossier `public/`, crée un nouveau dossier avec un nom simple (sans accents, sans espaces).

Exemple : `public/pergolese/`

Mets toutes les photos de l'appartement dedans. Nomme-les simplement :
- salon-1.jpg
- salon-2.jpg
- cuisine-1.jpg
- chambre-1.jpg
- sdb-1.jpg
- vue-1.jpg
- etc.

## Étape 2 : Ajouter l'appartement dans le fichier JSON

Ouvre le fichier `src/data/apartments.json`

Copie-colle ce bloc à la fin (avant le dernier `]`) et remplis tes infos :

```json
  ,
  {
    "slug": "rue-pergolese-paris-16",
    "title": "Rue Pergolèse",
    "address": "12 rue Pergolèse, Paris 16e",
    "district": "Paris 16e",
    "surface": 38,
    "rooms": 2,
    "bedrooms": 1,
    "bathrooms": 1,
    "floor": "3e étage avec ascenseur",
    "status": "À louer",
    "description": "Décris l'appartement ici. Pièces, équipements, ambiance, quartier...",
    "features": [
      "Wifi",
      "Télévision 4K",
      "Lave-vaisselle",
      "Cuisine équipée",
      "Ascenseur"
    ],
    "photos": "pergolese",
    "images": [
      "/pergolese/salon-1.jpg",
      "/pergolese/cuisine-1.jpg",
      "/pergolese/chambre-1.jpg",
      "/pergolese/sdb-1.jpg"
    ],
    "nearby": [
      { "type": "Métro", "name": "Porte Maillot (ligne 1)", "distance": "5 min" },
      { "type": "Commerce", "name": "Avenue de la Grande Armée", "distance": "3 min" }
    ]
  }
```

## Étape 3 : Publier

Dans le Terminal, tape ces 3 commandes :

```
cd ~/Documents/move-in-paris
git add -A && git commit -m "Ajout appartement Pergolese"
git push
```

Vercel redéploie automatiquement en 1-2 minutes. C'est en ligne !

## Règles pour le slug

Le slug c'est ce qui apparaît dans l'URL. Exemples :
- "Rue de Bassano, Paris 16e" → `rue-de-bassano-paris-16`
- "Boulevard Malesherbes, Paris 17e" → `boulevard-malesherbes-paris-17`
- "12 rue Pergolèse, Paris 16e" → `rue-pergolese-paris-16`

Pas d'accents, pas de majuscules, des tirets à la place des espaces.

## Les statuts possibles

- `"À louer"` → badge doré
- `"Disponible"` → badge doré
- `"Loué"` → badge gris

## La référence de l'appartement

Pas besoin de t'en occuper : une référence unique (ex. `MIP-7A3F91`) est **générée automatiquement** à partir du slug de l'appartement. Elle apparaît sous l'adresse sur la fiche, et elle est incluse dans les emails de demande de visite.

Tant que tu ne changes pas le slug d'un appart existant, sa référence reste la même.
