# TODO API (Node.js + Express) — Stockage en mémoire

## Description
API REST CRUD pour gérer des tâches (TODO list) — stockage en mémoire (tableau).


## Structure d'une tâche
```json
{
  "id": "uuid",
  "title": "Faire les courses",
  "description": "Acheter du pain et du lait",
  "completed": false,
  "priority": "high",
  "dueDate": "2025-10-25",
  "createdAt": "2025-10-21T10:00:00Z"
}
```

## Endpoints

### GET /api/tasks
Récupérer toutes les tâches. Supporte des filtres optionnels via query parameters :
- `completed`: true ou false
- `priority`: low, medium, high
- `dueDate`: YYYY-MM-DD

Exemple : `GET /api/tasks?completed=false&priority=high`

### GET /api/tasks/:id
Récupérer une tâche par ID.

### POST /api/tasks
Créer une nouvelle tâche. Le body doit contenir au minimum `title` (string non vide).

Exemple de body :
```json
{
  "title": "Faire les courses",
  "description": "Acheter du pain et du lait",
  "completed": false,
  "priority": "high",
  "dueDate": "2025-10-25"
}
```

### PUT /api/tasks/:id
Mettre à jour une tâche (remplacement partiel autorisé). Seuls les champs fournis sont mis à jour.

### DELETE /api/tasks/:id
Supprimer une tâche.

## Validation et erreurs
- **400 Bad Request** : Données invalides (ex: title vide, priority invalide, dueDate mal formatée).
- **404 Not Found** : Tâche non trouvée.
- **500 Internal Server Error** : Erreur serveur.

## Setup
1. Copier les fichiers `package.json` et `server.js`.
2. Installer dépendances :
   ```bash
   npm install
3. Lancer le serveur :
   ```bash
   npm start
   ```
   ou en mode développement :
   ```bash
   npm run dev
   ```

Le serveur démarre sur http://localhost:3000.

## Tests avec Postman
Importez le fichier `API_CRUD_Postman_Collection.json` dans Postman pour tester facilement tous les endpoints de l'API.


## Étape 1 — Installer les dépendances
npm install bcryptjs jsonwebtoken

## Étape 2 — Ajouter la “base” d’utilisateurs (en mémoire) : Dans ton server.js, crée un tableau en mémoire pour stocker les utilisateurs 

const users = [];

## Structure d'un user :
```json
{
  id: "uuid",
  username: "alpha",
  email: "alpha@mail.com",
  password: "haché_avec_bcrypt"
}
```