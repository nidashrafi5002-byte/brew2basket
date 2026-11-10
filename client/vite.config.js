import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Brew2Basket",
        short_name: "Brew2Basket",
        description: "A café purchasing copilot",
        theme_color: "#3B2A20",
        background_color: "#F3E6CF",
        display: "standalone",
        start_url: "/",
        icons: [
  {
    src: "/pwa-icon.svg",
    sizes: "any",
    type: "image/svg+xml",
    purpose: "any",
  },
],
      },
    }),
  ],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});