// Lee data.json de tu propio repo GitHub (lo actualizas tú manualmente)
// Es la fuente más confiable porque tú controlas los datos.

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");

  // Método GET: devuelve los datos actuales
  if (req.method === "GET") {
    try {
      // Lee data.json del mismo repo (via GitHub raw)
      // Reemplaza TU_USUARIO y TU_REPO con los tuyos
      const REPO_RAW = "https://raw.githubusercontent.com/justweb8/jose_-_/main/data.json";
      const r = await fetch(REPO_RAW + "?t=" + Date.now(), {
        signal: AbortSignal.timeout(8000),
        headers: { "Cache-Control": "no-cache" }
      });
      if (!r.ok) throw new Error(`data.json no encontrado (HTTP ${r.status}). Créalo en tu repo.`);
      const data = await r.json();
      return res.status(200).json({ ok: true, ...data });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  return res.status(405).json({ error: "Método no permitido" });
}
