// Centralized secrets/config for serverless functions.
//
// ✅ Recommended: set these values in Vercel Environment Variables
//    and REMOVE hard-coded keys before going public.
//
// This file supports both:
//   - process.env (preferred)
//   - fallback hard-coded values (your current setup)

const env = process.env || {};

function num(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export const KEYS = {
  pakasir: {
    project: env.PAKASIR_PROJECT || "dndone",
    apiKey: env.PAKASIR_APIKEY || "yMOSmSezc4RnQ6QsumORBIn3gzoMe0Aq",
    baseUrl: env.PAKASIR_BASEURL || "https://app.pakasir.com/api",
  },

  pterodactyl: {
    domain: env.PTERO_DOMAIN || "https://botz.dndstore.my.id",
    apiKey: env.PTERO_APIKEY || "ptla_HNLc8Dk91tr43AMWja7dXjZA0p0b0GiBG9HpHbZJIJu",
    clientKey: env.PTERO_CLIENTKEY || "ptlc_rXVlw0VC0RL4Jn710mGoMOhdXpTvbzyJkHSWxS3z27n",
    egg: num(env.PTERO_EGG, 15),
    nestId: num(env.PTERO_NESTID, 5),
    locationId: num(env.PTERO_LOCATIONID, 1),
  },
};
