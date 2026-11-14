// Builds the Windows installer (release/EasyChurch-Suite-Setup-<version>.exe).
//   node scripts/pack.cjs            full build
//   node scripts/pack.cjs --no-next  reuse the existing .next-prod build
//
// Needs (not in git, see vendor/):
//   vendor/ffmpeg/ffmpeg.exe              FFmpeg essentials build (gyan.dev)
//   vendor/seed/easy_bible.db             node scripts/make-seed.cjs
//   vendor/better-sqlite3/better_sqlite3.node   prebuild for Electron's ABI
//                                         (better-sqlite3-v<ver>-electron-v<abi>-win32-x64.tar.gz)
//
// The app is assembled in release/stage with a dependency-free package.json, so electron-builder
// packs only the Electron main process; the Next.js server ships as plain files in resources/server.
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const root    = path.resolve(__dirname, '..')
const distDir = path.join(root, '.next-prod')
const release = path.join(root, 'release')
const stage   = path.join(release, 'stage')
const vendor  = path.join(root, 'vendor')
const pkg     = require(path.join(root, 'package.json'))
const electronVersion = require(path.join(root, 'node_modules/electron/package.json')).version

const step = msg => console.log(`\n▶ ${msg}`)
const run = (cmd, args, env = {}) =>
  execFileSync(cmd, args, { cwd: root, stdio: 'inherit', env: { ...process.env, ...env } })

function requireFile(p, hint) {
  if (!fs.existsSync(p)) { console.error(`✖ Missing ${path.relative(root, p)} — ${hint}`); process.exit(1) }
}
requireFile(path.join(vendor, 'ffmpeg/ffmpeg.exe'), 'extract ffmpeg.exe from the gyan.dev essentials zip')
requireFile(path.join(vendor, 'seed/easy_bible.db'), 'run: node scripts/make-seed.cjs')
requireFile(path.join(vendor, 'better-sqlite3/better_sqlite3.node'), 'download the Electron prebuild of better-sqlite3')

function findFiles(dir, name, found = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) findFiles(p, name, found)
    else if (e.name === name) found.push(p)
  }
  return found
}

/**
 * symlink-as-copy turns pnpm's links into copies, so a package no longer sees its siblings in
 * .pnpm/<pkg>/node_modules (next → styled-jsx …). Flatten every package into server/node_modules,
 * where Node finds it by walking up, and drop the duplicates.
 */
function hoistPnpm(serverDir) {
  const flat = path.join(serverDir, 'node_modules')
  const store = path.join(flat, '.pnpm')
  const hoisted = new Set()
  const pkgDirs = dir => fs.readdirSync(dir).flatMap(n =>
    n.startsWith('@') ? fs.readdirSync(path.join(dir, n)).map(s => `${n}/${s}`) : n.startsWith('.') ? [] : [n])
  for (const entry of fs.readdirSync(store)) {
    const nm = path.join(store, entry, 'node_modules')
    if (!fs.existsSync(nm)) continue
    for (const name of pkgDirs(nm)) {
      const dest = path.join(flat, name)
      if (hoisted.has(name)) continue
      fs.cpSync(path.join(nm, name), dest, { recursive: true, dereference: true })
      hoisted.add(name)
    }
  }
  fs.rmSync(store, { recursive: true, force: true })
  // The app's own node_modules holds copies of the same packages — keep only what was not hoisted
  const appNm = path.join(serverDir, 'apps/easy-presenter/node_modules')
  if (fs.existsSync(appNm)) {
    for (const name of pkgDirs(appNm)) if (hoisted.has(name)) fs.rmSync(path.join(appNm, name), { recursive: true, force: true })
  }
  console.log(`  hoisted packages: ${hoisted.size}`)
}

if (!process.argv.includes('--no-next')) {
  step('next build → .next-prod')
  fs.rmSync(distDir, { recursive: true, force: true })
  run(process.execPath, [require.resolve('next/dist/bin/next', { paths: [root] }), 'build'], {
    NEXT_DIST_DIR: '.next-prod',
    NODE_OPTIONS: `--require=${path.join(__dirname, 'symlink-as-copy.cjs').replace(/\\/g, '/')}`,
  })
}

step('electron main → dist-electron')
run(process.execPath, [require.resolve('typescript/bin/tsc', { paths: [root] }), '-p', 'tsconfig.electron.json'])

step('staging')
fs.rmSync(release, { recursive: true, force: true })
const server = path.join(stage, 'server')
fs.cpSync(path.join(distDir, 'standalone'), server, { recursive: true, dereference: true })
// Standalone output leaves static assets to the deployer
fs.cpSync(path.join(distDir, 'static'), path.join(server, 'apps/easy-presenter/.next-prod/static'), { recursive: true })
// File tracing picks up the dev database (with test data); the app uses resources/seed instead
fs.rmSync(path.join(server, 'data'), { recursive: true, force: true })
hoistPnpm(server)
// better-sqlite3 was compiled for system Node; the server runs on Electron's Node
const nativeModules = findFiles(server, 'better_sqlite3.node')
for (const f of nativeModules) fs.copyFileSync(path.join(vendor, 'better-sqlite3/better_sqlite3.node'), f)
console.log(`  better_sqlite3.node replaced: ${nativeModules.length}`)
fs.cpSync(path.join(vendor, 'ffmpeg'), path.join(stage, 'ffmpeg'), { recursive: true })
fs.cpSync(path.join(vendor, 'seed'), path.join(stage, 'seed'), { recursive: true })
fs.cpSync(path.join(root, 'dist-electron'), path.join(stage, 'dist-electron'), { recursive: true })
// Icon for the phone remote page (home-screen icon), read by the main process
fs.mkdirSync(path.join(stage, 'assets'), { recursive: true })
fs.copyFileSync(path.join(root, 'build/icon.png'), path.join(stage, 'assets/icon.png'))
fs.writeFileSync(path.join(stage, 'package.json'), JSON.stringify({
  name: 'easychurch-suite',
  productName: 'EasyChurch Suite',
  version: pkg.version,
  description: 'EasyChurch Suite — presentasi ibadah',
  author: 'EasyChurch',
  main: 'dist-electron/main.js',
}, null, 2))

step('electron-builder (NSIS x64)')
// Regenerate with: npx electron scripts/make-icon.cjs (from build/icon.svg)
const icon = path.join(root, 'build/icon.ico')
const config = {
  appId: 'id.easychurch.suite',
  productName: 'EasyChurch Suite',
  electronVersion,
  electronDist: path.join(root, 'node_modules/electron/dist'),
  directories: { app: stage, output: release },
  files: ['dist-electron/**/*', 'assets/**/*', 'package.json'],
  extraResources: ['server', 'ffmpeg', 'seed'].map(d => ({ from: path.join(stage, d), to: d, filter: ['**/*'] })),
  npmRebuild: false,
  win: { target: [{ target: 'nsis', arch: ['x64'] }], icon },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    shortcutName: 'EasyChurch Suite',
    installerIcon: icon,
    uninstallerIcon: icon,
    installerHeaderIcon: icon,
    uninstallDisplayName: 'EasyChurch Suite',
    artifactName: 'EasyChurch-Suite-Setup-${version}.${ext}',
  },
}
const configPath = path.join(release, 'builder.json')
fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
run(process.execPath, [require.resolve('electron-builder/cli.js', { paths: [root] }), '--win', '--x64', '--config', configPath, '--projectDir', stage])

console.log(`\n✔ ${path.join(release, `EasyChurch-Suite-Setup-${pkg.version}.exe`)}`)
