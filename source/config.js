// Web HirrOfficial — Client Config (AMAN untuk browser)
// ⚠️ Jangan taruh API KEY di sini. Secrets harus di Vercel Environment Variables.

export const BRAND = {
  name: "Web Dndoffc",
  tagline: "Powerful hosting • Panel Pterodactyl",
};

// Mata uang (display only)
export const CURRENCY = "IDR";

// Produk & harga (edit bebas)
// NOTE: Sesuai permintaan: hanya aktifkan BUYPANEL (panel). Produk lain dihapus dari UI.
export const PRODUCTS = [
  {
    key: "panel",
    title: "Panel Pterodactyl",
    subtitle: "Pilih RAM sesuai kebutuhan. Unlimited = request-based.",
    icon: "panel",
    requires: { name: true, hostname: false },
    plans: [
      { key: "panel-1gb", label: "1GB", ramGb: 1, cores: null, price: 1500, badge: "Starter" },
      { key: "panel-2gb", label: "2GB", ramGb: 2, cores: null, price: 3000, badge: "Basic" },
      { key: "panel-3gb", label: "3GB", ramGb: 3, cores: null, price: 4500, badge: "Plus" },
      { key: "panel-4gb", label: "4GB", ramGb: 4, cores: null, price: 6000, badge: "Popular" },
      { key: "panel-5gb", label: "5GB", ramGb: 5, cores: null, price: 7500, badge: "Pro" },
      { key: "panel-6gb", label: "6GB", ramGb: 6, cores: null, price: 9000, badge: "Pro+" },
      { key: "panel-7gb", label: "7GB", ramGb: 7, cores: null, price: 10500, badge: "Ultra" },
      { key: "panel-8gb", label: "8GB", ramGb: 8, cores: null, price: 12000, badge: "Max" },
      { key: "panel-9gb", label: "9GB", ramGb: 9, cores: null, price: 13500, badge: "Max+" },
      { key: "panel-10gb", label: "10GB", ramGb: 10, cores: null, price: 15000, badge: "Extreme" },
      { key: "panel-unlimited", label: "UNLIMITED", ramGb: 0, cores: null, price: 16500, badge: "Request" },
    ],
    notes: [
      "Unlimited (ram=0) = request-based (bukan RAM tak terbatas secara fisik).",
      "Resource menyesuaikan kapasitas server & kebijakan fair use.",
    ],
  },
];

// UX defaults
export const UX = {
  autoPollMs: 8000,
};
