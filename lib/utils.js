/**
 * utils.js — v1.0.0
 * Utilitaires JavaScript génériques, sans dépendance au DOM ni à Grist.
 * Fonctions pures réutilisables dans tout widget.
 */

// ─── Collections ──────────────────────────────────────────────────────────────

/**
 * Indexe un tableau dans une `Map` selon une clé calculée,
 * avec projection optionnelle de la valeur stockée.
 *
 * Remplace le pattern `new Map(array.map(item => [keyFn(item), valueFn(item)]))`.
 * Utile pour construire des caches de lookup O(1) depuis des lignes Grist.
 *
 * @template T, K, V
 * @param {T[]}             items       - Tableau source.
 * @param {(item: T) => K}  keyFn       - Fonction de calcul de la clé.
 * @param {(item: T) => V} [valueFn]    - Transformateur de valeur (identité par défaut).
 * @returns {Map<K, V>}
 *
 * @example
 * // Indexer les réponses existantes par exigenceId, en ne gardant que les champs utiles
 * const byExigence = indexBy(
 *   allReponseBilanSoft.filter(r => r.BilanSoft === currentBilanSoftId),
 *   r => Number(r.Exigence),
 *   r => ({ id: r.id, Etat: r.Etat ?? '', Commentaire: r.Commentaire ?? '' })
 * );
 *
 * // Lookup O(1)
 * const existing = byExigence.get(exigenceId);
 */
export function indexBy(items, keyFn, valueFn = x => x) {
  return new Map(items.map(item => [keyFn(item), valueFn(item)]));
}

/**
 * Regroupe un tableau d'éléments par clé calculée.
 * Retourne un objet dont chaque valeur est un tableau d'éléments partageant la même clé.
 *
 * @template T
 * @param {T[]}                    items  - Tableau source.
 * @param {(item: T) => string}    keyFn  - Fonction de calcul de la clé.
 * @returns {Record<string, T[]>}
 *
 * @example
 * const parCDC = groupBy(allExigencesCDC, ec => String(ec.CDC));
 * // { '1': [...], '2': [...] }
 */
export function groupBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key   = keyFn(item);
    acc[key] ??= [];
    acc[key].push(item);
    return acc;
  }, {});
}

// ─── Async ────────────────────────────────────────────────────────────────────

/**
 * Attend n millisecondes de façon asynchrone.
 * Utile pour les feedbacks visuels ou les transitions.
 *
 * @param {number} ms
 * @returns {Promise<void>}
 *
 * @example
 * button.disabled = true;
 * await sleep(300); // laisse le temps à l'animation CSS de se jouer
 * button.disabled = false;
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Divers ───────────────────────────────────────────────────────────────────

/**
 * Retourne une valeur de fallback si la valeur principale est `null` ou `undefined`.
 * Différent de `||` : ne déclenche pas sur `0`, `false` ou `''`.
 *
 * @template T
 * @param {T|null|undefined} value
 * @param {T}                fallback
 * @returns {T}
 *
 * @example
 * const nom = coalesce(row.Nom, `#${row.id}`);  // '' est conservé, null/undefined remplacé
 */
export function coalesce(value, fallback) {
  return value ?? fallback;
}
