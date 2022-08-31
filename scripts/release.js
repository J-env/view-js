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
const currentVersion = require('../package.json').version

const packages = fs.readdirSync(path.resolve(__dirname, '../packages'))
  .filter(p => !p.endsWith('.ts') && !p.startsWith('.'))

const prereleaseVersion = () => {
  const spcv = semver.prerelease(currentVersion)
  return spcv && spcv[0]
}

const preId = args.preid || prereleaseVersion()
const isDryRun = args.dry
const skipTests = args.skipTests
const skipBuild = args.skipBuild

const skippedPackages = []

// '0.0.1-0' => 'major.minor.patch-pre()' => '大号.中号.小号-预发布号'
const versionIncrements = [
  'patch', // 补丁版本 - 小修复
  'minor', // 小版本
  'major', // 大版本
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

// run...
main()
  .then(() => { })
  .catch((err) => {
    updateVersions(currentVersion)
    console.error(err)
  })

async function main() {
  let targetVersion = args._[0]

  if (!targetVersion) {
    // no explicit version, offer suggestions
    const { release } = await prompt({
      type: 'select',
      name: 'release',
      message: 'Select release type',
      choices: versionIncrements.map(i => `${i} (${inc(i)})`).concat(['custom'])
    })

    if (release === 'custom') {
      targetVersion = (
        await prompt({
          type: 'input',
          name: 'version',
          message: 'Input custom version',
          initial: currentVersion
        })
      ).version

    } else {
      targetVersion = release.match(/\((.*)\)/)[1]
    }
  }

  if (!semver.valid(targetVersion)) {
    throw new Error(`invalid target version: ${targetVersion}`)
  }

  const { yes } = await prompt({
    type: 'confirm',
    name: 'yes',
    message: `Releasing v${targetVersion}. Confirm?`
  })

  if (!yes) {
    return
  }

  await (Promise.resolve(null)
    .then(() => runTests())
    .then(() => runUpdateVersions())
    .then(() => runBuilding())
    .then(() => runChangeLog())
    .then(() => runGitCommit())
    .then(() => runPublishPackage())
    .then(() => runPushGithub())
  )
}

// =======================================================================
async function runTests() {
  // run tests before release
  step('\nRunning tests (jest)...')

  if (!skipTests && !isDryRun) {
    // jest --clearCache
    await run(bin('jest'), ['--clearCache'])
    // pnpm test --bail
    await run('pnpm', ['test', '--bail'])

  } else {
    console.log(`(skipped)`)
  }
}

async function runUpdateVersions() {
  step('\nUpdating cross dependencies...')
  updateVersions(targetVersion)
}

async function runBuilding() {
  step('\nBuilding all packages...')

  if (!skipBuild && !isDryRun) {
    step('\nVerifying type declarations...')
    // pnpm run tsc
    await run('pnpm', ['run', 'tsc'])

    // pnpm run build --release
    await run('pnpm', ['run', 'build', '--release'])

  } else {
    console.log(`(skipped)`)
  }
}

async function runChangeLog() {
  step('\nGenerating changelog...')
  // pnpm run changelog
  await run('pnpm', ['run', 'changelog'])

  step('\nUpdating lockfile...')
  // pnpm install --prefer-offline
  await run('pnpm', ['install', '--prefer-offline'])
}

async function runGitCommit() {
  const { stdout } = await run('git', ['diff'], { stdio: 'pipe' })

  if (stdout) {
    step('\nCommitting changes...')

    await runIfNotDry('git', ['add', '-A'])
    await runIfNotDry('git', ['commit', '-m', `release: v${targetVersion}`])

  } else {
    console.log('No changes to commit.')
  }
}

async function runPublishPackage() {
  step('\nPublishing packages...')

  for (const pkg of packages) {
    await publishPackage(pkg, targetVersion, runIfNotDry)
  }
}

async function runPushGithub() {
  step('\nPushing to GitHub...')

  await runIfNotDry('git', ['tag', `v${targetVersion}`])
  await runIfNotDry('git', ['push', 'origin', `refs/tags/v${targetVersion}`])
  await runIfNotDry('git', ['push'])

  if (isDryRun) {
    console.log(`\nDry run finished - run git diff to see package changes.`)
  }

  if (skippedPackages.length) {
    console.log(
      chalk.yellow(
        `The following packages are skipped and NOT published:\n- ${skippedPackages.join(
          '\n- '
        )}`
      )
    )
  }

  console.log()
}

// =======================================================================
function updateVersions(version) {
  // 1. update root package.json
  updatePackage(path.resolve(__dirname, '..'), version)
  // 2. update all packages
  packages.forEach(p => updatePackage(getPkgRoot(p), version))
}

function updatePackage(pkgRoot, version) {
  const pkgPath = path.resolve(pkgRoot, 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))

  pkg.version = version
  updateDeps(pkg, 'dependencies', version)
  updateDeps(pkg, 'peerDependencies', version)

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
}

function updateDeps(pkg, depType, version) {
  const deps = pkg[depType]

  if (!deps) return

  Object.keys(deps).forEach(dep => {
    if (
      dep === 'view-js' ||
      (dep.startsWith('@view-js') && packages.includes(dep.replace(/^@view-js\//, '')))
    ) {
      console.log(
        chalk.yellow(`${pkg.name} -> ${depType} -> ${dep}@${version}`)
      )

      deps[dep] = version
    }
  })
}

async function publishPackage(pkgName, version, runIfNotDry) {
  if (skippedPackages.includes(pkgName)) {
    return
  }

  const pkgRoot = getPkgRoot(pkgName)
  const pkgPath = path.resolve(pkgRoot, 'package.json')
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))

  if (pkg.private) {
    return
  }

  let releaseTag = null

  if (args.tag) {
    releaseTag = args.tag
  } else if (version.includes('alpha')) {
    releaseTag = 'alpha'
  } else if (version.includes('beta')) {
    releaseTag = 'beta'
  } else if (version.includes('rc')) {
    releaseTag = 'rc'
  }

  step(`Publishing ${pkgName}...`)

  try {
    // yarn publish --new-version 1.0.0 --tag alpha --access public

    await runIfNotDry(
      // note: use of yarn is intentional here as we rely on its publishing behavior.
      'yarn',
      [
        'publish',
        '--new-version',
        version,
        ...(releaseTag ? ['--tag', releaseTag] : []),
        '--access',
        'public'
      ],
      {
        cwd: pkgRoot,
        stdio: 'pipe'
      }
    )

    console.log(chalk.green(`Successfully published ${pkgName}@${version}`))

  } catch (e) {
    if (e.stderr.match(/previously published/)) {
      console.log(chalk.red(`Skipping already published: ${pkgName}`))

    } else {
      throw e
    }
  }
}
