// reponseCahierDesCharges.js — v2.0.0
import { fetchTableRows }                from '../../lib/table.js';
import { initCombobox }                  from '../../lib/comboBox.js';
import { showFeedback, setLoadingState } from '../../lib/form.js';

// ─── Version ──────────────────────────────────────────────────────────────────
const VERSION = '2.0.0';
document.getElementById('version-badge').textContent = `v${VERSION}`;

// ─── Options par défaut ───────────────────────────────────────────────────────
const DEFAULT_OPTIONS = {
  title:                   'Réponse Cahier des Charges',
  color:                   '#3ddc84',
  tableCDC:                'CahierDesCharges',
  tableExigenceCDC:        'ExigenceCDC',
  tableReponse:            'Reponse',
  tableReponseExigenceCDC: 'ReponseExigenceCDC',
  tableOrganisation:       'Organisation',
  tableSoftware:           'Software',
};

let options = { ...DEFAULT_OPTIONS };

// ─── DOM ──────────────────────────────────────────────────────────────────────
const el = {
  loading:                    document.getElementById('loading'),
  widgetContainer:            document.getElementById('widget-container'),
  widgetTitle:                document.getElementById('widget-title'),
  feedback:                   document.getElementById('feedback'),
  configPanel:                document.getElementById('config-panel'),

  cdcSearch:                  document.getElementById('cdc-search'),
  cdcDropdown:                document.getElementById('cdc-dropdown'),
  cdcId:                      document.getElementById('cdc-id'),
  errCdc:                     document.getElementById('err-cdc'),

  orgSearch:                  document.getElementById('org-search'),
  orgDropdown:                document.getElementById('org-dropdown'),
  orgId:                      document.getElementById('org-id'),
  errOrg:                     document.getElementById('err-org'),

  swSearch:                   document.getElementById('sw-search'),
  swDropdown:                 document.getElementById('sw-dropdown'),
  swId:                       document.getElementById('sw-id'),
  errSw:                      document.getElementById('err-sw'),

  loadBtn:                    document.getElementById('load-btn'),
  exigencesSection:           document.getElementById('exigences-section'),
  exigencesTitle:             document.getElementById('exigences-title'),
  exigencesCount:             document.getElementById('exigences-count'),
  exigencesList:              document.getElementById('exigences-list'),
  submitBtn:                  document.getElementById('submit-btn'),
  resetBtn:                   document.getElementById('reset-btn'),

  cfgColor:                   document.getElementById('cfg-color'),
  cfgTableCDC:                document.getElementById('cfg-table-cdc'),
  cfgTableExigenceCDC:        document.getElementById('cfg-table-exigence-cdc'),
  cfgTableReponse:            document.getElementById('cfg-table-reponse'),
  cfgTableReponseExigenceCDC: document.getElementById('cfg-table-reponse-exigence'),
  cfgTableOrganisation:       document.getElementById('cfg-table-organisation'),
  cfgTableSoftware:           document.getElementById('cfg-table-software'),
};

// ─── Données en mémoire ───────────────────────────────────────────────────────
let allCDC                   = []; // { id, name }[]
let allOrganisations         = []; // { id, name }[]
let allSoftwares             = []; // { id, name }[]
let allExigencesCDC          = []; // rows bruts ExigenceCDC
let allReponses              = []; // rows bruts Reponse
let allReponseExigencesCDC   = []; // rows bruts ReponseExigenceCDC

// Exigences actuellement affichées dans le formulaire
let currentExigences = [];

