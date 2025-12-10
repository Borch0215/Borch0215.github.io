// Cableworld Backend - Express + SQLite
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Database setup
const dbPath = path.join(__dirname, 'cableworld.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Error opening database:', err);
  else console.log('✓ Base de datos conectada:', dbPath);
});

// Initialize database tables
function initializeDatabase() {
  db.serialize(() => {
    // Manuals table
    db.run(`
      CREATE TABLE IF NOT EXISTS manuals (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT,
        role TEXT,
        type TEXT,
        summary TEXT,
        version TEXT,
        lastUpdated TEXT,
        tags TEXT,
        content TEXT,
        versions TEXT,
        createdAt TEXT,
        updatedAt TEXT
      )
    `);

    // Diagrams (Fibra) table
    db.run(`
      CREATE TABLE IF NOT EXISTS diagrams (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        rootNodeId TEXT,
        nodes TEXT,
        createdAt TEXT,
        updatedAt TEXT
      )
    `);

    // User progress table
    db.run(`
      CREATE TABLE IF NOT EXISTS progress (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        manualId TEXT NOT NULL,
        stepIndex INTEGER,
        completed BOOLEAN,
        timestamp TEXT,
        UNIQUE(userId, manualId, stepIndex)
      )
    `);

    // Comments table
    db.run(`
      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        manualId TEXT NOT NULL,
        text TEXT,
        timestamp TEXT
      )
    `);

    // History table
    db.run(`
      CREATE TABLE IF NOT EXISTS history (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        manualId TEXT,
        diagramId TEXT,
        action TEXT,
        timestamp TEXT
      )
    `);

    // Users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT,
        name TEXT,
        createdAt TEXT
      )
    `);

    console.log('✓ Tablas de base de datos inicializadas');
  });
}

initializeDatabase();

// ==================== MANUALS API ====================

// Get all manuals
app.get('/api/manuals', (req, res) => {
  db.all('SELECT * FROM manuals', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    // Parse JSON fields
    const manuals = rows.map(m => ({
      ...m,
      tags: JSON.parse(m.tags || '[]'),
      versions: JSON.parse(m.versions || '[]'),
      content: JSON.parse(m.content || '[]')
    }));
    res.json(manuals);
  });
});

// Get single manual
app.get('/api/manuals/:id', (req, res) => {
  db.get('SELECT * FROM manuals WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Manual not found' });
      return;
    }
    row.tags = JSON.parse(row.tags || '[]');
    row.versions = JSON.parse(row.versions || '[]');
    row.content = JSON.parse(row.content || '[]');
    res.json(row);
  });
});

// Create manual
app.post('/api/manuals', (req, res) => {
  const { title, category, role, type, summary, version, tags, steps } = req.body;
  const id = req.body.id || `manual-${uuidv4()}`;
  const now = new Date().toISOString();

  db.run(
    `INSERT INTO manuals (id, title, category, role, type, summary, version, tags, content, versions, lastUpdated, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      title,
      category,
      role,
      type,
      summary,
      version,
      JSON.stringify(tags || []),
      JSON.stringify(steps || []),
      JSON.stringify([{ version, note: 'Initial version', date: now }]),
      now,
      now,
      now
    ],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id, message: 'Manual created successfully' });
    }
  );
});

// Update manual
app.put('/api/manuals/:id', (req, res) => {
  const { title, category, role, type, summary, version, tags, steps, versions } = req.body;
  const now = new Date().toISOString();

  db.run(
    `UPDATE manuals SET title = ?, category = ?, role = ?, type = ?, summary = ?, version = ?, tags = ?, content = ?, versions = ?, updatedAt = ?
     WHERE id = ?`,
    [
      title,
      category,
      role,
      type,
      summary,
      version,
      JSON.stringify(tags || []),
      JSON.stringify(steps || []),
      JSON.stringify(versions || []),
      now,
      req.params.id
    ],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      // === DEVOLVER EL MANUAL ACTUALIZADO ===
      db.get('SELECT * FROM manuals WHERE id = ?', [req.params.id], (getErr, row) => {
        if (getErr) {
          res.status(500).json({ error: getErr.message });
          return;
        }
        if (row) {
          row.tags = JSON.parse(row.tags || '[]');
          row.versions = JSON.parse(row.versions || '[]');
          row.content = JSON.parse(row.content || '[]');
        }
        res.json(row || { message: 'Manual updated successfully' });
      });
    }
  );
});

// Delete manual
app.delete('/api/manuals/:id', (req, res) => {
  db.run('DELETE FROM manuals WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Manual deleted successfully' });
  });
});

