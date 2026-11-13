/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export only for Capacitor mobile build
  ...(process.env.CAPACITOR_BUILD === '1' ? { output: 'export' } : {}),
  trailingSlash: true,
  images: { unoptimized: true },
  serverComponentsExternalPackages: ['better-sqlite3'],
  env: { NEXT_TELEMETRY_DISABLED: '1' },
  webpack: (config) => {
    // pdfjs-dist optionally requires the native "canvas" package (Node only) — not needed in the browser
    config.resolve.alias.canvas = false
    return config
  },
}

export default nextConfig