// ─── Chargement de toutes les tables ─────────────────────────────────────────
async function loadAllData() {
  try {
    const [cdcRows, orgRows, swRows, exigRows, repRows, repExigRows] = await Promise.all([
      fetchTableRows(options.tableCDC),
      fetchTableRows(options.tableOrganisation),
      fetchTableRows(options.tableSoftware),
      fetchTableRows(options.tableExigenceCDC),
      fetchTableRows(options.tableReponse),
      fetchTableRows(options.tableReponseExigenceCDC),
    ]);

    allCDC                 = cdcRows.map(r => ({ id: r.id, name: r.Nom || `#${r.id}` }));
    allOrganisations       = orgRows.map(r => ({ id: r.id, name: r.Name || `#${r.id}` }));
    allSoftwares           = swRows.map(r  => ({ id: r.id, name: r.Name || `#${r.id}` }));
    allExigencesCDC        = exigRows;
    allReponses            = repRows;
    allReponseExigencesCDC = repExigRows;
  } catch (e) {
    console.error('[reponseCDC] Erreur chargement :', e);
    showFeedback(el.feedback, '❌ Erreur lors du chargement des données.', 'error');
  }
}

// ─── Comboboxes de sélection ──────────────────────────────────────────────────
initCombobox({
  searchInput: el.cdcSearch,
  hiddenInput: el.cdcId,
  dropdown:    el.cdcDropdown,
  errorEl:     el.errCdc,
  getItems:    () => allCDC,
  filterMode:  'includes',
});

initCombobox({
  searchInput: el.orgSearch,
  hiddenInput: el.orgId,
  dropdown:    el.orgDropdown,
  errorEl:     el.errOrg,
  getItems:    () => allOrganisations,
  filterMode:  'includes',
});

initCombobox({
  searchInput: el.swSearch,
  hiddenInput: el.swId,
  dropdown:    el.swDropdown,
  errorEl:     el.errSw,
  getItems:    () => allSoftwares,
  filterMode:  'includes',
});

// ─── Validation de la sélection (CDC + Org + Software) ───────────────────────
function validateSelection() {
  let valid = true;

  [
    { inputEl: el.cdcId, searchEl: el.cdcSearch, errEl: el.errCdc },
    { inputEl: el.orgId, searchEl: el.orgSearch, errEl: el.errOrg },
    { inputEl: el.swId,  searchEl: el.swSearch,  errEl: el.errSw  },
  ].forEach(({ inputEl, searchEl, errEl }) => {
    const empty = !inputEl.value;
    searchEl.classList.toggle('invalid', empty);
    errEl.classList.toggle('visible',    empty);
    if (empty) valid = false;
  });

  return valid;
}

// ─── Chargement et affichage des exigences ────────────────────────────────────
el.loadBtn.addEventListener('click', () => {
  if (!validateSelection()) return;

  const cdcId = parseInt(el.cdcId.value, 10);
  const orgId = parseInt(el.orgId.value, 10);
  const swId  = parseInt(el.swId.value,  10);

  // Toutes les exigences liées à ce CDC
  const exigencesDuCDC = allExigencesCDC.filter(r => Number(r.CDC) === Number(cdcId));

  const existing = allReponses.find(r =>
  Number(r.CDC)          === Number(cdcId) &&
  Number(r.Organisation) === Number(orgId) &&
  Number(r.Software)     === Number(swId)
  );

  if (!exigencesDuCDC.length) {
    el.exigencesSection.hidden = true;
    showFeedback(el.feedback, 'ℹ️ Aucune exigence liée à ce cahier des charges.', 'info');
    return;
  }

  // Reponse existante pour ce triplet (CDC, Organisation, Software)
  const reponse = allReponses.find(r =>
    r.CDC          === cdcId &&
    r.Organisation === orgId &&
    r.Software     === swId
  ) ?? null;

  // IDs des ExigenceCDC déjà répondus pour cette Reponse
  const dejaPondus = reponse
    ? new Set(
        allReponseExigencesCDC
          .filter(r => r.Reponse === reponse.id && r.Exigence > 0)
          .map(r => r.Exigence)
      )
    : new Set();

  currentExigences = exigencesDuCDC.filter(e => !dejaPondus.has(e.Exigence));

  if (!currentExigences.length) {
    el.exigencesSection.hidden = true;
    showFeedback(
      el.feedback,
      `✅ Toutes les exigences (${exigencesDuCDC.length}/${exigencesDuCDC.length}) ont déjà été répondues pour cette organisation et ce software.`,
      'info'
    );
    return;
  }

  const cdc             = allCDC.find(c => c.id === cdcId);
  const already         = dejaPondus.size;
  const total           = exigencesDuCDC.length;

  el.exigencesTitle.textContent = cdc?.name ?? 'Exigences';
  el.exigencesCount.textContent =
    already > 0
      ? `${currentExigences.length} restante${currentExigences.length > 1 ? 's' : ''} sur ${total}`
      : `${total} exigence${total > 1 ? 's' : ''}`;

  renderExigences(currentExigences);
  el.exigencesSection.hidden = false;
  el.feedback.hidden         = true;
});

