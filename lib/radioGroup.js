/**
 * radioGroup.js — v1.0.0
 * Composant boutons radio stylisés pour formulaires Grist.
 *
 * Classes CSS attendues dans votre feuille de style :
 *   .radio-group           — conteneur du groupe
 *   .radio-group.invalid   — état d'erreur
 *   .radio-option          — wrapper label + input
 *   .radio-label           — label visuel cliquable
 */

/**
 * @typedef {Object} RadioOption
 * @property {string} value - Valeur de l'input radio.
 * @property {string} label - Libellé affiché (texte brut ou HTML sûr).
 */

// ─── Rendu ────────────────────────────────────────────────────────────────────

/**
 * Génère le HTML d'un groupe de boutons radio.
 * À injecter dans un conteneur `.radio-group`.
 *
 * @param {string}        groupName        - Attribut `name` partagé par les inputs.
 * @param {RadioOption[]} options          - Options disponibles.
 * @param {string}       [selected='']    - Valeur pré-sélectionnée.
 * @param {boolean}      [disabled=false] - Si `true`, tous les inputs sont désactivés.
 * @returns {string} Fragment HTML.
 *
 * @example
 * container.innerHTML = renderRadioGroupHTML(
 *   `etat-${exigenceId}`,
 *   [{ value: 'Fait', label: '✅ Fait' }, { value: 'PasFait', label: '❌ Pas fait' }],
 *   existing?.Etat ?? '',
 *   isLocked
 * );
 */
export function renderRadioGroupHTML(groupName, options, selected = '', disabled = false) {
  return options.map(({ value, label }) => `
    <label class="radio-option">
      <input type="radio" name="${groupName}" value="${value}"
             ${selected === value ? 'checked' : ''}
             ${disabled ? 'disabled' : ''} />
      <span class="radio-label">${label}</span>
    </label>
  `).join('');
}

// ─── Lecture ──────────────────────────────────────────────────────────────────

/**
 * Retourne la valeur sélectionnée d'un groupe radio, ou `null` si aucune.
 *
 * @param {string} groupName - Attribut `name` du groupe.
 * @returns {string|null}
 *
 * @example
 * const etat = getRadioValue(`etat-${exigenceId}`);
 * // → 'Fait' | 'PasFait' | 'Partiel' | null
 */
export function getRadioValue(groupName) {
  return document.querySelector(`input[name="${groupName}"]:checked`)?.value ?? null;
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * @typedef {Object} RadioGroupRule
 * @property {string} groupName - Attribut `name` du groupe radio.
 * @property {string} groupId   - ID du conteneur `.radio-group` (pour la classe `.invalid`).
 * @property {string} errId     - ID du message d'erreur (pour la classe `.visible`).
 */

/**
 * Valide un ensemble de groupes radio (au moins une option sélectionnée par groupe).
 * Applique/retire `.invalid` sur chaque conteneur et `.visible` sur les messages d'erreur.
 *
 * @param {RadioGroupRule[]} groups
 * @returns {boolean} `true` si tous les groupes ont une sélection.
 *
 * @example
 * const ok = validateRadioGroups(
 *   currentExigences.map(({ exigenceId }) => ({
 *     groupName: `etat-${exigenceId}`,
 *     groupId:   `etat-group-${exigenceId}`,
 *     errId:     `err-etat-${exigenceId}`,
 *   }))
 * );
 */
export function validateRadioGroups(groups) {
  let valid = true;

  groups.forEach(({ groupName, groupId, errId }) => {
    const isInvalid = getRadioValue(groupName) === null;
    document.getElementById(groupId)?.classList.toggle('invalid', isInvalid);
    document.getElementById(errId)?.classList.toggle('visible',   isInvalid);
    if (isInvalid) valid = false;
  });

  return valid;
}

// ─── Réinitialisation ─────────────────────────────────────────────────────────

/**
 * Réinitialise un groupe radio à une valeur donnée et retire les marques de validation.
 * Passer `value = ''` vide la sélection.
 *
 * @param {string} groupName - Attribut `name` du groupe.
 * @param {string} groupId   - ID du conteneur `.radio-group`.
 * @param {string} errId     - ID du message d'erreur.
 * @param {string} [value=''] - Valeur à restaurer.
 *
 * @example
 * resetRadioGroup(
 *   `etat-${id}`, `etat-group-${id}`, `err-etat-${id}`,
 *   existingReponse?.Etat ?? ''
 * );
 */
export function resetRadioGroup(groupName, groupId, errId, value = '') {
  document.querySelectorAll(`input[name="${groupName}"]`)
    .forEach(r => (r.checked = r.value === value));
  document.getElementById(groupId)?.classList.remove('invalid');
  document.getElementById(errId)?.classList.remove('visible');
}
