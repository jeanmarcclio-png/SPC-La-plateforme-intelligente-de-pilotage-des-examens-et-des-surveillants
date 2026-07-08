// Utilitaires CSV purs (aucune dépendance) — SPC.
// Gère le séparateur ; ou , (détection auto), les champs entre guillemets,
// les guillemets échappés (""), les accents et les retours à la ligne CRLF/LF.

/** Détecte le séparateur le plus probable sur la première ligne non vide. */
export function detectDelimiter(text: string): "," | ";" {
  const firstLine = text.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
  const semi = (firstLine.match(/;/g) ?? []).length;
  const comma = (firstLine.match(/,/g) ?? []).length;
  return semi >= comma ? ";" : ",";
}

/** Parse un CSV en tableau de tableaux de chaînes. */
export function parseCSV(text: string, delimiter?: "," | ";"): string[][] {
  const delim = delimiter ?? detectDelimiter(text);
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  // Retire un éventuel BOM
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delim) {
      row.push(field); field = "";
    } else if (c === "\n") {
      row.push(field); field = "";
      rows.push(row); row = [];
    } else if (c === "\r") {
      // ignoré (géré avec \n)
    } else {
      field += c;
    }
  }
  // dernier champ / ligne
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // supprime les lignes entièrement vides
  return rows.filter((r) => r.some((cell) => cell.trim().length > 0));
}

/** Échappe une valeur pour l'écriture CSV. */
function escapeCSV(value: string): string {
  const v = value ?? "";
  return /[",;\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Sérialise des lignes en CSV (séparateur ; par défaut, compatible Excel FR). */
export function toCSV(rows: (string | number | null | undefined)[][], delimiter: "," | ";" = ";"): string {
  return rows
    .map((r) => r.map((c) => escapeCSV(c == null ? "" : String(c))).join(delimiter))
    .join("\r\n");
}
