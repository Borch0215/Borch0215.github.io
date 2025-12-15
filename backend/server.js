// Cableworld Backend - Express + SQLite
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const path = require('path');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = 5000;

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'your-app-password'
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Function to send welcome email
async function sendWelcomeEmail(userEmail, username, appUrl) {
  const emailTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .section { margin-bottom: 20px; }
        .section h2 { color: #667eea; font-size: 18px; margin-top: 0; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; font-weight: bold; }
        .button:hover { background: #764ba2; }
        .credentials { background: white; border: 1px solid #ddd; padding: 15px; border-radius: 4px; margin: 15px 0; font-family: monospace; }
        .credentials-item { margin: 8px 0; }
        .label { font-weight: bold; color: #667eea; }
        .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎓 Bienvenido a Cableworld</h1>
          <p>Dashboard de conocimiento para agentes de soporte</p>
        </div>
        
        <div class="content">
          <div class="section">
            <h2>Hola,</h2>
            <p>Tu cuenta ha sido creada exitosamente en <strong>Cableworld</strong>. Este es tu portal de acceso a manuales técnicos, árboles de decisión (Fibra), FAQs y herramientas de gestión de conocimiento.</p>
          </div>
          
          <div class="section">
            <h2>🔐 Configurar tu Contraseña</h2>
            <p>Esta es tu primera vez accediendo, así que necesitas configurar tu contraseña:</p>
            
            <div class="credentials">
              <div class="credentials-item"><span class="label">Usuario:</span> ${username}</div>
              <div class="credentials-item"><span class="label">Correo:</span> ${userEmail}</div>
            </div>
            
            <p><strong>Pasos para configurar tu contraseña:</strong></p>
            <ol>
              <li>Abre el siguiente enlace: <a href="${appUrl}" class="button">${appUrl}</a></li>
              <li>Ingresa tu usuario: <strong>${username}</strong></li>
              <li>Haz clic en "Siguiente"</li>
              <li>Verás la opción "Configurar Contraseña"</li>
              <li>Establece una contraseña fuerte que cumpla con:
                <ul>
                  <li>Mínimo 8 caracteres</li>
                  <li>Al menos 1 mayúscula</li>
                  <li>Al menos 1 minúscula</li>
                  <li>Al menos 1 número</li>
                  <li>Al menos 1 carácter especial (!@#$%^&*)</li>
                </ul>
              </li>
              <li>Confirma tu contraseña y ¡listo!</li>
            </ol>
          </div>
          
          <div class="section">
            <h2>📚 ¿Qué es Cableworld Dashboard?</h2>
            <p>Cableworld Dashboard es una plataforma integral de gestión del conocimiento diseñada para agentes de soporte técnico:</p>
            <ul>
              <li><strong>📖 Manuales:</strong> Accede a procedimientos paso a paso para resolver problemas</li>
              <li><strong>🌳 Fibra (Árboles de Decisión):</strong> Diagrams interactivos para diagnóstico rápido</li>
              <li><strong>❓ FAQs:</strong> Respuestas frecuentes organizadas por tema</li>
              <li><strong>📝 Historial:</strong> Acceso rápido a elementos consultados recientemente</li>
              <li><strong>⚙️ Ajustes:</strong> Personaliza tema, tamaño de fuente y gestión de usuarios (admin)</li>
            </ul>
          </div>
          
          <div class="section">
            <h2>⚡ Características Principales</h2>
            <ul>
              <li>Búsqueda rápida de manuales y procedimientos</li>
              <li>Sistema de árboles de decisión interactivos</li>
              <li>Soporte multiidioma en interfaz</li>
              <li>Modo oscuro/claro personalizable</li>
              <li>Acceso offline a documentación</li>
              <li>Gestión de usuarios (para administradores)</li>
            </ul>
          </div>
          
          <div class="section" style="background: #fff3cd; padding: 15px; border-radius: 4px; border-left: 4px solid #ffc107;">
            <p><strong>⚠️ Nota de Seguridad:</strong> Nunca compartas tu contraseña con nadie. Los administradores nunca te pedirán tu contraseña.</p>
          </div>
          
          <div class="footer">
            <p>Si tienes problemas para acceder o preguntas, contacta a tu administrador.</p>
            <p>© 2025 Cableworld - Sistema de Gestión de Conocimiento Técnico</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
  
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER || 'noreply@cableworld.local',
      to: userEmail,
      subject: '🎓 Bienvenido a Cableworld - Configura tu Contraseña',
      html: emailTemplate
    });
    console.log('✓ Welcome email sent to:', userEmail);
    return true;
  } catch (err) {
    console.error('✗ Error sending email to', userEmail, ':', err.message);
    return false;
  }
}

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
        data TEXT,
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
        email TEXT UNIQUE,
        password TEXT,
        passwordSet BOOLEAN DEFAULT 0,
        role TEXT,
        name TEXT,
        createdAt TEXT,
        updatedAt TEXT
      )
    `);

    console.log('✓ Tablas de base de datos inicializadas');
    
    // Create default admin user if it doesn't exist (using env variables)
    createDefaultAdmin().then(() => {
      console.log('✓ Admin user check completado');
    });
  });
}

// Create default admin user using environment variables
async function createDefaultAdmin() {
  return new Promise((resolve) => {
    db.get('SELECT id FROM users WHERE username = ?', ['admin'], async (err, row) => {
      if (row) {
        console.log('✓ Usuario admin ya existe');
        resolve();
        return;
      }
      
      // Get admin credentials from environment variables
      const adminUsername = process.env.ADMIN_USERNAME || 'admin';
      const adminPassword = process.env.ADMIN_PASSWORD;
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@cableworld.local';
      
      if (!adminPassword) {
        console.warn('⚠️ ADMIN_PASSWORD no está configurada en variables de entorno. Usuario admin no será creado automáticamente.');
        resolve();
        return;
      }
      
      try {
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        const id = uuidv4();
        const now = new Date().toISOString();
        
        db.run(
          `INSERT INTO users (id, username, email, password, role, name, passwordSet, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, adminUsername, adminEmail, hashedPassword, 'admin', 'Administrador', 1, now, now],
          function(err) {
            if (err) {
              console.error('Error creating default admin:', err);
            } else {
              console.log('✓ Usuario admin por defecto creado (usuario: ' + adminUsername + ')');
            }
            resolve();
          }
        );
      } catch (err) {
        console.error('Error hashing admin password:', err);
        resolve();
      }
    });
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
    const manuals = rows.map(m => {
      try {
        return {
          ...m,
          tags: Array.isArray(m.tags) ? m.tags : JSON.parse(m.tags || '[]'),
          versions: Array.isArray(m.versions) ? m.versions : JSON.parse(m.versions || '[]'),
          content: Array.isArray(m.content) ? m.content : JSON.parse(m.content || '[]')
        };
      } catch (e) {
        console.warn(`Error parsing manual ${m.id}:`, e.message);
        return {
          ...m,
          tags: [],
          versions: [],
          content: []
        };
      }
    });
    res.json({ value: manuals, data: manuals, manuals: manuals, Count: manuals.length });
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
    try {
      row.tags = Array.isArray(row.tags) ? row.tags : JSON.parse(row.tags || '[]');
      row.versions = Array.isArray(row.versions) ? row.versions : JSON.parse(row.versions || '[]');
      row.content = Array.isArray(row.content) ? row.content : JSON.parse(row.content || '[]');
    } catch (e) {
      console.warn(`Error parsing manual ${row.id}:`, e.message);
      row.tags = [];
      row.versions = [];
      row.content = [];
    }
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
  console.log('📥 GET /api/diagrams recibido');
  try {
    db.all('SELECT * FROM diagrams', (err, rows) => {
      try {
        if (err) {
          console.error('❌ Error en SELECT:', err);
          res.status(500).json({ error: err.message });
          return;
        }
        console.log(`📊 Base de datos tiene ${rows?.length || 0} diagramas`);
        if (!rows || rows.length === 0) {
          console.log('✅ Enviando array vacío');
          res.json([]);
          return;
        }
        const diagrams = rows.map((d, idx) => {
          try {
            console.log(`  [${idx}] id=${d.id}, title=${d.title}, has_data=${!!d.data}`);
            // Try to parse as hierarchical structure first
            let data = d;
            if (d.data) {
              try {
                data = JSON.parse(d.data);
                data.id = d.id;
                data.createdAt = d.createdAt;
                data.updatedAt = d.updatedAt;
                console.log(`  ✓ Parseado como hierarchical`);
              } catch (e) {
                console.error(`  ❌ Error parsing data:`, e.message);
                // Fallback to old structure
                data = {
                  ...d,
                  nodes: JSON.parse(d.nodes || '{}')
                };
              }
            } else {
              // Old structure fallback
              data = {
                ...d,
                nodes: JSON.parse(d.nodes || '{}')
              };
            }
            return data;
          } catch (mapErr) {
            console.error(`❌ Error en map [${idx}]:`, mapErr);
            throw mapErr;
          }
        });
        console.log(`✅ Enviando ${diagrams.length} diagramas`);
        res.json(diagrams);
      } catch (callbackErr) {
        console.error('❌ Error en callback:', callbackErr);
        res.status(500).json({ error: callbackErr.message });
      }
    });
  } catch (outerErr) {
    console.error('❌ Error outer:', outerErr);
    res.status(500).json({ error: outerErr.message });
  }
});

