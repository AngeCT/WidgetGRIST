// reponseBilanSoft.js — v5.0.0
import { fetchTableRows }                                                             from '../../lib/table.js';
import { initCombobox }                                                               from '../../lib/comboBox.js';
import { showFeedback, setLoadingState, validateForm }                                from '../../lib/form.js';
import { escapeHtml }                                                                 from '../../lib/html.js';
import { nextMajorVersion, populateVersionSelect }                                    from '../../lib/version.js';
import { addRecord, updateRecord, applyActions }                                      from '../../lib/gristActions.js';
import { renderRadioGroupHTML, getRadioValue, validateRadioGroups, resetRadioGroup }  from '../../lib/radioGroup.js';
import { indexBy }                                                                    from '../../lib/utils.js';

// ─── Version ─────────────────────────────────────────────────────────────────
const VERSION = '5.0.0';
document.getElementById('version-badge').textContent = `v${VERSION}`;

// ─── Options par défaut ──────────────────────────────────────────────────────
const DEFAULT_OPTIONS = {
  title:                 'Réponse Bilan Soft',
  color:                 '#3ddc84',
  tableCDC:              'CahierDesCharges',
  tableExigenceCDC:      'ExigenceCDC',
  tableExigence:         'Exigence',
  tableBilanSoft:        'BilanSoft',
  tableReponseBilanSoft: 'ReponseBilanSoft',
  tableOrganisation:     'Organisation',
  tableSoftware:         'Software',
};

let options = { ...DEFAULT_OPTIONS };

// ─── DOM ─────────────────────────────────────────────────────────────────────
const el = {
  loading:                   document.getElementById('loading'),
  widgetContainer:           document.getElementById('widget-container'),
  widgetTitle:               document.getElementById('widget-title'),
  feedback:                  document.getElementById('feedback'),
  configPanel:               document.getElementById('config-panel'),

  cdcSearch:                 document.getElementById('cdc-search'),
  cdcDropdown:               document.getElementById('cdc-dropdown'),
  cdcId:                     document.getElementById('cdc-id'),
  errCdc:                    document.getElementById('err-cdc'),

  orgSearch:                 document.getElementById('org-search'),
  orgDropdown:               document.getElementById('org-dropdown'),
  orgId:                     document.getElementById('org-id'),
  errOrg:                    document.getElementById('err-org'),

  swSearch:                  document.getElementById('sw-search'),
  swDropdown:                document.getElementById('sw-dropdown'),
  swId:                      document.getElementById('sw-id'),
  errSw:                     document.getElementById('err-sw'),

  loadBtn:                   document.getElementById('load-btn'),
  bilanInfo:                 document.getElementById('bilan-info'),
  bilanVersionSelect:        document.getElementById('bilan-version-select'),
  newVersionBtn:             document.getElementById('new-version-btn'),
  bilanIsValid:              document.getElementById('bilan-isvalid'),
  validateBtn:               document.getElementById('validate-btn'),
  lockedBanner:              document.getElementById('locked-banner'),

  exigencesSection:          document.getElementById('exigences-section'),
  exigencesTitle:            document.getElementById('exigences-title'),
  exigencesCount:            document.getElementById('exigences-count'),
  exigencesList:             document.getElementById('exigences-list'),
  formActions:               document.getElementById('form-actions'),
  submitBtn:                 document.getElementById('submit-btn'),
  resetBtn:                  document.getElementById('reset-btn'),

  cfgColor:                  document.getElementById('cfg-color'),
  cfgTableCDC:               document.getElementById('cfg-table-cdc'),
  cfgTableExigenceCDC:       document.getElementById('cfg-table-exigence-cdc'),
  cfgTableExigence:          document.getElementById('cfg-table-exigence'),
  cfgTableBilanSoft:         document.getElementById('cfg-table-bilan-soft'),
  cfgTableReponseBilanSoft:  document.getElementById('cfg-table-reponse-bilan-soft'),
  cfgTableOrganisation:      document.getElementById('cfg-table-organisation'),
  cfgTableSoftware:          document.getElementById('cfg-table-software'),
};

// ─── Données en mémoire ──────────────────────────────────────────────────────
let allCDC              = [];
let allOrganisations    = [];
let allSoftwares        = [];
let allExigencesCDC     = [];
let allExigences        = [];
let allBilanSoft        = [];
let allReponseBilanSoft = [];

