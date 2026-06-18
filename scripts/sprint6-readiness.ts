import { existsSync, readFileSync } from 'node:fs'
import { openApiContract } from '../src/contracts/openapi.js'

const checks: ReadinessCheck[] = [
  checkOpenApiContract(),
  checkHandoffDocument(),
  checkRunbookDocument(),
  checkParentBoundary(),
]

const failed = checks.filter((check) => !check.ok)

console.log(JSON.stringify({
  ok: failed.length === 0,
  checks,
}, null, 2))

if (failed.length > 0) process.exit(1)

interface ReadinessCheck {
  name: string
  ok: boolean
  details: string[]
}

function checkOpenApiContract(): ReadinessCheck {
  const requiredPaths = ['/openapi.json', '/v1/rates', '/v1/shipments', '/v1/shipments/{id}/tracking', '/webhooks/jne']
  const missingPaths = requiredPaths.filter((path) => !openApiContract.paths[path as keyof typeof openApiContract.paths])
  const missingSecurity = !openApiContract.components.securitySchemes.bearerAuth

  return {
    name: 'openapi-contract',
    ok: missingPaths.length === 0 && !missingSecurity,
    details: [
      `version=${openApiContract.openapi}`,
      `requiredPaths=${requiredPaths.length - missingPaths.length}/${requiredPaths.length}`,
      `bearerAuth=${String(!missingSecurity)}`,
      ...(missingPaths.length > 0 ? [`missingPaths=${missingPaths.join(',')}`] : []),
    ],
  }
}

function checkHandoffDocument(): ReadinessCheck {
  const path = 'docs/TEKNOS_ID_HANDOFF.md'
  const requiredSections = [
    '## Required Parent Environment',
    '## Server-only HTTP Client Example',
    '## Webhook Receiver Example',
    '## Staging Cutover Checklist',
    '## Rollback',
  ]
  return checkMarkdownSections('handoff-document', path, requiredSections)
}

function checkRunbookDocument(): ReadinessCheck {
  const path = 'docs/SPRINT_6_CONTRACT_RUNBOOK.md'
  const requiredSections = [
    '## Hard Boundary',
    '## Merchant API Contracts',
    '## Outbound Merchant Relay Contract',
    '## Parent Handoff',
    '## Smoke Commands',
    '## Definition of Done',
  ]
  return checkMarkdownSections('sprint6-runbook', path, requiredSections)
}

function checkParentBoundary(): ReadinessCheck {
  const files = ['CLAUDE.md', 'AGENTS.md', 'docs/SPRINT_6_CONTRACT_RUNBOOK.md', 'docs/TEKNOS_ID_HANDOFF.md']
  const missing = files.filter((file) => {
    if (!existsSync(file)) return true
    const content = readFileSync(file, 'utf8').toLowerCase()
    return !content.includes('read-only') || !content.includes('teknos.id')
  })

  return {
    name: 'parent-read-only-boundary',
    ok: missing.length === 0,
    details: missing.length > 0 ? [`missingBoundaryIn=${missing.join(',')}`] : [`files=${files.length}`],
  }
}

function checkMarkdownSections(name: string, path: string, requiredSections: string[]): ReadinessCheck {
  if (!existsSync(path)) return { name, ok: false, details: [`missingFile=${path}`] }

  const content = readFileSync(path, 'utf8')
  const missingSections = requiredSections.filter((section) => !content.includes(section))

  return {
    name,
    ok: missingSections.length === 0,
    details: missingSections.length > 0
      ? [`missingSections=${missingSections.join('|')}`]
      : [`sections=${requiredSections.length}`],
  }
}
