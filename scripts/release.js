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
