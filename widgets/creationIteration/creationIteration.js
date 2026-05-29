// widget.js — v1.4.0
import { fetchTableRows } from '../../lib/table.js';
import { populateSelect } from '../../lib/select.js';
import { initCombobox } from '../../lib/comboBox.js';
import { showFeedback, setLoadingState, validateForm, clearValidation, toUnixTimestamp }  from '../../lib/form.js';

// ─── Version ──────────────────────────────────────────────────────────────────
const VERSION = '1.4.0';
document.getElementById('version-badge').textContent = `v${VERSION}`;

// ─── Config par défaut ────────────────────────────────────────────────────────
const DEFAULT_OPTIONS = {
  title:          'Nouvelle Itération',
  color:          '#3ddc84',
  tableIteration: 'Iteration',
  tableWorkgroup: 'WorkGroup',
  tableSoftware:  'Software',
};

let options = { ...DEFAULT_OPTIONS };

// ─── Éléments DOM ─────────────────────────────────────────────────────────────
const el = {
  loading:            document.getElementById('loading'),
  configPanel:        document.getElementById('config-panel'),
  widgetContainer:    document.getElementById('widget-container'),
  widgetTitle:        document.getElementById('widget-title'),
  feedback:           document.getElementById('feedback'),
  form:               document.getElementById('iteration-form'),
  submitBtn:          document.getElementById('submit-btn'),
  formatSelect:       document.getElementById('format'),
  softwaresContainer: document.getElementById('softwares-container'),
  cfgColor:           document.getElementById('cfg-color'),
  cfgTableIteration:  document.getElementById('cfg-table-iteration'),
  cfgTableWorkgroup:  document.getElementById('cfg-table-workgroup'),
  cfgTableSoftware:   document.getElementById('cfg-table-software'),
};

// ─── Règles de validation ─────────────────────────────────────────────────────
const VALIDATION_RULES = [
  { fieldId: 'nom',        errId: 'err-nom'                                        },
  { fieldId: 'workgroup',  errId: 'err-workgroup', visualId: 'workgroup-search'    },
  { fieldId: 'format',     errId: 'err-format'                                     },
  { fieldId: 'debut-date', errId: 'err-debut'                                      },
  { fieldId: 'fin-date',   errId: 'err-fin'                                        },
];

// ─── WorkGroup ────────────────────────────────────────────────────────────────
let allWorkgroups = [];

async function loadWorkgroups() {
  const searchInput       = document.getElementById('workgroup-search');
  searchInput.placeholder = '⏳ Chargement…';
  allWorkgroups           = [];

  try {
    const rows            = await fetchTableRows(options.tableWorkgroup);
    allWorkgroups         = rows.map(r => ({ id: r.id, name: r.Name || `#${r.id}` }));
    searchInput.placeholder = 'Rechercher un WorkGroup…';
  } catch (e) {
    console.warn('Erreur chargement WorkGroup :', e);
    searchInput.placeholder = '⚠️ Erreur chargement';
  }
}

