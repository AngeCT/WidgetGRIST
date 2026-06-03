// creationCahierDesCharges.js — v1.2.0
import { fetchTableRows }                        from '../../lib/table.js';
import { initCombobox }                          from '../../lib/comboBox.js';
import { showFeedback, setLoadingState }         from '../../lib/form.js';
import { escapeHtml }                            from '../../lib/html.js';
import { addRecord, updateRecord, applyActions } from '../../lib/gristActions.js';
import { indexBy }                               from '../../lib/utils.js';

const VERSION = '1.2.0';
document.getElementById('version-badge').textContent = `v${VERSION}`;

const DEFAULT_OPTIONS = {
  title:            'Création Cahier des Charges',
  color:            '#3ddc84',
  tableCDC:         'CahierDesCharges',
  tableExigenceCDC: 'ExigenceCDC',
  tableExigence:    'Exigence',
};

let options = { ...DEFAULT_OPTIONS };

// ─── DOM ─────────────────────────────────────────────────────────────────────
const el = {
  loading:             document.getElementById('loading'),
  widgetContainer:     document.getElementById('widget-container'),
  widgetTitle:         document.getElementById('widget-title'),
  feedback:            document.getElementById('feedback'),
  configPanel:         document.getElementById('config-panel'),

  btnModeExisting:     document.getElementById('btn-mode-existing'),
  btnModeNew:          document.getElementById('btn-mode-new'),

  // Champ unique adaptatif
  fieldLabel:          document.getElementById('field-label'),
  cdcInput:            document.getElementById('cdc-input'),
  cdcDropdown:         document.getElementById('cdc-dropdown'),
  cdcId:               document.getElementById('cdc-id'),
  errCdc:              document.getElementById('err-cdc'),

  actionBtn:           document.getElementById('action-btn'),

  cdcSection:          document.getElementById('cdc-section'),
  cdcNameEdit:         document.getElementById('cdc-name-edit'),
  dirtyBadge:          document.getElementById('dirty-badge'),

  exigencesCount:      document.getElementById('exigences-count'),
  exigencesList:       document.getElementById('exigences-list'),
  emptyState:          document.getElementById('empty-state'),

  addExigenceSearch:   document.getElementById('add-exigence-search'),
  addExigenceDropdown: document.getElementById('add-exigence-dropdown'),
  addExigenceId:       document.getElementById('add-exigence-id'),
  addExigenceBtn:      document.getElementById('add-exigence-btn'),

  resetBtn:            document.getElementById('reset-btn'),
  saveBtn:             document.getElementById('save-btn'),

  cfgColor:            document.getElementById('cfg-color'),
  cfgTableCDC:         document.getElementById('cfg-table-cdc'),
  cfgTableExigenceCDC: document.getElementById('cfg-table-exigence-cdc'),
  cfgTableExigence:    document.getElementById('cfg-table-exigence'),
};

// ─── Données ─────────────────────────────────────────────────────────────────
let allCDC          = [];
let allExigences    = [];
let allExigencesCDC = [];
let exigenceMap     = new Map();

/** @type {'existing'|'new'} */
let currentMode       = 'existing';
let currentCDCId      = null;

/** @type {{ exigenceId: number, exigenceCDCId: number|null, nom: string }[]} */
let workingExigences  = [];
let originalExigences = [];

// ─── Chargement ──────────────────────────────────────────────────────────────
async function loadAllData() {
  try {
    const [cdcRows, exigRows, exigCDCRows] = await Promise.all([
      fetchTableRows(options.tableCDC),
      fetchTableRows(options.tableExigence),
      fetchTableRows(options.tableExigenceCDC),
    ]);
    allCDC          = cdcRows.map(r => ({ id: r.id, name: r.Nom || `#${r.id}` }));
    allExigences    = exigRows;
    allExigencesCDC = exigCDCRows;
    exigenceMap     = indexBy(allExigences, e => e.id);
  } catch (e) {
    console.error('[creationCahierDesCharges] Erreur chargement :', e);
    showFeedback(el.feedback, '❌ Erreur lors du chargement des données.', 'error');
  }
}

// ─── Chemin hiérarchique ─────────────────────────────────────────────────────
/**
 * Construit le chemin complet d'une exigence depuis la racine.
 * Ex. "Sécurité › Authentification › MFA"
 * @param {number} exigenceId
 * @returns {string}
 */
