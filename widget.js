// ─── Version ──────────────────────────────────────────────────────────────────
const VERSION = "1.4.0";
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
  formatSelect:       document.getElementById("format"),
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
function showFeedback(msg, type) {
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
  el.configPanel.classList.remove("open");
  await loadSelectData();
});

// ─── Chargement des tables liées ──────────────────────────────────────────────
async function loadSelectData() {
  await Promise.all([loadWorkgroups(), loadFormats(), loadSoftwares()]);
}

// ─── WorkGroup : données ──────────────────────────────────────────────────────
let allWorkgroups = []; // { id, name }[]

async function loadWorkgroups() {
  const searchInput = document.getElementById("workgroup-search");
  const hiddenInput = document.getElementById("workgroup");
  const dropdown    = document.getElementById("workgroup-dropdown");

  searchInput.value = "";
  hiddenInput.value = "";
  dropdown.hidden   = true;
  allWorkgroups     = [];

  try {
    const table = await grist.docApi.fetchTable(options.tableWorkgroup);
    const names = table.Name ?? [];
    allWorkgroups = table.id.map((id, i) => ({
      id,
      name: names[i] || `#${id}`,
    }));
    searchInput.placeholder = "Rechercher un WorkGroup…";
  } catch (e) {
    console.warn("Erreur chargement WorkGroup :", e);
    searchInput.placeholder = "⚠️ Erreur chargement";
  }
}

// ─── WorkGroup : combobox (initialisé une seule fois) ─────────────────────────
function initWorkgroupCombo() {
  const searchInput = document.getElementById("workgroup-search");
  const hiddenInput = document.getElementById("workgroup");
  const dropdown    = document.getElementById("workgroup-dropdown");
  let activeIndex   = -1;

  function getOpts() {
    return [...dropdown.querySelectorAll(".combobox-option")];
  }

  function renderDropdown(filtered) {
    dropdown.innerHTML = "";
    activeIndex = -1;

    if (!filtered.length) {
      dropdown.innerHTML = '<div class="combobox-empty">Aucun résultat.</div>';
      dropdown.hidden = false;
      return;
    }

    filtered.forEach(wg => {
      const div       = document.createElement("div");
      div.className   = "combobox-option";
      div.textContent = wg.name;
      div.dataset.id  = wg.id;
      // mousedown avant blur : on peut sélectionner sans perdre le focus
      div.addEventListener("mousedown", e => {
        e.preventDefault();
        selectWorkgroup(wg);
      });
      dropdown.appendChild(div);
    });

    dropdown.hidden = false;
  }

  function selectWorkgroup(wg) {
    searchInput.value = wg.name;
    hiddenInput.value = wg.id;
    dropdown.hidden   = true;
    activeIndex       = -1;
    // Effacer l'état invalide si l'utilisateur vient de corriger
    searchInput.classList.remove("invalid");
    document.getElementById("err-workgroup").classList.remove("visible");
  }

  function closeDropdown() {
    dropdown.hidden = true;
    activeIndex     = -1;
    // Si rien n'a été sélectionné mais du texte reste, on efface pour éviter la confusion
    if (!hiddenInput.value && searchInput.value.trim()) {
      searchInput.value = "";
    }
  }

  // Filtrage en startsWith à chaque frappe
  searchInput.addEventListener("input", () => {
    hiddenInput.value = ""; // reset la sélection si l'utilisateur retape
    const query = searchInput.value.trim().toLowerCase();

    if (!query) {
      dropdown.hidden = true;
      return;
    }

    const filtered = allWorkgroups.filter(wg =>
      wg.name.toLowerCase().startsWith(query)
    );
    renderDropdown(filtered);
  });

  // Navigation clavier : flèches, Entrée, Échap
  searchInput.addEventListener("keydown", e => {
    const opts = getOpts();

    if (e.key === "Escape") {
      closeDropdown();
      return;
    }

    if (!opts.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, opts.length - 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      const id = parseInt(opts[activeIndex].dataset.id, 10);
      const wg = allWorkgroups.find(w => w.id === id);
      if (wg) selectWorkgroup(wg);
      return;
    }

    opts.forEach((opt, i) => opt.classList.toggle("active", i === activeIndex));
    if (activeIndex >= 0) opts[activeIndex].scrollIntoView({ block: "nearest" });
  });

  // Fermeture au clic extérieur (avec délai pour laisser mousedown agir)
  searchInput.addEventListener("blur", () => {
    setTimeout(closeDropdown, 150);
  });

  // Réouverture si on re-focus avec du texte déjà tapé mais sans sélection
  searchInput.addEventListener("focus", () => {
    const query = searchInput.value.trim().toLowerCase();
    if (query && !hiddenInput.value) {
      const filtered = allWorkgroups.filter(wg =>
        wg.name.toLowerCase().startsWith(query)
      );
      renderDropdown(filtered);
    }
  });
}

