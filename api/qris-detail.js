import axios from "axios";
import { KEYS } from "./_keys.js";

/**
 * GET /api/qris-detail?orderId=...&amount=...
 * (amount required by Pakasir transactiondetail per contoh implementasi kamu)
 */
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { orderId, amount } = req.query || {};
    if (!orderId || !amount) return res.status(400).json({ error: "orderId & amount required" });

    const r = await axios.get(`${KEYS.pakasir.baseUrl}/transactiondetail`, {
      params: {
        project: KEYS.pakasir.project,
        amount,
        order_id: orderId,
        api_key: KEYS.pakasir.apiKey,
      },
      timeout: 15000,
    });

    return res.status(200).json(r.data);
  } catch (err) {
    return res.status(500).json({
      error: "Failed to get transaction detail",
      detail: err?.response?.data || String(err),
    });
  }
}
