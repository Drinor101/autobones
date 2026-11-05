import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

// Link previews (X, LinkedIn, Slack, Reddit) need an absolute image URL. Netlify exposes the
// site's address as URL while building, so the real address ends up in the HTML. Locally it stays relative.
const siteUrl = (process.env.URL ?? process.env.SITE_URL ?? "").replace(/\/$/, "");
const absoluteUrls = (): Plugin => ({
  name: "site-url",
  transformIndexHtml: (html) => html.replaceAll("__SITE_URL__", siteUrl),
});

export default defineConfig({
  plugins: [react(), absoluteUrls()],
  // autobones is linked from ".." (file: dependency), and that folder has its own copy of React
  // for development. Make sure the site and the library share one copy.
  resolve: { dedupe: ["react", "react-dom"] },
});
