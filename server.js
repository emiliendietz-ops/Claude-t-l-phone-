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

  CREATE TABLE IF NOT EXISTS entreprises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    equipement TEXT,
    telephone TEXT,
    email TEXT,
    statut TEXT NOT NULL DEFAULT 'A contacter',
    date_dernier_contact TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS rdv (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entreprise_id INTEGER NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
    date_rdv TEXT NOT NULL,
    heure_rdv TEXT,
    objet TEXT,
    statut TEXT NOT NULL DEFAULT 'Planifie',
    commentaire TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const ETATS_VALIDES = ['Fonctionnel', 'En panne', 'Batterie HS', 'A verifier'];
const STATUTS_ENTREPRISE = ['A contacter', 'Contactee', 'RDV planifie', 'Intervention faite'];
const STATUTS_RDV = ['Planifie', 'Effectue', 'Annule'];

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/entretien', express.static(path.join(__dirname, 'public-entretien')));

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

// --- Entreprises (suivi entretien annuel) ---

function getEntrepriseById(id) {
  return db.prepare('SELECT * FROM entreprises WHERE id = ?').get(id);
}

app.get('/api/entreprises', (req, res) => {
  const rows = db.prepare('SELECT * FROM entreprises ORDER BY statut, nom').all();
  res.json(rows);
});

app.get('/api/entreprises/:id', (req, res) => {
  const entreprise = getEntrepriseById(req.params.id);
  if (!entreprise) return res.status(404).json({ error: 'Entreprise introuvable' });
  const rdvs = db.prepare('SELECT * FROM rdv WHERE entreprise_id = ? ORDER BY date_rdv DESC, id DESC').all(req.params.id);
  res.json({ ...entreprise, rdv: rdvs });
});

app.post('/api/entreprises', (req, res) => {
  const { nom, equipement, telephone, email, statut, date_dernier_contact, notes } = req.body || {};
  if (!nom || !String(nom).trim()) {
    return res.status(400).json({ error: 'Le nom de l\'entreprise est obligatoire' });
  }
  const statutFinal = STATUTS_ENTREPRISE.includes(statut) ? statut : 'A contacter';
  const stmt = db.prepare(`
    INSERT INTO entreprises (nom, equipement, telephone, email, statut, date_dernier_contact, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(nom.trim(), equipement || null, telephone || null, email || null, statutFinal, date_dernier_contact || null, notes || null);
  res.status(201).json(getEntrepriseById(info.lastInsertRowid));
});

app.put('/api/entreprises/:id', (req, res) => {
  const existing = getEntrepriseById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Entreprise introuvable' });
  const { nom, equipement, telephone, email, statut, date_dernier_contact, notes } = req.body || {};
  if (!nom || !String(nom).trim()) {
    return res.status(400).json({ error: 'Le nom de l\'entreprise est obligatoire' });
  }
  const statutFinal = STATUTS_ENTREPRISE.includes(statut) ? statut : existing.statut;
  db.prepare(`
    UPDATE entreprises SET nom = ?, equipement = ?, telephone = ?, email = ?, statut = ?, date_dernier_contact = ?, notes = ?
    WHERE id = ?
  `).run(nom.trim(), equipement || null, telephone || null, email || null, statutFinal, date_dernier_contact || null, notes || null, req.params.id);
  res.json(getEntrepriseById(req.params.id));
});

app.delete('/api/entreprises/:id', (req, res) => {
  const existing = getEntrepriseById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Entreprise introuvable' });
  db.prepare('DELETE FROM entreprises WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

// --- RDV ---

app.post('/api/entreprises/:id/rdv', (req, res) => {
  const entreprise = getEntrepriseById(req.params.id);
  if (!entreprise) return res.status(404).json({ error: 'Entreprise introuvable' });
  const { date_rdv, heure_rdv, objet, statut, commentaire } = req.body || {};
  if (!date_rdv) {
    return res.status(400).json({ error: 'date_rdv est obligatoire' });
  }
  const statutFinal = STATUTS_RDV.includes(statut) ? statut : 'Planifie';
  db.prepare('INSERT INTO rdv (entreprise_id, date_rdv, heure_rdv, objet, statut, commentaire) VALUES (?, ?, ?, ?, ?, ?)')
    .run(req.params.id, date_rdv, heure_rdv || null, objet || null, statutFinal, commentaire || null);

  // Un RDV planifie fait passer l'entreprise au statut "RDV planifie",
  // sauf si le RDV est deja marque comme effectue.
  const nouveauStatutEntreprise = statutFinal === 'Effectue' ? 'Intervention faite' : 'RDV planifie';
  db.prepare('UPDATE entreprises SET statut = ?, date_dernier_contact = ? WHERE id = ?')
    .run(nouveauStatutEntreprise, date_rdv, req.params.id);

  res.status(201).json(getEntrepriseById(req.params.id));
});

app.delete('/api/rdv/:rdvId', (req, res) => {
  const info = db.prepare('DELETE FROM rdv WHERE id = ?').run(req.params.rdvId);
  if (info.changes === 0) return res.status(404).json({ error: 'RDV introuvable' });
  res.status(204).end();
});

app.get('/api/statuts-entreprise', (req, res) => res.json(STATUTS_ENTREPRISE));
app.get('/api/statuts-rdv', (req, res) => res.json(STATUTS_RDV));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Suivi BAES demarre sur http://0.0.0.0:${PORT}`);
  console.log(`Suivi entretien annuel disponible sur http://0.0.0.0:${PORT}/entretien`);
  console.log(`Accessible depuis ce PC via http://localhost:${PORT}`);
  console.log(`Accessible depuis les autres postes du reseau local via l'IP de cette machine, ex: http://192.168.x.x:${PORT}`);
});
