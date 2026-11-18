---
name: verify-pr
description: Independently verify an open pull request by exercising its acceptance scenario on the base and proposed revisions. Use for a pre-merge behavioral verdict.
---

# Verify a pull request

Use a session independent of the author.
If you implemented this patch, hand the issue and PR to a fresh verifier; if a fresh session is unavailable, return the handoff and mark independent verification pending.

1. Read the issue, PR scope and applicable project rules. Record the current target branch, base tip, PR head and their merge-base. Use the merge-base as the before revision to isolate the PR's changes. Identify a moved target and any integration question this comparison leaves open.
2. From the claimed outcome, choose a consumer, entry point, input and expected observation. Include what must keep working. Record this scenario before consulting the author's reproduction instructions or CI results when available separately.
3. Exercise the same scenario on the before revision and the PR head in isolated checkouts with comparable inputs and configuration. A feature absent on the base is a useful observation. For preservation claims, matching results can be the expected outcome. Record any fixture or preview-only change and apply it consistently where applicable.
4. Inspect the artifact the consumer receives. Use the actual CLI, rendered page, report, API, or conversation and tool trace as appropriate. Use the agreed evaluation set and threshold for a quality claim. Distinguish observations you reproduced from results reported by the author or hosted CI.
5. Check that the PR still points at the revisions assessed. If it moved, rerun the affected comparisons or mark the verdict stale. Leave author changes to the author and the merge decision to the team lead.

Return the scenario, revisions, before/after results, commands or evidence, outstanding checks and one verdict:

- **PASS** when the observed result satisfies the agreed acceptance criteria.
- **PASS+NOTES** when acceptance holds and a nonblocking observation is worth recording. Identify pre-existing behavior with evidence from the base.
- **FAIL** when an observed result contradicts acceptance. Give the smallest reproducible case.
- **INCONCLUSIVE** when missing evidence, environment or access prevents deciding acceptance. State what would settle it.

Return the verdict to the requester. Publish a PR comment or review only when explicitly requested.
