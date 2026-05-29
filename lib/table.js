/**
 * table.js — v1.0.0
 * Extraction générique de données depuis une table Grist.
 */

/**
 * Récupère toutes les lignes d'une table Grist sous forme de tableau d'objets.
 *
 * @param {string} tableName - Nom de la table Grist.
 * @returns {Promise<Array<{ id: number, [col: string]: any }>>}
 *
 * @example
 * const rows = await fetchTableRows('Software');
 * // [{ id: 1, Name: 'VSCode' }, { id: 2, Name: 'IntelliJ' }, ...]
 */
export async function fetchTableRows(tableName) {
  const raw  = await grist.docApi.fetchTable(tableName);
  const cols = Object.keys(raw).filter(k => k !== 'id');

  return raw.id.map((id, i) => {
    const row = { id };
    cols.forEach(col => (row[col] = raw[col][i]));
    return row;
  });
}