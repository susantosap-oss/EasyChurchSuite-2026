// Preload for `next build` on Windows without Developer Mode:
// Next's standalone output recreates pnpm symlinks, which needs symlink privileges.
// Copy the link target instead — the installer needs real files anyway.
const fs = require('fs')
const path = require('path')

async function copyInstead(target, dest) {
  const src = path.resolve(path.dirname(dest), String(target))
  await fs.promises.cp(src, dest, { recursive: true, dereference: true, force: true, errorOnExist: false })
}

fs.promises.symlink = copyInstead
fs.symlink = (target, dest, type, cb) => {
  const done = typeof type === 'function' ? type : cb
  copyInstead(target, dest).then(() => done && done(null), err => done && done(err))
}
fs.symlinkSync = (target, dest) => {
  fs.cpSync(path.resolve(path.dirname(dest), String(target)), dest, { recursive: true, dereference: true, force: true })
}
