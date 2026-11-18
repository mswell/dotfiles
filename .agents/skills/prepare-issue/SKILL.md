---
name: prepare-issue
description: Turn a clear request or resolved decision map into a delivery-ready issue with observable acceptance criteria. Use when preparing or refining implementation work for another engineer.
---

# Prepare an issue

Read the request, the relevant code or product documentation, the project's tracker conventions, and any decisions already made.
Find existing issues covering the same outcome and build on them.
If a product choice changes the expected behavior, ask the person who owns it.
Use [grill-me](../grill-me/SKILL.md) for an open-ended interview or [wayfinder](../wayfinder/SKILL.md) when dependent decisions span sessions.

Write a ticket another engineer can pick up with the repository alone:

- Name the consumer, their entry point, the behavior they need, and relevant scope limits.
- Give a concrete input or starting state, the action, and the expected observation.
- Identify how to demonstrate acceptance and which public interface is agreed for tests.
- For a claim about aggregate AI quality, agree on the evaluation cases, metric and threshold; for a single behavior, a representative conversation and its tool trace may suffice.
- Link actual dependencies and existing decisions. Split independently useful outcomes when they need separate delivery.

If the existing issue already meets these conditions, return it with its title and the agreed check.
Publish or update the identified issue when the request authorizes tracker writes; otherwise return the ready-to-paste body.
On retry, look up the existing issue before creating another.
The handoff to deliver-issue is the issue reference or its complete agreed body.
