import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'ghost.svg'],
      manifest: {
        name: 'Scary Movie Project',
        short_name: 'ScaryMovies',
        description: 'Track your family movie nights 👻',
        theme_color: '#292524',
        icons: [
          {
            src: 'ghost.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  base: mode === "production" ? "/scary-movie-project/" : "/",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));