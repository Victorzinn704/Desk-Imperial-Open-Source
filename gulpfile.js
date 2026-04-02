'use strict'

const gulp = require('gulp')
const path = require('path')
const fs = require('fs')
const { deleteAsync } = require('del')
const sharp = require('sharp')

// ─── Paths ────────────────────────────────────────────────────────────────────

const PATHS = {
  publicSrc: 'apps/web/public',
  buildArtifacts: [
    'apps/web/.next',
    'apps/web/out',
    'apps/api/dist',
  ],
}

// ─── Clean ────────────────────────────────────────────────────────────────────

async function clean() {
  const deleted = await deleteAsync(PATHS.buildArtifacts, { force: true })
  if (deleted.length) {
    console.log(`🗑  Removed ${deleted.length} artifact(s)`)
  } else {
    console.log('✓  Nothing to clean')
  }
}

// ─── Images: compress ─────────────────────────────────────────────────────────

async function imagesCompress() {
  const publicDir = path.resolve(PATHS.publicSrc)
  const files = fs.readdirSync(publicDir).filter((f) => /\.(jpg|jpeg|png)$/i.test(f))

  if (!files.length) {
    console.log('✓  No images to compress')
    return
  }

  for (const file of files) {
    const input = path.join(publicDir, file)
    const ext = path.extname(file).toLowerCase()
    const stats = fs.statSync(input)
    const beforeKB = (stats.size / 1024).toFixed(1)

    const tmp = input + '.tmp'

    if (ext === '.jpg' || ext === '.jpeg') {
      await sharp(input).jpeg({ quality: 82, progressive: true, mozjpeg: true }).toFile(tmp)
    } else if (ext === '.png') {
      await sharp(input).png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(tmp)
    }

    const afterKB = (fs.statSync(tmp).size / 1024).toFixed(1)
    fs.renameSync(tmp, input)
    console.log(`  ${file}: ${beforeKB} KB → ${afterKB} KB`)
  }
}

// ─── Images: generate WebP ────────────────────────────────────────────────────

async function imagesWebp() {
  const publicDir = path.resolve(PATHS.publicSrc)
  const files = fs.readdirSync(publicDir).filter((f) => /\.(jpg|jpeg|png)$/i.test(f))

  if (!files.length) {
    console.log('✓  No images to convert')
    return
  }

  for (const file of files) {
    const input = path.join(publicDir, file)
    const output = path.join(publicDir, path.basename(file, path.extname(file)) + '.webp')

    if (fs.existsSync(output)) {
      const srcMtime = fs.statSync(input).mtime
      const webpMtime = fs.statSync(output).mtime
      if (webpMtime >= srcMtime) {
        console.log(`  ↩  ${path.basename(output)} already up to date`)
        continue
      }
    }

    await sharp(input).webp({ quality: 85 }).toFile(output)
    const sizeKB = (fs.statSync(output).size / 1024).toFixed(1)
    console.log(`  ✓  ${path.basename(output)} generated (${sizeKB} KB)`)
  }
}

// ─── Watch ────────────────────────────────────────────────────────────────────

function watch() {
  console.log(`👁  Watching ${PATHS.publicSrc} for image changes…`)
  gulp.watch(
    [`${PATHS.publicSrc}/**/*.{jpg,jpeg,png}`],
    { ignoreInitial: false },
    gulp.series(imagesCompress, imagesWebp)
  )
}

// ─── Composed tasks ───────────────────────────────────────────────────────────

const images = gulp.series(imagesCompress, imagesWebp)

// ─── Exports ──────────────────────────────────────────────────────────────────

exports.clean = clean
exports['images:compress'] = imagesCompress
exports['images:webp'] = imagesWebp
exports.images = images
exports.watch = watch
exports.default = images