let currentTripletBilans = [];
let currentBilanSoftId   = null;
let existingReponsesMap  = new Map(); // exigenceId → { id, Etat, Commentaire }
let currentExigences     = [];        // { exigenceCDCId, exigenceId, nom }[]

const ETATS = [
  { value: 'Fait',    label: '✅ Fait'    },
  { value: 'PasFait', label: '❌ Pas fait' },
  { value: 'Partiel', label: '⚠️ Partiel' },
];

// ─── Chargement de toutes les tables ────────────────────────────────────────
async function loadAllData() {
  try {
    const [cdcRows, orgRows, swRows, exigCDCRows, exigRows, bilanRows, repBilanRows] =
      await Promise.all([
        fetchTableRows(options.tableCDC),
        fetchTableRows(options.tableOrganisation),
        fetchTableRows(options.tableSoftware),
        fetchTableRows(options.tableExigenceCDC),
        fetchTableRows(options.tableExigence),
        fetchTableRows(options.tableBilanSoft),
        fetchTableRows(options.tableReponseBilanSoft),
      ]);

    allCDC              = cdcRows.map(r => ({ id: r.id, name: r.Nom  || `#${r.id}` }));
    allOrganisations    = orgRows.map(r => ({ id: r.id, name: r.Nom  || r.Name || `#${r.id}` }));
    allSoftwares        = swRows.map(r  => ({ id: r.id, name: r.Nom  || r.Name || `#${r.id}` }));
    allExigencesCDC     = exigCDCRows;
    allExigences        = exigRows;
    allBilanSoft        = bilanRows;
    allReponseBilanSoft = repBilanRows;
  } catch (e) {
    console.error('[reponseBilanSoft] Erreur chargement :', e);
    showFeedback(el.feedback, '❌ Erreur lors du chargement des données.', 'error');
  }
}

// ─── Comboboxes ──────────────────────────────────────────────────────────────
initCombobox({ searchInput: el.cdcSearch, hiddenInput: el.cdcId, dropdown: el.cdcDropdown, errorEl: el.errCdc, getItems: () => allCDC,           filterMode: 'includes' });
initCombobox({ searchInput: el.orgSearch, hiddenInput: el.orgId, dropdown: el.orgDropdown, errorEl: el.errOrg, getItems: () => allOrganisations, filterMode: 'includes' });
initCombobox({ searchInput: el.swSearch,  hiddenInput: el.swId,  dropdown: el.swDropdown,  errorEl: el.errSw,  getItems: () => allSoftwares,      filterMode: 'includes' });

// ─── Validation sélection ────────────────────────────────────────────────────
function validateSelection() {
  return validateForm([
    { fieldId: 'cdc-id', errId: 'err-cdc', visualId: 'cdc-search' },
    { fieldId: 'org-id', errId: 'err-org', visualId: 'org-search' },
    { fieldId: 'sw-id',  errId: 'err-sw',  visualId: 'sw-search'  },
  ]);
}

// ─── Helpers locaux ───────────────────────────────────────────────────────────

function isCurrentBilanLocked() {
  return !!(currentTripletBilans.find(b => b.id === currentBilanSoftId)?.IsValid);
}

/** Reconstruit le cache des réponses existantes pour le BilanSoft courant. */
function refreshReponsesMap() {
  existingReponsesMap = indexBy(
    allReponseBilanSoft.filter(r => Number(r.BilanSoft) === currentBilanSoftId),
    r => Number(r.Exigence),
    r => ({ id: r.id, Etat: r.Etat ?? '', Commentaire: r.Commentaire ?? '' })
  );
}

/** Met à jour le bandeau BilanSoft (badge, bouton toggle, bannière, actions). */
function updateIsValidDisplay(bilan) {
  const isValid = !!(bilan?.IsValid);

  el.bilanIsValid.textContent = isValid ? '✅ Validé' : '❌ Non validé';
  el.bilanIsValid.className   = `bilan-info-value ${isValid ? 'valid' : 'not-valid'}`;

  el.validateBtn.textContent = isValid ? '🔓 Dévalider cette version' : '🔒 Valider cette version';
  el.validateBtn.classList.toggle('btn-devalidate', isValid);

  el.lockedBanner.hidden  = !isValid;
  el.formActions.hidden   = isValid;
  el.newVersionBtn.disabled = false;
}