// ─── Softwares ────────────────────────────────────────────────────────────────
async function loadSoftwares() {
  el.softwaresContainer.innerHTML = '<span class="placeholder">⏳ Chargement…</span>';
  try {
    const rows = await fetchTableRows(options.tableSoftware);
    if (!rows.length) {
      el.softwaresContainer.innerHTML = '<span class="placeholder">Aucun logiciel disponible.</span>';
      return;
    }
    el.softwaresContainer.innerHTML = '';
    rows.forEach(r => {
      const label = document.createElement('label');
      const cb    = Object.assign(document.createElement('input'), { type: 'checkbox', value: r.id });
      label.append(cb, ` ${r.Name || `#${r.id}`}`);
      el.softwaresContainer.appendChild(label);
    });
  } catch (e) {
    console.warn('Erreur chargement Software :', e);
    el.softwaresContainer.innerHTML = '<span class="placeholder error">⚠️ Erreur chargement.</span>';
  }
}

async function loadSelectData() {
  await Promise.all([
    loadWorkgroups(),
    populateSelect(el.formatSelect, options.tableIteration, 'Format', '— Sélectionner un format —'),
    loadSoftwares(),
  ]);
}

// ─── Options ──────────────────────────────────────────────────────────────────
function applyOptions(opts) {
  options = { ...DEFAULT_OPTIONS, ...opts };
  el.widgetTitle.textContent = options.title;
  document.documentElement.style.setProperty('--accent', options.color);
  el.cfgColor.value          = options.color;
  el.cfgTableIteration.value = options.tableIteration;
  el.cfgTableWorkgroup.value = options.tableWorkgroup;
  el.cfgTableSoftware.value  = options.tableSoftware;
}

document.getElementById('cfg-save').addEventListener('click', async () => {
  options.color          = el.cfgColor.value                  || DEFAULT_OPTIONS.color;
  options.tableIteration = el.cfgTableIteration.value.trim()  || DEFAULT_OPTIONS.tableIteration;
  options.tableWorkgroup = el.cfgTableWorkgroup.value.trim()  || DEFAULT_OPTIONS.tableWorkgroup;
  options.tableSoftware  = el.cfgTableSoftware.value.trim()   || DEFAULT_OPTIONS.tableSoftware;

  await grist.setOptions(options);
  applyOptions(options);
  el.configPanel.classList.remove('open');
  await loadSelectData();
});

// ─── ComboBox WorkGroup ───────────────────────────────────────────────────────
const workgroupCombo = initCombobox({
  searchInput: document.getElementById('workgroup-search'),
  hiddenInput: document.getElementById('workgroup'),
  dropdown:    document.getElementById('workgroup-dropdown'),
  errorEl:     document.getElementById('err-workgroup'),
  getItems:    () => allWorkgroups,
});

// ─── Soumission ───────────────────────────────────────────────────────────────
el.form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validateForm(VALIDATION_RULES)) return;

  el.submitBtn.disabled = true;
  setLoadingState(el.loading, el.widgetContainer, 'loading');

  try {
    const softwareIds = [...document.querySelectorAll('#softwares-container input:checked')]
      .map(cb => parseInt(cb.value, 10));

    const lien        = document.getElementById('lien').value.trim();
    const description = document.getElementById('description').value.trim();

    const fields = {
      Name:      document.getElementById('nom').value.trim(),
      Workgroup: parseInt(document.getElementById('workgroup').value, 10),
      Format:    el.formatSelect.value,
      Start:     toUnixTimestamp(document.getElementById('debut-date').value, document.getElementById('debut-time').value),
      End:       toUnixTimestamp(document.getElementById('fin-date').value,   document.getElementById('fin-time').value),
    };

    if (lien)               fields.Link      = lien;
    if (description)        fields.Infos     = description;
    if (softwareIds.length) fields.Softwares = ['L', ...softwareIds];

    await grist.docApi.applyUserActions([['AddRecord', options.tableIteration, null, fields]]);
    showFeedback(el.feedback, '✅ Itération créée avec succès !', 'success');
    el.form.reset();
  } catch (err) {
    console.error('Erreur création itération :', err);
    showFeedback(el.feedback, `❌ Erreur : ${err.message ?? "Impossible de créer l'itération."}`, 'error');
  } finally {
    el.submitBtn.disabled = false;
    setLoadingState(el.loading, el.widgetContainer, 'ready');
  }
});

el.form.addEventListener('reset', () => {
  clearValidation(VALIDATION_RULES);
  el.feedback.hidden    = true;
  el.feedback.className = '';
  workgroupCombo.reset();
});

// ─── Initialisation Grist ─────────────────────────────────────────────────────
grist.ready({
  requiredAccess: 'full',
  onEditOptions() {
    applyOptions(options);
    el.configPanel.classList.add('open');
  },
});

grist.onOptions(async (opts) => {
  applyOptions(opts ?? {});
  await loadSelectData();
  setLoadingState(el.loading, el.widgetContainer, 'ready');
});