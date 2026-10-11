import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { validateAuditReport, KNOWN_ADVISORY, UPSTREAM_COMMIT, BASE_TARBALL, BASE_INTEGRITY } from './audit-guard.mjs'

const privateReport = JSON.parse(
  readFileSync(new URL('./fixtures/private-audit.json', import.meta.url), 'utf8').replace(/^\uFEFF/, ''),
)
const publicReport = JSON.parse(
  readFileSync(new URL('./fixtures/public-audit.json', import.meta.url), 'utf8').replace(/^\uFEFF/, ''),
)
const clone = (value) => structuredClone(value)
const digest = (label) => createHash('sha256').update(`SYNTHETIC TEST FIXTURE, NOT PATCH PROOF: ${label}`).digest('hex')

// This factory exists ONLY in tests. Deriving expected hashes/inventory from
// arbitrary current input in the real verifier would defeat its trust boundary.
function syntheticEvidence(report = privateReport) {
  const baseTreeSha256 = digest('base')
  const patchedTreeSha256 = digest('patched')
  const manifestSha256 = digest('manifest')
  const paths = report.vulnerabilities.braces.nodes
  return {
    schemaVersion: 1,
    evaluatedAt: '2026-10-11T20:10:00.000Z',
    verifiedAt: '2026-10-11T20:00:00.000Z',
    decision: {
      id: 'TEST-ONLY-NOT-AN-ACCEPTANCE',
      owner: 'test fixture',
      acceptedAt: '2026-10-11T18:00:00.000Z',
      expiresAt: '2026-10-18T18:00:00.000Z',
    },
    package: { name: 'braces', version: '3.0.3', resolved: BASE_TARBALL, integrity: BASE_INTEGRITY },
    upstreamCommit: UPSTREAM_COMMIT,
    patchSha256: digest('patch'),
    baseTreeSha256,
    patchedTreeSha256,
    manifestSha256,
    lockfile: { reviewedSha256: digest('lock'), observedSha256: digest('lock'), graphUnchanged: true },
    advisory: {
      id: 'GHSA-vfj7-8cjw-p6xm',
      reviewedRecordSha256: digest('advisory'),
      currentRecordSha256: digest('advisory'),
      retrievedAt: '2026-10-11T19:55:00.000Z',
    },
    behavior: {
      nodeMajor: 22,
      passed: true,
      suiteSha256: digest('regression'),
      runId: 'TEST-NOT-EXECUTED-UPSTREAM',
      completedAt: '2026-10-11T19:50:00.000Z',
      patchedTreeSha256,
    },
    inventory: {
      complete: true,
      expectedPaths: [...paths],
      discoveredPaths: [...paths],
      developmentOnlyPaths: [
        ...new Set(
          Object.values(report.vulnerabilities)
            .filter((finding) => ['high', 'critical'].includes(finding.severity))
            .flatMap((finding) => finding.nodes),
        ),
      ],
      instances: paths.map((path) => ({
        path,
        name: 'braces',
        version: '3.0.3',
        dev: true,
        isSymbolicLink: false,
        verified: true,
        baseTreeSha256,
        patchedTreeSha256,
        manifestSha256,
      })),
    },
    runtime: { validReport: true, high: 0, critical: 0, bracesInProductionGraph: false },
  }
}

function recalculate(report) {
  const counts = Object.fromEntries(['info', 'low', 'moderate', 'high', 'critical'].map((key) => [key, 0]))
  for (const finding of Object.values(report.vulnerabilities)) counts[finding.severity]++
  counts.total = Object.keys(report.vulnerabilities).length
  report.metadata.vulnerabilities = counts
}

function advisory(overrides = {}) {
  return {
    ...clone(KNOWN_ADVISORY),
    source: 999000001,
    name: 'unknown-package',
    dependency: 'unknown-package',
    url: 'https://github.com/advisories/GHSA-test-new1-high',
    title: 'Synthetic new high advisory',
    ...overrides,
  }
}