/** Met à jour le badge de progression (X/Y répondues). */
function updateCountBadge() {
  const total    = currentExigences.length;
  const answered = existingReponsesMap.size;
  el.exigencesCount.textContent = answered > 0
    ? `${answered}/${total} répondue${answered > 1 ? 's' : ''}`
    : `${total} exigence${total > 1 ? 's' : ''}`;
}

// ─── Rendu des exigences ─────────────────────────────────────────────────────
function renderExigences(exigences, isLocked = false) {
  el.exigencesList.innerHTML = '';

  exigences.forEach((exigence, index) => {
    const { exigenceId, nom } = exigence;
    const existing = existingReponsesMap.get(exigenceId);

    const card = document.createElement('div');
    card.className = ['exigence-card', existing ? 'pre-filled' : '', isLocked ? 'locked' : '']
      .filter(Boolean).join(' ');
    card.dataset.exigenceId = exigenceId;

    card.innerHTML = `
      <div class="card-header">
        <span class="card-index">#${index + 1}</span>
        <span class="card-title">${escapeHtml(nom)}</span>
        ${existing ? '<span class="card-answered-badge">✓ Répondu</span>' : ''}
        ${isLocked ? '<span class="card-locked-badge">🔒</span>'          : ''}
      </div>
      <div class="card-body">
        <div class="field">
          <label>État${isLocked ? '' : ' <span class="required">*</span>'}</label>
          <div class="radio-group" id="etat-group-${exigenceId}">
            ${renderRadioGroupHTML(`etat-${exigenceId}`, ETATS, existing?.Etat ?? '', isLocked)}
          </div>
          <span class="error-msg" id="err-etat-${exigenceId}">Veuillez sélectionner un état.</span>
        </div>
        <div class="field">
          <label for="commentaire-${exigenceId}">Commentaire</label>
          <textarea id="commentaire-${exigenceId}"
                    placeholder="${isLocked ? '—' : 'Justification, détails…'}"
                    ${isLocked ? 'readonly' : ''}>${escapeHtml(existing?.Commentaire ?? '')}</textarea>
        </div>
      </div>`;

    el.exigencesList.appendChild(card);
  });
}

/** Charge et affiche toutes les exigences du CDC pour le BilanSoft courant. */
function loadExigencesForCurrentBilan() {
  const cdcId             = parseInt(el.cdcId.value, 10);
  const exigencesCDCDuCDC = allExigencesCDC.filter(r => Number(r.CDC) === cdcId);

  if (!exigencesCDCDuCDC.length) {
    el.exigencesSection.hidden = true;
    showFeedback(el.feedback, 'ℹ️ Aucune exigence liée à ce cahier des charges.', 'info');
    return;
  }

  refreshReponsesMap();

  const exigenceMap = indexBy(allExigences, e => e.id);
  currentExigences  = exigencesCDCDuCDC.map(ec => ({
    exigenceCDCId: ec.id,
    exigenceId:    Number(ec.Exigence),
    nom:           ec.FullName || exigenceMap.get(Number(ec.Exigence))?.Nom || `Exigence #${ec.Exigence}`,
  }));

  el.exigencesTitle.textContent = allCDC.find(c => c.id === cdcId)?.name ?? 'Exigences';
  updateCountBadge();
  renderExigences(currentExigences, isCurrentBilanLocked());
  el.exigencesSection.hidden = false;
  el.feedback.hidden         = true;
}

