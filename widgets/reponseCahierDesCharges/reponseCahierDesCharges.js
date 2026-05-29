// reponseCahierDesCharges.js — v1.0.0
import { fetchTableRows }                from '../../lib/table.js';
import { initCombobox }                  from '../../lib/comboBox.js';
import { showFeedback, setLoadingState } from '../../lib/form.js';

// ─── Version ──────────────────────────────────────────────────────────────────
const VERSION = '1.0.0';
document.getElementById('version-badge').textContent = `v${VERSION}`;

// ─── Options par défaut ───────────────────────────────────────────────────────
const DEFAULT_OPTIONS = {
  title:             'Réponse Cahier des Charges',
  color:             '#3ddc84',
  tableCDC:          'CahierDesCharges',
  tableExigenceCDC:  'Exigence_CahierDesCharges',
  tableReponse:      'Reponse',
  tableOrganisation: 'Organisation',
  tableSoftware:     'Software',
};

let options = { ...DEFAULT_OPTIONS };

// ─── DOM ──────────────────────────────────────────────────────────────────────
const el = {
  loading:              document.getElementById('loading'),
  widgetContainer:      document.getElementById('widget-container'),
  widgetTitle:          document.getElementById('widget-title'),
  feedback:             document.getElementById('feedback'),
  configPanel:          document.getElementById('config-panel'),
  cdcSearch:            document.getElementById('cdc-search'),
  cdcDropdown:          document.getElementById('cdc-dropdown'),
  cdcId:                document.getElementById('cdc-id'),
  errCdc:               document.getElementById('err-cdc'),
  exigencesSection:     document.getElementById('exigences-section'),
  exigencesTitle:       document.getElementById('exigences-title'),
  exigencesCount:       document.getElementById('exigences-count'),
  exigencesList:        document.getElementById('exigences-list'),
  submitBtn:            document.getElementById('submit-btn'),
  resetBtn:             document.getElementById('reset-btn'),
  cfgColor:             document.getElementById('cfg-color'),
  cfgTableCDC:          document.getElementById('cfg-table-cdc'),
  cfgTableExigenceCDC:  document.getElementById('cfg-table-exigence-cdc'),
  cfgTableReponse:      document.getElementById('cfg-table-reponse'),
  cfgTableOrganisation: document.getElementById('cfg-table-organisation'),
  cfgTableSoftware:     document.getElementById('cfg-table-software'),
};

// ─── Données en mémoire ───────────────────────────────────────────────────────
let allCDC           = []; // { id, name }[]
let allOrganisations = []; // { id, name }[]
let allSoftwares     = []; // { id, name }[]
let allExigencesCDC  = []; // rows bruts de Exigence_CahierDesCharges
let allReponses      = []; // rows bruts de Reponse

const orgCombos = new Map(); // Map<exigenceCDCId, ComboboxInstance>

// ─── Valeurs de note ──────────────────────────────────────────────────────────
// ⚠️  Si la colonne Note dans Grist est numérique, remplacer les value par des entiers.
const NOTE_OPTIONS = [
  { value: '',                        label: '— Non évalué —'            },
  { value: 'Conforme',                label: '✅ Conforme'               },
  { value: 'Partiellement conforme',  label: '⚠️ Partiellement conforme' },
  { value: 'Non conforme',            label: '❌ Non conforme'           },
  { value: 'N/A',                     label: '— N/A —'                   },
];

// ─── Utilitaire : intercepter la mise à jour d'un input hidden ────────────────
// Permet de réagir quand initCombobox écrit dans hiddenInput.value.
function onHiddenInputChange(inputEl, callback) {
  const proto = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  Object.defineProperty(inputEl, 'value', {
    configurable: true,
    get() { return proto.get.call(this); },
    set(v) {
      const prev = proto.get.call(this);
      proto.set.call(this, v);
      if (String(v) !== String(prev)) callback(v);
    },
  });
}

