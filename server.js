// Importations
const express = require('express');
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

// Stockage de données en mémoire sous forme de tableau
let tasks = [];
const users = [];


// Aide : validation de la chaîne de date aaaa-mm-jj
function isValidDateYYYYMMDD(dateString) {
    if(!dateString) return false;
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if(!regex.test(dateString)) return false;
    const date = new Date(dateString);
    // Vérifier si la date est valide avec le bon format (aaaa-mm-jj)
    return date instanceof Date && !isNaN(date) && date.toISOString().slice(0,10) === dateString;
}

// Aide : valider la charge utile de la tâche pour POST
function validateTaskPayload(payload, forUpdate = false) {
  const errors = [];

  // title est obligatoire pour création
  if (!forUpdate) {
    if (!payload.title || typeof payload.title !== 'string' || payload.title.trim() === '') {
      errors.push("Le titre est obligatoire lors de la création d'une tâche et ne doit pas etre vide.");
    }
  } else {
    if (payload.title !== undefined && (typeof payload.title !== 'string' || payload.title.trim() === '')) {
      errors.push('Si fourni, le titre doit être une chaîne non vide.');
    }
  }

  if (payload.description !== undefined && typeof payload.description !== 'string') {
    errors.push('La description doit être une chaîne.');
  }

  if (payload.completed !== undefined && typeof payload.completed !== 'boolean') {
    errors.push('Completed doit être un booléen.');
  }

  if (payload.priority !== undefined) {
    const allowed = ['low', 'medium', 'high'];
    if (!allowed.includes(payload.priority)) {
      errors.push(`La priorité doit être l'une des suivantes : ${allowed.join(', ')}.`);
    }
  }

  if (payload.dueDate !== undefined) {
    if (!isValidDateYYYYMMDD(payload.dueDate)) {
      errors.push('La date d\'échéance doit être au format AAAA-MM-JJ et une date valide.');
    }
  }

  return errors;
}

// GET /api/tasks - récupérer toutes les tâches
// Optionnel : filtrer par completed, priority, dueDate ; support de requête simple
app.get('/api/tasks',  authMiddleware, (req, res) => {
  try {
    let result = tasks.slice();

    // filtres simples
    if (req.query.completed !== undefined) {
      const val = req.query.completed.toLowerCase();
      if (val === 'true' || val === 'false') {
        result = result.filter(t => String(t.completed) === val);
      } else {
        return res.status(400).json({ error: 'Le paramètre completed doit être true ou false' });
      }
    }

    if (req.query.priority) {
      result = result.filter(t => t.priority === req.query.priority);
    }

    if (req.query.dueDate) {
      if (!isValidDateYYYYMMDD(req.query.dueDate)) {
        return res.status(400).json({ error: 'La date d\'échéance doit être au format AAAA-MM-JJ' });
      }
      result = result.filter(t => t.dueDate === req.query.dueDate);
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/tasks/:id - récupérer une tâche par ID
app.get('/api/tasks/:id',  authMiddleware, (req, res) => {
  try {
    const task = tasks.find(t => t.id === req.params.id);
    if (!task) return res.status(404).json({ error: 'Tâche non trouvée' });
    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/tasks - créer une nouvelle tâche puis ajout d'une authentification
app.post('/api/tasks',  authMiddleware, (req, res) => {
  try {
    const payload = req.body;
    const errors = validateTaskPayload(payload, false);
    if (errors.length) return res.status(400).json({ errors });

    const now = new Date().toISOString();
    const newTask = {
      id: uuidv4(),
      title: payload.title.trim(),
      description: payload.description ? String(payload.description).trim() : '',
      completed: payload.completed === undefined ? false : !!payload.completed,
      priority: payload.priority ? payload.priority : 'medium',
      dueDate: payload.dueDate ? payload.dueDate : null, // stocker comme AAAA-MM-JJ ou null
      createdAt: now,
      userId: req.user.id // Associer la tâche à l'utilisateur connecté
    };

    tasks.push(newTask);
    res.status(201).json(newTask);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/tasks/:id - mettre à jour une tâche (remplacement partiel autorisé)
app.put('/api/tasks/:id',  authMiddleware,(req, res) => {
  try {
    const idx = tasks.findIndex(t => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Tâche non trouvée' });

    const payload = req.body;
    const errors = validateTaskPayload(payload, true);
    if (errors.length) return res.status(400).json({ errors });

    // appliquer les mises à jour
    const task = tasks[idx];
    if (payload.title !== undefined) task.title = String(payload.title).trim();
    if (payload.description !== undefined) task.description = String(payload.description).trim();
    if (payload.completed !== undefined) task.completed = !!payload.completed;
    if (payload.priority !== undefined) task.priority = payload.priority;
    if (payload.dueDate !== undefined) task.dueDate = payload.dueDate;

    tasks[idx] = task;
    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/tasks/:id - supprimer une tâche
app.delete('/api/tasks/:id',  authMiddleware,(req, res) => {
  try {
    const idx = tasks.findIndex(t => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Tâche non trouvée' });
    const removed = tasks.splice(idx, 1)[0];
    res.json({ message: 'Tâche supprimée', task: removed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Créer la route d’inscription /api/auth/register:
app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ message: "Tous les champs sont obligatoires." });
    }

    const userExists = users.find(u => u.email === email);
    if (userExists) {
      return res.status(400).json({ message: "Cet utilisateur existe déjà." });
    }

    // Hachage du mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      id: uuidv4(),
      username,
      email,
      password: hashedPassword
    };

    users.push(newUser);

    res.status(201).json({ message: "Utilisateur enregistré avec succès." });
  } catch (error) {
    res.status(500).json({ error: "Erreur interne du serveur." });
  }
});

// Route de connexion /api/auth/login:
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  const user = users.find(u => u.email === email);
  if (!user) return res.status(400).json({ message: "Utilisateur non trouvé." });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ message: "Mot de passe incorrect." });

  const token = jwt.sign({ id: user.id }, "SECRET_KEY", { expiresIn: "2h" });

  res.json({ token });
});

// Middleware d’authentification:
function authMiddleware(req, res, next) {
  let authHeader = req.headers.authorization;

  // Handle case where header might be sent as an array
  if (Array.isArray(authHeader)) {
    authHeader = authHeader[0];
  }

  if (!authHeader) return res.status(401).json({ message: "Accès refusé, token manquant." });

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, "SECRET_KEY");
    req.user = decoded; // on attache l’utilisateur à la requête
    next();
  } catch (err) {
    res.status(403).json({ message: "Token invalide." });
  }
}

// Route protégée /api/auth/me:
app.get("/api/auth/me", authMiddleware, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  res.json(user);
});


// 404 global pour les autres
app.use((req, res) => {
  res.status(404).json({ error: 'Point de terminaison non trouvé' });
});



// Démarrer le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});