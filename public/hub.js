async function chargerApps() {
  const grid = document.getElementById('apps-grid');
  try {
    const res = await fetch('apps.json');
    const apps = await res.json();
    if (!apps.length) {
      grid.innerHTML = '<p class="empty-state">Aucune application enregistree pour le moment.</p>';
      return;
    }
    grid.innerHTML = apps.map(app => `
      <a class="app-card" href="${app.url}">
        <span class="app-card-icon">${app.icone || '\u{1F4E6}'}</span>
        <span class="app-card-nom">${app.nom}</span>
        <span class="app-card-desc">${app.description || ''}</span>
      </a>
    `).join('');
  } catch (err) {
    grid.innerHTML = '<p class="empty-state">Impossible de charger la liste des applications.</p>';
  }
}

chargerApps();
