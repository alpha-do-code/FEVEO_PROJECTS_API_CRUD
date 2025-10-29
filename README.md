# API CRUD - Liste de tâches avec MongoDB Atlas

API REST complète pour gérer une liste de tâches avec Express.js, MongoDB Atlas et authentification JWT.

## Fonctionnalités

- Authentification utilisateur (inscription/connexion) avec JWT
- CRUD complet des tâches avec propriété utilisateur
- Endpoint public pour consulter les tâches
- Filtrage par statut, priorité et date d'échéance
- Validation des données d'entrée
- Stockage persistant avec MongoDB Atlas
- Gestion d'erreurs

## Installation

1. Cloner le repository
2. Installer les dépendances : `npm install`
3. Configurer MongoDB Atlas :
   - Créer un compte sur [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Créer un cluster gratuit
   - Obtenir la chaîne de connexion
4. Créer un fichier `.env` avec vos variables d'environnement :
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/todo-api
   JWT_SECRET=votre-cle-secrete-jwt
   ```
5. Démarrer le serveur : `npm run dev`

## Utilisation

Le serveur démarre sur `http://localhost:3000`.

### Authentification

#### POST /api/auth/register
Inscrit un nouvel utilisateur.

**Corps de la requête :**
```json
{
  "username": "nomutilisateur",
  "email": "email@example.com",
  "password": "motdepasse"
}
```

#### POST /api/auth/login
Connecte un utilisateur.

**Corps de la requête :**
```json
{
  "email": "email@example.com",
  "password": "motdepasse"
}
```

**Réponse :**
```json
{
  "token": "jwt-token-here"
}
```

### Endpoints des tâches

Utilisez le token JWT dans l'en-tête `Authorization: Bearer <token>` pour les endpoints protégés.

#### GET /api/tasks/public
Récupère toutes les tâches publiques (sans authentification).

#### GET /api/tasks
Récupère les tâches de l'utilisateur connecté avec filtrage optionnel.

**Paramètres de requête :**
- `completed`: `true` ou `false`
- `priority`: `low`, `medium`, `high`
- `dueDate`: date au format `AAAA-MM-JJ`

#### GET /api/tasks/:id
Récupère une tâche spécifique de l'utilisateur connecté.

#### POST /api/tasks
Crée une nouvelle tâche pour l'utilisateur connecté.

**Corps de la requête :**
```json
{
  "title": "Titre de la tâche",
  "description": "Description optionnelle",
  "completed": false,
  "priority": "medium",
  "dueDate": "2024-12-31"
}
```

#### PUT /api/tasks/:id
Met à jour une tâche de l'utilisateur connecté.

#### DELETE /api/tasks/:id
Supprime une tâche de l'utilisateur connecté.

## Structure des données

### Utilisateur
- `id`: Identifiant unique (UUID)
- `username`: Nom d'utilisateur
- `email`: Email (unique)
- `password`: Mot de passe hashé
- `createdAt`: Date de création

### Tâche
- `id`: Identifiant unique (UUID)
- `title`: Titre de la tâche (obligatoire)
- `description`: Description (optionnelle)
- `completed`: Statut de completion (booléen)
- `priority`: Priorité (`low`, `medium`, `high`)
- `dueDate`: Date d'échéance (format `AAAA-MM-JJ`, optionnelle)
- `createdAt`: Date de création
- `user`: Référence à l'utilisateur propriétaire

## Tests avec cURL

### Inscription
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'
```

### Connexion
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Créer une tâche (remplacez TOKEN par votre token JWT)
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"title":"Ma première tâche","description":"Description","priority":"high"}'
```

### Récupérer les tâches publiques
```bash
curl -X GET http://localhost:3000/api/tasks/public
