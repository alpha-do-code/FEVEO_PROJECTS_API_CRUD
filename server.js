// Importations
const express = require('express');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

// Stockage de données en mémoire sous forme de tableau
let tasks = [];

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
app.get('/api/tasks', (req, res) => {
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
app.get('/api/tasks/:id', (req, res) => {
  try {
    const task = tasks.find(t => t.id === req.params.id);
    if (!task) return res.status(404).json({ error: 'Tâche non trouvée' });
    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/tasks - créer une nouvelle tâche
app.post('/api/tasks', (req, res) => {
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
      createdAt: now
    };

    tasks.push(newTask);
    res.status(201).json(newTask);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/tasks/:id - mettre à jour une tâche (remplacement partiel autorisé)
app.put('/api/tasks/:id', (req, res) => {
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
app.delete('/api/tasks/:id', (req, res) => {
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

// 404 global pour les autres
app.use((req, res) => {
  res.status(404).json({ error: 'Point de terminaison non trouvé' });
});

// Démarrer le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Todo API server running on http://localhost:${PORT}`);
});