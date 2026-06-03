/**
 * version.js — v2.0.0
 * Gestion de versions entières pour les entités Grist versionnées.
 *
 * Convention : la version est un entier simple (1, 2, 3…).
 * Format stocké en base : string (ex. "1", "2", "20").
 *
 * Changement v2.0.0 : abandon du format sémantique X.Y.Z au profit
 * d'un entier simple, plus lisible pour les utilisateurs métier.
 */

// ─── Calcul ───────────────────────────────────────────────────────────────────

/**
 * Calcule la prochaine version en incrémentant l'entier courant maximum.
 * Retourne la version initiale si aucune entité n'est fournie.
 *
 * @param {Array<{ Version?: string|number }>} entities       - Entités ayant un champ `Version`.
 * @param {string}                             [initial='1']  - Version de départ si liste vide.
 * @returns {string} Entier sous forme de chaîne (ex. "3").
 *
 * @example
 * nextVersion([{ Version: '1' }, { Version: '2' }]); // → '3'
 * nextVersion([{ Version: '20' }]);                   // → '21'
 * nextVersion([]);                                    // → '1'
 */
export function nextVersion(entities, initial = '1') {
  if (!entities.length) return initial;

  const max = Math.max(
    ...entities.map(e => {
      const n = parseInt(String(e.Version ?? '0'), 10);
      return isNaN(n) ? 0 : n;
    })
  );

  return String(max + 1);
}

// ─── UI ───────────────────────────────────────────────────────────────────────

/**
 * Remplit un `<select>` avec une liste d'entités versionnées.
 * Chaque option affiche `entity.Version` et sa valeur est `entity.id`.
 *
 * @param {HTMLSelectElement}                              selectEl   - Élément cible.
 * @param {Array<{ id: number, Version?: string|number }>} entities   - Entités à lister.
 * @param {number}                                         selectedId - ID de l'option à pré-sélectionner.
 *
 * @example
 * populateVersionSelect(el.besoinVersionSelect, besoinForPair, currentBesoinId);
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