// ─── Options ──────────────────────────────────────────────────────────────────
function applyOptions(opts) {
  options = { ...DEFAULT_OPTIONS, ...opts };
  el.widgetTitle.textContent    = options.title;
  document.documentElement.style.setProperty('--accent', options.color);
  el.cfgColor.value             = options.color;
  el.cfgTableCDC.value          = options.tableCDC;
  el.cfgTableExigenceCDC.value  = options.tableExigenceCDC;
  el.cfgTableReponse.value      = options.tableReponse;
  el.cfgTableOrganisation.value = options.tableOrganisation;
  el.cfgTableSoftware.value     = options.tableSoftware;
}

document.getElementById('cfg-save').addEventListener('click', async () => {
  options.color             = el.cfgColor.value                     || DEFAULT_OPTIONS.color;
  options.tableCDC          = el.cfgTableCDC.value.trim()           || DEFAULT_OPTIONS.tableCDC;
  options.tableExigenceCDC  = el.cfgTableExigenceCDC.value.trim()   || DEFAULT_OPTIONS.tableExigenceCDC;
  options.tableReponse      = el.cfgTableReponse.value.trim()       || DEFAULT_OPTIONS.tableReponse;
  options.tableOrganisation = el.cfgTableOrganisation.value.trim()  || DEFAULT_OPTIONS.tableOrganisation;
  options.tableSoftware     = el.cfgTableSoftware.value.trim()      || DEFAULT_OPTIONS.tableSoftware;

  await grist.setOptions(options);
  applyOptions(options);
  el.configPanel.classList.remove('open');
  await loadAllData();
});

// ─── Chargement initial de toutes les données ─────────────────────────────────
async function loadAllData() {
  setLoadingState(el.loading, el.widgetContainer, 'loading');
  orgCombos.clear();
  el.exigencesSection.hidden = true;
  el.exigencesList.innerHTML = '';

  try {
    const [cdcRows, orgRows, swRows, exigRows, repRows] = await Promise.all([
      fetchTableRows(options.tableCDC),
      fetchTableRows(options.tableOrganisation),
      fetchTableRows(options.tableSoftware),
      fetchTableRows(options.tableExigenceCDC),
      fetchTableRows(options.tableReponse),
    ]);

    allCDC           = cdcRows.map(r => ({ id: r.id, name: r.Nom || `#${r.id}` }));
    allOrganisations = orgRows.map(r => ({ id: r.id, name: r.Nom || `#${r.id}` }));
    allSoftwares     = swRows.map(r  => ({ id: r.id, name: r.Nom || `#${r.id}` }));
    allExigencesCDC  = exigRows;
    allReponses      = repRows;

    el.cdcSearch.placeholder = 'Rechercher un cahier des charges…';
  } catch (e) {
    console.error('[reponseCDC] Erreur chargement :', e);
    showFeedback(el.feedback, '❌ Erreur lors du chargement des données.', 'error');
  }

  setLoadingState(el.loading, el.widgetContainer, 'ready');
}

// ─── ComboBox CDC ──────────────────────────────────────────────────────────────
initCombobox({
  searchInput: el.cdcSearch,
  hiddenInput: el.cdcId,
  dropdown:    el.cdcDropdown,
  errorEl:     el.errCdc,
  getItems:    () => allCDC,
  filterMode:  'includes',
});

// Réagit dès qu'un CDC est sélectionné dans la combobox
onHiddenInputChange(el.cdcId, val => {
  if (val) {
    renderExigences(parseInt(val, 10));
  } else {
    el.exigencesSection.hidden = true;
    el.exigencesList.innerHTML = '';
    orgCombos.clear();
  }
});

