/**
 * select.js — v1.0.0
 * Valeurs distinctes d'une colonne Grist + alimentation d'un <select>.
 */

/**
 * Retourne les valeurs distinctes non vides d'une colonne, triées alphabétiquement.
 *
 * @param {string} tableName
 * @param {string} columnName
 * @returns {Promise<string[]>}
 *
 * @example
 * const formats = await fetchDistinctValues('Iteration', 'Format');
 */
export async function fetchDistinctValues(tableName, columnName) {
  const raw    = await grist.docApi.fetchTable(tableName);
  const values = raw[columnName] ?? [];

  return [
    ...new Set(
      values
        .filter(v => v != null && String(v).trim() !== '')
        .map(v => String(v).trim())
    ),
  ].sort((a, b) => a.localeCompare(b, 'fr'));
}

/**
 * Remplit un <select> avec les valeurs distinctes d'une colonne Grist.
 * Gère les états de chargement et d'erreur.
 *
 * @param {HTMLSelectElement} selectEl
 * @param {string}            tableName
 * @param {string}            columnName
 * @param {string}            [placeholder='— Sélectionner —']
 *
 * @example
 * await populateSelect(
 *   document.getElementById('format'),
 *   'Iteration', 'Format', '— Sélectionner un format —'
 * );
 */
export async function populateSelect(selectEl, tableName, columnName, placeholder = '— Sélectionner —') {
  selectEl.innerHTML = '<option value="">⏳ Chargement…</option>';

  try {
    const values = await fetchDistinctValues(tableName, columnName);

    if (!values.length) {
      selectEl.innerHTML = '<option value="">Aucune valeur disponible</option>';
      return;
    }

    selectEl.innerHTML = `<option value="">${placeholder}</option>`;
    values.forEach(v =>
      selectEl.appendChild(
        Object.assign(document.createElement('option'), { value: v, textContent: v })
      )
    );
  } catch (e) {
    console.warn(`[grist-select] Erreur "${columnName}" depuis "${tableName}" :`, e);
    selectEl.innerHTML = '<option value="">⚠️ Erreur chargement</option>';
  }
}