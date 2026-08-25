const state = {
  baesList: [],
  etats: [],
  currentDetailId: null,
};

const el = (id) => document.getElementById(id);

function badgeClass(etat) {
  switch (etat) {
    case 'Fonctionnel': return 'badge-ok';
    case 'En panne': return 'badge-fail';
    case 'Batterie HS': return 'badge-fail';
    case 'A verifier': return 'badge-warn';
    default: return 'badge-default';
  }
}

function fmtDate(d) {
  if (!d) return 'jamais';
  const parts = d.split('-');
  if (parts.length !== 3) return d;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

async function api(path, options) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.error) || 'Erreur serveur');
  return data;
}

function fillSelect(select, values, withEmpty) {
  select.innerHTML = '';
  if (withEmpty) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = withEmpty;
    select.appendChild(opt);
  }
  values.forEach((v) => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v;
    select.appendChild(opt);
  });
}

async function loadEtats() {
  state.etats = await api('/api/etats');
  fillSelect(el('filter-etat'), state.etats, 'Tous les etats');
  fillSelect(el('baes-etat'), state.etats);
  fillSelect(el('test-resultat'), state.etats);
}

async function loadBaesList() {
  state.baesList = await api('/api/baes');
  renderList();
}

function renderList() {
  const search = el('search').value.trim().toLowerCase();
  const etatFilter = el('filter-etat').value;

  const filtered = state.baesList.filter((b) => {
    if (etatFilter && b.etat !== etatFilter) return false;
    if (!search) return true;
    const haystack = [b.batiment, b.etage, b.salle, b.reference].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(search);
  });

  const container = el('baes-list');
  container.innerHTML = '';

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state">Aucun BAES a afficher. Ajoute le premier avec le bouton en haut.</div>';
    return;
  }

  const groups = new Map();
  filtered.forEach((b) => {
    const key = b.batiment || 'Sans batiment';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(b);
  });

  [...groups.keys()].sort((a, b) => a.localeCompare(b)).forEach((batiment) => {
    const section = document.createElement('section');
    section.className = 'batiment-group';

    const items = groups.get(batiment);
    section.innerHTML = `<h2 class="batiment-title">${escapeHtml(batiment)} <span class="batiment-count">${items.length}</span></h2>`;

    const ul = document.createElement('ul');
    ul.className = 'baes-rows';
    items.forEach((b) => {
      const li = document.createElement('li');
      li.className = 'baes-row';
      li.addEventListener('click', () => openDetail(b.id));
      const loc = [b.etage && `etage ${b.etage}`, b.salle].filter(Boolean).join(' - ');
      li.innerHTML = `
        <div class="baes-row-main">
          <span class="baes-row-ref">${escapeHtml(b.reference || 'BAES #' + b.id)}</span>
          <span class="baes-row-loc">${escapeHtml(loc)}</span>
        </div>
        <div class="baes-row-side">
          <span class="badge ${badgeClass(b.etat)}">${escapeHtml(b.etat)}</span>
          <span class="baes-row-date">Dernier test : ${fmtDate(b.date_dernier_test)}</span>
        </div>
      `;
      ul.appendChild(li);
    });

    section.appendChild(ul);
    container.appendChild(section);
  });
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// --- Modale creation/edition BAES ---

function openBaesModal(baes) {
  el('modal-baes-title').textContent = baes ? 'Modifier le BAES' : 'Nouveau BAES';
  el('baes-id').value = baes ? baes.id : '';
  el('baes-batiment').value = baes ? baes.batiment : '';
  el('baes-etage').value = baes ? (baes.etage || '') : '';
  el('baes-salle').value = baes ? (baes.salle || '') : '';
  el('baes-reference').value = baes ? (baes.reference || '') : '';
  el('baes-etat').value = baes ? baes.etat : state.etats[0];
  el('baes-date-test').value = baes ? (baes.date_dernier_test || '') : '';
  el('baes-notes').value = baes ? (baes.notes || '') : '';
  el('modal-baes').classList.remove('hidden');
}

function closeModal(id) {
  el(id).classList.add('hidden');
}

el('btn-new-baes').addEventListener('click', () => openBaesModal(null));

document.querySelectorAll('[data-close-modal]').forEach((btn) => {
  btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
});

