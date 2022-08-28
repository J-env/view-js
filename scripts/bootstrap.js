// create package.json, README, etc. for packages that don't have them yet

const fs = require('fs')
const path = require('path')
const args = require('minimist')(process.argv.slice(2))

const indexJson = require('../package.json')

const packagesDir = path.resolve(__dirname, '../packages')
const files = fs.readdirSync(packagesDir)

files.forEach((shortName) => {
  const joinPath = (p) => path.join(packagesDir, shortName, p)

  if (!fs.statSync(joinPath('')).isDirectory()) {
    return
  }

  const name = shortName === `view-js` ? shortName : `@view-js/${shortName}`
  const pkgPath = joinPath(`package.json`)
  const pkgExists = fs.existsSync(pkgPath)

  if (pkgExists) {
    const pkg = require(pkgPath)

    if (pkg.private) {
      return
    }
  }

  // package.json
  if (args.force || !pkgExists) {
    const json = {
      name,
      version: indexJson.version,
      description: name,
      main: 'index.js',
      module: `dist/${shortName}.esm-bundler.js`,
      files: [`index.js`, `dist`],
      types: `dist/${shortName}.d.ts`,
      repository: {
        ...indexJson.repository,
        directory: `packages/${shortName}`
      },
      bugs: indexJson.bugs,
      keywords: indexJson.keywords,
      author: indexJson.author,
      license: indexJson.license,
      homepage: `https://github.com/J-env/view-js/tree/main/packages/${shortName}#readme`
    }

    fs.writeFileSync(pkgPath, JSON.stringify(json, null, 2))
  }

  // README.md
  const readmePath = joinPath(`README.md`)
  if (args.force || !fs.existsSync(readmePath)) {
    fs.writeFileSync(readmePath, `# ${name}`)
  }

  // api-extractor.json
  const apiExtractorConfigPath = joinPath(`api-extractor.json`)

  if (args.force || !fs.existsSync(apiExtractorConfigPath)) {
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

  if (args.force || !fs.existsSync(indexPath)) {
    if (!fs.existsSync(srcDir)) {
      fs.mkdirSync(srcDir)
    }

    fs.writeFileSync(indexPath, `console.log('${name}')`)
  }

  // index.js
  const nodeIndexPath = joinPath('index.js')

  if (args.force || !fs.existsSync(nodeIndexPath)) {
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
