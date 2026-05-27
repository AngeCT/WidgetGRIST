// ─── Version ──────────────────────────────────────────────────────────────────
const VERSION = "1.2.0";
document.getElementById("version-badge").textContent = `v${VERSION}`;

// ─── Config par défaut ────────────────────────────────────────────────────────
const DEFAULT_OPTIONS = {
  title:          "Nouvelle Itération",
  color:          "#f59e0b",
  tableIteration: "Iteration",
  tableWorkgroup: "WorkGroup",
  tableSoftware:  "Software",
};

let options = { ...DEFAULT_OPTIONS };

// ─── Éléments DOM ─────────────────────────────────────────────────────────────
const el = {
  loading:            document.getElementById("loading"),
  configPanel:        document.getElementById("config-panel"),
  widgetContainer:    document.getElementById("widget-container"),
  widgetTitle:        document.getElementById("widget-title"),
  feedback:           document.getElementById("feedback"),
  form:               document.getElementById("iteration-form"),
  submitBtn:          document.getElementById("submit-btn"),
  workgroupSelect:    document.getElementById("workgroup"),
  softwaresContainer: document.getElementById("softwares-container"),
  cfgTitle:           document.getElementById("cfg-title"),
  cfgColor:           document.getElementById("cfg-color"),
  cfgTableIteration:  document.getElementById("cfg-table-iteration"),
  cfgTableWorkgroup:  document.getElementById("cfg-table-workgroup"),
  cfgTableSoftware:   document.getElementById("cfg-table-software"),
};

// ─── États d'affichage ────────────────────────────────────────────────────────
function showLoading() {
  el.loading.hidden         = false;
  el.widgetContainer.hidden = true;
}

function showWidget() {
  el.loading.hidden         = true;
  el.widgetContainer.hidden = false;
}

// ─── Feedback ─────────────────────────────────────────────────────────────────
function showFeedback(msg, type /* "success" | "error" */) {
  el.feedback.textContent = msg;
  el.feedback.className   = type;
  el.feedback.hidden      = false;
  setTimeout(() => {
    el.feedback.hidden    = true;
    el.feedback.className = "";
  }, 4000);
}

// ─── Options ──────────────────────────────────────────────────────────────────
function applyOptions(opts) {
  options = { ...DEFAULT_OPTIONS, ...opts };
  el.widgetTitle.textContent = options.title;
  document.documentElement.style.setProperty("--accent", options.color);
  el.cfgTitle.value          = options.title;
  el.cfgColor.value          = options.color;
  el.cfgTableIteration.value = options.tableIteration;
  el.cfgTableWorkgroup.value = options.tableWorkgroup;
  el.cfgTableSoftware.value  = options.tableSoftware;
}

document.getElementById("cfg-save").addEventListener("click", async () => {
  options.title          = el.cfgTitle.value.trim()          || DEFAULT_OPTIONS.title;
  options.color          = el.cfgColor.value                  || DEFAULT_OPTIONS.color;
  options.tableIteration = el.cfgTableIteration.value.trim() || DEFAULT_OPTIONS.tableIteration;
  options.tableWorkgroup = el.cfgTableWorkgroup.value.trim()  || DEFAULT_OPTIONS.tableWorkgroup;
  options.tableSoftware  = el.cfgTableSoftware.value.trim()  || DEFAULT_OPTIONS.tableSoftware;

  await grist.setOptions(options);
  applyOptions(options);

  // FIX 1 — fermeture via classe CSS (display:none/flex) au lieu de hidden
  el.configPanel.classList.remove("open");

  await loadSelectData();
});

// ─── Chargement des tables liées ─────────────────────────────────────────────
async function loadSelectData() {
  await Promise.all([loadWorkgroups(), loadSoftwares()]);
}

async function loadWorkgroups() {
  el.workgroupSelect.innerHTML = '<option value="">— Sélectionner un WorkGroup —</option>';
  try {
    const table = await grist.docApi.fetchTable(options.tableWorkgroup);
    const names = table.FullName ?? table.Name ?? [];
    table.id.forEach((id, i) => {
      const opt = Object.assign(document.createElement("option"), {
        value:       id,
        textContent: names[i] || `#${id}`,
      });
      el.workgroupSelect.appendChild(opt);
    });
  } catch (e) {
    console.warn("Erreur chargement WorkGroup :", e);
    el.workgroupSelect.innerHTML = '<option value="">⚠️ Erreur chargement</option>';
  }
}