// Create diagram
app.post('/api/diagrams', (req, res) => {
  const diagram = req.body;
  const id = diagram.id || `diagram-${uuidv4()}`;
  const now = new Date().toISOString();
  
  // Ensure id and timestamps are set
  diagram.id = id;
  diagram.createdAt = diagram.createdAt || now;
  diagram.updatedAt = now;

  db.run(
    `INSERT INTO diagrams (id, title, rootNodeId, nodes, data, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id, 
      diagram.title, 
      diagram.rootNodeId || null, 
      JSON.stringify(diagram.nodes || {}),
      JSON.stringify(diagram),  // Store complete hierarchical structure
      diagram.createdAt, 
      now
    ],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(diagram);  // Return complete diagram with rootNode
    }
  );
});

// Update diagram
app.put('/api/diagrams/:id', (req, res) => {
  const diagram = req.body;
  const now = new Date().toISOString();
  diagram.updatedAt = now;

  db.run(
    `UPDATE diagrams SET title = ?, rootNodeId = ?, nodes = ?, data = ?, updatedAt = ?
     WHERE id = ?`,
    [
      diagram.title, 
      diagram.rootNodeId || null, 
      JSON.stringify(diagram.nodes || {}),
      JSON.stringify(diagram),  // Store complete hierarchical structure
      now, 
      req.params.id
    ],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(diagram);  // Return complete diagram with rootNode
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
  db.all('SELECT id, username, email, role, name, passwordSet, createdAt FROM users', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Create user (admin creates user, user must set password on first login)
app.post('/api/users', async (req, res) => {
  const { username, email, role, name } = req.body;
  
  // Validation
  if (!username || !email) {
    res.status(400).json({ error: 'Username and email are required' });
    return;
  }
  
  try {
    const id = uuidv4();
    const now = new Date().toISOString();
    const appUrl = process.env.APP_URL || 'http://localhost:3000';

    db.run(
      `INSERT INTO users (id, username, email, password, passwordSet, role, name, createdAt, updatedAt)
       VALUES (?, ?, ?, NULL, 0, ?, ?, ?, ?)`,
      [id, username, email, role || 'agent', name || username, now, now],
      async function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            res.status(400).json({ error: 'Username or email already exists' });
          } else {
            res.status(500).json({ error: err.message });
          }
          return;
        }
        
        // Send welcome email
        const emailSent = await sendWelcomeEmail(email, username, appUrl);
        
        res.json({ 
          id, 
          username, 
          email,
          role: role || 'agent', 
          name: name || username,
          passwordSet: false,
          message: 'User created. ' + (emailSent ? 'Welcome email sent.' : 'User must set password on first login.'),
          emailSent: emailSent
        });
      }
    );
  } catch (err) {
    res.status(500).json({ error: 'Error creating user: ' + err.message });
  }
});

// Set password for new user (first login)
app.post('/api/setup-password', async (req, res) => {
  const { username, password, confirmPassword } = req.body;
  
  if (!username || !password || !confirmPassword) {
    res.status(400).json({ error: 'Username, password and confirm password are required' });
    return;
  }

  if (password !== confirmPassword) {
    res.status(400).json({ error: 'Passwords do not match' });
    return;
  }
  
  // Validate password strength
  const passwordValidation = validatePasswordStrength(password);
  if (!passwordValidation.valid) {
    res.status(400).json({ error: 'Password does not meet requirements', errors: passwordValidation.errors });
    return;
  }
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();
    
    db.run(
      `UPDATE users SET password = ?, passwordSet = 1, updatedAt = ? WHERE (username = ? OR email = ?) AND passwordSet = 0`,
      [hashedPassword, now, username, username],
      function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        if (this.changes === 0) {
          res.status(400).json({ error: 'User not found or password already set' });
          return;
        }
        res.json({ message: 'Password set successfully. You can now login.' });
      }
    );
  } catch (err) {
    res.status(500).json({ error: 'Error setting password: ' + err.message });
  }
});

// Change password endpoint (for authenticated users)
app.post('/api/change-password', async (req, res) => {
  const { userId, currentPassword, newPassword, confirmPassword } = req.body;
  
  if (!userId || !currentPassword || !newPassword || !confirmPassword) {
    res.status(400).json({ error: 'All fields are required' });
    return;
  }

  if (newPassword !== confirmPassword) {
    res.status(400).json({ error: 'Passwords do not match' });
    return;
  }

  // Validate new password strength
  const passwordValidation = validatePasswordStrength(newPassword);
  if (!passwordValidation.valid) {
    res.status(400).json({ error: 'New password does not meet requirements', errors: passwordValidation.errors });
    return;
  }

  try {
    // Get user from database
    db.get(
      `SELECT id, password FROM users WHERE id = ?`,
      [userId],
      async (err, user) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        
        if (!user) {
          res.status(404).json({ error: 'User not found' });
          return;
        }

        // Verify current password
        const passwordMatch = await bcrypt.compare(currentPassword, user.password);
        if (!passwordMatch) {
          res.status(401).json({ error: 'Current password is incorrect' });
          return;
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const now = new Date().toISOString();

        // Update password
        db.run(
          `UPDATE users SET password = ?, updatedAt = ? WHERE id = ?`,
          [hashedPassword, now, userId],
          function(err) {
            if (err) {
              res.status(500).json({ error: err.message });
              return;
            }
            res.json({ message: 'Password changed successfully' });
          }
        );
      }
    );
  } catch (err) {
    res.status(500).json({ error: 'Error changing password: ' + err.message });
  }
});


// Validate password strength
function validatePasswordStrength(password) {
  const errors = [];
  
  if (password.length < 8) {
    errors.push('Mínimo 8 caracteres');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Al menos una mayúscula');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Al menos una minúscula');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Al menos un número');
  }
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Al menos un carácter especial (!@#$%^&*)');
  }
  
  return {
    valid: errors.length === 0,
    errors: errors
  };
}

// Login user (accepts email or username)
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Username/email and password are required' });
    return;
  }

  // Try to find user by username or email
  db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, username], async (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (!row) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    
    // Check if password has been set
    if (!row.passwordSet || !row.password) {
      res.status(401).json({ error: 'Password not set. Please set your password first.', needsSetup: true, username: row.username });
      return;
    }

    try {
      // Compare password with hashed password using bcrypt
      const isPasswordValid = await bcrypt.compare(password, row.password);
      
      if (!isPasswordValid) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      // Password is valid, return user info without password
      const { password: _, ...user } = row;
      res.json({ user, token: uuidv4() });
    } catch (err) {
      res.status(500).json({ error: 'Error verifying password: ' + err.message });
    }
  });
});

// Check if user exists and their password setup status (first step of login)
app.post('/api/check-user-setup-status', (req, res) => {
  const { username } = req.body;

  if (!username) {
    res.status(400).json({ error: 'Username or email is required' });
    return;
  }

  db.get('SELECT id, username, email, name, passwordSet FROM users WHERE username = ? OR email = ?', [username, username], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    if (!row) {
      res.status(404).json({ error: 'User not found', userFound: false });
      return;
    }

    res.json({ 
      userFound: true,
      user: { 
        id: row.id,
        username: row.username, 
        email: row.email, 
        name: row.name 
      }, 
      needsPasswordSetup: !row.passwordSet 
    });
  });
});

// Check if user exists (for session validation)
app.post('/api/validate-user/:id', (req, res) => {
  const userId = req.params.id;

  if (!userId) {
    res.status(400).json({ error: 'User ID is required' });
    return;
  }

  db.get('SELECT id, username, role FROM users WHERE id = ?', [userId], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    if (!row) {
      res.status(404).json({ error: 'User not found', exists: false });
      return;
    }

    res.json({ exists: true, user: { id: row.id, username: row.username, role: row.role } });
  });
});

// Check if user needs to setup password (accept email or username)
app.post('/api/check-password-status', (req, res) => {
  const { username } = req.body;

  if (!username) {
    res.status(400).json({ error: 'Username or email is required' });
    return;
  }

  db.get('SELECT id, username, email, name, passwordSet FROM users WHERE username = ? OR email = ?', [username, username], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    if (!row) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ 
      user: { 
        id: row.id,
        username: row.username, 
        email: row.email, 
        name: row.name 
      }, 
      needsPasswordSetup: !row.passwordSet 
    });
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
