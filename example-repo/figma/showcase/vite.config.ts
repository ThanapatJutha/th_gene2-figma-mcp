import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Showcase lives in figma/showcase/ — resolve "@" to the project's src/ directory
// so that showcase pages can import real components: import { Button } from "@/components/Button"
const projectRoot = new URL("../..", import.meta.url).pathname;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": `${projectRoot}/src`,
    },
  },
  server: {
    port: 5173,
  },
});
