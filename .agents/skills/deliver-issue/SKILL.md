---
name: deliver-issue
description: Deliver a ready issue on a branch through test-driven implementation, author verification and a reviewable pull request. Use when the user wants the issue implemented.
---

# Deliver an issue

Read the issue and state its title, intended behavior, agreed test interface and dependencies.
A test interface named in an approved issue counts as agreed.
Resolve facts from the repository; ask about a missing decision when it changes the acceptance criteria or which behavior to test.
Check the intended base, current worktree, existing branch and PR so a retry resumes the same work and preserves unrelated edits.

## Implement with TDD

1. Take one observable behavior through an agreed public interface. For a bug, reproduce the reported symptom first.
2. Write one focused test. Run it and observe the expected failure before changing the implementation. Fix an unrelated setup failure before counting the test as red.
3. Make the smallest implementation that passes that test. Run it again and capture the result.
4. Repeat one vertical slice at a time. Run focused checks and typechecking as the change grows. Review refactoring opportunities once the behavior is green.
5. Run the project's full applicable suite at the end, report any checks that could not run, and review the diff against the issue and repository standards. Recheck affected behavior after corrections.

For work where an automated red test is impractical, record the reason and the repeatable observation used instead.
For documentation or visual acceptance this may mean following the instructions in a clean environment or inspecting the rendered result.

## Hand off the author's evidence

Exercise the issue's scenario through the consumer's real entry point.
Record what ran, the input, expected and observed behavior, and any limits.
For a statistical claim, run the agreed evaluation and report the metric against its threshold.

Keep the branch, commits and PR limited to this issue.
Honor the requested Git scope; when publication is authorized, push and open or update the matching PR with the issue, evidence and checks.
If publication is outside the requested scope, provide the local result and PR draft.
Return the head revision and PR reference when available.
The next step is verify-pr in a fresh session; the author's demonstration is input for the reviewer.
