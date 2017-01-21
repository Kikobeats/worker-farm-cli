#!/usr/bin/env node

'use strict'

const pkg = require('../../package.json')
require('update-notifier')({pkg}).notify()
const debug = require('debug')(pkg.name)

const workerFarm = require('worker-farm')
const range = require('lodash.range')
const minimist = require('minimist')
const series = require('run-series')
const path = require('path')

const getNumWorkers = require('../get-num-workers')
const getWorkerArgs = require('../get-worker-args')
const getFarmArgs = require('../get-farm-args')
const parseArgs = require('../parse-args')

const processArgv = process.argv.slice(2)
const argv = parseArgs(processArgv)
const cli = getFarmArgs(argv.farm)

const [filename] = cli.input
if (!filename) cli.showHelp()

const {file: fileOpts} = argv
const {flags: farmOpts} = cli
const {delayBetweenWorkers} = farmOpts
const numWorkers = getNumWorkers(farmOpts)
const workersRange = range(numWorkers)

const spawnWorkers = workersRange.map(function (worker) {
  const workerArgs = getWorkerArgs(fileOpts, worker)
  return spawnWorkerDelay(workerArgs, delayBetweenWorkers)
})

function spawnWorkerDelay (args, delay) {
  function spawnWorker (cb) {
    const parsedArgs = minimist(args)
    debug('spawning', parsedArgs)
    farm(parsedArgs, process.exit)
    setTimeout(cb, delay)
  }

  return spawnWorker
}

const filePath = path.resolve(filename)
const farm = workerFarm(farmOpts, filePath)

debug('starting')
series(spawnWorkers, function () {
  workerFarm.end(farm)
  debug('finished')
})
