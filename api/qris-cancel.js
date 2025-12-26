import axios from "axios";
import { KEYS } from "./_keys.js";

/**
 * POST /api/qris-cancel
 * body: { orderId: string, amount: number }
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { orderId, amount } = req.body || {};
    if (!orderId || !amount) return res.status(400).json({ error: "orderId & amount required" });

    const r = await axios.post(
      `${KEYS.pakasir.baseUrl}/transactioncancel`,
      {
        project: KEYS.pakasir.project,
        order_id: orderId,
        amount,
        api_key: KEYS.pakasir.apiKey,
      },
      { timeout: 15000 }
    );

    return res.status(200).json(r.data);
  } catch (err) {
    return res.status(500).json({
      error: "Failed to cancel transaction",
      detail: err?.response?.data || String(err),
    });
  }
}
