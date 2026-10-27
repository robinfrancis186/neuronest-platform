/** Read the bounded list envelope used by every current core list endpoint. */
export function listRows(body) {
  const rows = Array.isArray(body) ? body : body?.results;
  if (!Array.isArray(rows)) throw new TypeError("Expected a list response.");
  return rows;
}