el('form-baes').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = el('baes-id').value;
  const payload = {
    batiment: el('baes-batiment').value,
    etage: el('baes-etage').value,
    salle: el('baes-salle').value,
    reference: el('baes-reference').value,
    etat: el('baes-etat').value,
    date_dernier_test: el('baes-date-test').value,
    notes: el('baes-notes').value,
  };
  try {
    if (id) {
      await api(`/api/baes/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await api('/api/baes', { method: 'POST', body: JSON.stringify(payload) });
    }
    closeModal('modal-baes');
    await loadBaesList();
    if (id && state.currentDetailId === Number(id)) await openDetail(Number(id));
  } catch (err) {
    alert(err.message);
  }
});

// --- Modale detail ---

async function openDetail(id) {
  const baes = await api(`/api/baes/${id}`);
  state.currentDetailId = id;
  el('detail-title').textContent = baes.reference || `BAES #${baes.id}`;
  const loc = [baes.batiment, baes.etage && `etage ${baes.etage}`, baes.salle].filter(Boolean).join(' - ');
  el('detail-meta').innerHTML = `${escapeHtml(loc)} &middot; <span class="badge ${badgeClass(baes.etat)}">${escapeHtml(baes.etat)}</span> &middot; Dernier test : ${fmtDate(baes.date_dernier_test)}`;

  renderHistoryList(el('tests-list'), baes.tests, (t) => `${fmtDate(t.date_test)} - ${escapeHtml(t.resultat)}${t.commentaire ? ' - ' + escapeHtml(t.commentaire) : ''}`, 'tests');
  renderHistoryList(el('remplacements-list'), baes.remplacements, (r) => `${fmtDate(r.date_remplacement)} - ${escapeHtml(r.piece)}${r.commentaire ? ' - ' + escapeHtml(r.commentaire) : ''}`, 'remplacements');

  el('test-date').value = '';
  el('test-commentaire').value = '';
  el('remplacement-date').value = '';
  el('remplacement-piece').value = '';
  el('remplacement-commentaire').value = '';

  el('modal-detail').classList.remove('hidden');
}

function renderHistoryList(ul, items, formatter, kind) {
  ul.innerHTML = '';
  if (!items || items.length === 0) {
    ul.innerHTML = '<li class="history-item"><span class="txt">Aucun historique</span></li>';
    return;
  }
  items.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'history-item';
    li.innerHTML = `<span class="txt">${formatter(item)}</span><button data-id="${item.id}">Supprimer</button>`;
    li.querySelector('button').addEventListener('click', async () => {
      if (!confirm('Supprimer cette entree ?')) return;
      await api(`/api/${kind}/${item.id}`, { method: 'DELETE' });
      await openDetail(state.currentDetailId);
      await loadBaesList();
    });
    ul.appendChild(li);
  });
}

el('btn-edit-baes').addEventListener('click', async () => {
  const baes = state.baesList.find((b) => b.id === state.currentDetailId) || await api(`/api/baes/${state.currentDetailId}`);
  closeModal('modal-detail');
  openBaesModal(baes);
});

el('btn-delete-baes').addEventListener('click', async () => {
  if (!confirm('Supprimer definitivement ce BAES et tout son historique ?')) return;
  await api(`/api/baes/${state.currentDetailId}`, { method: 'DELETE' });
  closeModal('modal-detail');
  await loadBaesList();
});

el('form-test').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api(`/api/baes/${state.currentDetailId}/tests`, {
      method: 'POST',
      body: JSON.stringify({
        date_test: el('test-date').value,
        resultat: el('test-resultat').value,
        commentaire: el('test-commentaire').value,
      }),
    });
    await openDetail(state.currentDetailId);
    await loadBaesList();
  } catch (err) {
    alert(err.message);
  }
});

el('form-remplacement').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api(`/api/baes/${state.currentDetailId}/remplacements`, {
      method: 'POST',
      body: JSON.stringify({
        date_remplacement: el('remplacement-date').value,
        piece: el('remplacement-piece').value,
        commentaire: el('remplacement-commentaire').value,
      }),
    });
    await openDetail(state.currentDetailId);
  } catch (err) {
    alert(err.message);
  }
});

el('search').addEventListener('input', renderList);
el('filter-etat').addEventListener('change', renderList);

(async function init() {
  await loadEtats();
  await loadBaesList();
})();
