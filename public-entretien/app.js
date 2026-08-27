const state = {
  entreprises: [],
  statutsEntreprise: [],
  statutsRdv: [],
  currentDetailId: null,
};

const el = (id) => document.getElementById(id);

function badgeClass(statut) {
  switch (statut) {
    case 'Intervention faite': return 'badge-ok';
    case 'RDV planifie': return 'badge-warn';
    case 'Contactee': return 'badge-warn';
    case 'A contacter': return 'badge-fail';
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

async function loadStatuts() {
  state.statutsEntreprise = await api('/api/statuts-entreprise');
  state.statutsRdv = await api('/api/statuts-rdv');
  fillSelect(el('filter-statut'), state.statutsEntreprise, 'Tous les statuts');
  fillSelect(el('entreprise-statut'), state.statutsEntreprise);
  fillSelect(el('rdv-statut'), state.statutsRdv);
}

async function loadEntreprises() {
  state.entreprises = await api('/api/entreprises');
  renderList();
}

function renderList() {
  const search = el('search').value.trim().toLowerCase();
  const statutFilter = el('filter-statut').value;

  const filtered = state.entreprises.filter((entreprise) => {
    if (statutFilter && entreprise.statut !== statutFilter) return false;
    if (!search) return true;
    const haystack = [entreprise.nom, entreprise.equipement].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(search);
  });

  const container = el('entreprises-list');
  container.innerHTML = '';

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state">Aucune entreprise a afficher. Ajoute la premiere avec le bouton en haut.</div>';
    return;
  }

  const ul = document.createElement('ul');
  ul.className = 'entreprise-rows';
  filtered.forEach((entreprise) => {
    const li = document.createElement('li');
    li.className = 'entreprise-row';
    li.addEventListener('click', () => openDetail(entreprise.id));
    li.innerHTML = `
      <div class="entreprise-row-main">
        <span class="entreprise-row-nom">${escapeHtml(entreprise.nom)}</span>
        <span class="entreprise-row-equip">${escapeHtml(entreprise.equipement || '')}</span>
      </div>
      <div class="entreprise-row-side">
        <span class="badge ${badgeClass(entreprise.statut)}">${escapeHtml(entreprise.statut)}</span>
        <span class="entreprise-row-date">Dernier contact : ${fmtDate(entreprise.date_dernier_contact)}</span>
      </div>
    `;
    ul.appendChild(li);
  });
  container.appendChild(ul);
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// --- Modale creation/edition entreprise ---

function openEntrepriseModal(entreprise) {
  el('modal-entreprise-title').textContent = entreprise ? 'Modifier l\'entreprise' : 'Nouvelle entreprise';
  el('entreprise-id').value = entreprise ? entreprise.id : '';
  el('entreprise-nom').value = entreprise ? entreprise.nom : '';
  el('entreprise-equipement').value = entreprise ? (entreprise.equipement || '') : '';
  el('entreprise-telephone').value = entreprise ? (entreprise.telephone || '') : '';
  el('entreprise-email').value = entreprise ? (entreprise.email || '') : '';
  el('entreprise-statut').value = entreprise ? entreprise.statut : state.statutsEntreprise[0];
  el('entreprise-date-contact').value = entreprise ? (entreprise.date_dernier_contact || '') : '';
  el('entreprise-notes').value = entreprise ? (entreprise.notes || '') : '';
  el('modal-entreprise').classList.remove('hidden');
}

function closeModal(id) {
  el(id).classList.add('hidden');
}

el('btn-new-entreprise').addEventListener('click', () => openEntrepriseModal(null));

document.querySelectorAll('[data-close-modal]').forEach((btn) => {
  btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
});

el('form-entreprise').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = el('entreprise-id').value;
  const payload = {
    nom: el('entreprise-nom').value,
    equipement: el('entreprise-equipement').value,
    telephone: el('entreprise-telephone').value,
    email: el('entreprise-email').value,
    statut: el('entreprise-statut').value,
    date_dernier_contact: el('entreprise-date-contact').value,
    notes: el('entreprise-notes').value,
  };
  try {
    if (id) {
      await api(`/api/entreprises/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await api('/api/entreprises', { method: 'POST', body: JSON.stringify(payload) });
    }
    closeModal('modal-entreprise');
    await loadEntreprises();
    if (id && state.currentDetailId === Number(id)) await openDetail(Number(id));
  } catch (err) {
    alert(err.message);
  }
});

// --- Modale detail ---

async function openDetail(id) {
  const entreprise = await api(`/api/entreprises/${id}`);
  state.currentDetailId = id;
  el('detail-title').textContent = entreprise.nom;
  const meta = [entreprise.equipement, entreprise.telephone, entreprise.email].filter(Boolean).join(' &middot; ');
  el('detail-meta').innerHTML = `${meta ? meta + ' &middot; ' : ''}<span class="badge ${badgeClass(entreprise.statut)}">${escapeHtml(entreprise.statut)}</span> &middot; Dernier contact : ${fmtDate(entreprise.date_dernier_contact)}`;

  renderHistoryList(el('rdv-list'), entreprise.rdv, (r) => `${fmtDate(r.date_rdv)}${r.heure_rdv ? ' ' + r.heure_rdv : ''} - ${escapeHtml(r.statut)}${r.objet ? ' - ' + escapeHtml(r.objet) : ''}${r.commentaire ? ' - ' + escapeHtml(r.commentaire) : ''}`, 'rdv');

  el('rdv-date').value = '';
  el('rdv-heure').value = '';
  el('rdv-objet').value = '';
  el('rdv-commentaire').value = '';

  el('modal-detail').classList.remove('hidden');
}

function renderHistoryList(ul, items, formatter, kind) {
  ul.innerHTML = '';
  if (!items || items.length === 0) {
    ul.innerHTML = '<li class="history-item"><span class="txt">Aucun rendez-vous</span></li>';
    return;
  }
  items.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'history-item';
    li.innerHTML = `<span class="txt">${formatter(item)}</span><button data-id="${item.id}">Supprimer</button>`;
    li.querySelector('button').addEventListener('click', async () => {
      if (!confirm('Supprimer ce rendez-vous ?')) return;
      await api(`/api/${kind}/${item.id}`, { method: 'DELETE' });
      await openDetail(state.currentDetailId);
      await loadEntreprises();
    });
    ul.appendChild(li);
  });
}

el('btn-edit-entreprise').addEventListener('click', async () => {
  const entreprise = state.entreprises.find((e) => e.id === state.currentDetailId) || await api(`/api/entreprises/${state.currentDetailId}`);
  closeModal('modal-detail');
  openEntrepriseModal(entreprise);
});

el('btn-delete-entreprise').addEventListener('click', async () => {
  if (!confirm('Supprimer definitivement cette entreprise et tout son historique de RDV ?')) return;
  await api(`/api/entreprises/${state.currentDetailId}`, { method: 'DELETE' });
  closeModal('modal-detail');
  await loadEntreprises();
});

el('form-rdv').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api(`/api/entreprises/${state.currentDetailId}/rdv`, {
      method: 'POST',
      body: JSON.stringify({
        date_rdv: el('rdv-date').value,
        heure_rdv: el('rdv-heure').value,
        objet: el('rdv-objet').value,
        statut: el('rdv-statut').value,
        commentaire: el('rdv-commentaire').value,
      }),
    });
    await openDetail(state.currentDetailId);
    await loadEntreprises();
  } catch (err) {
    alert(err.message);
  }
});

el('search').addEventListener('input', renderList);
el('filter-statut').addEventListener('change', renderList);

(async function init() {
  await loadStatuts();
  await loadEntreprises();
})();