function buildExigencePath(exigenceId) {
  const parts = [];
  let current = exigenceMap.get(exigenceId);
  let safety  = 0;
  while (current && safety < 6) {
    parts.unshift(current.Nom || `#${current.id}`);
    const parentId = current.Parent ? Number(current.Parent) : null;
    current = parentId ? exigenceMap.get(parentId) : null;
    safety++;
  }
  return parts.join(' › ') || `#${exigenceId}`;
}

// ─── Combobox CDC ────────────────────────────────────────────────────────────
// Initialisée une seule fois sur le champ unique.
// En mode "new", un listener supplémentaire masque le dropdown après chaque frappe.
initCombobox({
  searchInput: el.cdcInput,
  hiddenInput: el.cdcId,
  dropdown:    el.cdcDropdown,
  errorEl:     el.errCdc,
  getItems:    () => allCDC,
  filterMode:  'includes',
});

// Désactivation du dropdown en mode "nouveau" : notre listener s'exécute après
// celui de la combobox et referme systématiquement le dropdown.
el.cdcInput.addEventListener('input', () => {
  if (currentMode === 'new') el.cdcDropdown.hidden = true;
});

// ─── Combobox ajout d'exigences ──────────────────────────────────────────────
initCombobox({
  searchInput: el.addExigenceSearch,
  hiddenInput: el.addExigenceId,
  dropdown:    el.addExigenceDropdown,
  getItems: () => {
    const addedIds = new Set(workingExigences.map(w => w.exigenceId));
    return allExigences
      .filter(e => !addedIds.has(e.id))
      .map(e => ({ id: e.id, name: buildExigencePath(e.id) }));
  },
  filterMode: 'includes',
});

// ─── Segmented control ───────────────────────────────────────────────────────
el.btnModeExisting.addEventListener('click', () => switchMode('existing'));
el.btnModeNew.addEventListener('click',      () => switchMode('new'));

/**
 * Bascule entre les deux modes.
 * Adapte le label, le placeholder, le message d'erreur et le libellé du bouton.
 * Réinitialise la section édition.
 * @param {'existing'|'new'} mode
 */
function switchMode(mode) {
  currentMode = mode;

  // Segmented control
  el.btnModeExisting.classList.toggle('active', mode === 'existing');
  el.btnModeNew.classList.toggle('active',      mode === 'new');

  // Champ adaptatif : label, placeholder, message d'erreur
  if (mode === 'existing') {
    el.fieldLabel.innerHTML      = 'Cahier des Charges <span class="required">*</span>';
    el.cdcInput.placeholder      = 'Rechercher un CDC…';
    el.errCdc.textContent        = 'Veuillez sélectionner un cahier des charges.';
  } else {
    el.fieldLabel.innerHTML      = 'Nom du nouveau CDC <span class="required">*</span>';
    el.cdcInput.placeholder      = 'Saisir le nom du nouveau CDC…';
    el.errCdc.textContent        = 'Veuillez saisir un nom.';
    el.cdcDropdown.hidden        = true; // fermeture préventive du dropdown
  }

  // Libellé du bouton
  el.actionBtn.textContent = mode === 'existing' ? '📂 Charger' : '➕ Initialiser';

  resetCDCSection();
}

function resetCDCSection() {
  currentCDCId         = null;
  workingExigences     = [];
  originalExigences    = [];
  el.cdcSection.hidden = true;
  el.cdcNameEdit.value = '';
  el.cdcInput.value    = '';
  el.cdcId.value       = '';
  el.cdcDropdown.hidden = true;
  setDirty(false);
}

// ─── Bouton d'action unique ───────────────────────────────────────────────────
el.actionBtn.addEventListener('click', () => {
  if (currentMode === 'existing') handleLoadExisting();
  else                            handleInitNew();
});

function handleLoadExisting() {
  const hasValue = !!el.cdcId.value;
  el.cdcInput.classList.toggle('invalid', !hasValue);
  el.errCdc.classList.toggle('visible',   !hasValue);
  if (!hasValue) return;

  const id  = parseInt(el.cdcId.value, 10);
  const cdc = allCDC.find(c => c.id === id);
  if (!cdc) return;

  currentCDCId = id;
  loadCDCExigences(id, cdc.name);
}

