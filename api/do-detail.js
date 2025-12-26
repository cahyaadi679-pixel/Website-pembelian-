import axios from "axios";
import { KEYS } from "./_keys.js";

/**
 * GET /api/do-detail?dropletId=123
 * Returns droplet status and IPv4 if available.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { dropletId } = req.query || {};
    if (!dropletId) return res.status(400).json({ error: "dropletId required" });

    const r = await axios.get(`https://api.digitalocean.com/v2/droplets/${encodeURIComponent(dropletId)}`, {
      headers: { Authorization: `Bearer ${KEYS.digitalocean.apiKey}` },
      timeout: 15000,
    });

    const d = r.data?.droplet || {};
    const v4 = (d?.networks?.v4 || []).find((n) => n.type === "public")?.ip_address || "";
    return res.status(200).json({
      droplet: {
        id: d.id,
        name: d.name,
        status: d.status,
        createdAt: d.created_at,
        ipv4: v4,
        region: d.region?.slug,
        size: d.size_slug,
      },
    });
  } catch (err) {
    return res.status(500).json({
      error: "Failed to fetch droplet",
      detail: err?.response?.data || String(err),
    });
  }
}
