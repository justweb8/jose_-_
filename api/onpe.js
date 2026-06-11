const BASE = "https://resultadosegundavuelta.onpe.gob.pe/presentacion-backend";

// Headers que simulan Chrome real — obligatorio para la API de ONPE
const CHROME_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "es-PE,es;q=0.9,en;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
  "Origin": "https://resultadosegundavuelta.onpe.gob.pe",
  "Referer": "https://resultadosegundavuelta.onpe.gob.pe/main/resumen",
  "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
  "Connection": "keep-alive",
};

async function onpeFetch(path) {
  const r = await fetch(`${BASE}${path}`, {
    headers: CHROME_HEADERS,
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} en ${path}`);
  const json = await r.json();
  return json.data ?? json;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");

  try {
    // 1. Obtener idEleccion activo
    const proceso = await onpeFetch("/proceso/proceso-electoral-activo");
    const idEleccion = proceso?.idEleccion ?? proceso?.id_eleccion ?? proceso?.[0]?.idEleccion;
    if (!idEleccion) {
      return res.status(502).json({ error: "No se pudo obtener idEleccion", proceso });
    }

    // 2. Obtener totales de candidatos
    const candidatos = await onpeFetch(
      `/candidatos/buscar/todos?idEleccion=${idEleccion}&tipoFiltro=eleccion`
    );

    // La respuesta puede ser array directo o { data: [...] }
    const lista = Array.isArray(candidatos) ? candidatos : candidatos?.candidatos ?? [];

    if (!lista.length) {
      return res.status(502).json({ error: "Lista de candidatos vacía", raw: candidatos });
    }

    // 3. Obtener % de actas procesadas
    const totales = await onpeFetch(
      `/totales/buscar?idEleccion=${idEleccion}&tipoFiltro=eleccion`
    ).catch(() => null);

    const actas = totales?.porcentajeActasContabilizadas
      ?? totales?.actasContabilizadas
      ?? totales?.porcentaje
      ?? null;

    // 4. Armar respuesta
    const result = lista.map(c => ({
      nombre: c.nombreCandidato ?? c.nombre,
      partido: c.nombreAgrupacionPolitica ?? c.partido,
      pct: parseFloat(c.porcentajeVotosValidos ?? c.porcentaje ?? 0),
      votos: parseInt(c.totalVotosValidos ?? c.votos ?? 0),
    })).sort((a, b) => b.pct - a.pct);

    const s = result[0];
    const k = result[1];

    return res.status(200).json({
      ok: true,
      actas: actas ? parseFloat(actas) : null,
      s: s.pct,
      k: k.pct,
      sv: s.votos,
      kv: k.votos,
      diff: s.votos - k.votos,
      candidatos: result,
      idEleccion,
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
}
