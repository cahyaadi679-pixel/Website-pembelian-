import { BRAND, PRODUCTS, CURRENCY, UX } from "./config.js";
import { createQris, qrisDetail, qrisCancel, fulfillOrder } from "./pakasir.js";

function $(sel, root = document) { return root.querySelector(sel); }
function $all(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

function formatIDR(amount) {
  try {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `Rp ${amount}`;
  }
}

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function iconSvg(kind) {
  // Minimal icons (no external deps)
  const common = 'class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.7"';
  if (kind === "panel") {
    return `<svg ${common} viewBox="0 0 24 24"><path stroke-linecap="round" d="M6 7h12M6 12h12M6 17h12M4 7h16M4 17h16"/><path stroke-linecap="round" d="M7 4v16"/></svg>`;
  }
  return `<svg ${common} viewBox="0 0 24 24"><path d="M4 12h16"/></svg>`;
}

function toast(message, kind = "info") {
  const root = $("#toastRoot");
  const id = `t-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const color =
    kind === "success"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
      : kind === "error"
      ? "border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-200"
      : "border-indigo-500/30 bg-indigo-500/10 text-indigo-800 dark:text-indigo-200";

  const el = document.createElement("div");
  el.id = id;
  el.className = `glass rounded-2xl px-4 py-3 border ${color}`;
  el.innerHTML = `<div class="text-sm font-medium">${escapeHtml(message)}</div>`;
  root.appendChild(el);

  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateY(6px)";
    setTimeout(() => el.remove(), 220);
  }, 2600);
}

function setCatActive(cat) {
  $all(".catBtn").forEach((a) => {
    const active = a.dataset.cat === cat;
    a.classList.toggle("bg-indigo-500", active);
    a.classList.toggle("text-zinc-950", active);
    a.classList.toggle("font-semibold", active);

    // remove default surface classes when active to avoid weird mixes
    if (active) {
      a.classList.remove("bg-black/5", "hover:bg-black/10", "border-black/10", "dark:bg-white/5", "dark:hover:bg-white/10", "dark:border-white/10");
    } else {
      a.classList.add("bg-black/5", "hover:bg-black/10", "border-black/10", "dark:bg-white/5", "dark:hover:bg-white/10", "dark:border-white/10");
    }
  });
}

function setPayStatus({ kind, text }) {
  const dot = $("#payDot");
  const label = $("#payStatusText");
  label.textContent = text;

  dot.className = "h-2 w-2 rounded-full";
  if (kind === "idle") dot.classList.add("bg-zinc-400");
  if (kind === "loading") dot.classList.add("bg-indigo-400");
  if (kind === "pending") dot.classList.add("bg-amber-400");
  if (kind === "success") dot.classList.add("bg-emerald-400");
  if (kind === "canceled") dot.classList.add("bg-rose-400");
  if (kind === "error") dot.classList.add("bg-rose-500");
}

function looksPaid(status = "") {
  const s = String(status).toLowerCase();
  return ["paid", "success", "completed", "settlement", "done"].some((k) => s.includes(k));
}

function looksPending(status = "") {
  const s = String(status).toLowerCase();
  return ["pending", "process", "waiting", "unpaid"].some((k) => s.includes(k));
}

function buildSection(product) {
  const reqName = product.requires?.name;
  const inputBlock = `
    ${reqName ? `
      <div class="mt-5">
        <div class="text-xs uppercase tracking-widest text-zinc-600 dark:text-zinc-300/80">Masukkan username / nama Anda</div>
        <input data-input="${product.key}:name" type="text" placeholder="contoh: Dndoffc" class="mt-2 w-full rounded-2xl px-4 py-3 bg-white/70 dark:bg-zinc-950/30 border border-black/10 dark:border-white/10 focus:border-indigo-400 dark:focus:border-indigo-400" />
      </div>
    ` : ""}

  `;

  const cards = product.plans.map((p) => {
    const isUnlimited = p.ramGb === 0;
    const subline = isUnlimited ? "Request-based • Fair Use" : `${p.ramGb}GB RAM`;

    const badge = p.badge ? `<span class="rounded-full px-2 py-0.5 text-[11px] border border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/5">${escapeHtml(p.badge)}</span>` : "";

    return `
      <button type="button"
        data-plan="${product.key}:${p.key}"
        class="planCard text-left rounded-2xl p-4 border border-black/10 bg-black/5 hover:bg-black/10 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10">
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="font-semibold">${escapeHtml(p.label)}</div>
            <div class="mt-1 text-sm text-zinc-700 dark:text-zinc-300/90">${escapeHtml(subline)}</div>
          </div>
          ${badge}
        </div>
        <div class="mt-4 text-2xl font-extrabold tracking-tight">${escapeHtml(formatIDR(p.price))}</div>
      </button>
    `;
  }).join("");

  const notes = (product.notes || []).map((n) => `<li>${escapeHtml(n)}</li>`).join("");

  return `
    <section id="${escapeHtml(product.key)}" class="scroll-mt-28">
      <div class="glass rounded-3xl p-6 sm:p-8 border border-black/10 dark:border-white/10">
        <div class="flex items-start justify-between gap-4 flex-col sm:flex-row">
          <div class="flex items-start gap-4">
            <div class="h-12 w-12 rounded-2xl bg-black/5 border border-black/10 dark:bg-white/5 dark:border-white/10 flex items-center justify-center">
              ${iconSvg(product.icon)}
            </div>
            <div>
              <h3 class="font-display font-semibold text-2xl">${escapeHtml(product.title)}</h3>
              <p class="mt-1 text-zinc-700 dark:text-zinc-300/90">${escapeHtml(product.subtitle)}</p>
            </div>
          </div>

          <div class="text-sm text-zinc-600 dark:text-zinc-300/80">
            <div class="uppercase tracking-widest text-xs">Pilih paket</div>
            <div class="mt-1">Klik kartu di bawah</div>
          </div>
        </div>

        ${inputBlock}

        <div class="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          ${cards}
        </div>

        <div class="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          <div class="lg:col-span-2">
            <div class="rounded-2xl border border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/5 p-4">
              <div class="text-xs uppercase tracking-widest text-zinc-600 dark:text-zinc-300/80">Catatan</div>
              <ul class="mt-2 list-disc pl-5 text-sm text-zinc-700 dark:text-zinc-300/90 space-y-1">${notes}</ul>
            </div>
          </div>
          <div>
            <button
              data-buy="${product.key}"
              class="buyBtn w-full rounded-2xl px-5 py-3 font-semibold bg-black/10 text-zinc-500 border border-black/10 dark:bg-white/5 dark:text-zinc-300/60 dark:border-white/10 cursor-not-allowed"
              disabled>
              Beli
            </button>
            <div class="mt-2 text-xs text-zinc-600 dark:text-zinc-300/80">
              Tombol aktif setelah input & paket valid.
            </div>
          </div>
        </div>

      </div>
    </section>
  `;
}

export function initApp() {
  // Footer year
  $("#year").textContent = String(new Date().getFullYear());

  // Render products
  const root = $("#productsRoot");
  root.innerHTML = PRODUCTS.map(buildSection).join("");

  // State
  const state = {
    selected: { panel: null },
    inputs: {
      "panel:name": "",
    },
    order: null,
    pollTimer: null,
  };

  function getProduct(key) { return PRODUCTS.find((p) => p.key === key); }
  function getPlan(productKey, planKey) {
    const p = getProduct(productKey);
    return p?.plans?.find((pl) => pl.key === planKey) || null;
  }

  function isValid(productKey) {
    const product = getProduct(productKey);
    const sel = state.selected[productKey];
    if (!product || !sel) return false;

    if (product.requires?.name) {
      const v = (state.inputs[`${productKey}:name`] || "").trim();
      if (!v) return false;
    }
    return true;
  }

  function updateBuyButton(productKey) {
    const btn = $(`[data-buy="${productKey}"]`);
    const ok = isValid(productKey);
    btn.disabled = !ok;
    btn.classList.toggle("cursor-not-allowed", !ok);
    btn.classList.toggle("bg-black/10", !ok);
    btn.classList.toggle("text-zinc-500", !ok);
    btn.classList.toggle("bg-indigo-500", ok);
    btn.classList.toggle("hover:bg-indigo-400", ok);
    btn.classList.toggle("text-zinc-950", ok);
    btn.classList.toggle("border-black/10", !ok);
    btn.classList.toggle("border-transparent", ok);
    btn.classList.toggle("dark:bg-white/5", !ok);
    btn.classList.toggle("dark:text-zinc-300/60", !ok);
  }

  // Init buy buttons disabled
  PRODUCTS.forEach((p) => updateBuyButton(p.key));

  // Plan card select handler
  $all(".planCard").forEach((btn) => {
    btn.addEventListener("click", () => {
      const [productKey, planKey] = (btn.dataset.plan || "").split(":");
      if (!productKey || !planKey) return;

      // clear active within section
      const section = $(`#${productKey}`);
      $all(".planCard", section).forEach((c) => {
        c.classList.remove("ring-2", "ring-indigo-500", "shadow-lg", "shadow-indigo-500/10");
      });

      btn.classList.add("ring-2", "ring-indigo-500", "shadow-lg", "shadow-indigo-500/10");

      state.selected[productKey] = planKey;
      updateBuyButton(productKey);

      const plan = getPlan(productKey, planKey);
      toast(`Paket dipilih: ${plan?.label || planKey}`, "info");
    });
  });

  // Inputs handler
  $all("input[data-input]").forEach((inp) => {
    inp.addEventListener("input", () => {
      state.inputs[inp.dataset.input] = inp.value;
      const [productKey] = inp.dataset.input.split(":");
      updateBuyButton(productKey);
    });
  });

  // Category active state (click)
  $all(".catBtn").forEach((a) => {
    a.addEventListener("click", () => setCatActive(a.dataset.cat));
  });
  // default active
  setCatActive("panel");

  // Payment controls
  const paymentEmpty = $("#paymentEmpty");
  const paymentActive = $("#paymentActive");
  const qrImage = $("#qrImage");
  const paymentString = $("#paymentString");
  const orderSummary = $("#orderSummary");
  const amountBadge = $("#amountBadge");
  const statusDetails = $("#statusDetails");

  async function refreshStatus() {
    if (!state.order) return;
    try {
      setPayStatus({ kind: "loading", text: "Cek status..." });
      const data = await qrisDetail({ orderId: state.order.orderId, amount: state.order.amount });
      const tx = data?.transaction || data?.data || data;

      const status = tx?.status || tx?.transaction_status || tx?.state || "UNKNOWN";

      if (looksPaid(status)) {
        setPayStatus({ kind: "success", text: "Pembayaran berhasil" });

                statusDetails.innerHTML = `
          <div class="font-semibold text-emerald-700 dark:text-emerald-200">Pembayaran terkonfirmasi ✅</div>
          <div class="mt-1">Order ID: <span class="font-mono text-xs">${escapeHtml(state.order.orderId)}</span></div>
          <div class="mt-3 text-sm text-zinc-700 dark:text-zinc-300/90">
            Selanjutnya: proses pembuatan layanan akan dijalankan sesuai sistem kamu.
          </div>
        `;
// Auto-fulfillment (server-side). Guarded to avoid duplicate calls from same browser.
try {
  const key = `fulfilled:${state.order.orderId}`;
  const already = localStorage.getItem(key);
  if (!already) {
    localStorage.setItem(key, "1");
    const payload = {
      orderId: state.order.orderId,
      amount: state.order.amount,
      productKey: state.order.productKey,
      planKey: state.order.planKey,
      inputs: state.order.inputs || {},
    };
    const fr = await fulfillOrder(payload);
    const f = fr?.fulfillment || {};
    if (f?.type === "manual" && f?.message) {
      statusDetails.innerHTML += `
        <div class="mt-5 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
          <div class="font-semibold">Fulfillment</div>
          <div class="mt-1 text-sm text-zinc-700 dark:text-zinc-300/90">${escapeHtml(String(f.message))}</div>
        </div>
      `;
    } else if (f?.type === "panel" && f?.server?.id) {
      const u = f?.user || {};
      const s = f?.server || {};
      const specs = f?.specs || {};
      const panelUrl = String(f?.panelUrl || "").trim();
      const pass = f?.password ? String(f.password) : "";
      statusDetails.innerHTML += `
        <div class="mt-5 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4">
          <div class="font-semibold">Server Panel dibuat ✅</div>
          <div class="mt-1 text-sm">Server ID: <span class="font-mono text-xs">${escapeHtml(String(s.id))}</span></div>
          ${s.identifier ? `<div class="mt-1 text-sm">Identifier: <span class="font-mono text-xs">${escapeHtml(String(s.identifier))}</span></div>` : ``}
          <div class="mt-3 text-sm font-semibold">Akun Panel</div>
          <div class="mt-1 text-sm">Username: <span class="font-mono text-xs">${escapeHtml(String(u.username || ""))}</span></div>
          ${pass ? `<div class="mt-1 text-sm">Password: <span class="font-mono text-xs">${escapeHtml(pass)}</span></div>` : `<div class="mt-1 text-xs text-zinc-600 dark:text-zinc-300/80">Password tidak ditampilkan (akun sudah ada sebelumnya).</div>`}
          ${panelUrl ? `<div class="mt-2 text-sm">Panel: <a class="underline font-semibold" href="${escapeHtml(panelUrl)}" target="_blank" rel="noopener">${escapeHtml(panelUrl)}</a></div>` : ``}
          <div class="mt-3 text-sm font-semibold">Spesifikasi</div>
          <div class="mt-1 text-sm">RAM: <span class="font-semibold">${escapeHtml(String(specs.label || ""))}</span></div>
          <div class="mt-1 text-sm">Disk: <span class="font-semibold">${escapeHtml(specs.disk === 0 ? "UNLIMITED" : String(specs.disk) + "MB")}</span></div>
          <div class="mt-1 text-sm">CPU: <span class="font-semibold">${escapeHtml(specs.cpu === 0 ? "UNLIMITED" : String(specs.cpu) + "%")}</span></div>
          ${f?.note ? `<div class="mt-3 text-xs text-zinc-600 dark:text-zinc-300/80">${escapeHtml(String(f.note))}</div>` : ``}
        </div>
      `;
    }
  }
} catch (e) {
  // show fulfillment error (don't hide; user needs to know)
  const msg = e?.message || "Fulfillment gagal";
  statusDetails.innerHTML += `
    <div class="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4">
      <div class="font-semibold text-rose-700 dark:text-rose-200">Fulfillment gagal</div>
      <div class="mt-1 text-sm text-rose-700/90 dark:text-rose-200/90">${escapeHtml(String(msg))}</div>
      <div class="mt-2 text-xs text-zinc-600 dark:text-zinc-300/80">Order ID: <span class="font-mono">${escapeHtml(state.order.orderId)}</span></div>
    </div>
  `;
  toast(msg, "error");
}
        stopAutoPoll();
        toast("Pembayaran sukses!", "success");
        return;
      }

      if (looksPending(status)) {
        setPayStatus({ kind: "pending", text: "Menunggu pembayaran" });
        statusDetails.innerHTML = `
          <div class="font-semibold">Status: ${escapeHtml(status)}</div>
          <div class="mt-1 text-xs text-zinc-600 dark:text-zinc-300/80">Klik refresh lagi setelah kamu bayar.</div>
        `;
        return;
      }

      // fallback
      setPayStatus({ kind: "pending", text: `Status: ${status}` });
      statusDetails.innerHTML = `<div class="font-semibold">Status: ${escapeHtml(status)}</div>`;
    } catch (err) {
      setPayStatus({ kind: "error", text: "Gagal cek status" });
      statusDetails.innerHTML = `<div class="text-rose-700 dark:text-rose-200">Error: ${escapeHtml(err.message || "Unknown")}</div>`;
      toast(err.message || "Gagal cek status", "error");
    }
  }

  function stopAutoPoll() {
    if (state.pollTimer) {
      clearInterval(state.pollTimer);
      state.pollTimer = null;
    }
  }

  function startAutoPoll() {
    stopAutoPoll();
    state.pollTimer = setInterval(() => {
      // don't spam if tab hidden
      if (document.hidden) return;
      refreshStatus().catch(() => {});
    }, UX.autoPollMs);
  }

  async function cancelOrder() {
    if (!state.order) return;
    try {
      setPayStatus({ kind: "loading", text: "Membatalkan..." });
      await qrisCancel({ orderId: state.order.orderId, amount: state.order.amount });
      setPayStatus({ kind: "canceled", text: "Dibatalkan" });
      toast("Transaksi dibatalkan.", "info");
    } catch (err) {
      setPayStatus({ kind: "error", text: "Gagal cancel" });
      toast(err.message || "Gagal cancel", "error");
    } finally {
      stopAutoPoll();
      // reset UI
      state.order = null;
      paymentActive.classList.add("hidden");
      paymentEmpty.classList.remove("hidden");
      qrImage.removeAttribute("src");
      paymentString.textContent = "";
      orderSummary.innerHTML = "";
      amountBadge.innerHTML = "";
      statusDetails.innerHTML = "";
      setPayStatus({ kind: "idle", text: "Belum ada transaksi" });
    }
  }

  $("#refreshStatus").addEventListener("click", () => refreshStatus());
  $("#cancelPayment").addEventListener("click", () => cancelOrder());
  $("#copyPayment").addEventListener("click", async () => {
    const text = paymentString.textContent || "";
    if (!text) return toast("Belum ada payment string.", "error");
    try {
      await navigator.clipboard.writeText(text);
      toast("Payment string tersalin.", "success");
    } catch {
      toast("Gagal copy (izin browser).", "error");
    }
  });

  // Buy button handler
  $all(".buyBtn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const productKey = btn.dataset.buy;
      const product = getProduct(productKey);
      if (!product) return;

      if (!isValid(productKey)) {
        toast("Lengkapi input & pilih paket dulu.", "error");
        return;
      }

      const planKey = state.selected[productKey];
      const plan = getPlan(productKey, planKey);

      const orderId = `WH-${Date.now()}-${Math.random().toString(16).slice(2, 6).toUpperCase()}`;
      const amount = plan.price;

      const meta = {
        product: productKey,
        plan: planKey,
        label: plan.label,
        name: product.requires?.name ? (state.inputs[`${productKey}:name`] || "").trim() : undefined,
      };

      // Activate payment UI
      paymentEmpty.classList.add("hidden");
      paymentActive.classList.remove("hidden");
      qrImage.removeAttribute("src");
      paymentString.textContent = "";
      orderSummary.innerHTML = `
        <div><span class="text-zinc-600 dark:text-zinc-300/80">Produk:</span> <span class="font-semibold">${escapeHtml(product.title)}</span></div>
        <div><span class="text-zinc-600 dark:text-zinc-300/80">Paket:</span> <span class="font-semibold">${escapeHtml(plan.label)}</span></div>
        ${meta.name ? `<div><span class="text-zinc-600 dark:text-zinc-300/80">Nama:</span> <span class="font-semibold">${escapeHtml(meta.name)}</span></div>` : ""}
        <div class="mt-2"><span class="text-zinc-600 dark:text-zinc-300/80">Order ID:</span> <span class="font-mono text-xs">${escapeHtml(orderId)}</span></div>
      `;
      amountBadge.innerHTML = `<span class="text-zinc-600 dark:text-zinc-300/80">Total</span> <span class="font-semibold">${escapeHtml(formatIDR(amount))}</span>`;
      statusDetails.innerHTML = `<div class="text-sm text-zinc-700 dark:text-zinc-300/90">Membuat QRIS…</div>`;
      setPayStatus({ kind: "loading", text: "Membuat QRIS..." });

      // scroll to payment section
      $("#payment").scrollIntoView({ behavior: "smooth", block: "start" });

      try {
        const data = await createQris({ orderId, amount, meta });

        const qr = data?.qr || {};
        const paymentNumber = qr?.paymentNumber || qr?.payment_number || data?.payment?.payment_number || data?.payment?.paymentNumber || "";
        const dataUrl = qr?.dataUrl || qr?.data_url || "";


const inputs = {
  name: (state.inputs[`${productKey}:name`] || "").trim(),
};
state.order = { orderId, amount, productKey, planKey, meta, paymentNumber, inputs };

        if (dataUrl) qrImage.src = dataUrl;

        paymentString.textContent = paymentNumber || "(Tidak ada payment string)";
        setPayStatus({ kind: "pending", text: "Menunggu pembayaran" });
        statusDetails.innerHTML = `
          <div class="font-semibold">Scan QR untuk bayar.</div>
          <div class="mt-1 text-xs text-zinc-600 dark:text-zinc-300/80">Klik <span class="font-semibold">Refresh Status</span> setelah pembayaran.</div>
        `;
        toast("QRIS siap. Silakan bayar.", "success");

        // auto poll
        startAutoPoll();
      } catch (err) {
        setPayStatus({ kind: "error", text: "Gagal membuat QRIS" });
        statusDetails.innerHTML = `<div class="text-rose-700 dark:text-rose-200">Error: ${escapeHtml(err.message || "Unknown")}</div>`;
        toast(err.message || "Gagal membuat QRIS", "error");
      }
    });
  });
}
