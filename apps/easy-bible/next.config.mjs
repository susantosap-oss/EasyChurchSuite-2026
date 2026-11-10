// CAPACITOR_BUILD=1 → static export (no API routes) for Capacitor native build
// default (dev + web) → normal Next.js with API routes + better-sqlite3
const isCapacitorBuild = process.env.CAPACITOR_BUILD === '1'

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(isCapacitorBuild && { output: 'export', trailingSlash: true }),
  images: { unoptimized: true },
  env: { NEXT_TELEMETRY_DISABLED: '1' },
  // Suppress punycode deprecation warning from Next.js internals
  experimental: { serverComponentsExternalPackages: ['better-sqlite3'] },
}

export default nextConfig
