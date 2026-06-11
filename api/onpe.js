const BASE = "https://resultadosegundavuelta.onpe.gob.pe/presentacion-backend";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "es-PE,es;q=0.9",
  "Origin": "https://resultadosegundavuelta.onpe.gob.pe",
  "Referer": "https://resultadosegundavuelta.onpe.gob.pe/main/resumen",
  "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
};

async function tryFetch(path) {
  const url = `${BASE}${path}`;
  const r = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(10000) });
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch(e) {}
  return { status: r.status, isJson: json !== null, preview: text.slice(0, 200), json };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");

  // idEleccion = 10 (confirmado del endpoint proceso-electoral-activo)
  const ID = 10;

  // Probar todos los endpoints posibles a la vez para ver cuál responde con JSON
  const endpoints = [
    `/candidatos/buscar/todos?idEleccion=${ID}&tipoFiltro=eleccion`,
    `/candidatos/buscar?idEleccion=${ID}&tipoFiltro=eleccion`,
    `/candidatos?idEleccion=${ID}&tipoFiltro=eleccion`,
    `/totales/buscar?idEleccion=${ID}&tipoFiltro=eleccion`,
    `/totales?idEleccion=${ID}&tipoFiltro=eleccion`,
    `/resumen/buscar?idEleccion=${ID}&tipoFiltro=eleccion`,
    `/resumen?idEleccion=${ID}`,
    `/actas/resumen?idEleccion=${ID}`,
  ];

  const results = {};
  await Promise.allSettled(
    endpoints.map(async (ep) => {
      try {
        results[ep] = await tryFetch(ep);
      } catch(e) {
        results[ep] = { error: e.message };
      }
    })
  );

  // Devolver debug: cuáles responden con JSON válido
  const jsonOnes = Object.entries(results)
    .filter(([, v]) => v.isJson)
    .map(([k, v]) => ({ endpoint: k, status: v.status, data: v.json }));

  const htmlOnes = Object.entries(results)
    .filter(([, v]) => !v.isJson && !v.error)
    .map(([k, v]) => ({ endpoint: k, status: v.status, preview: v.preview }));

  return res.status(200).json({ jsonOnes, htmlOnes, errorOnes: Object.entries(results).filter(([,v]) => v.error).map(([k,v]) => ({ endpoint: k, error: v.error })) });
}
