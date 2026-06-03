// reponseBesoinOrga.js — v1.1.0
import { fetchTableRows }                                                            from '../../lib/table.js';
import { initCombobox }                                                              from '../../lib/comboBox.js';
import { showFeedback, setLoadingState, validateForm }                               from '../../lib/form.js';
import { escapeHtml }                                                                from '../../lib/html.js';
import { nextVersion, populateVersionSelect }                                        from '../../lib/version.js'; // ← nextVersion
import { addRecord, updateRecord, applyActions }                                     from '../../lib/gristActions.js';
import { renderRadioGroupHTML, getRadioValue, validateRadioGroups, resetRadioGroup } from '../../lib/radioGroup.js';
import { indexBy }                                                                   from '../../lib/utils.js';

const VERSION = '1.1.0';
document.getElementById('version-badge').textContent = `v${VERSION}`;

const DEFAULT_OPTIONS = {
  title:                  'Réponse Besoin Organisation',
  color:                  '#3ddc84',
  tableCDC:               'CahierDesCharges',
  tableExigenceCDC:       'ExigenceCDC',
  tableExigence:          'Exigence',
  tableBesoinOrga:        'BesoinOrga',
  tableReponseBesoinOrga: 'ReponseBesoinOrga',
  tableOrganisation:      'Organisation',
};

let options = { ...DEFAULT_OPTIONS };

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
  loadBtn:                   document.getElementById('load-btn'),
  besoinInfo:                document.getElementById('besoin-info'),
  besoinVersionSelect:       document.getElementById('besoin-version-select'),
  newVersionBtn:             document.getElementById('new-version-btn'),
  besoinIsValid:             document.getElementById('besoin-isvalid'),
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
  cfgTableBesoinOrga:        document.getElementById('cfg-table-besoin-orga'),
  cfgTableReponseBesoinOrga: document.getElementById('cfg-table-reponse-besoin-orga'),
  cfgTableOrganisation:      document.getElementById('cfg-table-organisation'),
};

let allCDC               = [];
let allOrganisations     = [];
let allExigencesCDC      = [];
let allExigences         = [];
let allBesoinOrga        = [];
let allReponseBesoinOrga = [];

let currentPairBesoin   = [];
let currentBesoinOrgaId = null;
let existingReponsesMap = new Map();
let currentExigences    = [];

const NOTES = [
  { value: 'P0', label: 'P0 — Non concerné' },
  { value: 'P1', label: 'P1 — Faible'       },
  { value: 'P2', label: 'P2 — Modéré'       },
  { value: 'P3', label: 'P3 — Important'    },
  { value: 'P4', label: 'P4 — Critique'     },
];

async function loadAllData() {
  try {
    const [cdcRows, orgRows, exigCDCRows, exigRows, besoinRows, repBesoinRows] =
      await Promise.all([
        fetchTableRows(options.tableCDC),
        fetchTableRows(options.tableOrganisation),
        fetchTableRows(options.tableExigenceCDC),
        fetchTableRows(options.tableExigence),
        fetchTableRows(options.tableBesoinOrga),
        fetchTableRows(options.tableReponseBesoinOrga),
      ]);
    allCDC               = cdcRows.map(r => ({ id: r.id, name: r.Nom || `#${r.id}` }));
    allOrganisations     = orgRows.map(r => ({ id: r.id, name: r.Nom || r.Name || `#${r.id}` }));
    allExigencesCDC      = exigCDCRows;
    allExigences         = exigRows;
    allBesoinOrga        = besoinRows;
    allReponseBesoinOrga = repBesoinRows;
  } catch (e) {
    console.error('[reponseBesoinOrga] Erreur chargement :', e);
    showFeedback(el.feedback, '❌ Erreur lors du chargement des données.', 'error');
  }
}

initCombobox({ searchInput: el.cdcSearch, hiddenInput: el.cdcId, dropdown: el.cdcDropdown, errorEl: el.errCdc, getItems: () => allCDC,          filterMode: 'includes' });
initCombobox({ searchInput: el.orgSearch, hiddenInput: el.orgId, dropdown: el.orgDropdown, errorEl: el.errOrg, getItems: () => allOrganisations, filterMode: 'includes' });

function validateSelection() {
  return validateForm([
    { fieldId: 'cdc-id', errId: 'err-cdc', visualId: 'cdc-search' },
    { fieldId: 'org-id', errId: 'err-org', visualId: 'org-search' },
  ]);
}

function isCurrentBesoinLocked() {
  return !!(currentPairBesoin.find(b => b.id === currentBesoinOrgaId)?.IsValid);
}

function refreshReponsesMap() {
  existingReponsesMap = indexBy(
    allReponseBesoinOrga.filter(r => Number(r.BesoinOrga) === currentBesoinOrgaId),
    r => Number(r.Exigence),
    r => ({ id: r.id, Note: r.Note ?? '', Commentaire: r.Commentaire ?? '' })
  );
}

