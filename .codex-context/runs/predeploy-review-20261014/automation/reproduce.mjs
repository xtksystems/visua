import assert from 'node:assert/strict';
import { openStore } from '../../../../apps/server/src/storage/index.ts';
import { VisuaService } from '../../../../apps/server/src/services/visua.ts';
import { EventBus } from '../../../../apps/server/src/bus.ts';
import { workspaceEventStream, STREAM_MAX_EVENTS } from '../../../../apps/server/src/workspace-events.ts';
import { withConnectorBudget, ConnectorCapacityError } from '../../../../apps/server/src/connectors/limits.ts';
import { runChecks, modelTask } from '../../../../packages/agents/src/tools.ts';
import { ownsRun } from '../../../../apps/server/src/services/run-execution.ts';

// Imports resolve from the run/node directory; all fixture storage stays in memory.
const store = await openStore(':memory:');
const registry = { framework: () => undefined };
let physicalRuns = 0;
const kind = { kind: 'fixture', name: 'Fixture', description: 'Synthetic check', configFields: [], run: () => withConnectorBudget(async () => { physicalRuns++; return []; }) };
const svc = new VisuaService(store, registry, new EventBus(), [kind]);
let release;
const held = new Promise(resolve => { release = resolve; });
const occupying = Array.from({ length: 4 }, () => withConnectorBudget(() => held));
try {
  const ws = await svc.createWorkspace({ name: 'Automation review fixture', frameworks: [], profile: { industry: 'saas', size: '11-50', dataTypes: [], drivers: [], environments: ['cloud'], maturityTier: 1, guidance: 'guided', securityTeamSize: 1 } });
  const connector = await svc.createConnector(ws.id, { kind: kind.kind, config: {} });
  await assert.rejects(svc.runConnector(ws.id, connector.id), ConnectorCapacityError);
  const failed = await store.connectors.get(connector.id);
  assert.equal(failed.status, 'error');
  release();
  await Promise.all(occupying);
  const agentResult = await runChecks.run({ connectors: () => [failed] }, { connectorId: connector.id });
  assert.match(agentResult.error, /No active connectors/);
  assert.equal(physicalRuns, 0);
  console.log(JSON.stringify({ case: 'connector_capacity_recovery', statusAfterTemporaryOverload: failed.status, capacityReleased: true, agentRetryResult: agentResult, physicalRuns }));
  await svc.runConnector(ws.id, connector.id);
  assert.equal((await store.connectors.get(connector.id)).status, 'active');
  assert.equal(physicalRuns, 1);
  console.log(JSON.stringify({ case: 'manual_retry_counterevidence', status: 'active', physicalRuns }));
} finally {
  release();
  await Promise.all(occupying);
  await store.close();
}

const bus = new EventBus();
let authorized = true;
const reader = workspaceEventStream({ bus, workspaceId: 'synthetic', authorize: async () => { if (!authorized) throw new Error('revoked'); } }).getReader();
assert.match(new TextDecoder().decode((await reader.read()).value), /event: ready/);
for (let i = 0; i < STREAM_MAX_EVENTS + 1; i++) bus.publish('synthetic', 'activity', { id: String(i) });
assert.match(new TextDecoder().decode((await reader.read()).value), /event: resync/);
bus.publish('synthetic', 'activity', { id: 'after-revocation' });
authorized = false;
assert.equal((await reader.read()).done, true);
await reader.cancel();
console.log(JSON.stringify({ case: 'event_overflow_and_revocation', overflowEmitsResync: true, revokedQueuedPayloadWithheld: true }));

const fence = { runId: 'run', workspaceId: 'workspace', ownerId: 'owner', attemptId: 'attempt', epoch: 1 };
const run = { id: 'run', workspaceId: 'workspace', status: 'running', executionEpoch: 1, execution: { ownerId: 'owner', attemptId: 'attempt', epoch: 1, leaseExpiresAt: new Date(Date.now() + 5000).toISOString() } };
assert.equal(ownsRun(run, fence), true);
assert.equal(ownsRun({ ...run, executionEpoch: 2 }, fence), false);
assert.equal(ownsRun({ ...run, status: 'cancelled' }, fence), false);
console.log(JSON.stringify({ case: 'run_fence', matchingLeaseAllowed: true, changedEpochAndCancellationRefused: true }));

process.env.VISUA_AGENT_MODE = 'claude';
delete process.env.VISUA_AICPA_AI_USE;
const text = 'SYNTHETIC RESTRICTED TEXT FOR TEST ONLY';
const task = { title: 'Synthetic task', description: text, checklist: [], requirementIds: ['restricted:node'], contentRequirementIds: [] };
const sanitized = modelTask({ registry: { node: () => ({ text, code: 'TEST', title: 'Synthetic', attributes: { licensed: true, summary: 'Synthetic summary' } }) } }, task);
assert.equal(sanitized.description.includes(text), false);
console.log(JSON.stringify({ case: 'licensed_task_routing', syntheticRestrictedTextWithheld: true }));
