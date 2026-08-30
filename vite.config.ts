import { defineConfig } from "vite";

// Vercel production serves at domain root (not GitHub Pages /babylon-pilot/).
export default defineConfig({
  base: "/",
  build: {
    target: "es2020",
    chunkSizeWarningLimit: 6500,
  },
});
