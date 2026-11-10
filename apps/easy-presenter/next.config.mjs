/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export only for Capacitor mobile build
  ...(process.env.CAPACITOR_BUILD === '1' ? { output: 'export' } : {}),
  trailingSlash: true,
  images: { unoptimized: true },
  serverComponentsExternalPackages: ['better-sqlite3'],
  env: { NEXT_TELEMETRY_DISABLED: '1' },
}

export default nextConfig
