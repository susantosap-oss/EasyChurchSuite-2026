import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const here = dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export only for Capacitor mobile build
  ...(process.env.CAPACITOR_BUILD === '1' ? { output: 'export' } : { output: 'standalone' }),
  // Packaging builds into a separate folder so a running `next dev` (.next) is not disturbed
  distDir: process.env.NEXT_DIST_DIR || '.next',
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_TELEMETRY_DISABLED: '1' },
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
    // pnpm monorepo: trace dependencies from the workspace root
    outputFileTracingRoot: join(here, '../..'),
    // Read with fs at runtime, so file tracing cannot see it
    outputFileTracingIncludes: {
      '/api/pdf-worker': ['./node_modules/pdfjs-dist/build/pdf.worker.min.js'],
    },
  },
  webpack: (config) => {
    // pdfjs-dist optionally requires the native "canvas" package (Node only) — not needed in the browser
    config.resolve.alias.canvas = false
    return config
  },
}

export default nextConfig