function updateIsValidDisplay(besoin) {
  const isValid = !!(besoin?.IsValid);
  el.besoinIsValid.textContent = isValid ? '✅ Validé' : '❌ Non validé';
  el.besoinIsValid.className   = `besoin-info-value ${isValid ? 'valid' : 'not-valid'}`;
  el.validateBtn.textContent   = isValid ? '🔓 Dévalider cette version' : '🔒 Valider cette version';
  el.validateBtn.classList.toggle('btn-devalidate', isValid);
  el.lockedBanner.hidden    = !isValid;
  el.formActions.hidden     = isValid;
  el.newVersionBtn.disabled = false;
}

function updateCountBadge() {
  const total    = currentExigences.length;
  const answered = existingReponsesMap.size;
  el.exigencesCount.textContent = answered > 0
    ? `${answered}/${total} répondue${answered > 1 ? 's' : ''}`
    : `${total} exigence${total > 1 ? 's' : ''}`;
}

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
          <label>Note${isLocked ? '' : ' <span class="required">*</span>'}</label>
          <div class="radio-group note-group" id="note-group-${exigenceId}">
            ${renderRadioGroupHTML(`note-${exigenceId}`, NOTES, existing?.Note ?? '', isLocked)}
          </div>
          <span class="error-msg" id="err-note-${exigenceId}">Veuillez sélectionner une note.</span>
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

function loadExigencesForCurrentBesoin() {
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
  renderExigences(currentExigences, isCurrentBesoinLocked());
  el.exigencesSection.hidden = false;
  el.feedback.hidden         = true;
}

el.loadBtn.addEventListener('click', async () => {
  if (!validateSelection()) return;
  el.loadBtn.disabled = true;
  const cdcId = parseInt(el.cdcId.value, 10);
  const orgId = parseInt(el.orgId.value, 10);
  currentPairBesoin = allBesoinOrga.filter(r =>
    Number(r.CDC) === cdcId && Number(r.Organisation) === orgId
  );
  if (!currentPairBesoin.length) {
    try {
      const newId     = await addRecord(options.tableBesoinOrga, { CDC: cdcId, Organisation: orgId, Version: '1' }); // ← '1'
      const newBesoin = { id: newId, CDC: cdcId, Organisation: orgId, Version: '1', IsValid: false };
      allBesoinOrga.push(newBesoin);
      currentPairBesoin = [newBesoin];
      showFeedback(el.feedback, '✅ Nouveau BesoinOrga créé automatiquement (v1).', 'success');
    } catch (err) {
      showFeedback(el.feedback, `❌ Erreur création BesoinOrga : ${err.message}`, 'error');
      el.loadBtn.disabled = false;
      return;
    }
  }
  const defaultBesoin = currentPairBesoin[currentPairBesoin.length - 1];
  currentBesoinOrgaId = defaultBesoin.id;
  populateVersionSelect(el.besoinVersionSelect, currentPairBesoin, currentBesoinOrgaId);
  updateIsValidDisplay(defaultBesoin);
  el.besoinInfo.hidden = false;
  loadExigencesForCurrentBesoin();
  el.loadBtn.disabled = false;
});

el.besoinVersionSelect.addEventListener('change', () => {
  currentBesoinOrgaId = parseInt(el.besoinVersionSelect.value, 10);
  updateIsValidDisplay(currentPairBesoin.find(b => b.id === currentBesoinOrgaId));
  loadExigencesForCurrentBesoin();
});

el.newVersionBtn.addEventListener('click', async () => {
  const version = nextVersion(currentPairBesoin); // ← nextVersion
  el.newVersionBtn.disabled = true;
  try {
    const cdcId     = parseInt(el.cdcId.value, 10);
    const orgId     = parseInt(el.orgId.value, 10);
    const newId     = await addRecord(options.tableBesoinOrga, { CDC: cdcId, Organisation: orgId, Version: version });
    const newBesoin = { id: newId, CDC: cdcId, Organisation: orgId, Version: version, IsValid: false };
    allBesoinOrga.push(newBesoin);
    currentPairBesoin.push(newBesoin);
    currentBesoinOrgaId = newId;
    populateVersionSelect(el.besoinVersionSelect, currentPairBesoin, currentBesoinOrgaId);
    updateIsValidDisplay(newBesoin);
    loadExigencesForCurrentBesoin();
    showFeedback(el.feedback, `✅ Nouvelle version ${version} créée.`, 'success');
  } catch (err) {
    showFeedback(el.feedback, `❌ Erreur : ${err.message}`, 'error');
  } finally {
    el.newVersionBtn.disabled = false;
  }
});