// ─── Chargement initial ───────────────────────────────────────────────────────
el.loadBtn.addEventListener('click', async () => {
  if (!validateSelection()) return;

  el.loadBtn.disabled = true;
  const cdcId = parseInt(el.cdcId.value, 10);
  const orgId = parseInt(el.orgId.value, 10);
  const swId  = parseInt(el.swId.value,  10);

  currentTripletBilans = allBilanSoft.filter(r =>
    Number(r.CDC) === cdcId && Number(r.Organisation) === orgId && Number(r.Software) === swId
  );

  // Aucun BilanSoft → création automatique v1.0.0
  if (!currentTripletBilans.length) {
    try {
      const newId    = await addRecord(options.tableBilanSoft, { CDC: cdcId, Organisation: orgId, Software: swId, Version: '1.0.0' });
      const newBilan = { id: newId, CDC: cdcId, Organisation: orgId, Software: swId, Version: '1.0.0', IsValid: false };
      allBilanSoft.push(newBilan);
      currentTripletBilans = [newBilan];
      showFeedback(el.feedback, '✅ Nouveau BilanSoft créé automatiquement (v1.0.0).', 'success');
    } catch (err) {
      showFeedback(el.feedback, `❌ Erreur création BilanSoft : ${err.message}`, 'error');
      el.loadBtn.disabled = false;
      return;
    }
  }

  const defaultBilan = currentTripletBilans[currentTripletBilans.length - 1];
  currentBilanSoftId = defaultBilan.id;

  populateVersionSelect(el.bilanVersionSelect, currentTripletBilans, currentBilanSoftId);
  updateIsValidDisplay(defaultBilan);
  el.bilanInfo.hidden = false;
  loadExigencesForCurrentBilan();
  el.loadBtn.disabled = false;
});

// ─── Changement de version ────────────────────────────────────────────────────
el.bilanVersionSelect.addEventListener('change', () => {
  currentBilanSoftId = parseInt(el.bilanVersionSelect.value, 10);
  updateIsValidDisplay(currentTripletBilans.find(b => b.id === currentBilanSoftId));
  loadExigencesForCurrentBilan();
});

// ─── Nouvelle version ────────────────────────────────────────────────────────
el.newVersionBtn.addEventListener('click', async () => {
  const version = nextMajorVersion(currentTripletBilans);
  el.newVersionBtn.disabled = true;
  try {
    const cdcId    = parseInt(el.cdcId.value, 10);
    const orgId    = parseInt(el.orgId.value, 10);
    const swId     = parseInt(el.swId.value,  10);
    const newId    = await addRecord(options.tableBilanSoft, { CDC: cdcId, Organisation: orgId, Software: swId, Version: version });
    const newBilan = { id: newId, CDC: cdcId, Organisation: orgId, Software: swId, Version: version, IsValid: false };
    allBilanSoft.push(newBilan);
    currentTripletBilans.push(newBilan);
    currentBilanSoftId = newId;
    populateVersionSelect(el.bilanVersionSelect, currentTripletBilans, currentBilanSoftId);
    updateIsValidDisplay(newBilan);
    loadExigencesForCurrentBilan();
    showFeedback(el.feedback, `✅ Nouvelle version ${version} créée.`, 'success');
  } catch (err) {
    showFeedback(el.feedback, `❌ Erreur : ${err.message}`, 'error');
  } finally {
    el.newVersionBtn.disabled = false;
  }
});

// ─── Toggle Valider / Dévalider ───────────────────────────────────────────────
el.validateBtn.addEventListener('click', async () => {
  const nextValue = !isCurrentBilanLocked();
  const message   = nextValue
    ? '⚠️ Confirmer la validation ?\n\nCette version passera en lecture seule.\n\nContinuer ?'
    : '⚠️ Confirmer la dévalidation ?\n\nCette version redeviendra modifiable.\n\nContinuer ?';

  if (!window.confirm(message)) return;

  el.validateBtn.disabled = true;
  try {
    await updateRecord(options.tableBilanSoft, currentBilanSoftId, { IsValid: nextValue });

    // Mise à jour des deux caches (triplet + global)
    [currentTripletBilans, allBilanSoft].forEach(list => {
      const b = list.find(b => b.id === currentBilanSoftId);
      if (b) b.IsValid = nextValue;
    });

    const bilan = currentTripletBilans.find(b => b.id === currentBilanSoftId);
    updateIsValidDisplay(bilan);
    renderExigences(currentExigences, nextValue);
    showFeedback(
      el.feedback,
      nextValue ? '🔒 Version validée — formulaire en lecture seule.' : '🔓 Version dévalidée — formulaire à nouveau modifiable.',
      'success'
    );
  } catch (err) {
    showFeedback(el.feedback, `❌ Opération refusée : ${err.message ?? 'permissions insuffisantes.'}`, 'error');
  } finally {
    el.validateBtn.disabled = false;
  }
});

// ─── Réinitialisation ────────────────────────────────────────────────────────
el.resetBtn.addEventListener('click', () => {
  if (isCurrentBilanLocked()) return;
  currentExigences.forEach(({ exigenceId }) => {
    const existing = existingReponsesMap.get(exigenceId);
    resetRadioGroup(`etat-${exigenceId}`, `etat-group-${exigenceId}`, `err-etat-${exigenceId}`, existing?.Etat ?? '');
    document.getElementById(`commentaire-${exigenceId}`).value = existing?.Commentaire ?? '';
  });
});

