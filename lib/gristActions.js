/**
 * gristActions.js — v1.0.0
 * Helpers haut niveau pour construire et envoyer des actions Grist.
 *
 * Prérequis : la variable globale `grist` doit être disponible
 * (injectée par `grist-plugin-api.js`).
 *
 * Tous les helpers remontent les erreurs Grist sans les avaler,
 * ce qui permet à l'appelant de les afficher dans le feedback UI.
 */

// ─── Exécution ────────────────────────────────────────────────────────────────

/**
 * Exécute un lot d'actions Grist et retourne les valeurs de retour.
 * Wrapper mince sur `grist.docApi.applyUserActions`.
 *
 * Les ACL Grist sont appliquées côté serveur : si une action est refusée,
 * une erreur est levée avec le message de Grist.
 *
 * @param {Array} actions - Actions Grist valides (AddRecord, UpdateRecord, etc.).
 * @returns {Promise<any[]>} `retValues` de la réponse Grist (peut être vide).
 * @throws {Error} Si Grist refuse une ou plusieurs actions.
 *
 * @example
 * const ids = await applyActions([
 *   ['AddRecord', 'BilanSoft', null, { Version: '1.0.0' }],
 *   ['AddRecord', 'BilanSoft', null, { Version: '2.0.0' }],
 * ]);
 * // ids → [newId1, newId2]
 */
export async function applyActions(actions) {
  if (!actions.length) return [];
  const result = await grist.docApi.applyUserActions(actions);
  return result.retValues ?? [];
}

// ─── Raccourcis CRUD ──────────────────────────────────────────────────────────

/**
 * Insère un enregistrement et retourne son nouvel ID.
 *
 * @param {string}              tableName
 * @param {Record<string, any>} fields
 * @returns {Promise<number>} ID de la ligne créée.
 *
 * @example
 * const id = await addRecord('BilanSoft', { CDC: 1, Version: '1.0.0', IsValid: false });
 */
export async function addRecord(tableName, fields) {
  const [id] = await applyActions([['AddRecord', tableName, null, fields]]);
  return id;
}

/**
 * Met à jour un enregistrement existant.
 *
 * @param {string}              tableName
 * @param {number}              id
 * @param {Record<string, any>} fields
 * @returns {Promise<void>}
 *
 * @example
 * await updateRecord('BilanSoft', 5, { IsValid: true });
 */
export async function updateRecord(tableName, id, fields) {
  await applyActions([['UpdateRecord', tableName, id, fields]]);
}

/**
 * Insère ou met à jour un enregistrement selon la présence d'un ID existant.
 * Retourne l'ID final (existant ou nouvellement créé).
 *
 * Utile pour le pattern "créer si absent, sinon mettre à jour".
 *
 * @param {string}              tableName
 * @param {number|null}         existingId - `null` ou `undefined` → AddRecord.
 * @param {Record<string, any>} fields
 * @returns {Promise<number>}
 *
 * @example
 * // Crée si pas d'ID, met à jour sinon
 * const id = await upsertRecord('Reponse', existingReponseId ?? null, {
 *   CDC: 1, Organisation: 2, Software: 3,
 * });
 */
export async function upsertRecord(tableName, existingId, fields) {
  if (existingId) {
    await updateRecord(tableName, existingId, fields);
    return existingId;
  }
  return addRecord(tableName, fields);
}

/**
 * Construit une action Grist AddRecord ou UpdateRecord sans l'exécuter.
 * Utile pour assembler un lot d'actions mixtes avant un `applyActions` unique.
 *
 * @param {string}              tableName
 * @param {number|null}         existingId - `null` → AddRecord, sinon UpdateRecord.
 * @param {Record<string, any>} fields
 * @returns {[string, string, number|null, Record<string, any>]}
 *
 * @example
 * const actions = items.map(item =>
 *   buildUpsertAction('ReponseBilanSoft', item.existingId ?? null, {
 *     Etat: item.etat, Commentaire: item.commentaire,
 *   })
 * );
 * await applyActions(actions);
 */
export function buildUpsertAction(tableName, existingId, fields) {
  return existingId
    ? ['UpdateRecord', tableName, existingId, fields]
    : ['AddRecord',    tableName, null,        fields];
}