el.validateBtn.addEventListener('click', async () => {
  const nextValue = !isCurrentBesoinLocked();
  const message   = nextValue
    ? '⚠️ Confirmer la validation ?\n\nCette version passera en lecture seule.\n\nContinuer ?'
    : '⚠️ Confirmer la dévalidation ?\n\nCette version redeviendra modifiable.\n\nContinuer ?';
  if (!window.confirm(message)) return;
  el.validateBtn.disabled = true;
  try {
    await updateRecord(options.tableBesoinOrga, currentBesoinOrgaId, { IsValid: nextValue });
    [currentPairBesoin, allBesoinOrga].forEach(list => {
      const b = list.find(b => b.id === currentBesoinOrgaId);
      if (b) b.IsValid = nextValue;
    });
    const besoin = currentPairBesoin.find(b => b.id === currentBesoinOrgaId);
    updateIsValidDisplay(besoin);
    renderExigences(currentExigences, nextValue);
    showFeedback(el.feedback,
      nextValue ? '🔒 Version validée — formulaire en lecture seule.' : '🔓 Version dévalidée — formulaire à nouveau modifiable.',
      'success'
    );
  } catch (err) {
    showFeedback(el.feedback, `❌ Opération refusée : ${err.message ?? 'permissions insuffisantes.'}`, 'error');
  } finally {
    el.validateBtn.disabled = false;
  }
});

el.resetBtn.addEventListener('click', () => {
  if (isCurrentBesoinLocked()) return;
  currentExigences.forEach(({ exigenceId }) => {
    const existing = existingReponsesMap.get(exigenceId);
    resetRadioGroup(`note-${exigenceId}`, `note-group-${exigenceId}`, `err-note-${exigenceId}`, existing?.Note ?? '');
    document.getElementById(`commentaire-${exigenceId}`).value = existing?.Commentaire ?? '';
  });
});

el.submitBtn.addEventListener('click', async () => {
  if (isCurrentBesoinLocked()) return;
  if (!validateSelection())    return;
  if (!validateRadioGroups(
    currentExigences.map(({ exigenceId }) => ({
      groupName: `note-${exigenceId}`,
      groupId:   `note-group-${exigenceId}`,
      errId:     `err-note-${exigenceId}`,
    }))
  )) return;
  el.submitBtn.disabled = true;
  try {
    const actions = currentExigences
      .filter(({ exigenceId }) => getRadioValue(`note-${exigenceId}`) !== null)
      .map(({ exigenceId }) => {
        const note        = getRadioValue(`note-${exigenceId}`);
        const commentaire = document.getElementById(`commentaire-${exigenceId}`).value.trim();
        const existing    = existingReponsesMap.get(exigenceId);
        const fields      = { Note: note, Commentaire: commentaire };
        return existing
          ? ['UpdateRecord', options.tableReponseBesoinOrga, existing.id, fields]
          : ['AddRecord',    options.tableReponseBesoinOrga, null, { BesoinOrga: currentBesoinOrgaId, Exigence: exigenceId, ...fields }];
      });
    if (actions.length) await applyActions(actions);
    const n = actions.length;
    showFeedback(el.feedback, `✅ ${n} réponse${n > 1 ? 's' : ''} enregistrée${n > 1 ? 's' : ''} avec succès !`, 'success');
    allReponseBesoinOrga = await fetchTableRows(options.tableReponseBesoinOrga);
    refreshReponsesMap();
    renderExigences(currentExigences, false);
    updateCountBadge();
  } catch (err) {
    showFeedback(el.feedback, `❌ Erreur : ${err.message ?? "Impossible d'enregistrer."}`, 'error');
  } finally {
    el.submitBtn.disabled = false;
  }
});

function applyOptions(opts) {
  options = { ...DEFAULT_OPTIONS, ...opts };
  el.widgetTitle.textContent = options.title;
  document.documentElement.style.setProperty('--accent', options.color);
  el.cfgColor.value                  = options.color;
  el.cfgTableCDC.value               = options.tableCDC;
  el.cfgTableExigenceCDC.value       = options.tableExigenceCDC;
  el.cfgTableExigence.value          = options.tableExigence;
  el.cfgTableBesoinOrga.value        = options.tableBesoinOrga;
  el.cfgTableReponseBesoinOrga.value = options.tableReponseBesoinOrga;
  el.cfgTableOrganisation.value      = options.tableOrganisation;
}

document.getElementById('cfg-save').addEventListener('click', async () => {
  options.color                  = el.cfgColor.value                          || DEFAULT_OPTIONS.color;
  options.tableCDC               = el.cfgTableCDC.value.trim()                || DEFAULT_OPTIONS.tableCDC;
  options.tableExigenceCDC       = el.cfgTableExigenceCDC.value.trim()        || DEFAULT_OPTIONS.tableExigenceCDC;
  options.tableExigence          = el.cfgTableExigence.value.trim()           || DEFAULT_OPTIONS.tableExigence;
  options.tableBesoinOrga        = el.cfgTableBesoinOrga.value.trim()         || DEFAULT_OPTIONS.tableBesoinOrga;
  options.tableReponseBesoinOrga = el.cfgTableReponseBesoinOrga.value.trim()  || DEFAULT_OPTIONS.tableReponseBesoinOrga;
  options.tableOrganisation      = el.cfgTableOrganisation.value.trim()       || DEFAULT_OPTIONS.tableOrganisation;
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