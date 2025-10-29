const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  completed: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  dueDate: {
    type: String,
    validate: {
      validator: function(v) {
        if (!v) return true; // Allow null
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        if (!regex.test(v)) return false;
        const date = new Date(v);
        return date instanceof Date && !isNaN(date) && date.toISOString().slice(0,10) === v;
      },
      message: 'DueDate doit etre en format YYYY-MM-DD et valide .'
    }
  },
  createdAt: {
    type: String,
    default: () => new Date().toISOString()
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

module.exports = mongoose.model('Task', taskSchema);
