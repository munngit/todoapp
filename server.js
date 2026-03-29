const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const dbPath = process.env.TODO_DB_PATH || path.join(__dirname, 'todos.db');

// Middleware to parse JSON request bodies and serve static frontend files.
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Open or create the SQLite database file.
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to connect to SQLite database:', err.message);
    process.exit(1);
  }
  console.log('Connected to SQLite database at', dbPath);
});

// Create the todos table when the server starts if it does not exist.
db.run(
  `CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  (err) => {
    if (err) {
      console.error('Failed to create todos table:', err.message);
      process.exit(1);
    }
  }
);

// Get all todos.
app.get('/todos', (req, res) => {
  const sql = 'SELECT id, title, completed, created_at FROM todos ORDER BY created_at DESC';
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to retrieve todos' });
    }
    res.json(rows);
  });
});

// Create a new todo.
app.post('/todos', (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Todo title is required' });
  }

  const sql = 'INSERT INTO todos (title, completed) VALUES (?, 0)';
  db.run(sql, [title.trim()], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to create todo' });
    }
    res.status(201).json({ id: this.lastID, title: title.trim(), completed: 0 });
  });
});

// Update a todo title or completed status.
app.put('/todos/:id', (req, res) => {
  const id = Number(req.params.id);
  const { title, completed } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Todo title is required' });
  }

  const completedValue = completed ? 1 : 0;
  const sql = 'UPDATE todos SET title = ?, completed = ? WHERE id = ?';

  db.run(sql, [title.trim(), completedValue, id], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to update todo' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    res.json({ id, title: title.trim(), completed: completedValue });
  });
});

// Delete a todo.
app.delete('/todos/:id', (req, res) => {
  const id = Number(req.params.id);
  const sql = 'DELETE FROM todos WHERE id = ?';

  db.run(sql, [id], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete todo' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    res.json({ message: 'Todo deleted' });
  });
});

// Toggle the completed status for a todo.
app.patch('/todos/:id/toggle', (req, res) => {
  const id = Number(req.params.id);
  const sql = 'UPDATE todos SET completed = 1 - completed WHERE id = ?';

  db.run(sql, [id], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to toggle todo status' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    db.get('SELECT id, title, completed, created_at FROM todos WHERE id = ?', [id], (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to retrieve updated todo' });
      }
      res.json(row);
    });
  });
});

// Fallback route for unknown requests.
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

module.exports = { app, db };
