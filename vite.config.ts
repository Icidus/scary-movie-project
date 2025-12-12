import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === "production" ? "/scary-movie-project/" : "/", // "/" in dev, subpath in prod
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));