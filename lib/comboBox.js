/**
 * comboBox.js — v1.0.0
 * Combobox recherchable qui associe un champ texte à un ID de ligne Grist.
 *
 * Classes CSS attendues : .combobox-option, .combobox-option.active,
 *                         .combobox-empty, .invalid, .visible
 */

/**
 * @typedef {{ id: number, name: string }} ComboboxItem
 *
 * @typedef {Object} ComboboxConfig
 * @property {HTMLInputElement}         searchInput         - Champ texte visible.
 * @property {HTMLInputElement}         hiddenInput         - Champ caché stockant l'ID.
 * @property {HTMLElement}              dropdown            - Conteneur du menu déroulant.
 * @property {HTMLElement}             [errorEl]            - Élément d'erreur (classe `.visible`).
 * @property {() => ComboboxItem[]}     getItems            - Liste des items disponibles.
 * @property {'startsWith'|'includes'} [filterMode='startsWith']
 *
 * @typedef {Object} ComboboxInstance
 * @property {() => void}                   reset
 * @property {(item: ComboboxItem) => void} select
 * @property {() => ComboboxItem|null}      getSelected
 */

/**
 * Initialise une combobox recherchable.
 *
 * @param {ComboboxConfig} config
 * @returns {ComboboxInstance}
 *
 * @example
 * const combo = initCombobox({
 *   searchInput: document.getElementById('workgroup-search'),
 *   hiddenInput: document.getElementById('workgroup'),
 *   dropdown:    document.getElementById('workgroup-dropdown'),
 *   errorEl:     document.getElementById('err-workgroup'),
 *   getItems:    () => allWorkgroups,
 * });
 */
export function initCombobox({ searchInput, hiddenInput, dropdown, errorEl, getItems, filterMode = 'startsWith' }) {
  let activeIndex = -1;

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const getOpts = () => [...dropdown.querySelectorAll('.combobox-option')];

  function filterItems(query) {
    const q = query.toLowerCase();
    return getItems().filter(item =>
      filterMode === 'includes'
        ? item.name.toLowerCase().includes(q)
        : item.name.toLowerCase().startsWith(q)
    );
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────────

  function renderDropdown(filtered) {
    dropdown.innerHTML = '';
    activeIndex        = -1;

    if (!filtered.length) {
      dropdown.innerHTML = '<div class="combobox-empty">Aucun résultat.</div>';
      dropdown.hidden    = false;
      return;
    }

    filtered.forEach(item => {
      const div       = document.createElement('div');
      div.className   = 'combobox-option';
      div.textContent = item.name;
      div.dataset.id  = item.id;
      div.addEventListener('mousedown', e => { e.preventDefault(); selectItem(item); });
      dropdown.appendChild(div);
    });

    dropdown.hidden = false;
  }

  // ── Actions ───────────────────────────────────────────────────────────────────

  function selectItem(item) {
    searchInput.value = item.name;
    hiddenInput.value = item.id;
    dropdown.hidden   = true;
    activeIndex       = -1;
    searchInput.classList.remove('invalid');
    if (errorEl) errorEl.classList.remove('visible');
  }

  function closeDropdown() {
    dropdown.hidden = true;
    activeIndex     = -1;
    if (!hiddenInput.value && searchInput.value.trim()) searchInput.value = '';
  }

  // ── Événements ────────────────────────────────────────────────────────────────

  searchInput.addEventListener('input', () => {
    hiddenInput.value = '';
    const query = searchInput.value.trim();
    if (!query) { dropdown.hidden = true; return; }
    renderDropdown(filterItems(query));
  });

  searchInput.addEventListener('keydown', e => {
    const opts = getOpts();
    if (e.key === 'Escape') { closeDropdown(); return; }
    if (!opts.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, opts.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      const id   = parseInt(opts[activeIndex].dataset.id, 10);
      const item = getItems().find(w => w.id === id);
      if (item) selectItem(item);
      return;
    }

    opts.forEach((opt, i) => opt.classList.toggle('active', i === activeIndex));
    if (activeIndex >= 0) opts[activeIndex].scrollIntoView({ block: 'nearest' });
  });

  searchInput.addEventListener('blur',  () => setTimeout(closeDropdown, 150));
  searchInput.addEventListener('focus', () => {
    const query = searchInput.value.trim();
    if (query && !hiddenInput.value) renderDropdown(filterItems(query));
  });

  // ── API publique ──────────────────────────────────────────────────────────────

  return {
    reset() {
      searchInput.value = '';
      hiddenInput.value = '';
      dropdown.hidden   = true;
      activeIndex       = -1;
    },
    select: selectItem,
    getSelected() {
      const id = parseInt(hiddenInput.value, 10);
      return isNaN(id) ? null : (getItems().find(item => item.id === id) ?? null);
    },
  };
}