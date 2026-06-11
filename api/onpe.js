export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");

  try {
    const REPO_RAW = "https://raw.githubusercontent.com/justweb8/jose_-_/refs/heads/main/data.json";
    const r = await fetch(REPO_RAW + "?t=" + Date.now(), {
      signal: AbortSignal.timeout(8000),
      headers: { "Cache-Control": "no-cache" }
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    return res.status(200).json({ ok: true, ...data });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
