// Lee el archivo candidatos_historial.txt del repo público de oscarzamora
// que extrae datos directamente de la API interna de ONPE con Chrome fingerprinting
// y los publica como datos abiertos en GitHub.

const HISTORIAL_URL = "https://raw.githubusercontent.com/oscarzamora/onpe-scraper-2026-2/main/output/candidatos_historial.txt";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");

  try {
    const r = await fetch(HISTORIAL_URL, {
      signal: AbortSignal.timeout(10000),
      headers: { "Cache-Control": "no-cache" }
    });

    if (!r.ok) throw new Error(`GitHub respondió HTTP ${r.status}`);

    const text = await r.text();
    const lines = text.trim().split("\n");
    if (lines.length < 2) throw new Error("Archivo vacío o sin datos");

    // Primera línea = headers tab-separados
    const headers = lines[0].split("\t");

    // Parsear todas las filas
    const rows = lines.slice(1).map(line => {
      const vals = line.split("\t");
      const obj = {};
      headers.forEach((h, i) => obj[h.trim()] = vals[i]?.trim() ?? "");
      return obj;
    });

    if (!rows.length) throw new Error("Sin filas de datos");

    // Obtener el timestamp más reciente
    const latest = rows[rows.length - 1].timestampActualizacion;

    // Filtrar solo las filas del último timestamp
    const lastRows = rows.filter(r => r.timestampActualizacion === latest);

    // Buscar Sánchez y Fujimori
    const sanchez = lastRows.find(r =>
      r.nombreCandidato?.toUpperCase().includes("SANCHEZ") ||
      r.nombreAgrupacionPolitica?.toUpperCase().includes("JUNTOS")
    );
    const fujimori = lastRows.find(r =>
      r.nombreCandidato?.toUpperCase().includes("FUJIMORI") ||
      r.nombreAgrupacionPolitica?.toUpperCase().includes("FUERZA")
    );

    if (!sanchez || !fujimori) {
      // Devolver todas las filas para debug
      return res.status(422).json({
        error: "No se encontraron candidatos",
        lastRows,
        headers
      });
    }

    const s = parseFloat(sanchez.porcentajeVotosValidos);
    const k = parseFloat(fujimori.porcentajeVotosValidos);
    const sv = parseInt(sanchez.totalVotosValidos);
    const kv = parseInt(fujimori.totalVotosValidos);
    const actas = parseFloat(sanchez.actasContabilizadas ?? lastRows[0]?.actasContabilizadas);

    return res.status(200).json({
      ok: true,
      actas,
      s,
      k,
      sv,
      kv,
      diff: sv - kv,
      timestamp: latest,
      fuente: "oscarzamora/onpe-scraper-2026-2"
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
