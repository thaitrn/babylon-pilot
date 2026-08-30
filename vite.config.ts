import { defineConfig } from "vite";

// Project Pages (thaitrn.github.io/babylon-pilot/) yêu cầu base tương đối
export default defineConfig({
  base: "/babylon-pilot/",
  build: {
    target: "es2020",
    chunkSizeWarningLimit: 6500,
  },
});