// ==================== DIAGRAMS (FIBRA) API ====================

// Get all diagrams
app.get('/api/diagrams', (req, res) => {
  db.all('SELECT * FROM diagrams', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    const diagrams = rows.map(d => ({
      ...d,
      nodes: JSON.parse(d.nodes || '{}')
    }));
    res.json(diagrams);
  });
});

// Create diagram
app.post('/api/diagrams', (req, res) => {
  const { title, rootNodeId, nodes } = req.body;
  const id = req.body.id || `diagram-${uuidv4()}`;
  const now = new Date().toISOString();

  db.run(
    `INSERT INTO diagrams (id, title, rootNodeId, nodes, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, title, rootNodeId, JSON.stringify(nodes || {}), now, now],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id, message: 'Diagram created successfully' });
    }
  );
});

// Update diagram
app.put('/api/diagrams/:id', (req, res) => {
  const { title, rootNodeId, nodes } = req.body;
  const now = new Date().toISOString();

  db.run(
    `UPDATE diagrams SET title = ?, rootNodeId = ?, nodes = ?, updatedAt = ?
     WHERE id = ?`,
    [title, rootNodeId, JSON.stringify(nodes || {}), now, req.params.id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ message: 'Diagram updated successfully' });
    }
  );
});

// Delete diagram
app.delete('/api/diagrams/:id', (req, res) => {
  db.run('DELETE FROM diagrams WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Diagram deleted successfully' });
  });
});

// ==================== PROGRESS API ====================

// Get progress for user
app.get('/api/progress/:userId', (req, res) => {
  db.all('SELECT * FROM progress WHERE userId = ?', [req.params.userId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Update progress
app.post('/api/progress', (req, res) => {
  const { userId, manualId, stepIndex, completed } = req.body;
  const id = uuidv4();
  const now = new Date().toISOString();

  db.run(
    `INSERT OR REPLACE INTO progress (id, userId, manualId, stepIndex, completed, timestamp)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, userId, manualId, stepIndex, completed ? 1 : 0, now],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ message: 'Progress updated' });
    }
  );
});

// ==================== COMMENTS API ====================

// Get comments for manual
app.get('/api/comments/:manualId', (req, res) => {
  db.all('SELECT * FROM comments WHERE manualId = ?', [req.params.manualId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Add comment
app.post('/api/comments', (req, res) => {
  const { userId, manualId, text } = req.body;
  const id = uuidv4();
  const now = new Date().toISOString();

  db.run(
    `INSERT INTO comments (id, userId, manualId, text, timestamp)
     VALUES (?, ?, ?, ?, ?)`,
    [id, userId, manualId, text, now],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id, message: 'Comment added' });
    }
  );
});

// Delete comment
app.delete('/api/comments/:id', (req, res) => {
  db.run('DELETE FROM comments WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Comment deleted' });
  });
});

// ==================== HISTORY API ====================

// Get history for user
app.get('/api/history/:userId', (req, res) => {
  db.all('SELECT * FROM history WHERE userId = ? ORDER BY timestamp DESC LIMIT 100', [req.params.userId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Add history entry
app.post('/api/history', (req, res) => {
  const { userId, manualId, diagramId, action } = req.body;
  const id = uuidv4();
  const now = new Date().toISOString();

  db.run(
    `INSERT INTO history (id, userId, manualId, diagramId, action, timestamp)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, userId, manualId, diagramId, action, now],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id, message: 'History entry added' });
    }
  );
});

// ==================== USERS API ====================

// Get all users (admin only)
app.get('/api/users', (req, res) => {
  db.all('SELECT id, username, role, name, createdAt FROM users', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Create user
app.post('/api/users', (req, res) => {
  const { username, password, role, name } = req.body;
  const id = uuidv4();
  const now = new Date().toISOString();

  db.run(
    `INSERT INTO users (id, username, password, role, name, createdAt)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, username, password, role || 'agent', name, now],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id, message: 'User created' });
    }
  );
});

// Login user
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const { password: _, ...user } = row;
    res.json({ user, token: uuidv4() });
  });
});

// Delete user
app.delete('/api/users/:id', (req, res) => {
  db.run('DELETE FROM users WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'User deleted' });
  });
});

// ==================== HEALTH CHECK ====================
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Cableworld backend is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Cableworld Backend corriendo en http://localhost:${PORT}`);
  console.log(`📊 Base de datos: ${dbPath}`);
  console.log(`\n API disponible en http://localhost:${PORT}/api\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Cerrando servidor...');
  db.close((err) => {
    if (err) console.error(err);
    else console.log('✓ Base de datos cerrada');
    process.exit(0);
  });
});
