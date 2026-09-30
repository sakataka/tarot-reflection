import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // `localweb dev` passes the API port. Without it there is no proxy, rather than a guessed port.
    proxy: process.env.LOCALWEB_API_PORT ? { "/api": `http://127.0.0.1:${process.env.LOCALWEB_API_PORT}` } : undefined,
  },
});
