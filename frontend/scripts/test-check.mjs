#!/usr/bin/env node
/**
 * Run vitest and judge it against the checked-in known-failure list.
 *
 * Eleven tests have failed on main since Stage 7. Before this script every work order
 * carried them verbatim in its KNOWN TEST FAILURES block, and every reconcile compared
 * the run to that block name-for-name by hand — a step that is easy to skip and easy to
 * get wrong, and which silently rots as tests are fixed.
 *
 * Here the list lives in one place (`known-test-failures.json`) and the comparison is
 * mechanical: this exits 0 when every failure is already known, and 1 the moment a NEW
 * one appears. An executor's targeted stop-check is therefore one command with no list
 * to carry, and a regression is caught by the tool rather than by a human diff.
 *
 * Usage:
 *   npm run test:check                       all tests
 *   npm run test:check -- src/x.test.tsx     one file (the shape a work order's STOP WHEN uses)
 *   npm run test:check -- --strict           also fail on stale entries (reconcile, once per stage)
 *
 * Filters are matched against paths relative to frontend/. A filter that matches nothing used to
 * print PASS on an empty run — so `-- frontend/src/x.test.tsx` (the repo-relative path, one
 * plausible slip) reported green having executed no tests at all. An empty run is now a failure.
 */

import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const frontendRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const listPath = join(frontendRoot, 'known-test-failures.json')

const argv = process.argv.slice(2)
const strict = argv.includes('--strict')
const vitestArgs = argv.filter((arg) => arg !== '--strict')

const knownList = JSON.parse(readFileSync(listPath, 'utf8'))
const known = new Map(knownList.failures.map((entry) => [entry.test, entry.reason]))
// Flaky entries fail intermittently on the same commit, so a green run says nothing about
// them. Judging them stale would delete the entry and turn the next red run into what looks
// like a fresh regression.
const flaky = new Set(knownList.failures.filter((entry) => entry.flaky).map((e) => e.test))

const workDir = mkdtempSync(join(tmpdir(), 'test-check-'))
const reportPath = join(workDir, 'vitest.json')

/** '<path from frontend/> :: <full test name>' — stable across machines. */
const identify = (filePath, fullName) =>
  `${relative(frontendRoot, filePath).split('\\').join('/')} :: ${fullName}`

try {
  const run = spawnSync(
    process.execPath,
    [
      join(frontendRoot, 'node_modules', 'vitest', 'vitest.mjs'),
      'run',
      '--silent=passed-only',
      '--reporter=verbose',
      '--reporter=json',
      `--outputFile.json=${reportPath}`,
      ...vitestArgs,
    ],
    { cwd: frontendRoot, stdio: ['ignore', 'inherit', 'inherit'] },
  )

  let report
  try {
    report = JSON.parse(readFileSync(reportPath, 'utf8'))
  } catch {
    console.error(
      '\ntest:check could not read a vitest JSON report — the run itself failed to start.',
    )
    process.exit(run.status === 0 ? 1 : (run.status ?? 1))
  }

  // A run that executed no test file proves nothing, so it can never be a pass. The usual cause is
  // a filter that matched no path; the message names them because the filter, not the suite, is
  // what has to change.
  if ((report.testResults ?? []).length === 0) {
    const filters = vitestArgs.filter((arg) => !arg.startsWith('-'))
    console.error('\ntest:check ran no test files, so there is nothing to judge.')
    if (filters.length > 0) {
      console.error(`\nNothing matched: ${filters.join(', ')}`)
      console.error(
        'Filters are matched against paths relative to frontend/ — pass src/player/x.test.tsx,\n' +
          'not frontend/src/player/x.test.tsx.',
      )
    }
    process.exit(1)
  }

  const actual = new Map()
  for (const suite of report.testResults ?? []) {
    let failedAssertions = 0
    for (const assertion of suite.assertionResults ?? []) {
      if (assertion.status !== 'failed') continue
      failedAssertions += 1
      actual.set(identify(suite.name, assertion.fullName), assertion.failureMessages ?? [])
    }
    // A file that throws on import reports no assertions at all; that is still a failure.
    if (suite.status === 'failed' && failedAssertions === 0) {
      actual.set(identify(suite.name, '<suite failed to run>'), [suite.message ?? ''])
    }
  }

  const isNew = (id) => !known.has(id)
  const newFailures = [...actual.keys()].filter(isNew).sort()
  // Only entries the run actually covered can be judged stale: a filtered run does not
  // execute the rest of the list, and absence there means "not run", not "now passing".
  const ranFiles = new Set(
    (report.testResults ?? []).map((suite) =>
      relative(frontendRoot, suite.name).split('\\').join('/'),
    ),
  )
  const stale = [...known.keys()]
    .filter((id) => ranFiles.has(id.split(' :: ')[0]) && !actual.has(id) && !flaky.has(id))
    .sort()

  const total = report.numTotalTests ?? 0
  const failed = actual.size
  console.log(
    `\ntest:check — ${total} tests, ${failed} failing, ` +
      `${failed - newFailures.length} of them already known.`,
  )

  if (newFailures.length > 0) {
    console.error(`\n${newFailures.length} NEW failure(s) — not in known-test-failures.json:\n`)
    for (const id of newFailures) {
      console.error(`  ✗ ${id}`)
      const [message] = actual.get(id) ?? []
      if (message) console.error(`      ${message.split('\n')[0]}`)
    }
    console.error('\nThese are yours. Fix them, or justify them into known-test-failures.json.')
    process.exit(1)
  }

  if (stale.length > 0) {
    const label = strict ? 'ERROR' : 'note'
    const report_ = strict ? console.error : console.log
    report_(`\n${label}: ${stale.length} known failure(s) now pass — prune the list:\n`)
    for (const id of stale) report_(`  ✓ ${id}`)
    if (strict) {
      report_('\nRemove them from known-test-failures.json (run once per stage at reconcile).')
      process.exit(1)
    }
  }

  // vitest's own exit code is deliberately ignored while a known failure explains it — swallowing
  // that is this script's whole job. An exit code with no failing test behind it is something else
  // (a config error, an unhandled rejection, an empty filtered run) and must not read as green.
  if (run.status !== 0 && actual.size === 0) {
    console.error(
      `\ntest:check — vitest exited ${run.status} with no failing test to explain it; treating the run as failed.`,
    )
    process.exit(run.status ?? 1)
  }

  console.log('\ntest:check PASS — no new failures.')
  process.exit(0)
} finally {
  rmSync(workDir, { recursive: true, force: true })
}
