/**
 * html.js — v1.0.0
 * Utilitaires de génération HTML sûre et de manipulation du DOM.
 *
 * Aucune dépendance extérieure. Utilisable dans tout contexte navigateur.
 */

// ─── Sécurité ─────────────────────────────────────────────────────────────────

/**
 * Échappe les caractères HTML spéciaux pour une insertion sûre dans `innerHTML`.
 * Prévient les injections XSS lorsque du contenu utilisateur est affiché.
 *
 * Caractères traités : & < > "
 *
 * @param {*} value - Valeur à échapper (sera convertie en string).
 * @returns {string}
 *
 * @example
 * card.innerHTML = `<span class="title">${escapeHtml(row.Nom)}</span>`;
 */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Création d'éléments ──────────────────────────────────────────────────────

/**
 * Crée un élément DOM avec des attributs et un contenu optionnels.
 * Alternative sûre à `innerHTML` pour des éléments simples.
 *
 * @param {string}                           tag      - Nom de la balise HTML.
 * @param {Record<string, string|boolean>}  [attrs]   - Attributs à appliquer.
 *   - `true`  → attribut booléen (ex. `disabled`, `hidden`)
 *   - `false` / `null` / `undefined` → attribut ignoré
 * @param {string|Node|(string|Node)[]}     [content] - Texte, nœud, ou tableau mixte.
 * @returns {HTMLElement}
 *
 * @example
 * const btn = createElement('button', { type: 'button', class: 'btn-primary' }, 'Valider');
 * const div = createElement('div', { id: 'container' }, [labelNode, inputNode]);
 * const opt = createElement('option', { value: '42', selected: true }, 'Mon label');
 */
export function createElement(tag, attrs = {}, content = null) {
  const el = document.createElement(tag);

  Object.entries(attrs).forEach(([key, val]) => {
    if (val === false || val == null) return;
    if (val === true) el.setAttribute(key, '');
    else              el.setAttribute(key, String(val));
  });

  if (content !== null) {
    const nodes = Array.isArray(content) ? content : [content];
    nodes.forEach(child =>
      el.appendChild(
        child instanceof Node ? child : document.createTextNode(String(child))
      )
    );
  }

  return el;
}

// ─── Manipulation ─────────────────────────────────────────────────────────────

/**
 * Vide le contenu d'un élément DOM sans le supprimer.
 * Plus performant que `el.innerHTML = ''` sur de gros arbres DOM.
 *
 * @param {HTMLElement} el
 *
 * @example
 * clearElement(document.getElementById('exigences-list'));
 */
export function clearElement(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}
