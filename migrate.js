// Migration script: Load manuals.json into SQLite database
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'cableworld.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err);
    process.exit(1);
  }
  console.log('✓ Database connected');
});

// Initialize database tables first
function initializeDatabase() {
  return new Promise((resolve, reject) => {
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
      `, (err) => {
        if (err) {
          console.error('❌ Error creating tables:', err);
          reject(err);
        } else {
          console.log('✓ Database tables created/verified');
          resolve();
        }
      });
    });
  });
}

// Read manuals.json
const manualsPath = path.join(__dirname, '..', 'data', 'manuals.json');
const fileContent = fs.readFileSync(manualsPath, 'utf-8');
const data = JSON.parse(fileContent);
const manuals = data.manuals || [];

console.log(`\n📚 Preparing migration of ${manuals.length} manuals to database...\n`);

// Initialize and then migrate
initializeDatabase().then(() => {
  console.log(`\n📚 Migrating ${manuals.length} manuals to database...\n`);

  // Insert each manual
  let inserted = 0;
  db.serialize(() => {
    manuals.forEach((manual) => {
      db.run(
        `INSERT OR REPLACE INTO manuals (id, title, category, role, type, summary, version, tags, content, versions, lastUpdated, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          manual.id,
          manual.title,
          manual.category || '',
          manual.role || 'tier1',
          manual.type || '',
          manual.summary || '',
          manual.version || '1.0',
          JSON.stringify(manual.tags || []),
          JSON.stringify(manual.steps || []),
          JSON.stringify(manual.versions || []),
          manual.lastUpdated || new Date().toISOString(),
          new Date().toISOString(),
          new Date().toISOString()
        ],
        function(err) {
          if (err) {
            console.error(`❌ Error inserting manual "${manual.title}":`, err.message);
          } else {
            inserted++;
            console.log(`✓ ${inserted}/${manuals.length} - ${manual.title}`);
          }
        }
      );
    });

    // Create some sample users
    const users = [
      { username: 'agente1', password: 'demo123', role: 'tier1', name: 'Agente Tier 1' },
      { username: 'agente2', password: 'demo123', role: 'tier2', name: 'Agente Tier 2' },
      { username: 'admin', password: 'admin123', role: 'admin', name: 'Administrador' }
    ];

    console.log('\n👥 Creating sample users...\n');
    users.forEach(user => {
      db.run(
        `INSERT OR REPLACE INTO users (id, username, password, role, name, createdAt)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          `user-${Math.random().toString(36).substr(2, 9)}`,
          user.username,
          user.password,
          user.role,
          user.name,
          new Date().toISOString()
        ],
        function(err) {
          if (err) {
            console.error(`❌ Error creating user "${user.username}":`, err.message);
          } else {
            console.log(`✓ User created: ${user.username} (${user.role})`);
          }
        }
      );
    });

    // Final summary
    setTimeout(() => {
      console.log('\n✅ Migration completed!');
      console.log(`📊 ${inserted} manuals migrated to database`);
      console.log('👤 Sample users created:');
      console.log('   - agente1 / demo123 (tier1)');
      console.log('   - agente2 / demo123 (tier2)');
      console.log('   - admin / admin123 (admin)');
      console.log('\n💾 Database file: ' + dbPath);
      db.close();
      process.exit(0);
    }, 1000);
  });
}).catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});

// Error handling
db.on('error', (err) => {
  console.error('❌ Database error:', err);
  process.exit(1);
});
