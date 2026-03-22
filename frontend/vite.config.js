import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      // Proxy /api requests to FastAPI backend during local dev
      // This avoids CORS issues without the backend needing allow_origins=["*"]
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
