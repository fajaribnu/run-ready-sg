import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://ec2-47-129-11-44.ap-southeast-1.compute.amazonaws.com:8000",
        // target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});