function finding(name, via, severity = 'high') {
  return {
    name,
    severity,
    isDirect: false,
    via,
    effects: [],
    range: '*',
    nodes: [`node_modules/${name}`],
    fixAvailable: false,
  }
}

function assertRejected(report, evidence, expectedCode) {
  const result = validateAuditReport(report, evidence)
  assert.equal(result.ok, false)
  assert.equal(result.decision, 'FAIL')
  assert.ok(
    result.diagnostics.some((item) => item.code === expectedCode),
    JSON.stringify(result.diagnostics),
  )
  assert.equal(result.rawReport, report)
  return result
}

for (const [label, original] of [
  ['private', privateReport],
  ['public', publicReport],
]) {
  test(`${label}: preserves original 37 findings; only verified patch mitigates the 17 high`, () => {
    const report = clone(original)
    const evidence = syntheticEvidence(report)
    const reportBefore = JSON.stringify(report)
    const evidenceBefore = JSON.stringify(evidence)
    const result = validateAuditReport(report, evidence)
    assert.equal(result.ok, true, JSON.stringify(result.diagnostics))
    assert.equal(result.decision, 'PASS_WITH_VERIFIED_BACKPORT')
    assert.equal(result.rawCounts.total, 37)
    assert.equal(result.rawCounts.high, 17)
    assert.equal(result.rawCounts.critical, 0)
    assert.equal(result.mitigatedCount, 17)
    assert.equal(result.belowThresholdFindings.length, 20)
    assert.equal(result.rawReport, report)
    assert.equal(JSON.stringify(report), reportBefore)
    assert.equal(JSON.stringify(evidence), evidenceBefore)
    assert.deepEqual(validateAuditReport(report, evidence), result)
  })
}

test('known advisory with no independent patch proof fails', () => {
  const result = assertRejected(clone(privateReport), undefined, 'PATCH_EVIDENCE_MISSING')
  assert.equal(result.mitigatedCount, 0)
})

test('a new direct high advisory cannot be covered by a valid braces patch', () => {
  const report = clone(privateReport)
  report.vulnerabilities['unknown-package'] = finding('unknown-package', [advisory()])
  recalculate(report)
  assertRejected(report, syntheticEvidence(), 'UNMITIGATED_CAUSE')
})

test('a second high advisory inside braces fails despite the known advisory also existing', () => {
  const report = clone(privateReport)
  report.vulnerabilities.braces.via.push(advisory({ name: 'braces', dependency: 'braces' }))
  const result = assertRejected(report, syntheticEvidence(), 'UNMITIGATED_CAUSE')
  assert.equal(result.mitigatedCount, 0)
})

test('a new cause mixed into a transitive parent fails', () => {
  const report = clone(privateReport)
  report.vulnerabilities.micromatch.via.push(advisory({ name: 'micromatch', dependency: 'micromatch' }))
  assertRejected(report, syntheticEvidence(), 'UNMITIGATED_CAUSE')
})

test('a new critical direct advisory always fails', () => {
  const report = clone(privateReport)
  report.vulnerabilities['unknown-package'] = finding(
    'unknown-package',
    [advisory({ severity: 'critical' })],
    'critical',
  )
  recalculate(report)
  assertRejected(report, syntheticEvidence(), 'CRITICAL_FINDING')
})

test('known advisory becoming critical is not silently accepted', () => {
  const report = clone(privateReport)
  report.vulnerabilities.braces.severity = 'critical'
  report.vulnerabilities.braces.via[0].severity = 'critical'
  recalculate(report)
  assertRejected(report, syntheticEvidence(), 'CRITICAL_FINDING')
})

