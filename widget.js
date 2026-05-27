// ── Version ───────────────────────────────────────────────
const VERSION = "1.0.0";
document.getElementById("version-badge").textContent = `v${VERSION}`;

// ── État interne ──────────────────────────────────────────
let records        = [];
let selectedRecord = null;
let options        = { title: "Mon Widget", color: "#16a34a" };

// ── Éléments DOM ─────────────────────────────────────────
const elLoading   = document.getElementById("loading");
const elError     = document.getElementById("error");
const elContainer = document.getElementById("widget-container");
const elConfig    = document.getElementById("config-panel");
const elTitle     = document.getElementById("widget-title");
const elOutput    = document.getElementById("widget-output");

// ── Affichage des états ───────────────────────────────────
function showLoading() {
  elLoading.hidden   = false;
  elError.hidden     = true;
  elContainer.hidden = true;
}

function showError(msg) {
  elLoading.hidden   = true;
  elError.hidden     = false;
  elError.textContent = `⚠️ ${msg}`;
  elContainer.hidden = true;
}

function showWidget() {
  elLoading.hidden   = true;
  elError.hidden     = true;
  elContainer.hidden = false;
}

// ── Rendu ─────────────────────────────────────────────────
// C'est ici que tu codes l'affichage de ton widget.
function render() {
  if (!records.length) {
    elOutput.innerHTML = "<p style='color:#888'>Aucune donnée disponible.</p>";
    showWidget();
    return;
  }

  const columns = Object.keys(records[0]).filter(k => k !== "id");

  let html = "<table><thead><tr>";
  columns.forEach(col => { html += `<th>${col}</th>`; });
  html += "</tr></thead><tbody>";

  records.forEach(record => {
    const isSelected = selectedRecord && record.id === selectedRecord.id;
    html += `<tr class="${isSelected ? "selected" : ""}">`;
    columns.forEach(col => { html += `<td>${record[col] ?? ""}</td>`; });
    html += "</tr>";
  });

  html += "</tbody></table>";
  elOutput.innerHTML = html;
  showWidget();
}

// ── Options ───────────────────────────────────────────────
function applyOptions(opts) {
  options = { ...options, ...opts };
  elTitle.textContent = options.title;
  document.documentElement.style.setProperty("--accent", options.color);
}

document.getElementById("cfg-save").addEventListener("click", async () => {
  options.title = document.getElementById("cfg-title").value || options.title;
  options.color = document.getElementById("cfg-color").value;
  await grist.setOptions(options);
  applyOptions(options);
  elConfig.hidden = true;
});

// ── Initialisation Grist ──────────────────────────────────
grist.ready({
  requiredAccess: "read table",

  // Mapping de colonnes — adapte ou supprime selon ton besoin :
  // columns: [
  //   { name: "labelCol", title: "Libellé", type: "Text"    },
  //   { name: "valueCol", title: "Valeur",  type: "Numeric" },
  // ],

  onEditOptions() {
    document.getElementById("cfg-title").value = options.title;
    document.getElementById("cfg-color").value  = options.color;
    elConfig.hidden = false;
  }
});

grist.onRecords(data => {
  records = data;
  render();
});

grist.onRecord(record => {
  selectedRecord = record;
  render();
});

grist.onOptions(opts => {
  if (opts) applyOptions(opts);
});