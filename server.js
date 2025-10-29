// Importations
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const Task = require('./models/task');
const User = require('./models/user');

const app = express();
app.use(express.json());

// Middleware d'authentification JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token d\'authentification requis' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token invalide' });
    }
    req.user = user;
    next();
  });
}

// Connexion à MongoDB Atlas avec Mongoose
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log(' Connecté à MongoDB Atlas avec Mongoose');
}).catch(err => {
  console.error(' Erreur de connexion à MongoDB:', err);
  process.exit(1);
});

// Aide : validation de la chaîne de date aaaa-mm-jj
function isValidDateYYYYMMDD(dateString) {
  if (!dateString) return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date) && date.toISOString().slice(0, 10) === dateString;
}

// Aide : valider la charge utile de la tâche
function validateTaskPayload(payload, forUpdate = false) {
  const errors = [];

  if (!forUpdate) {
    if (!payload.title || typeof payload.title !== 'string' || payload.title.trim() === '') {
      errors.push("Le titre est obligatoire lors de la création d'une tâche et ne doit pas être vide.");
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

// GET /api/tasks/public - récupérer toutes les tâches publiques (sans authentification)
app.get('/api/tasks/public', async (req, res) => {
  try {
    const tasks = await Task.find().populate('user', 'username').select('-__v');
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// GET /api/users/:id/tasks - récupérer les tâches d'un utilisateur spécifique (avec authentification)
app.get('/api/users/:id/tasks', authenticateToken, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    // Vérifier que l'utilisateur authentifié peut accéder aux tâches de cet utilisateur (par exemple, seulement ses propres tâches ou admin)
    if (req.user.id !== req.params.id) {
      return res.status(403).json({ error: 'Accès non autorisé' });
    }

    const user = await User.findById(req.params.id).populate('tasks');
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json(user.tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// GET /api/tasks - récupérer les tâches de l'utilisateur connecté
app.get('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const filter = { user: req.user.id };

    // Filtres
    if (req.query.completed !== undefined) {
      const val = req.query.completed.toLowerCase();
      if (val === 'true' || val === 'false') {
        filter.completed = val === 'true';
      } else {
        return res.status(400).json({ error: 'Le paramètre completed doit être true ou false' });
      }
    }

    if (req.query.priority) {
      filter.priority = req.query.priority;
    }

    if (req.query.dueDate) {
      if (!isValidDateYYYYMMDD(req.query.dueDate)) {
        return res.status(400).json({ error: 'La date d\'échéance doit être au format AAAA-MM-JJ' });
      }
      filter.dueDate = req.query.dueDate;
    }

    const tasks = await Task.find(filter).select('-__v');
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// GET /api/tasks/:id - récupérer une tâche par ID de l'utilisateur connecté
app.get('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const task = await Task.findOne({ _id: req.params.id, user: req.user.id }).select('-__v');

    if (!task) {
      return res.status(404).json({ error: 'Tâche non trouvée' });
    }

    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// POST /api/tasks - créer une nouvelle tâche pour l'utilisateur connecté
app.post('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const payload = req.body;
    const errors = validateTaskPayload(payload, false);
    if (errors.length) return res.status(400).json({ errors });

    const newTask = new Task({
      id: uuidv4(),
      title: payload.title.trim(),
      description: payload.description ? String(payload.description).trim() : '',
      completed: payload.completed === undefined ? false : !!payload.completed,
      priority: payload.priority ? payload.priority : 'medium',
      dueDate: payload.dueDate ? payload.dueDate : null,
      user: req.user.id
    });

    const savedTask = await newTask.save();
    res.status(201).json(savedTask);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// PUT /api/tasks/:id - mettre à jour une tâche de l'utilisateur connecté
app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const payload = req.body;
    const errors = validateTaskPayload(payload, true);
    if (errors.length) return res.status(400).json({ errors });

    // Préparer les mises à jour
    const updates = {};
    if (payload.title !== undefined) updates.title = String(payload.title).trim();
    if (payload.description !== undefined) updates.description = String(payload.description).trim();
    if (payload.completed !== undefined) updates.completed = !!payload.completed;
    if (payload.priority !== undefined) updates.priority = payload.priority;
    if (payload.dueDate !== undefined) updates.dueDate = payload.dueDate;

    const updatedTask = await Task.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-__v');

    if (!updatedTask) {
      return res.status(404).json({ error: 'Tâche non trouvée' });
    }

    res.json(updatedTask);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// DELETE /api/tasks/:id - supprimer une tâche de l'utilisateur connecté
app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    const deletedTask = await Task.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id
    }).select('-__v');

    if (!deletedTask) {
      return res.status(404).json({ error: 'Tâche non trouvée' });
    }

    res.json({ message: 'Tâche supprimée', task: deletedTask });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Routes d'authentification
// POST /api/auth/register - inscription d'un nouvel utilisateur
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Nom d\'utilisateur, email et mot de passe requis' });
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: 'Utilisateur déjà existant' });
    }

    // Hacher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer un nouvel utilisateur
    const newUser = new User({
      username,
      email,
      password: hashedPassword
    });

    const savedUser = await newUser.save();

    // Générer un token JWT
    const token = jwt.sign({ id: savedUser._id, username: savedUser.username }, process.env.JWT_SECRET, {
      expiresIn: '24h'
    });

    res.status(201).json({
      message: 'Utilisateur créé avec succès',
      token,
      user: { id: savedUser._id, username: savedUser.username, email: savedUser.email }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// POST /api/auth/login - connexion d'un utilisateur
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    // Trouver l'utilisateur
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Générer un token JWT
    const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET, {
      expiresIn: '24h'
    });

    res.json({
      message: 'Connexion réussie',
      token,
      user: { id: user._id, username: user.username, email: user.email }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// 404 global pour les autres routes
app.use((req, res) => {
  res.status(404).json({ error: 'Point de terminaison non trouvé' });
});

// Démarrer le serveur
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`L'API server running on http://localhost:${PORT}`);
});