// ─── Rendu dynamique des exigences ────────────────────────────────────────────
function renderExigences(cdcId) {
  el.exigencesList.innerHTML = '';
  orgCombos.clear();

  const exigences = allExigencesCDC.filter(r => r.CDC === cdcId);

  if (!exigences.length) {
    el.exigencesSection.hidden = true;
    showFeedback(el.feedback, 'ℹ️ Aucune exigence liée à ce cahier des charges.', 'info');
    return;
  }

  const cdc = allCDC.find(c => c.id === cdcId);
  el.exigencesTitle.textContent = cdc?.name ?? 'Exigences';
  el.exigencesCount.textContent = `${exigences.length} exigence${exigences.length > 1 ? 's' : ''}`;

  exigences.forEach((exigence, index) => {
    const reponse = allReponses.find(r => r.ExigenceCDC === exigence.id) ?? null;
    const card    = buildCard(exigence, reponse, index);
    el.exigencesList.appendChild(card);
    initOrgCombo(exigence.id, reponse?.Organisation ?? null);
  });

  el.exigencesSection.hidden = false;
}

// ─── Construction d'une carte exigence ────────────────────────────────────────
function buildCard(exigence, reponse, index) {
  const id     = exigence.id;
  const hasRep = !!reponse;

  const noteOpts = NOTE_OPTIONS.map(o =>
    `<option value="${o.value}"${reponse?.Note === o.value ? ' selected' : ''}>${o.label}</option>`
  ).join('');

  const swOpts = [
    '<option value="">— Aucun —</option>',
    ...allSoftwares.map(s =>
      `<option value="${s.id}"${reponse?.Software === s.id ? ' selected' : ''}>${s.name}</option>`
    ),
  ].join('');

  const card = document.createElement('div');
  card.className             = 'exigence-card';
  card.dataset.exigenceCdcId = id;
  card.dataset.reponseId     = reponse?.id ?? '';

  card.innerHTML = `
    <div class="card-header">
      <span class="card-index">#${index + 1}</span>
      <span class="card-title">${exigence.FullName || `Exigence #${id}`}</span>
      <span class="badge ${hasRep ? 'badge-existing' : 'badge-new'}">
        ${hasRep ? '✏️ Réponse existante' : '🆕 Nouvelle réponse'}
      </span>
    </div>
    <div class="card-body">

      <div class="field">
        <label for="note-${id}">Note <span class="required">*</span></label>
        <select id="note-${id}" class="note-select">${noteOpts}</select>
      </div>

      <div class="field">
        <label for="software-${id}">Software</label>
        <select id="software-${id}">${swOpts}</select>
      </div>

      <div class="field field-full">
        <label>Organisation</label>
        <div class="combobox">
          <input type="text" id="org-search-${id}"
                 placeholder="Rechercher une organisation…" autocomplete="off" />
          <div class="combobox-dropdown" id="org-dropdown-${id}" hidden></div>
        </div>
        <input type="hidden" id="org-${id}" />
      </div>

      <div class="field field-full">
        <label for="commentaire-${id}">Commentaire</label>
        <textarea id="commentaire-${id}"
                  placeholder="Commentaire ou justification…">${reponse?.Commentaire ?? ''}</textarea>
      </div>

    </div>
  `;

  return card;
}

// ─── Combobox Organisation par carte ─────────────────────────────────────────
function initOrgCombo(exigenceCDCId, existingOrgId) {
  const combo = initCombobox({
    searchInput: document.getElementById(`org-search-${exigenceCDCId}`),
    hiddenInput: document.getElementById(`org-${exigenceCDCId}`),
    dropdown:    document.getElementById(`org-dropdown-${exigenceCDCId}`),
    getItems:    () => allOrganisations,
    filterMode:  'includes',
  });

  if (existingOrgId) {
    const org = allOrganisations.find(o => o.id === existingOrgId);
    if (org) combo.select(org);
  }

  orgCombos.set(exigenceCDCId, combo);
}

// ─── Soumission ───────────────────────────────────────────────────────────────
el.submitBtn.addEventListener('click', async () => {
  const cdcId = parseInt(el.cdcId.value, 10);
  if (!cdcId) {
    el.errCdc.classList.add('visible');
    el.cdcSearch.classList.add('invalid');
    return;
  }

  const actions = [];

  [...el.exigencesList.querySelectorAll('.exigence-card')].forEach(card => {
    const eid       = parseInt(card.dataset.exigenceCdcId, 10);
    const reponseId = card.dataset.reponseId ? parseInt(card.dataset.reponseId, 10) : null;

    const note        = document.getElementById(`note-${eid}`).value;
    const softwareVal = document.getElementById(`software-${eid}`).value;
    const orgVal      = document.getElementById(`org-${eid}`).value;
    const commentaire = document.getElementById(`commentaire-${eid}`).value.trim();

    // Ignorer les cartes entièrement vides
    if (!note && !softwareVal && !orgVal && !commentaire) return;

    const fields = { ExigenceCDC: eid };
    if (note)        fields.Note         = note;
    if (orgVal)      fields.Organisation = parseInt(orgVal, 10);
    if (softwareVal) fields.Software     = parseInt(softwareVal, 10);
    if (commentaire) fields.Commentaire  = commentaire;

    actions.push(
      reponseId
        ? ['UpdateRecord', options.tableReponse, reponseId, fields]
        : ['AddRecord',    options.tableReponse, null,      fields]
    );
  });

  if (!actions.length) {
    showFeedback(el.feedback, 'ℹ️ Aucune réponse à enregistrer.', 'info');
    return;
  }

  el.submitBtn.disabled = true;

  try {
    await grist.docApi.applyUserActions(actions);
    const n = actions.length;
    showFeedback(el.feedback, `✅ ${n} réponse${n > 1 ? 's' : ''} enregistrée${n > 1 ? 's' : ''} !`, 'success');
    await refreshReponses();
  } catch (err) {
    console.error('[reponseCDC] Erreur soumission :', err);
    showFeedback(el.feedback, `❌ Erreur : ${err.message ?? "Impossible d'enregistrer."}`, 'error');
  } finally {
    el.submitBtn.disabled = false;
  }
});

// ─── Rafraîchissement post-sauvegarde ─────────────────────────────────────────
// Met à jour les reponseId et les badges sans détruire les cartes.
async function refreshReponses() {
  allReponses = await fetchTableRows(options.tableReponse);

  [...el.exigencesList.querySelectorAll('.exigence-card')].forEach(card => {
    if (card.dataset.reponseId) return;
    const eid     = parseInt(card.dataset.exigenceCdcId, 10);
    const reponse = allReponses.find(r => r.ExigenceCDC === eid);
    if (!reponse) return;

    card.dataset.reponseId = reponse.id;
    const badge = card.querySelector('.badge');
    if (badge) {
      badge.className   = 'badge badge-existing';
      badge.textContent = '✏️ Réponse existante';
    }
  });
}

// ─── Réinitialisation ─────────────────────────────────────────────────────────
el.resetBtn.addEventListener('click', () => {
  [...el.exigencesList.querySelectorAll('.exigence-card')].forEach(card => {
    const eid     = parseInt(card.dataset.exigenceCdcId, 10);
    const reponse = allReponses.find(r => r.ExigenceCDC === eid);

    document.getElementById(`note-${eid}`).value        = reponse?.Note         ?? '';
    document.getElementById(`software-${eid}`).value    = reponse?.Software     ?? '';
    document.getElementById(`commentaire-${eid}`).value = reponse?.Commentaire  ?? '';

    const combo = orgCombos.get(eid);
    if (combo) {
      combo.reset();
      if (reponse?.Organisation) {
        const org = allOrganisations.find(o => o.id === reponse.Organisation);
        if (org) combo.select(org);
      }
    }
  });
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
  await loadAllData();
  setLoadingState(el.loading, el.widgetContainer, 'ready');
});