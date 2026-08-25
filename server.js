const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');

const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data', 'baes.db');

require('fs').mkdirSync(path.join(__dirname, 'data'), { recursive: true });
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS baes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batiment TEXT NOT NULL,
    etage TEXT,
    salle TEXT,
    reference TEXT,
    etat TEXT NOT NULL DEFAULT 'Fonctionnel',
    date_dernier_test TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    baes_id INTEGER NOT NULL REFERENCES baes(id) ON DELETE CASCADE,
    date_test TEXT NOT NULL,
    resultat TEXT NOT NULL,
    commentaire TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS remplacements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    baes_id INTEGER NOT NULL REFERENCES baes(id) ON DELETE CASCADE,
    date_remplacement TEXT NOT NULL,
    piece TEXT NOT NULL,
    commentaire TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const ETATS_VALIDES = ['Fonctionnel', 'En panne', 'Batterie HS', 'A verifier'];

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function getBaesById(id) {
  return db.prepare('SELECT * FROM baes WHERE id = ?').get(id);
}

// --- BAES CRUD ---

app.get('/api/baes', (req, res) => {
  const rows = db.prepare('SELECT * FROM baes ORDER BY batiment, etage, salle').all();
  res.json(rows);
});

app.get('/api/baes/:id', (req, res) => {
  const baes = getBaesById(req.params.id);
  if (!baes) return res.status(404).json({ error: 'BAES introuvable' });
  const tests = db.prepare('SELECT * FROM tests WHERE baes_id = ? ORDER BY date_test DESC, id DESC').all(req.params.id);
  const remplacements = db.prepare('SELECT * FROM remplacements WHERE baes_id = ? ORDER BY date_remplacement DESC, id DESC').all(req.params.id);
  res.json({ ...baes, tests, remplacements });
});

app.post('/api/baes', (req, res) => {
  const { batiment, etage, salle, reference, etat, date_dernier_test, notes } = req.body || {};
  if (!batiment || !String(batiment).trim()) {
    return res.status(400).json({ error: 'Le batiment est obligatoire' });
  }
  const etatFinal = ETATS_VALIDES.includes(etat) ? etat : 'Fonctionnel';
  const stmt = db.prepare(`
    INSERT INTO baes (batiment, etage, salle, reference, etat, date_dernier_test, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(batiment.trim(), etage || null, salle || null, reference || null, etatFinal, date_dernier_test || null, notes || null);
  res.status(201).json(getBaesById(info.lastInsertRowid));
});

app.put('/api/baes/:id', (req, res) => {
  const existing = getBaesById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'BAES introuvable' });
  const { batiment, etage, salle, reference, etat, date_dernier_test, notes } = req.body || {};
  if (!batiment || !String(batiment).trim()) {
    return res.status(400).json({ error: 'Le batiment est obligatoire' });
  }
  const etatFinal = ETATS_VALIDES.includes(etat) ? etat : existing.etat;
  db.prepare(`
    UPDATE baes SET batiment = ?, etage = ?, salle = ?, reference = ?, etat = ?, date_dernier_test = ?, notes = ?
    WHERE id = ?
  `).run(batiment.trim(), etage || null, salle || null, reference || null, etatFinal, date_dernier_test || null, notes || null, req.params.id);
  res.json(getBaesById(req.params.id));
});

app.delete('/api/baes/:id', (req, res) => {
  const existing = getBaesById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'BAES introuvable' });
  db.prepare('DELETE FROM baes WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

// --- Tests ---

app.post('/api/baes/:id/tests', (req, res) => {
  const baes = getBaesById(req.params.id);
  if (!baes) return res.status(404).json({ error: 'BAES introuvable' });
  const { date_test, resultat, commentaire } = req.body || {};
  if (!date_test || !resultat) {
    return res.status(400).json({ error: 'date_test et resultat sont obligatoires' });
  }
  db.prepare('INSERT INTO tests (baes_id, date_test, resultat, commentaire) VALUES (?, ?, ?, ?)')
    .run(req.params.id, date_test, resultat, commentaire || null);

  // Met a jour la fiche BAES: date du dernier test + etat si le test l'indique
  const updates = { date_dernier_test: date_test };
  if (ETATS_VALIDES.includes(resultat)) updates.etat = resultat;
  db.prepare('UPDATE baes SET date_dernier_test = ?, etat = COALESCE(?, etat) WHERE id = ?')
    .run(updates.date_dernier_test, updates.etat || null, req.params.id);

  res.status(201).json(getBaesById(req.params.id));
});

app.delete('/api/tests/:testId', (req, res) => {
  const info = db.prepare('DELETE FROM tests WHERE id = ?').run(req.params.testId);
  if (info.changes === 0) return res.status(404).json({ error: 'Test introuvable' });
  res.status(204).end();
});

// --- Remplacements ---

app.post('/api/baes/:id/remplacements', (req, res) => {
  const baes = getBaesById(req.params.id);
  if (!baes) return res.status(404).json({ error: 'BAES introuvable' });
  const { date_remplacement, piece, commentaire } = req.body || {};
  if (!date_remplacement || !piece) {
    return res.status(400).json({ error: 'date_remplacement et piece sont obligatoires' });
  }
  db.prepare('INSERT INTO remplacements (baes_id, date_remplacement, piece, commentaire) VALUES (?, ?, ?, ?)')
    .run(req.params.id, date_remplacement, piece, commentaire || null);
  res.status(201).json(getBaesById(req.params.id));
});

app.delete('/api/remplacements/:remplacementId', (req, res) => {
  const info = db.prepare('DELETE FROM remplacements WHERE id = ?').run(req.params.remplacementId);
  if (info.changes === 0) return res.status(404).json({ error: 'Remplacement introuvable' });
  res.status(204).end();
});

app.get('/api/etats', (req, res) => res.json(ETATS_VALIDES));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Suivi BAES demarre sur http://0.0.0.0:${PORT}`);
  console.log(`Accessible depuis ce PC via http://localhost:${PORT}`);
  console.log(`Accessible depuis les autres postes du reseau local via l'IP de cette machine, ex: http://192.168.x.x:${PORT}`);
});
