import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // `localweb dev` passes the API port; the fallback matches standalone `bun run server`.
      "/api": `http://127.0.0.1:${process.env.LOCALWEB_API_PORT ?? "4192"}`,
    },
  },
});
