import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // autobones is linked from ../.. (file: dependency), and that folder has its own copy of
  // React for development. Make sure the app and the library share one copy.
  resolve: { dedupe: ["react", "react-dom"] },
});
