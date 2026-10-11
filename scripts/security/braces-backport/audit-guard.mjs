import { isDeepStrictEqual } from 'node:util'

export const KNOWN_ADVISORY = Object.freeze({
  source: 1240992,
  name: 'braces',
  dependency: 'braces',
  title: 'braces vulnerable to stack-exhaustion denial of service through deeply nested patterns',
  url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm',
  severity: 'high',
  cwe: Object.freeze(['CWE-674']),
  cvss: Object.freeze({ score: 7.5, vectorString: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H' }),
  range: '<=3.0.3',
})

export const UPSTREAM_COMMIT = 'd44b9b1ee12e7804d4232d5a47a4a0c61d2fbefe'
export const BASE_TARBALL = 'https://registry.npmjs.org/braces/-/braces-3.0.3.tgz'
export const BASE_INTEGRITY =
  'sha512-yQbXgO/OSZVD2IsiLlro+7Hf6Q18EJrKSEsdoMzKePKXct3gvD8oLcOQdIzGupr5Fj+EDe8gO/lxc1BzfMpxvA=='

const SEVERITIES = ['info', 'low', 'moderate', 'high', 'critical']
const DAY = 24 * 60 * 60 * 1000
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const own = (value, key) => Object.hasOwn(value, key)
const nonempty = (value) => typeof value === 'string' && value.trim().length > 0
const hash = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value) && !/^0+$/.test(value)
const strings = (value) => Array.isArray(value) && value.every(nonempty)
const unique = (value) => new Set(value).size === value.length
const safePath = (value) =>
  nonempty(value) &&
  !/[\\\u0000]/.test(value) &&
  !value.startsWith('/') &&
  !/^[A-Za-z]:/.test(value) &&
  !value.split('/').some((part) => part === '' || part === '.' || part === '..')
const sameSet = (left, right) => left.length === right.length && left.every((value) => right.includes(value))
const timestamp = (value) =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
  new Date(value).toISOString() === value
    ? Date.parse(value)
    : NaN

/**
 * Pure policy evaluation. Both inputs must be parsed JSON values.
 * verifiedPatchEvidence is TRUSTED OUTPUT of a separate verifier, not a claim
 * from a PR/report. This function does not inspect disk, run tests, query an
 * advisory provider, or read the clock. evaluatedAt must be supplied by the
 * trusted caller using the actual clock. See DESIGN.txt for the trust boundary.
 */
export function validateAuditReport(report, verifiedPatchEvidence) {
  const diagnostics = []
  const add = (code, message, packageName) =>
    diagnostics.push({ code, message, ...(packageName ? { package: packageName } : {}) })
  const rawCounts = object(report?.metadata?.vulnerabilities) ? { ...report.metadata.vulnerabilities } : null
  const result = (mitigated = [], evidenceValidated = false, belowThreshold = []) => ({
    ok: diagnostics.length === 0,
    decision: diagnostics.length === 0 ? (mitigated.length ? 'PASS_WITH_VERIFIED_BACKPORT' : 'PASS') : 'FAIL',
    // Original parsed report is returned unchanged; the runner must also retain
    // the original stdout bytes, stderr and exit status in a separate artifact.
    rawReport: report,
    rawCounts,
    evidenceValidated,
    mitigatedFindings: mitigated.map((name) => ({
      name,
      severity: report.vulnerabilities[name].severity,
      nodes: [...report.vulnerabilities[name].nodes],
      advisory: KNOWN_ADVISORY.url,
    })),
    mitigatedCount: mitigated.length,
    belowThresholdFindings: belowThreshold,
    diagnostics,
  })

  if (
    !object(report) ||
    report.auditReportVersion !== 2 ||
    own(report, 'error') ||
    !object(report.vulnerabilities) ||
    !object(report.metadata) ||
    own(report.metadata, 'error')
  ) {
    add('REPORT_SCHEMA', 'Expected a complete npm audit v2 report without error fields.')
    return result()
  }

  const vulnerabilities = report.vulnerabilities
  const entries = Object.entries(vulnerabilities)
  const computedCounts = Object.fromEntries(SEVERITIES.map((level) => [level, 0]))
  for (const [name, finding] of entries) {
    if (
      !object(finding) ||
      finding.name !== name ||
      !SEVERITIES.includes(finding.severity) ||
      !Array.isArray(finding.via) ||
      finding.via.length === 0 ||
      !strings(finding.nodes) ||
      finding.nodes.length === 0 ||
      !unique(finding.nodes) ||
      !finding.nodes.every(safePath) ||
      !strings(finding.effects) ||
      typeof finding.isDirect !== 'boolean' ||
      typeof finding.range !== 'string'
    ) {
      add('FINDING_SCHEMA', 'Finding identity, severity, nonempty via, nodes or metadata is invalid.', name)
      continue
    }
    computedCounts[finding.severity]++
    for (const via of finding.via) {
      if (typeof via === 'string') {
        if (!nonempty(via) || !own(vulnerabilities, via)) add('MISSING_VIA_TARGET', `Missing via target: ${via}`, name)
      } else if (
        !object(via) ||
        !Number.isSafeInteger(via.source) ||
        via.source <= 0 ||
        !nonempty(via.name) ||
        !nonempty(via.dependency) ||
        !nonempty(via.title) ||
        !nonempty(via.url) ||
        !nonempty(via.range) ||
        !SEVERITIES.includes(via.severity)
      ) {
        add('ADVISORY_SCHEMA', 'Advisory leaf is incomplete or unrecognized.', name)
      }
    }
  }

  computedCounts.total = entries.length
  if (
    !rawCounts ||
    [...SEVERITIES, 'total'].some(
      (level) =>
        !Number.isSafeInteger(rawCounts[level]) || rawCounts[level] < 0 || rawCounts[level] !== computedCounts[level],
    )
  ) {
    add('COUNT_MISMATCH', 'Raw vulnerability counts must match every reported finding.')
  }
  const dependencies = report.metadata.dependencies
  if (
    !object(dependencies) ||
    ['prod', 'dev', 'optional', 'peer', 'peerOptional', 'total'].some(
      (key) => !Number.isSafeInteger(dependencies[key]) || dependencies[key] < 0,
    ) ||
    dependencies.total < entries.length ||
    dependencies.total === 0
  ) {
    add('DEPENDENCY_METADATA', 'Dependency counts are missing, invalid or inconsistent.')
  }
  if (diagnostics.length) return result()

  // npm meta-vulnerability graphs can contain legitimate moderate cycles (e.g.
  // Jest). Do not recurse through those unless they are on a high/critical path.
  // But a lower declared severity must never conceal a high leaf or dependency.
  for (const [name, finding] of entries) {
    for (const via of finding.via) {
      const severity = typeof via === 'string' ? vulnerabilities[via].severity : via.severity
      if (SEVERITIES.indexOf(severity) >= 3 && SEVERITIES.indexOf(finding.severity) < SEVERITIES.indexOf(severity)) {
        add('SEVERITY_DOWNGRADE', 'A high/critical cause is hidden behind a lower finding severity.', name)
      }
    }
  }

  const candidates = []
  const high = entries.filter(([, finding]) => ['high', 'critical'].includes(finding.severity))
  for (const [name, finding] of high) {
    if (finding.severity === 'critical') {
      add('CRITICAL_FINDING', 'No critical finding is accepted by this policy.', name)
      continue
    }
    const leaves = collectLeaves(name, vulnerabilities, add)
    if (!leaves) continue
    if (
      !leaves.length ||
      leaves.some(({ entry, owner }) => owner !== 'braces' || !isDeepStrictEqual(entry, KNOWN_ADVISORY))
    ) {
      add(
        'UNMITIGATED_CAUSE',
        'Every high cause must be exactly the reviewed braces advisory; extra or changed causes fail.',
        name,
      )
    } else {
      candidates.push(name)
    }
  }

  let evidenceValidated = false
  if (candidates.length > 0) {
    evidenceValidated = validateEvidence(verifiedPatchEvidence, vulnerabilities, add)
  } else if (verifiedPatchEvidence !== undefined && verifiedPatchEvidence !== null) {
    add(
      'STALE_EXCEPTION',
      'Patch evidence exists but its reviewed advisory is absent; require explicit review/retirement.',
    )
  }
  const belowThreshold = entries
    .filter(([, finding]) => !['high', 'critical'].includes(finding.severity))
    .map(([name, finding]) => ({ name, severity: finding.severity }))
  return result(evidenceValidated ? candidates : [], evidenceValidated, belowThreshold)
}

// Iterative traversal avoids depending on the JS call stack for hostile reports.
function collectLeaves(start, vulnerabilities, add) {
  const frames = [{ name: start, index: 0 }]
  const active = new Set([start])
  const finished = new Set()
  const leaves = []
  while (frames.length) {
    const frame = frames.at(-1)
    const via = vulnerabilities[frame.name].via
    if (frame.index >= via.length) {
      active.delete(frame.name)
      finished.add(frame.name)
      frames.pop()
      continue
    }
    const entry = via[frame.index++]
    if (typeof entry !== 'string') {
      leaves.push({ owner: frame.name, entry })
    } else if (active.has(entry)) {
      add('HIGH_GRAPH_CYCLE', `High/critical via chain contains a cycle at ${entry}.`, start)
      return null
    } else if (!finished.has(entry)) {
      active.add(entry)
      frames.push({ name: entry, index: 0 })
    }
  }
  return leaves
}

function validateEvidence(evidence, vulnerabilities, add) {
  const initialErrors = []
  const reject = (code, message) => initialErrors.push({ code, message })
  if (!object(evidence) || evidence.schemaVersion !== 1) {
    add('PATCH_EVIDENCE_MISSING', 'A complete independently verified patch evidence object is required.')
    return false
  }
  const pkg = evidence.package
  if (
    !object(pkg) ||
    pkg.name !== 'braces' ||
    pkg.version !== '3.0.3' ||
    pkg.resolved !== BASE_TARBALL ||
    pkg.integrity !== BASE_INTEGRITY ||
    evidence.upstreamCommit !== UPSTREAM_COMMIT
  ) {
    reject(
      'PATCH_IDENTITY',
      'Package identity, published tarball/SRI or upstream commit does not match the reviewed backport.',
    )
  }
  for (const field of ['patchSha256', 'baseTreeSha256', 'patchedTreeSha256', 'manifestSha256']) {
    if (!hash(evidence[field])) reject('PATCH_HASH_MISSING', `Missing/invalid reviewed hash: ${field}.`)
  }
  if (
    !object(evidence.lockfile) ||
    !hash(evidence.lockfile.reviewedSha256) ||
    evidence.lockfile.observedSha256 !== evidence.lockfile.reviewedSha256 ||
    evidence.lockfile.graphUnchanged !== true
  ) {
    reject('LOCK_INTEGRITY', 'The observed lock must match its independently reviewed hash and graph.')
  }

  const decision = evidence.decision
  const evaluatedAt = readTimestamp(evidence.evaluatedAt)
  const verifiedAt = readTimestamp(evidence.verifiedAt)
  const acceptedAt = readTimestamp(decision?.acceptedAt)
  const expiresAt = readTimestamp(decision?.expiresAt)
  if (
    !object(decision) ||
    !nonempty(decision.id) ||
    !nonempty(decision.owner) ||
    ![evaluatedAt, verifiedAt, acceptedAt, expiresAt].every(Number.isFinite) ||
    acceptedAt > verifiedAt ||
    verifiedAt > evaluatedAt ||
    evaluatedAt - verifiedAt > DAY ||
    expiresAt <= evaluatedAt ||
    expiresAt <= acceptedAt
  ) {
    reject(
      'PATCH_EVIDENCE_EXPIRED',
      'Decision must be identified, unexpired at its reviewed expiresAt and verified within 24 hours using the trusted caller clock.',
    )
  }

  const advisory = evidence.advisory
  const retrievedAt = readTimestamp(advisory?.retrievedAt)
  if (
    !object(advisory) ||
    advisory.id !== 'GHSA-vfj7-8cjw-p6xm' ||
    !hash(advisory.reviewedRecordSha256) ||
    advisory.currentRecordSha256 !== advisory.reviewedRecordSha256 ||
    !Number.isFinite(retrievedAt) ||
    retrievedAt > evaluatedAt ||
    evaluatedAt - retrievedAt > DAY
  ) {
    reject('ADVISORY_DRIFT', 'Primary advisory evidence is stale, missing or changed since review.')
  }

  const behavior = evidence.behavior
  const completedAt = readTimestamp(behavior?.completedAt)
  if (
    !object(behavior) ||
    behavior.nodeMajor !== 22 ||
    behavior.passed !== true ||
    !hash(behavior.suiteSha256) ||
    !nonempty(behavior.runId) ||
    !Number.isFinite(completedAt) ||
    completedAt > verifiedAt ||
    evaluatedAt - completedAt > DAY ||
    behavior.patchedTreeSha256 !== evidence.patchedTreeSha256
  ) {
    reject(
      'REGRESSION_EVIDENCE',
      'Node 22 regression proof must cover the same tree, finish before verification and be current.',
    )
  }

  const inventory = evidence.inventory
  const validPaths = (paths) => strings(paths) && paths.length > 0 && unique(paths) && paths.every(safePath)
  if (
    !object(inventory) ||
    inventory.complete !== true ||
    !validPaths(inventory.expectedPaths) ||
    !validPaths(inventory.discoveredPaths) ||
    !Array.isArray(inventory.instances) ||
    !sameSet(inventory.expectedPaths, inventory.discoveredPaths)
  ) {
    reject(
      'INVENTORY_INCOMPLETE',
      'Lock and full disk inventory must be complete and contain identical nonempty path sets.',
    )
  } else {
    const instancePaths = inventory.instances.map((instance) => instance?.path)
    const auditPaths = vulnerabilities.braces?.nodes
    if (
      !validPaths(instancePaths) ||
      !sameSet(instancePaths, inventory.expectedPaths) ||
      !validPaths(auditPaths) ||
      !sameSet(auditPaths, inventory.expectedPaths)
    ) {
      reject(
        'INVENTORY_MISMATCH',
        'Every discovered instance, expected lock path and audit braces path must be accounted for exactly once.',
      )
    }
    const highPaths = [
      ...new Set(
        Object.values(vulnerabilities)
          .filter((finding) => ['high', 'critical'].includes(finding.severity))
          .flatMap((finding) => finding.nodes),
      ),
    ]
    if (!validPaths(inventory.developmentOnlyPaths) || !sameSet(highPaths, inventory.developmentOnlyPaths)) {
      reject('DEV_SCOPE', 'Every high/critical affected path must exactly match the reviewed dev-only inventory.')
    }
    for (const instance of inventory.instances) {
      if (
        !object(instance) ||
        instance.name !== 'braces' ||
        instance.version !== '3.0.3' ||
        instance.dev !== true ||
        instance.isSymbolicLink !== false ||
        instance.verified !== true ||
        instance.baseTreeSha256 !== evidence.baseTreeSha256 ||
        instance.patchedTreeSha256 !== evidence.patchedTreeSha256 ||
        instance.manifestSha256 !== evidence.manifestSha256
      ) {
        reject(
          'INSTANCE_INTEGRITY',
          `Package instance ${instance?.path ?? '(missing)'} does not exactly match the verified dev-only tree.`,
        )
      }
    }
  }
  if (
    !object(evidence.runtime) ||
    evidence.runtime.validReport !== true ||
    evidence.runtime.high !== 0 ||
    evidence.runtime.critical !== 0 ||
    evidence.runtime.bracesInProductionGraph !== false
  ) {
    reject(
      'RUNTIME_SCOPE',
      'Runtime must have a valid audit with zero high/critical and no braces in the production dependency graph.',
    )
  }
  for (const item of initialErrors) add(item.code, item.message)
  return initialErrors.length === 0
}

function readTimestamp(value) {
  try {
    return timestamp(value)
  } catch {
    return NaN
  }
}
