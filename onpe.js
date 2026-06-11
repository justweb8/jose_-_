export default async function handler(req, res) {
  // Permitir CORS para que tu HTML pueda llamarlo
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  const ONPE_URL = "https://resultadosegundavuelta.onpe.gob.pe/main/resumen";

  try {
    const response = await fetch(ONPE_URL, {
      headers: {
        // Simular Chrome para que la ONPE devuelva datos reales
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "es-PE,es;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Referer": "https://resultadosegundavuelta.onpe.gob.pe/",
        "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
      },
    });

    if (!response.ok) {
      return res.status(502).json({ error: "ONPE no respondió", status: response.status });
    }

    const html = await response.text();

    // Extraer porcentajes de candidatos (valores entre 40–60%)
    const allPcts = [...html.matchAll(/(\d{1,3})[.,](\d{2,3})\s*%/g)]
      .map(m => parseFloat(m[0].replace(",", ".")))
      .filter(v => !isNaN(v));

    // Buscar el par que sume ~100 (los dos candidatos)
    const candPcts = allPcts.filter(v => v > 40 && v < 60);
    let bestPair = null, bestDiff = 999;
    for (let i = 0; i < candPcts.length; i++) {
      for (let j = i + 1; j < candPcts.length; j++) {
        const diff = Math.abs(candPcts[i] + candPcts[j] - 100);
        if (diff < bestDiff) { bestDiff = diff; bestPair = [candPcts[i], candPcts[j]]; }
      }
    }

    if (!bestPair || bestDiff > 2) {
      return res.status(422).json({ error: "No se pudo parsear datos de candidatos", html_length: html.length });
    }

    const s = Math.max(...bestPair);
    const k = Math.min(...bestPair);

    // Actas: valor más alto entre 85–100
    const actasCandidates = allPcts.filter(v => v > 85 && v <= 100);
    const actas = actasCandidates.sort((a, b) => b - a)[0] || 0;

    // Votos exactos si aparecen (formato 9'018,592 o 9.018.592)
    const voteNums = [...html.matchAll(/(\d[\d'.,]{6,10})\s*votos/gi)]
      .map(m => parseInt(m[1].replace(/['.,]/g, "")))
      .filter(v => v > 8000000 && v < 12000000)
      .sort((a, b) => b - a);

    const TOTAL = 18027396;
    const sv = voteNums[0] || Math.round(TOTAL * s / 100);
    const kv = voteNums[1] || Math.round(TOTAL * k / 100);

    return res.status(200).json({
      ok: true,
      actas,
      s,
      k,
      sv,
      kv,
      diff: sv - kv,
      timestamp: new Date().toISOString(),
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