// ─── Format : valeurs distinctes de la colonne Format ─────────────────────────
async function loadFormats() {
  el.formatSelect.innerHTML = '<option value="">— Sélectionner un format —</option>';
  try {
    const table   = await grist.docApi.fetchTable(options.tableIteration);
    const formats = table.Format ?? [];

    const unique = [...new Set(formats.filter(v => v != null && String(v).trim() !== ""))]
      .map(v => String(v).trim())
      .sort((a, b) => a.localeCompare(b, "fr"));

    if (!unique.length) {
      el.formatSelect.innerHTML = '<option value="">Aucun format disponible</option>';
      return;
    }

    unique.forEach(fmt => {
      const opt = Object.assign(document.createElement("option"), {
        value:       fmt,
        textContent: fmt,
      });
      el.formatSelect.appendChild(opt);
    });
  } catch (e) {
    console.warn("Erreur chargement Format :", e);
    el.formatSelect.innerHTML = '<option value="">⚠️ Erreur chargement</option>';
  }
}

// ─── Softwares ────────────────────────────────────────────────────────────────
async function loadSoftwares() {
  el.softwaresContainer.innerHTML = "";
  try {
    const table = await grist.docApi.fetchTable(options.tableSoftware);
    const names = table.Name ?? [];
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
// workgroup : la valeur est dans le hidden input, mais l'état visuel va sur workgroup-search
const VISUAL_ID_MAP = { "workgroup": "workgroup-search" };

const REQUIRED_FIELDS = [
  { fieldId: "nom",        errId: "err-nom"      },
  { fieldId: "workgroup",  errId: "err-workgroup" },
  { fieldId: "format",     errId: "err-format"    },
  { fieldId: "debut-date", errId: "err-debut"     },
  { fieldId: "fin-date",   errId: "err-fin"       },
];

function setFieldValidity(fieldId, errId, isInvalid) {
  const visualId = VISUAL_ID_MAP[fieldId] ?? fieldId;
  document.getElementById(visualId).classList.toggle("invalid", isInvalid);
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
function toUnixTimestamp(dateStr, timeStr) {
  if (!dateStr) return null;
  const iso = `${dateStr}T${timeStr || "00:00"}`;
  return Math.floor(new Date(iso).getTime() / 1000);
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
      Format:    document.getElementById("format").value,
      Start:     toUnixTimestamp(
                   document.getElementById("debut-date").value,
                   document.getElementById("debut-time").value
                 ),
      End:       toUnixTimestamp(
                   document.getElementById("fin-date").value,
                   document.getElementById("fin-time").value
                 ),
    };

    if (lien)               fields.Link      = lien;
    if (description)        fields.Infos     = description;
    if (softwareIds.length) fields.Softwares = ["L", ...softwareIds];

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
  // Les hidden inputs ne sont pas réinitialisés par form.reset() — reset manuel
  document.getElementById("workgroup").value           = "";
  document.getElementById("workgroup-search").value    = "";
  document.getElementById("workgroup-dropdown").hidden = true;
});

// ─── Initialisation Grist ─────────────────────────────────────────────────────
initWorkgroupCombo(); // une seule fois, avant tout chargement de données

grist.ready({
  requiredAccess: "full",
  onEditOptions() {
    applyOptions(options);
    el.configPanel.classList.add("open");
  },
});

grist.onOptions(async (opts) => {
  applyOptions(opts ?? {});
  await loadSelectData();
  showWidget();
});