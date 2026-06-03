/**
 * version.js — v1.0.0
 * Gestion de versions sémantiques (MAJOR.MINOR.PATCH) pour les entités Grist versionnées.
 *
 * Convention : seul le MAJOR est incrémenté automatiquement.
 * Format attendu : "X.Y.Z" où X est un entier. Les parties Y et Z sont conservées à 0.
 */

// ─── Calcul ───────────────────────────────────────────────────────────────────

/**
 * Calcule la prochaine version en incrémentant le numéro MAJOR.
 * Retourne la version initiale si aucune entité n'est fournie.
 *
 * @param {Array<{ Version?: string }>} entities      - Entités ayant un champ `Version`.
 * @param {string}                     [initial='1.0.0'] - Version de départ si liste vide.
 * @returns {string}
 *
 * @example
 * nextMajorVersion([{ Version: '1.0.0' }, { Version: '2.0.0' }]); // → '3.0.0'
 * nextMajorVersion([{ Version: '5.2.1' }]);                        // → '6.0.0'
 * nextMajorVersion([]);                                             // → '1.0.0'
 */
export function nextMajorVersion(entities, initial = '1.0.0') {
  if (!entities.length) return initial;

  const maxMajor = Math.max(
    ...entities.map(e => {
      const match = String(e.Version ?? '0').match(/^(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    })
  );

  return `${maxMajor + 1}.0.0`;
}

// ─── UI ───────────────────────────────────────────────────────────────────────

/**
 * Remplit un `<select>` avec une liste d'entités versionnées.
 * Chaque option affiche `entity.Version` et sa valeur est `entity.id`.
 *
 * @param {HTMLSelectElement}                       selectEl   - Élément cible.
 * @param {Array<{ id: number, Version?: string }>} entities   - Entités à lister.
 * @param {number}                                  selectedId - ID de l'option à pré-sélectionner.
 *
 * @example
 * populateVersionSelect(el.bilanVersionSelect, bilansForTriplet, currentBilanId);
 */
export function populateVersionSelect(selectEl, entities, selectedId) {
  selectEl.innerHTML = '';

  entities.forEach(({ id, Version }) => {
    const opt       = document.createElement('option');
    opt.value       = id;
    opt.textContent = Version ?? `#${id}`;
    selectEl.appendChild(opt);
  });

  selectEl.value = String(selectedId);
}
