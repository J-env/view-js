/**
 * 发布
 * @release
 */

const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const semver = require('semver')
const { prompt } = require('enquirer')
const execa = require('execa')
const args = require('minimist')(process.argv.slice(2))

const { getPackages } = require('./utils')
const currentVersion = require('../package.json').version
const packages = getPackages(path.resolve(__dirname, '../packages'))

const prereleaseVersion = () => {
  const spcv = semver.prerelease(currentVersion)
  return spcv && spcv[0]
}

const preId = args.preid || prereleaseVersion()
const isDryRun = args.dry
const skipTests = args.skipTests
const skipBuild = args.skipBuild

const skippedPackages = []
const versionIncrements = [
  'patch',
  'minor',
  'major',
  ...(preId ? ['prepatch', 'preminor', 'premajor', 'prerelease'] : [])
]

const inc = (i) => semver.inc(currentVersion, i, preId)
const bin = (name) => path.resolve(__dirname, '../node_modules/.bin/' + name)
const run = (bin, args, opts = {}) => {
  return execa(bin, args, { stdio: 'inherit', ...opts })
}
const dryRun = (bin, args, opts = {}) => {
  return console.log(chalk.blue(`[dryrun] ${bin} ${args.join(' ')}`), opts)
}
const runIfNotDry = isDryRun ? dryRun : run

const getPkgRoot = (pkg) => path.resolve(__dirname, '../packages/' + pkg)
const step = (msg) => console.log(chalk.cyan(msg))

async function main() {
  let targetVersion = args._[0]

  if (!targetVersion) {

  }
}

main()
  .then(() => { })
  .catch((err) => {
    console.error(err)
  })
