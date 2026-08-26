/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Static export: this app has no API routes, no server actions, no
  // cookies/rewrites/redirects — everything runs client-side against
  // Supabase (see lib/supabaseClient.ts), so it doesn't need a Node server.
  // `next build` emits plain HTML/CSS/JS into `out/`, servable from GitHub
  // Pages (or any static host).
  output: "export",

  // GitHub Pages serves a project site at https://<user>.github.io/<repo>/,
  // not at the domain root, so every asset/link needs that repo-name
  // prefix. The GitHub Actions workflow sets PAGES_BASE_PATH from
  // actions/configure-pages' output; locally (`npm run build`,
  // `npm run dev`) it's unset, so basePath is "" and the app behaves
  // exactly as before.
  basePath: process.env.PAGES_BASE_PATH ?? "",

  // Matches the URLs GitHub Pages actually serves for a static export
  // (/staff/index.html via /staff/, not /staff.html via /staff).
  trailingSlash: true,

  // The default Image Optimization loader needs a Node server, which a
  // static export doesn't have. Unused today (no next/image in this app)
  // but harmless to set now rather than hit a build error the day someone
  // adds an <Image>.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