function handleInitNew() {
  const nom = el.cdcInput.value.trim();
  el.cdcInput.classList.toggle('invalid', !nom);
  el.errCdc.classList.toggle('visible',   !nom);
  if (!nom) return;

  el.cdcInput.classList.remove('invalid');
  currentCDCId         = null;
  workingExigences     = [];
  originalExigences    = [];
  el.cdcNameEdit.value = nom;
  renderExigencesList();
  el.cdcSection.hidden = false;
  setDirty(false);
}

// ─── Chargement des exigences depuis la DB ───────────────────────────────────
function loadCDCExigences(cdcId, cdcNom) {
  const cdcExigCDC = allExigencesCDC.filter(r => Number(r.CDC) === cdcId);
  const exigences  = cdcExigCDC.map(r => ({
    exigenceId:    Number(r.Exigence),
    exigenceCDCId: r.id,
    nom:           r.FullName || buildExigencePath(Number(r.Exigence)),
  }));
  workingExigences     = exigences;
  originalExigences    = exigences.map(e => ({ ...e }));
  el.cdcNameEdit.value = cdcNom;
  renderExigencesList();
  el.cdcSection.hidden = false;
  setDirty(false);
}

// ─── Rendu ───────────────────────────────────────────────────────────────────
function renderExigencesList() {
  el.exigencesList.innerHTML = '';
  el.emptyState.hidden = workingExigences.length > 0;

  workingExigences.forEach((exigence, index) => {
    const row = document.createElement('div');
    row.className = 'exigence-row';
    row.innerHTML = `
      <span class="exigence-index">#${index + 1}</span>
      <span class="exigence-nom">${escapeHtml(exigence.nom)}</span>
      <button type="button" class="btn-remove-exigence" title="Retirer du CDC">🗑️</button>
    `;
    row.querySelector('.btn-remove-exigence').addEventListener('click', () => {
      workingExigences.splice(index, 1);
      renderExigencesList();
      checkDirty();
    });
    el.exigencesList.appendChild(row);
  });

  updateCountBadge();
}

function updateCountBadge() {
  const n = workingExigences.length;
  el.exigencesCount.textContent = `${n} exigence${n > 1 ? 's' : ''}`;
}

// ─── Ajout exigence ───────────────────────────────────────────────────────────
el.addExigenceBtn.addEventListener('click', () => {
  const id = parseInt(el.addExigenceId.value, 10);
  el.addExigenceSearch.classList.toggle('invalid', !id);
  if (!id) return;
  el.addExigenceSearch.classList.remove('invalid');
  if (workingExigences.find(w => w.exigenceId === id)) return;
  workingExigences.push({ exigenceId: id, exigenceCDCId: null, nom: buildExigencePath(id) });
  el.addExigenceSearch.value = '';
  el.addExigenceId.value     = '';
  renderExigencesList();
  checkDirty();
});

// ─── Badge dirty ─────────────────────────────────────────────────────────────
el.cdcNameEdit.addEventListener('input', checkDirty);

function checkDirty() { setDirty(computeIsDirty()); }

function computeIsDirty() {
  if (currentCDCId === null) return true;
  const originalNom = allCDC.find(c => c.id === currentCDCId)?.name ?? '';
  if (el.cdcNameEdit.value.trim() !== originalNom) return true;
  const origIds = new Set(originalExigences.map(e => e.exigenceId));
  const workIds = new Set(workingExigences.map(e => e.exigenceId));
  if (origIds.size !== workIds.size) return true;
  for (const id of origIds) if (!workIds.has(id)) return true;
  return false;
}

function setDirty(dirty) { el.dirtyBadge.hidden = !dirty; }

// ─── Annuler ─────────────────────────────────────────────────────────────────
el.resetBtn.addEventListener('click', () => {
  if (currentCDCId === null) {
    el.cdcSection.hidden = true;
    el.cdcInput.value    = '';
    workingExigences     = [];
    originalExigences    = [];
    setDirty(false);
  } else {
    workingExigences     = originalExigences.map(e => ({ ...e }));
    el.cdcNameEdit.value = allCDC.find(c => c.id === currentCDCId)?.name ?? '';
    renderExigencesList();
    setDirty(false);
  }
});

