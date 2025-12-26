import axios from "axios";
import QRCode from "qrcode";
import { KEYS } from "./_keys.js";

function extractPaymentString(obj) {
  // Try common fields
  const candidates = [
    obj?.qr?.paymentNumber, obj?.qr?.payment_number,
    obj?.paymentNumber, obj?.payment_number,
    obj?.data?.paymentNumber, obj?.data?.payment_number,
    obj?.transaction?.paymentNumber, obj?.transaction?.payment_number,
    obj?.transaction?.qris_string, obj?.qris_string,
    obj?.transaction?.qr_string, obj?.qr_string,
    obj?.transaction?.payload, obj?.payload,
    obj?.data?.payload, obj?.data?.qris_string,
  ].filter(Boolean);
  for (const c of candidates) {
    const s = String(c).trim();
    if (s.startsWith("000201")) return s;
    if (s.length > 50) return s;
  }
  // Deep search: find any string that looks like EMVCo QR payload (often starts 000201)
  const stack = [obj];
  const seen = new Set();
  while (stack.length) {
    const cur = stack.pop();
    if (!cur || typeof cur !== "object") continue;
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const k of Object.keys(cur)) {
      const v = cur[k];
      if (typeof v === "string") {
        const s = v.trim();
        if (s.startsWith("000201")) return s;
        if (s.length > 100 && /\d{4,}/.test(s)) return s;
      } else if (v && typeof v === "object") {
        stack.push(v);
      }
    }
  }
  return "";
}

/**
 * POST /api/qris-create
 * body: { orderId: string, amount: number }
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { orderId, amount } = req.body || {};
    if (!orderId || !amount) return res.status(400).json({ error: "orderId & amount required" });

    const r = await axios.post(
      `${KEYS.pakasir.baseUrl}/transactioncreate/qris`,
      {
        project: KEYS.pakasir.project,
        order_id: orderId,
        amount,
        api_key: KEYS.pakasir.apiKey,
      },
      { timeout: 15000 }
    );


const raw = r.data;
const paymentNumber = extractPaymentString(raw);
let dataUrl = "";
if (paymentNumber) {
  try {
    dataUrl = await QRCode.toDataURL(paymentNumber, { errorCorrectionLevel: "M", margin: 1, scale: 6 });
  } catch (e) {
    // ignore QR generation failure
    dataUrl = "";
  }
}

return res.status(200).json({
  qr: { paymentNumber, dataUrl },
  raw,
});
  } catch (err) {
    return res.status(500).json({
      error: "Failed to create QRIS",
      detail: err?.response?.data || String(err),
    });
  }
}