for (const [label, edit, code] of [
  [
    'missing via',
    (report) => {
      delete report.vulnerabilities.braces.via
    },
    'FINDING_SCHEMA',
  ],
  [
    'empty via',
    (report) => {
      report.vulnerabilities.braces.via = []
    },
    'FINDING_SCHEMA',
  ],
  [
    'incomplete advisory',
    (report) => {
      delete report.vulnerabilities.braces.via[0].url
    },
    'ADVISORY_SCHEMA',
  ],
  [
    'missing graph target',
    (report) => {
      report.vulnerabilities.micromatch.via = ['not-present']
    },
    'MISSING_VIA_TARGET',
  ],
  [
    'high graph cycle',
    (report) => {
      report.vulnerabilities.micromatch.via = ['fast-glob']
    },
    'HIGH_GRAPH_CYCLE',
  ],
  [
    'self cycle',
    (report) => {
      report.vulnerabilities.braces.via.push('braces')
    },
    'HIGH_GRAPH_CYCLE',
  ],
  [
    'different source with same URL',
    (report) => {
      report.vulnerabilities.braces.via[0].source++
    },
    'UNMITIGATED_CAUSE',
  ],
  [
    'different URL with same source',
    (report) => {
      report.vulnerabilities.braces.via[0].url += '-other'
    },
    'UNMITIGATED_CAUSE',
  ],
  [
    'same advisory changed range',
    (report) => {
      report.vulnerabilities.braces.via[0].range = '<=3.0.4'
    },
    'UNMITIGATED_CAUSE',
  ],
  [
    'same advisory extra information',
    (report) => {
      report.vulnerabilities.braces.via[0].newAffectedPath = 'compile'
    },
    'UNMITIGATED_CAUSE',
  ],
  [
    'count mismatch',
    (report) => {
      report.metadata.vulnerabilities.high = 0
    },
    'COUNT_MISMATCH',
  ],
  [
    'missing dependency metadata',
    (report) => {
      delete report.metadata.dependencies
    },
    'DEPENDENCY_METADATA',
  ],
  [
    'error object plus findings',
    (report) => {
      report.error = { code: 'ECONNRESET' }
    },
    'REPORT_SCHEMA',
  ],
  [
    'metadata error',
    (report) => {
      report.metadata.error = { code: 'EAUDITNOLOCK' }
    },
    'REPORT_SCHEMA',
  ],
  [
    'unknown report version',
    (report) => {
      report.auditReportVersion = 99
    },
    'REPORT_SCHEMA',
  ],
  [
    'empty vulnerabilities missing schema',
    (report) => {
      delete report.vulnerabilities
    },
    'REPORT_SCHEMA',
  ],
]) {
  test(`rejects ${label}`, () => {
    const report = clone(privateReport)
    edit(report)
    assertRejected(report, syntheticEvidence(), code)
  })
}

test('a moderate label cannot hide the known high advisory', () => {
  const report = clone(privateReport)
  report.vulnerabilities.braces.severity = 'moderate'
  recalculate(report)
  assertRejected(report, syntheticEvidence(), 'SEVERITY_DOWNGRADE')
})

test('a low intermediary cannot hide a new critical advisory from a high ancestor', () => {
  const report = clone(privateReport)
  report.vulnerabilities['unknown-package'] = finding('unknown-package', [advisory({ severity: 'critical' })], 'low')
  report.vulnerabilities.micromatch.via.push('unknown-package')
  recalculate(report)
  const result = assertRejected(report, syntheticEvidence(), 'SEVERITY_DOWNGRADE')
  assert.ok(result.diagnostics.some((item) => item.code === 'UNMITIGATED_CAUSE'))
})

test('independent low/moderate findings remain visible without changing the high threshold', () => {
  const report = clone(privateReport)
  report.vulnerabilities['unknown-package'] = finding(
    'unknown-package',
    [advisory({ severity: 'moderate' })],
    'moderate',
  )
  report.vulnerabilities['low-package'] = finding(
    'low-package',
    [advisory({ name: 'low-package', dependency: 'low-package', severity: 'low' })],
    'low',
  )
  recalculate(report)
  const result = validateAuditReport(report, syntheticEvidence())
  assert.equal(result.ok, true, JSON.stringify(result.diagnostics))
  assert.equal(result.rawCounts.total, 39)
  assert.equal(result.rawCounts.low, 1)
  assert.equal(result.rawCounts.moderate, 21)
  assert.equal(result.mitigatedCount, 17)
  assert.equal(result.belowThresholdFindings.length, 22)
})

