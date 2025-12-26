import axios from "axios";
import crypto from "crypto";
import { KEYS } from "./_keys.js";

function normalizeStatus(s) {
  return String(s || "").toUpperCase();
}

function looksPaid(status) {
  const s = normalizeStatus(status);
  return [
    "PAID",
    "SUCCESS",
    "SETTLED",
    "SETTLEMENT",
    "COMPLETED",
    "DONE",
    "BERHASIL",
    "LUNAS",
  ].some((k) => s.includes(k));
}


function cap(s) {
  const t = String(s || "").trim();
  if (!t) return "";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function sanitizeUsername(raw) {
  const u = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
  // allow a-z, 0-9, dash, underscore, dot
  if (!/^[a-z0-9._-]{3,32}$/.test(u)) return "";
  return u;
}

function randomPass(prefix = "user") {
  const hex = crypto.randomBytes(2).toString("hex");
  return `${prefix}${hex}`;
}

function pteroBase() {
  return String(KEYS.pterodactyl.domain || "").replace(/\/+$/, "");
}

function pteroHeaders() {
  return {
    Authorization: `Bearer ${KEYS.pterodactyl.apiKey}`,
    Accept: "Application/vnd.pterodactyl.v1+json",
    "Content-Type": "application/json",
  };
}

async function pteroGet(path, params = {}) {
  const url = `${pteroBase()}${path}`;
  return axios.get(url, {
    params,
    headers: pteroHeaders(),
    timeout: 20000,
  });
}

async function pteroPost(path, body = {}) {
  const url = `${pteroBase()}${path}`;
  return axios.post(url, body, {
    headers: pteroHeaders(),
    timeout: 25000,
  });
}

async function pteroPatch(path, body = {}) {
  const url = `${pteroBase()}${path}`;
  return axios.patch(url, body, {
    headers: pteroHeaders(),
    timeout: 25000,
  });
}

function firstItem(listResp) {
  const arr = listResp?.data?.data || [];
  if (!Array.isArray(arr) || !arr.length) return null;
  return arr[0]?.attributes || null;
}

async function getUserByUsername(username) {
  const r = await pteroGet("/api/application/users", {
    per_page: 1,
    "filter[username]": username,
  });
  return firstItem(r);
}

async function getUserByExternalId(externalId) {
  const r = await pteroGet("/api/application/users", {
    per_page: 1,
    "filter[external_id]": externalId,
  });
  return firstItem(r);
}

async function createUser({ username, email, first_name, last_name, password, external_id }) {
  const body = {
    email,
    username,
    first_name,
    last_name,
    language: "en",
    password,
  };
  if (external_id) body.external_id = external_id;
  const r = await pteroPost("/api/application/users", body);
  return r?.data?.attributes || null;
}

async function getEggStartup() {
  const nestId = Number(KEYS.pterodactyl.nestId);
  const eggId = Number(KEYS.pterodactyl.egg);
  const r = await pteroGet(`/api/application/nests/${nestId}/eggs/${eggId}`);
  return r?.data?.attributes?.startup || "";
}

async function getServerByExternalId(externalId) {
  // Most Pterodactyl v1 installs support this endpoint:
  // GET /api/application/servers/external/{external_id}
  try {
    const r = await pteroGet(`/api/application/servers/external/${encodeURIComponent(externalId)}`);
    return r?.data?.attributes || null;
  } catch (e) {
    if (e?.response?.status === 404) return null;
    // Fallback to filter (in case external endpoint is disabled/older)
    try {
      const rr = await pteroGet("/api/application/servers", {
        per_page: 1,
        "filter[external_id]": externalId,
      });
      const item = firstItem(rr);
      return item || null;
    } catch {
      throw e;
    }
  }
}

function panelSpec(planKey) {
  // Mirroring your WhatsApp-bot logic
  switch (planKey) {
    case "panel-1gb":
      return { memory: 1000, disk: 1000, cpu: 40, label: "1GB" };
    case "panel-2gb":
      return { memory: 2000, disk: 1000, cpu: 60, label: "2GB" };
    case "panel-3gb":
      return { memory: 3000, disk: 2000, cpu: 80, label: "3GB" };
    case "panel-4gb":
      return { memory: 4000, disk: 2000, cpu: 100, label: "4GB" };
    case "panel-5gb":
      return { memory: 5000, disk: 3000, cpu: 120, label: "5GB" };
    case "panel-6gb":
      return { memory: 6000, disk: 3000, cpu: 140, label: "6GB" };
    case "panel-7gb":
      return { memory: 7000, disk: 4000, cpu: 160, label: "7GB" };
    case "panel-8gb":
      return { memory: 8000, disk: 4000, cpu: 180, label: "8GB" };
    case "panel-9gb":
      return { memory: 9000, disk: 5000, cpu: 200, label: "9GB" };
    case "panel-10gb":
      return { memory: 10000, disk: 5000, cpu: 220, label: "10GB" };
    case "panel-unlimited":
      return { memory: 0, disk: 0, cpu: 0, label: "UNLIMITED" };
    default:
      return null;
  }
}

async function fulfillPanel({ orderId, planKey, usernameRaw }) {
  const username = sanitizeUsername(usernameRaw);
  if (!username) {
    return {
      ok: false,
      status: 400,
      error: "Username panel tidak valid. Gunakan 3-32 karakter: a-z, 0-9, titik, underscore, dash.",
    };
  }

  const spec = panelSpec(planKey);
  if (!spec) {
    return { ok: false, status: 400, error: "Unknown panel planKey", planKey };
  }

  // Idempotency: if server already created for this order, return it.
  const existing = await getServerByExternalId(orderId);
  if (existing) {
    return {
      ok: true,
      fulfillment: {
        type: "panel",
        mode: "existing",
        server: {
          id: existing.id,
          identifier: existing.identifier,
          name: existing.name,
          description: existing.description,
        },
        specs: spec,
        panelUrl: pteroBase(),
        note: "Server sudah pernah dibuat untuk order ini (idempotent).",
      },
    };
  }

  // Get or create user
  let user = await getUserByUsername(username);
  let createdPassword = "";
  if (!user) {
    createdPassword = randomPass(username);
    const email = `${username}@gmail.com`;
    const first_name = `${cap(username)} Server`;
    const last_name = "Server";
    try {
      user = await createUser({
        username,
        email,
        first_name,
        last_name,
        password: createdPassword,
      });
    } catch (e) {
      // If create fails due to "already exists" race, attempt lookup again.
      user = await getUserByUsername(username);
      if (!user) throw e;
      createdPassword = "";
    }
  }

  const startup = await getEggStartup();
  const eggId = Number(KEYS.pterodactyl.egg);
  const locId = Number(KEYS.pterodactyl.locationId);

  const serverName = `${cap(username)} ${spec.label} Server`;
  const description = new Date().toISOString();

  const payload = {
    external_id: String(orderId),
    name: serverName,
    description,
    user: user.id,
    egg: eggId,
    docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
    startup: startup,
    environment: {
      INST: "npm",
      USER_UPLOAD: "0",
      AUTO_UPDATE: "0",
      CMD_RUN: "npm start",
    },
    limits: {
      memory: spec.memory,
      swap: 0,
      disk: spec.disk,
      io: 500,
      cpu: spec.cpu,
    },
    feature_limits: {
      databases: 5,
      backups: 5,
      allocations: 5,
    },
    deploy: {
      locations: [locId],
      dedicated_ip: false,
      port_range: [],
    },
  };

  const r = await pteroPost("/api/application/servers", payload);
  const server = r?.data?.attributes || null;
  if (!server) {
    return { ok: false, status: 500, error: "Create server returned empty response" };
  }

  return {
    ok: true,
    fulfillment: {
      type: "panel",
      mode: createdPassword ? "created_user" : "existing_user",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      password: createdPassword || null,
      server: {
        id: server.id,
        identifier: server.identifier,
        name: server.name,
      },
      specs: spec,
      panelUrl: pteroBase(),
      note: createdPassword
        ? "Akun panel baru dibuat dan server langsung diprovisioning."
        : "Akun panel sudah ada. Server dibuat, password tidak ditampilkan demi keamanan.",
    },
  };
}


/**
 * POST /api/fulfill
 * body: { orderId, amount, productKey, planKey, inputs?: { name?: string } }
 *
 * Flow:
 * 1) Verify PAID via Pakasir transactiondetail
 * 2) If PAID: fulfill product
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { orderId, amount, productKey, planKey, inputs } = req.body || {};
    if (!orderId || !amount || !productKey || !planKey) {
      return res.status(400).json({ error: "orderId, amount, productKey, planKey required" });
    }

    // 1) Verify payment with Pakasir
    const txr = await axios.get(`${KEYS.pakasir.baseUrl}/transactiondetail`, {
      params: {
        project: KEYS.pakasir.project,
        amount,
        order_id: orderId,
        api_key: KEYS.pakasir.apiKey,
      },
      timeout: 15000,
    });

    const tx = txr.data?.transaction || txr.data?.data || txr.data;
    const status = tx?.status || tx?.transaction_status || tx?.state || "UNKNOWN";
    if (!looksPaid(status)) {
      return res.status(402).json({ error: "Payment not confirmed", status, tx });
    }

    // 2) Fulfill based on product
    // Sesuai permintaan: hanya BUYPANEL yang aktif.
    if (productKey !== "panel") {
      return res.status(400).json({
        ok: false,
        error: "Produk dinonaktifkan. Hanya 'panel' yang tersedia.",
        productKey,
      });
    }

    if (productKey === "panel") {
      const r = await fulfillPanel({
        orderId,
        planKey,
        usernameRaw: inputs?.name,
      });
      if (!r.ok) return res.status(r.status || 500).json(r);
      return res.status(200).json({ ...r, tx });
    }

    // (Guard) should never reach here
    return res.status(400).json({ ok: false, error: "Unknown productKey", productKey });
  } catch (err) {
    return res.status(500).json({
      error: "Fulfillment failed",
      detail: err?.response?.data || String(err),
    });
  }
}
