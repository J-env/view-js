// create package.json, README, etc. for packages that don't have them yet

const fs = require('fs')
const path = require('path')
const args = require('minimist')(process.argv.slice(2))

const indexJson = require('../package.json')

const packagesDir = path.resolve(__dirname, '../packages')
const files = fs.readdirSync(packagesDir)

const __force = args.force

files.forEach((shortName) => {
  const joinPath = (p) => path.join(packagesDir, shortName, p)

  if (!fs.statSync(joinPath('')).isDirectory()) {
    return
  }

  const name = shortName === `view-js` ? shortName : `@view-js/${shortName}`
  const pkgPath = joinPath(`package.json`)
  const pkgExists = fs.existsSync(pkgPath)

  let pkg_json = {}

  if (pkgExists) {
    pkg_json = require(pkgPath)

    if (pkg_json.private) {
      return
    }
  }

  // package.json
  pkg_json.name = name
  pkg_json.version = indexJson.version
  pkg_json.description = pkg_json.description || name
  pkg_json.main = pkg_json.main || 'index.js'
  pkg_json.module = `dist/${shortName}.esm-bundler.js`
  pkg_json.types = `dist/${shortName}.d.ts`

  const files = new Set(['index.js', 'dist', ...(pkg_json.files || [])])
  pkg_json.files = [...files]
  pkg_json.sideEffects = pkg_json.sideEffects || false
  pkg_json.scripts = pkg_json.scripts || {}
  pkg_json.dependencies = pkg_json.dependencies || {}
  pkg_json.devDependencies = pkg_json.devDependencies || {}

  pkg_json.keywords = indexJson.keywords
  pkg_json.repository = {
    ...indexJson.repository,
    directory: `packages/${shortName}`
  }
  pkg_json.bugs = indexJson.bugs
  pkg_json.homepage = indexJson.homepage || `https://github.com/J-env/view-js/tree/master/packages/${shortName}#readme`
  pkg_json.author = indexJson.author
  pkg_json.license = indexJson.license

  fs.writeFileSync(pkgPath, JSON.stringify(pkg_json, null, 2))

  // README.md
  const readmePath = joinPath(`README.md`)
  if (__force || !fs.existsSync(readmePath)) {
    fs.writeFileSync(readmePath, `# ${name}`)
  }

  // api-extractor.json
  const apiExtractorConfigPath = joinPath(`api-extractor.json`)

  if (__force || !fs.existsSync(apiExtractorConfigPath)) {
    const api_json = {
      extends: `../../api-extractor.json`,
      mainEntryPointFilePath: `./dist/packages/<unscopedPackageName>/src/index.d.ts`,
      dtsRollup: {
        publicTrimmedFilePath: `./dist/<unscopedPackageName>.d.ts`
      }
    }

    fs.writeFileSync(apiExtractorConfigPath, JSON.stringify(api_json, null, 2))
  }

  // src
  const srcDir = joinPath(`src`)
  const indexPath = joinPath(`src/index.ts`)

  if (__force || !fs.existsSync(indexPath)) {
    if (!fs.existsSync(srcDir)) {
      fs.mkdirSync(srcDir)
    }

    fs.writeFileSync(indexPath, `console.log('${name}')`)
  }

  // index.js
  const nodeIndexPath = joinPath('index.js')

  if (__force || !fs.existsSync(nodeIndexPath)) {
    fs.writeFileSync(
      nodeIndexPath,
      `
'use strict'

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./dist/${shortName}.cjs.prod.js')
} else {
  module.exports = require('./dist/${shortName}.cjs.js')
}
    `.trim() + '\n'
    )
  }
})