test('an unrelated moderate cause mixed into a high chain is not exempted', () => {
  const report = clone(privateReport)
  report.vulnerabilities.micromatch.via.push(advisory({ severity: 'moderate' }))
  assertRejected(report, syntheticEvidence(), 'UNMITIGATED_CAUSE')
})

for (const [label, edit, code] of [
  [
    'wrong package version',
    (evidence) => {
      evidence.package.version = '3.0.4'
    },
    'PATCH_IDENTITY',
  ],
  [
    'renamed package',
    (evidence) => {
      evidence.package.name = 'safe-braces'
    },
    'PATCH_IDENTITY',
  ],
  [
    'wrong upstream SHA',
    (evidence) => {
      evidence.upstreamCommit = 'a'.repeat(40)
    },
    'PATCH_IDENTITY',
  ],
  [
    'modified original SRI',
    (evidence) => {
      evidence.package.integrity += 'x'
    },
    'PATCH_IDENTITY',
  ],
  [
    'missing patch hash',
    (evidence) => {
      delete evidence.patchSha256
    },
    'PATCH_HASH_MISSING',
  ],
  [
    'missing manifest hash',
    (evidence) => {
      delete evidence.manifestSha256
    },
    'PATCH_HASH_MISSING',
  ],
  [
    'different lock hash',
    (evidence) => {
      evidence.lockfile.observedSha256 = digest('changed lock')
    },
    'LOCK_INTEGRITY',
  ],
  [
    'changed lock graph',
    (evidence) => {
      evidence.lockfile.graphUnchanged = false
    },
    'LOCK_INTEGRITY',
  ],
  [
    'expired decision',
    (evidence) => {
      evidence.decision.expiresAt = '2026-10-11T20:09:00.000Z'
    },
    'PATCH_EVIDENCE_EXPIRED',
  ],
  [
    'future proof',
    (evidence) => {
      evidence.verifiedAt = '2026-10-11T20:11:00.000Z'
    },
    'PATCH_EVIDENCE_EXPIRED',
  ],
  [
    'stale proof',
    (evidence) => {
      evidence.evaluatedAt = '2026-10-13T20:00:00.000Z'
    },
    'PATCH_EVIDENCE_EXPIRED',
  ],
  [
    'invalid date',
    (evidence) => {
      evidence.evaluatedAt = '2026-13-11T20:00:00.000Z'
    },
    'PATCH_EVIDENCE_EXPIRED',
  ],
  [
    'unreviewed advisory change',
    (evidence) => {
      evidence.advisory.currentRecordSha256 = digest('changed advisory')
    },
    'ADVISORY_DRIFT',
  ],
  [
    'failed regression',
    (evidence) => {
      evidence.behavior.passed = false
    },
    'REGRESSION_EVIDENCE',
  ],
  [
    'regression on different tree',
    (evidence) => {
      evidence.behavior.patchedTreeSha256 = digest('different tested tree')
    },
    'REGRESSION_EVIDENCE',
  ],
  [
    'unverified Node version',
    (evidence) => {
      evidence.behavior.nodeMajor = 24
    },
    'REGRESSION_EVIDENCE',
  ],
  [
    'incomplete disk inventory',
    (evidence) => {
      evidence.inventory.complete = false
    },
    'INVENTORY_INCOMPLETE',
  ],
  [
    'missing disk copy',
    (evidence) => {
      evidence.inventory.discoveredPaths = []
    },
    'INVENTORY_INCOMPLETE',
  ],
  [
    'extra disk copy',
    (evidence) => {
      evidence.inventory.discoveredPaths.push('apps/api/node_modules/braces')
    },
    'INVENTORY_INCOMPLETE',
  ],
  [
    'duplicate copy path',
    (evidence) => {
      evidence.inventory.instances.push(clone(evidence.inventory.instances[0]))
    },
    'INVENTORY_MISMATCH',
  ],
  [
    'modified file tree',
    (evidence) => {
      evidence.inventory.instances[0].patchedTreeSha256 = digest('tampered file')
    },
    'INSTANCE_INTEGRITY',
  ],
  [
    'instance version mismatch',
    (evidence) => {
      evidence.inventory.instances[0].version = '2.3.2'
    },
    'INSTANCE_INTEGRITY',
  ],
  [
    'runtime instance',
    (evidence) => {
      evidence.inventory.instances[0].dev = false
    },
    'INSTANCE_INTEGRITY',
  ],
  [
    'unexpected symlink',
    (evidence) => {
      evidence.inventory.instances[0].isSymbolicLink = true
    },
    'INSTANCE_INTEGRITY',
  ],
  [
    'missing dev-only path',
    (evidence) => {
      evidence.inventory.developmentOnlyPaths.pop()
    },
    'DEV_SCOPE',
  ],
  [
    'runtime high accepted by old allowlist',
    (evidence) => {
      evidence.runtime.high = 1
    },
    'RUNTIME_SCOPE',
  ],
  [
    'runtime invalid report',
    (evidence) => {
      evidence.runtime.validReport = false
    },
    'RUNTIME_SCOPE',
  ],
  [
    'braces in runtime',
    (evidence) => {
      evidence.runtime.bracesInProductionGraph = true
    },
    'RUNTIME_SCOPE',
  ],
]) {
  test(`rejects patch evidence: ${label}`, () => {
    const evidence = syntheticEvidence()
    edit(evidence)
    const result = assertRejected(clone(privateReport), evidence, code)
    assert.equal(result.evidenceValidated, false)
    assert.equal(result.mitigatedCount, 0)
  })
}