async function loadSoftwares() {
  el.softwaresContainer.innerHTML = "";
  try {
    const table = await grist.docApi.fetchTable(options.tableSoftware);
    const names = table.Name ?? table.FullName ?? [];
    if (!table.id?.length) {
      el.softwaresContainer.innerHTML = '<span class="placeholder">Aucun logiciel disponible.</span>';
      return;
    }
    table.id.forEach((id, i) => {
      const label = document.createElement("label");
      const cb    = Object.assign(document.createElement("input"), {
        type:  "checkbox",
        value: id,
      });
      label.append(cb, ` ${names[i] || `#${id}`}`);
      el.softwaresContainer.appendChild(label);
    });
  } catch (e) {
    console.warn("Erreur chargement Software :", e);
    el.softwaresContainer.innerHTML = '<span class="placeholder error">⚠️ Erreur chargement.</span>';
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────
const REQUIRED_FIELDS = [
  { fieldId: "nom",       errId: "err-nom"      },
  { fieldId: "workgroup", errId: "err-workgroup" },
  { fieldId: "format",    errId: "err-format"    },
  { fieldId: "debut",     errId: "err-debut"     },
  { fieldId: "fin",       errId: "err-fin"       },
];

function setFieldValidity(fieldId, errId, isInvalid) {
  document.getElementById(fieldId).classList.toggle("invalid", isInvalid);
  document.getElementById(errId).classList.toggle("visible",   isInvalid);
}

function validateForm() {
  let valid = true;
  REQUIRED_FIELDS.forEach(({ fieldId, errId }) => {
    const empty = !document.getElementById(fieldId).value.trim();
    setFieldValidity(fieldId, errId, empty);
    if (empty) valid = false;
  });
  return valid;
}

function clearValidation() {
  REQUIRED_FIELDS.forEach(({ fieldId, errId }) => setFieldValidity(fieldId, errId, false));
}

// ─── Utilitaires ──────────────────────────────────────────────────────────────
/**
 * Convertit une valeur "datetime-local" (ex: "2026-05-27T14:30")
 * en timestamp Unix en secondes, format attendu par les colonnes DateTime de Grist.
 * FIX 3 — new Date() parse nativement le format datetime-local en heure locale,
 * ce qui préserve l'heure et les minutes saisies par l'utilisateur.
 */
function toUnixTimestamp(datetimeLocalStr) {
  if (!datetimeLocalStr) return null;
  return Math.floor(new Date(datetimeLocalStr).getTime() / 1000);
}

// ─── Soumission ───────────────────────────────────────────────────────────────
el.form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validateForm()) return;

  el.submitBtn.disabled = true;
  showLoading();

  try {
    const softwareIds = [...document.querySelectorAll("#softwares-container input:checked")]
      .map(cb => parseInt(cb.value, 10));

    const lien        = document.getElementById("lien").value.trim();
    const description = document.getElementById("description").value.trim();

    const fields = {
      Name:      document.getElementById("nom").value.trim(),
      Workgroup: parseInt(document.getElementById("workgroup").value, 10),
      Format:    document.getElementById("format").value.trim(),
      Start:     toUnixTimestamp(document.getElementById("debut").value),
      End:       toUnixTimestamp(document.getElementById("fin").value),
    };

    if (lien)              fields.Link        = lien;
    if (description)       fields.Infos = description;
    if (softwareIds.length) fields.Softwares  = ["L", ...softwareIds];

    // FIX 2 — applyUserActions à la place de addRows (qui n'existe pas)
    // Signature : ["AddRecord", tableId, rowId (null = auto), fields]
    await grist.docApi.applyUserActions([
      ["AddRecord", options.tableIteration, null, fields],
    ]);

    showFeedback("✅ Itération créée avec succès !", "success");
    el.form.reset();

  } catch (err) {
    console.error("Erreur création itération :", err);
    showFeedback(`❌ Erreur : ${err.message ?? "Impossible de créer l'itération."}`, "error");
  } finally {
    el.submitBtn.disabled = false;
    showWidget();
  }
});

el.form.addEventListener("reset", () => {
  clearValidation();
  el.feedback.hidden    = true;
  el.feedback.className = "";
});

// ─── Initialisation Grist ─────────────────────────────────────────────────────
grist.ready({
  requiredAccess: "full",
  onEditOptions() {
    // FIX 1 — ouverture via classe CSS, jamais au chargement initial
    applyOptions(options);
    el.configPanel.classList.add("open");
  },
});

grist.onOptions(async (opts) => {
  applyOptions(opts ?? {});
  await loadSelectData();
  showWidget();
});