// ─── Sauvegarder ─────────────────────────────────────────────────────────────
el.saveBtn.addEventListener('click', async () => {
  const nom = el.cdcNameEdit.value.trim();
  el.cdcNameEdit.classList.toggle('invalid', !nom);
  if (!nom) return;
  el.cdcNameEdit.classList.remove('invalid');

  el.saveBtn.disabled = true;
  const wasNew = currentCDCId === null;

  try {
    // 1. Créer ou renommer le CDC
    if (wasNew) {
      currentCDCId = await addRecord(options.tableCDC, { Nom: nom });
    } else {
      const originalNom = allCDC.find(c => c.id === currentCDCId)?.name ?? '';
      if (nom !== originalNom) {
        await updateRecord(options.tableCDC, currentCDCId, { Nom: nom });
        const cdcInList = allCDC.find(c => c.id === currentCDCId);
        if (cdcInList) cdcInList.name = nom;
      }
    }

    // 2. Diff exigences
    const origIds  = new Set(originalExigences.map(e => e.exigenceId));
    const workIds  = new Set(workingExigences.map(e => e.exigenceId));
    const toRemove = originalExigences.filter(o => !workIds.has(o.exigenceId));
    const toAdd    = workingExigences.filter(w => !origIds.has(w.exigenceId));
    const actions  = [
      ...toRemove.map(e => ['RemoveRecord', options.tableExigenceCDC, e.exigenceCDCId]),
      ...toAdd.map(e    => ['AddRecord',    options.tableExigenceCDC, null, { CDC: currentCDCId, Exigence: e.exigenceId }]),
    ];
    if (actions.length) await applyActions(actions);

    // 3. Re-fetch
    allExigencesCDC   = await fetchTableRows(options.tableExigenceCDC);
    originalExigences = allExigencesCDC
      .filter(r => Number(r.CDC) === currentCDCId)
      .map(r => ({
        exigenceId:    Number(r.Exigence),
        exigenceCDCId: r.id,
        nom:           r.FullName || buildExigencePath(Number(r.Exigence)),
      }));
    workingExigences = originalExigences.map(e => ({ ...e }));
    renderExigencesList();
    setDirty(false);

    // 4. Après création : basculer en mode existant et pré-sélectionner
    if (wasNew) {
      allCDC.push({ id: currentCDCId, name: nom });
      switchMode('existing');
      el.cdcInput.value    = nom;
      el.cdcId.value       = String(currentCDCId);
      el.cdcSection.hidden = false;
    }

    const nAdded   = toAdd.length;
    const nRemoved = toRemove.length;
    const summary  = [
      nAdded   > 0 ? `${nAdded} ajout${nAdded > 1 ? 's' : ''}`           : '',
      nRemoved > 0 ? `${nRemoved} suppression${nRemoved > 1 ? 's' : ''}` : '',
    ].filter(Boolean).join(', ') || 'aucune modification des exigences';
    showFeedback(el.feedback, `✅ CDC "${nom}" enregistré — ${summary}.`, 'success');

  } catch (err) {
    console.error('[creationCahierDesCharges] Erreur sauvegarde :', err);
    showFeedback(el.feedback, `❌ Erreur : ${err.message}`, 'error');
  } finally {
    el.saveBtn.disabled = false;
  }
});

// ─── Options Grist ───────────────────────────────────────────────────────────
function applyOptions(opts) {
  options = { ...DEFAULT_OPTIONS, ...opts };
  el.widgetTitle.textContent = options.title;
  document.documentElement.style.setProperty('--accent', options.color);
  el.cfgColor.value            = options.color;
  el.cfgTableCDC.value         = options.tableCDC;
  el.cfgTableExigenceCDC.value = options.tableExigenceCDC;
  el.cfgTableExigence.value    = options.tableExigence;
}

document.getElementById('cfg-save').addEventListener('click', async () => {
  options.color            = el.cfgColor.value                   || DEFAULT_OPTIONS.color;
  options.tableCDC         = el.cfgTableCDC.value.trim()         || DEFAULT_OPTIONS.tableCDC;
  options.tableExigenceCDC = el.cfgTableExigenceCDC.value.trim() || DEFAULT_OPTIONS.tableExigenceCDC;
  options.tableExigence    = el.cfgTableExigence.value.trim()    || DEFAULT_OPTIONS.tableExigence;
  await grist.setOptions(options);
  applyOptions(options);
  el.configPanel.classList.remove('open');
  await loadAllData();
});

grist.ready({
  requiredAccess: 'full',
  onEditOptions() { applyOptions(options); el.configPanel.classList.add('open'); },
});
grist.onOptions(async (opts) => {
  applyOptions(opts ?? {});
  setLoadingState(el.loading, el.widgetContainer, 'loading');
  await loadAllData();
  setLoadingState(el.loading, el.widgetContainer, 'ready');
});