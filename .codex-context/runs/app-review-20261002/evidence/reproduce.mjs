import assert from "node:assert/strict";
import { createServer } from "node:http";
import { writeFileSync } from "node:fs";
import { createApp } from "../../../../apps/server/src/app.ts";
import { loadAuthConfig } from "../../../../apps/server/src/auth/config.ts";
import { AuthService } from "../../../../apps/server/src/auth/service.ts";
import { createService } from "../../../../apps/server/src/context.ts";
import { webPostureConnector } from "../../../../apps/server/src/connectors/web-posture.ts";
import { TestClient } from "../../../../apps/server/test/client.ts";
import { isEvidenceValid } from "../../../../packages/core/src/status.ts";

process.env.VISUA_AGENT_MODE = "offline";
const findings = [];
const svc = await createService({ database: ":memory:" });
try {
  const auth = new AuthService(svc, { ...loadAuthConfig({}), mode: "dev" });
  const app = createApp(svc, auth);
  const owner = new TestClient(app);
  const login = await owner.devLogin("owner@review-fixture.example", "Review owner");
  assert.equal(login.status, 200);
  const tenant = login.json.activeTenant.id;
  const created = await owner.post("/api/workspaces", {
    name: "Isolated review fixture",
    profile: { industry: "saas", size: "11-50", dataTypes: [], drivers: [], environments: ["cloud"], maturityTier: 1, guidance: "guided", securityTeamSize: 1 },
    frameworks: ["nist-csf-2.0"],
  });
  assert.equal(created.status, 201);
  const ws = created.json.workspace.id;
  const first = "nist-csf-2.0:PR.AA-01";
  const second = "nist-csf-2.0:PR.AA-02";
  for (const id of [first, second]) {
    const state = await owner.patch(`/api/workspaces/${ws}/requirements/${id}`, { current: 3, target: 3, verifiedAt: "2026-01-01T00:00:00Z" });
    assert.equal(state.status, 200);
  }
  const evidence = await owner.post(`/api/workspaces/${ws}/evidence`, { title: "Expired fixture evidence", requirementIds: [first], content: "Synthetic fixture only", validUntil: "2020-01-01T00:00:00Z" });
  assert.equal(evidence.status, 201);
  const accepted = await owner.patch(`/api/workspaces/${ws}/evidence/${evidence.json.id}`, { decision: "accepted" });
  assert.equal(accepted.status, 200);
  assert.equal(isEvidenceValid(accepted.json), false);
  const member = await owner.post(`/api/tenants/${tenant}/members`, { email: "contributor@review-fixture.example", name: "Review contributor", role: "contributor" });
  assert.equal(member.status, 201);
  const contributor = new TestClient(app);
  assert.equal((await contributor.devLogin("contributor@review-fixture.example", "Review contributor")).status, 200);
  const before = await contributor.get(`/api/workspaces/${ws}/requirements/${second}`);
  const modified = await contributor.patch(`/api/workspaces/${ws}/evidence/${evidence.json.id}`, { requirementIds: [second], validUntil: "2099-01-01T00:00:00Z" });
  assert.equal(modified.status, 200);
  assert.equal(modified.json.status, "accepted");
  assert.equal(modified.json.reviewedBy, accepted.json.reviewedBy);
  assert.equal(isEvidenceValid(modified.json), true);
  const after = await contributor.get(`/api/workspaces/${ws}/requirements/${second}`);
  assert.equal(before.json.status.status, "implemented");
  assert.equal(after.json.status.status, "verified");
  findings.push({ id: "accepted-evidence-edit", reproduced: true, actorRole: "contributor", patchStatus: modified.status, reviewStatusPreserved: modified.json.status, reviewerPreserved: true, evidenceValidBefore: false, evidenceValidAfter: true, newlyLinkedRequirementBefore: before.json.status.status, newlyLinkedRequirementAfter: after.json.status.status, environment: "isolated SQLite memory database; in-process Hono requests" });
  const invalidDate = await contributor.patch(`/api/workspaces/${ws}/evidence/${evidence.json.id}`, { validUntil: "not-a-date" });
  assert.equal(invalidDate.status, 200);
  assert.equal(isEvidenceValid(invalidDate.json), true);
  findings.push({ id: "invalid-evidence-date", reproduced: true, patchStatus: invalidDate.status, invalidDateConsideredValid: true });
} finally {
  await svc.store.close();
}

const requests = [];
const server = createServer((request, response) => {
  requests.push(request.url);
  response.writeHead(302, { location: "https://loopback-fixture.invalid/" });
  response.end();
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
try {
  const port = server.address().port;
  const results = await webPostureConnector.run({ url: `https://127.0.0.1:${port}` });
  assert.ok(requests.includes("/"));
  const redirect = results.find((result) => result.checkId === "http-redirect");
  assert.equal(redirect.observed.location, "https://loopback-fixture.invalid/");
  findings.push({ id: "web-posture-loopback", reproduced: true, loopbackHttpRequests: requests.length, privateServiceHeaderRecorded: true, environment: "ephemeral loopback HTTP fixture only; no external requests" });
} finally {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
const result = { status: "complete", source: "1dc5ed1", command: "node .codex-context/runs/app-review-20261002/evidence/reproduce.mjs", findings, limitations: ["SQLite only; no production state or secrets accessed", "The connector reproduction proves loopback access, not cloud metadata exfiltration or a DNS-rebinding attack"] };
writeFileSync(new URL("reproductions.json", import.meta.url), JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result, null, 2));