// ─── Rendu des cartes exigences ───────────────────────────────────────────────
function renderExigences(exigences) {
  el.exigencesList.innerHTML = '';

  exigences.forEach((exigence, index) => {
    const id   = exigence.id;
    const card = document.createElement('div');
    card.className             = 'exigence-card';
    card.dataset.exigenceCdcId = id;

    card.innerHTML = `
      <div class="card-header">
        <span class="card-index">#${index + 1}</span>
        <span class="card-title">${exigence.FullName || `Exigence #${id}`}</span>
      </div>
      <div class="card-body">

        <div class="field">
          <label for="note-${id}">Note <span class="required">*</span></label>
          <div class="note-wrapper">
            <input type="number" id="note-${id}" class="note-input"
                   min="0" max="100" placeholder="—" />
            <span class="note-unit">/100</span>
          </div>
          <span class="error-msg" id="err-note-${id}">Note requise (0 à 100).</span>
        </div>

        <div class="field">
          <label for="commentaire-${id}">Commentaire</label>
          <textarea id="commentaire-${id}" placeholder="Justification, détails…"></textarea>
        </div>

      </div>
    `;

    el.exigencesList.appendChild(card);
  });
}

// ─── Validation des notes ─────────────────────────────────────────────────────
function validateNotes() {
  let valid = true;

  currentExigences.forEach(({ id }) => {
    const noteEl    = document.getElementById(`note-${id}`);
    const errEl     = document.getElementById(`err-note-${id}`);
    const num       = parseFloat(noteEl.value);
    const isInvalid = noteEl.value === '' || isNaN(num) || num < 0 || num > 100;

    noteEl.classList.toggle('invalid', isInvalid);
    errEl.classList.toggle('visible',  isInvalid);
    if (isInvalid) valid = false;
  });

  return valid;
}

// ─── Réinitialisation des champs ──────────────────────────────────────────────
el.resetBtn.addEventListener('click', () => {
  currentExigences.forEach(({ id }) => {
    document.getElementById(`note-${id}`).value        = '';
    document.getElementById(`commentaire-${id}`).value = '';
    document.getElementById(`note-${id}`).classList.remove('invalid');
    document.getElementById(`err-note-${id}`).classList.remove('visible');
  });
});

// ─── Soumission ───────────────────────────────────────────────────────────────
el.submitBtn.addEventListener('click', async () => {
  if (!validateSelection()) return;
  if (!validateNotes())     return;

  el.submitBtn.disabled = true;

  const cdcId = parseInt(el.cdcId.value, 10);
  const orgId = parseInt(el.orgId.value, 10);
  const swId  = parseInt(el.swId.value,  10);

  try {
    // ── 1. Trouver ou créer la Reponse ────────────────────────────────────────
    let reponseId;
    const existing = allReponses.find(r =>
      r.CDC          === cdcId &&
      r.Organisation === orgId &&
      r.Software     === swId
    );

    if (existing) {
      reponseId = existing.id;
    } else {
      const result = await grist.docApi.applyUserActions([
        ['AddRecord', options.tableReponse, null, {
          CDC:          cdcId,
          Organisation: orgId,
          Software:     swId,
        }],
      ]);
      reponseId = result.retValues[0];
      // Mise à jour du cache local
      allReponses.push({ id: reponseId, CDC: cdcId, Organisation: orgId, Software: swId });
    }

    // ── 2. Créer les ReponseExigenceCDC ───────────────────────────────────────
    const actions = currentExigences.map((exigence) => {
      const domId      = exigence.id;        // ID ExigenceCDC → clé des éléments DOM
      const exigenceId = exigence.Exigence;  // ID Exigence (base) → valeur à stocker

      const note        = parseFloat(document.getElementById(`note-${domId}`).value);
      const commentaire = document.getElementById(`commentaire-${domId}`).value.trim();

      const fields = {
        CDC:      cdcId,
        Reponse:  reponseId,
        Exigence: exigenceId,   // ← corrigé
        Note:     note,
      };
      if (commentaire) fields.Commentaire = commentaire;

      return ['AddRecord', options.tableReponseExigenceCDC, null, fields];
    });

    await grist.docApi.applyUserActions(actions);

    const n = actions.length;
    showFeedback(
      el.feedback,
      `✅ ${n} réponse${n > 1 ? 's' : ''} enregistrée${n > 1 ? 's' : ''} avec succès !`,
      'success'
    );

    // Rafraîchit le cache et masque le formulaire
    allReponseExigencesCDC = await fetchTableRows(options.tableReponseExigenceCDC);
    el.exigencesSection.hidden = true;
    currentExigences           = [];

  } catch (err) {
    console.error('[reponseCDC] Erreur soumission :', err);
    showFeedback(el.feedback, `❌ Erreur : ${err.message ?? "Impossible d'enregistrer."}`, 'error');
  } finally {
    el.submitBtn.disabled = false;
  }
});

// ─── Options Grist ────────────────────────────────────────────────────────────
function applyOptions(opts) {
  options = { ...DEFAULT_OPTIONS, ...opts };
  el.widgetTitle.textContent          = options.title;
  document.documentElement.style.setProperty('--accent', options.color);
  el.cfgColor.value                   = options.color;
  el.cfgTableCDC.value                = options.tableCDC;
  el.cfgTableExigenceCDC.value        = options.tableExigenceCDC;
  el.cfgTableReponse.value            = options.tableReponse;
  el.cfgTableReponseExigenceCDC.value = options.tableReponseExigenceCDC;
  el.cfgTableOrganisation.value       = options.tableOrganisation;
  el.cfgTableSoftware.value           = options.tableSoftware;
}

document.getElementById('cfg-save').addEventListener('click', async () => {
  options.color                   = el.cfgColor.value                             || DEFAULT_OPTIONS.color;
  options.tableCDC                = el.cfgTableCDC.value.trim()                   || DEFAULT_OPTIONS.tableCDC;
  options.tableExigenceCDC        = el.cfgTableExigenceCDC.value.trim()           || DEFAULT_OPTIONS.tableExigenceCDC;
  options.tableReponse            = el.cfgTableReponse.value.trim()               || DEFAULT_OPTIONS.tableReponse;
  options.tableReponseExigenceCDC = el.cfgTableReponseExigenceCDC.value.trim()    || DEFAULT_OPTIONS.tableReponseExigenceCDC;
  options.tableOrganisation       = el.cfgTableOrganisation.value.trim()          || DEFAULT_OPTIONS.tableOrganisation;
  options.tableSoftware           = el.cfgTableSoftware.value.trim()              || DEFAULT_OPTIONS.tableSoftware;

  await grist.setOptions(options);
  applyOptions(options);
  el.configPanel.classList.remove('open');
  await loadAllData();
});

// ─── Init Grist ───────────────────────────────────────────────────────────────
grist.ready({
  requiredAccess: 'full',
  onEditOptions() {
    applyOptions(options);
    el.configPanel.classList.add('open');
  },
});

grist.onOptions(async (opts) => {
  applyOptions(opts ?? {});
  setLoadingState(el.loading, el.widgetContainer, 'loading');
  await loadAllData();
  setLoadingState(el.loading, el.widgetContainer, 'ready');
});