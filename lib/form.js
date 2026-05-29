/**
 * form.js — v1.0.0
 * Utilitaires génériques pour formulaires Grist :
 *   feedback, état de chargement, validation, timestamps Unix.
 */

// ─── Feedback ──────────────────────────────────────────────────────────────────

/**
 * Affiche un message temporaire dans un élément dédié.
 *
 * @param {HTMLElement}               feedbackEl
 * @param {string}                    msg
 * @param {'success'|'error'|'info'}  type       - Classe CSS appliquée.
 * @param {number}                   [duration=4000]
 *
 * @example
 * showFeedback(el.feedback, '✅ Enregistré !', 'success');
 */
export function showFeedback(feedbackEl, msg, type, duration = 4000) {
  feedbackEl.textContent = msg;
  feedbackEl.className   = type;
  feedbackEl.hidden      = false;
  setTimeout(() => {
    feedbackEl.hidden    = true;
    feedbackEl.className = '';
  }, duration);
}

// ─── États de chargement ───────────────────────────────────────────────────────

/**
 * Bascule entre l'état "chargement" et l'état "prêt".
 *
 * @param {HTMLElement}        loadingEl
 * @param {HTMLElement}        containerEl
 * @param {'loading'|'ready'}  state
 *
 * @example
 * setLoadingState(el.loading, el.widgetContainer, 'loading');
 * setLoadingState(el.loading, el.widgetContainer, 'ready');
 */
export function setLoadingState(loadingEl, containerEl, state) {
  const isLoading    = state === 'loading';
  loadingEl.hidden   = !isLoading;
  containerEl.hidden = isLoading;
}

// ─── Validation ────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} FieldRule
 * @property {string}   fieldId              - ID du champ (input, select…).
 * @property {string}   errId                - ID du message d'erreur associé.
 * @property {string}  [visualId]            - ID de l'élément visuel si différent de fieldId.
 * @property {(v: string) => boolean} [validator] - Validateur personnalisé (true = valide).
 */

/**
 * Valide les champs selon les règles données.
 * Applique/retire `.invalid` sur les champs et `.visible` sur les messages d'erreur.
 *
 * @param {FieldRule[]} rules
 * @returns {boolean} true si tout est valide.
 *
 * @example
 * const ok = validateForm([
 *   { fieldId: 'nom',       errId: 'err-nom' },
 *   { fieldId: 'workgroup', errId: 'err-workgroup', visualId: 'workgroup-search' },
 *   { fieldId: 'email',     errId: 'err-email', validator: v => /\S+@\S+/.test(v) },
 * ]);
 */
export function validateForm(rules) {
  let valid = true;

  rules.forEach(({ fieldId, errId, visualId, validator }) => {
    const field     = document.getElementById(fieldId);
    const errEl     = document.getElementById(errId);
    const visualEl  = document.getElementById(visualId ?? fieldId);
    const value     = field?.value ?? '';
    const isInvalid = validator ? !validator(value) : !value.trim();

    visualEl?.classList.toggle('invalid', isInvalid);
    errEl?.classList.toggle('visible',    isInvalid);
    if (isInvalid) valid = false;
  });

  return valid;
}

/**
 * Retire toutes les marques de validation d'un ensemble de champs.
 *
 * @param {FieldRule[]} rules - Les mêmes règles que validateForm.
 */
export function clearValidation(rules) {
  rules.forEach(({ fieldId, errId, visualId }) => {
    document.getElementById(visualId ?? fieldId)?.classList.remove('invalid');
    document.getElementById(errId)?.classList.remove('visible');
  });
}

// ─── Utilitaires date ──────────────────────────────────────────────────────────

/**
 * Convertit une date + heure en timestamp Unix (secondes).
 *
 * @param {string}  dateStr          - Format YYYY-MM-DD.
 * @param {string} [timeStr='00:00'] - Format HH:MM.
 * @returns {number|null}
 *
 * @example
 * toUnixTimestamp('2025-06-15', '09:30'); // → 1750000200
 */
export function toUnixTimestamp(dateStr, timeStr = '00:00') {
  if (!dateStr) return null;
  const ts = new Date(`${dateStr}T${timeStr}`).getTime();
  return isNaN(ts) ? null : Math.floor(ts / 1000);
}