test('a second declared and audited copy must have its own complete verification', () => {
  const report = clone(privateReport)
  report.vulnerabilities.braces.nodes.push('apps/web/node_modules/braces')
  assertRejected(report, syntheticEvidence(), 'INVENTORY_MISMATCH')
  const evidence = syntheticEvidence(report)
  assert.equal(validateAuditReport(report, evidence).ok, true)
  evidence.inventory.instances[1].patchedTreeSha256 = digest('second copy unpatched')
  assertRejected(report, evidence, 'INSTANCE_INTEGRITY')
})

test('respects a trusted explicit expiry without imposing seven days or renewing it', () => {
  const evidence = syntheticEvidence()
  evidence.decision.expiresAt = '2026-11-10T20:00:00.000Z'
  assert.equal(validateAuditReport(clone(privateReport), evidence).ok, true)
  evidence.evaluatedAt = evidence.decision.expiresAt
  evidence.verifiedAt = evidence.evaluatedAt
  evidence.advisory.retrievedAt = evidence.evaluatedAt
  evidence.behavior.completedAt = evidence.evaluatedAt
  assertRejected(clone(privateReport), evidence, 'PATCH_EVIDENCE_EXPIRED')
  assert.equal(evidence.decision.expiresAt, '2026-11-10T20:00:00.000Z')
})

test('review may accept already-completed regression evidence for the exact same tree', () => {
  const evidence = syntheticEvidence()
  evidence.decision.acceptedAt = '2026-10-11T19:59:00.000Z'
  assert.equal(validateAuditReport(clone(privateReport), evidence).ok, true)
})

test('no names are globally exempt: new path on the known cause requires reviewed inventory', () => {
  const report = clone(privateReport)
  report.vulnerabilities['new-parent'] = finding('new-parent', ['braces'])
  recalculate(report)
  assertRejected(report, syntheticEvidence(), 'DEV_SCOPE')
})

test('zero findings can pass without an exception; a stale exception cannot silently disappear', () => {
  const report = { auditReportVersion: 2, vulnerabilities: {}, metadata: clone(privateReport.metadata) }
  recalculate(report)
  const result = validateAuditReport(report)
  assert.equal(result.ok, true)
  assert.equal(result.decision, 'PASS')
  assert.equal(result.mitigatedCount, 0)
  assertRejected(report, syntheticEvidence(), 'STALE_EXCEPTION')
})

test('an npm error-only JSON never becomes a zero-findings success', () => {
  assertRejected({ error: { code: 'ENOAUDIT', summary: 'Registry unavailable' } }, undefined, 'REPORT_SCHEMA')
})