// ─── Soumission ──────────────────────────────────────────────────────────────
el.submitBtn.addEventListener('click', async () => {
  if (isCurrentBilanLocked()) return;
  if (!validateSelection())   return;
  if (!validateRadioGroups(
    currentExigences.map(({ exigenceId }) => ({
      groupName: `etat-${exigenceId}`,
      groupId:   `etat-group-${exigenceId}`,
      errId:     `err-etat-${exigenceId}`,
    }))
  )) return;

  el.submitBtn.disabled = true;
  try {
    const actions = currentExigences
      .filter(({ exigenceId }) => getRadioValue(`etat-${exigenceId}`) !== null)
      .map(({ exigenceId }) => {
        const etat        = getRadioValue(`etat-${exigenceId}`);
        const commentaire = document.getElementById(`commentaire-${exigenceId}`).value.trim();
        const existing    = existingReponsesMap.get(exigenceId);
        const fields      = { Etat: etat, Commentaire: commentaire };
        return existing
          ? ['UpdateRecord', options.tableReponseBilanSoft, existing.id, fields]
          : ['AddRecord',    options.tableReponseBilanSoft, null, { BilanSoft: currentBilanSoftId, Exigence: exigenceId, ...fields }];
      });

    if (actions.length) await applyActions(actions);

    const n = actions.length;
    showFeedback(el.feedback, `✅ ${n} réponse${n > 1 ? 's' : ''} enregistrée${n > 1 ? 's' : ''} avec succès !`, 'success');

    allReponseBilanSoft = await fetchTableRows(options.tableReponseBilanSoft);
    refreshReponsesMap();
    renderExigences(currentExigences, false);
    updateCountBadge();
  } catch (err) {
    showFeedback(el.feedback, `❌ Erreur : ${err.message ?? "Impossible d'enregistrer."}`, 'error');
  } finally {
    el.submitBtn.disabled = false;
  }
});

// ─── Options Grist ───────────────────────────────────────────────────────────
function applyOptions(opts) {
  options = { ...DEFAULT_OPTIONS, ...opts };
  el.widgetTitle.textContent = options.title;
  document.documentElement.style.setProperty('--accent', options.color);
  el.cfgColor.value                 = options.color;
  el.cfgTableCDC.value              = options.tableCDC;
  el.cfgTableExigenceCDC.value      = options.tableExigenceCDC;
  el.cfgTableExigence.value         = options.tableExigence;
  el.cfgTableBilanSoft.value        = options.tableBilanSoft;
  el.cfgTableReponseBilanSoft.value = options.tableReponseBilanSoft;
  el.cfgTableOrganisation.value     = options.tableOrganisation;
  el.cfgTableSoftware.value         = options.tableSoftware;
}

document.getElementById('cfg-save').addEventListener('click', async () => {
  options.color                 = el.cfgColor.value                        || DEFAULT_OPTIONS.color;
  options.tableCDC              = el.cfgTableCDC.value.trim()              || DEFAULT_OPTIONS.tableCDC;
  options.tableExigenceCDC      = el.cfgTableExigenceCDC.value.trim()      || DEFAULT_OPTIONS.tableExigenceCDC;
  options.tableExigence         = el.cfgTableExigence.value.trim()         || DEFAULT_OPTIONS.tableExigence;
  options.tableBilanSoft        = el.cfgTableBilanSoft.value.trim()        || DEFAULT_OPTIONS.tableBilanSoft;
  options.tableReponseBilanSoft = el.cfgTableReponseBilanSoft.value.trim() || DEFAULT_OPTIONS.tableReponseBilanSoft;
  options.tableOrganisation     = el.cfgTableOrganisation.value.trim()     || DEFAULT_OPTIONS.tableOrganisation;
  options.tableSoftware         = el.cfgTableSoftware.value.trim()         || DEFAULT_OPTIONS.tableSoftware;
  await grist.setOptions(options);
  applyOptions(options);
  el.configPanel.classList.remove('open');
  await loadAllData();
});

// ─── Init Grist ──────────────────────────────────────────────────────────────
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
