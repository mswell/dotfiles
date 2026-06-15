# Roles — Human-AI Pairing Dynamics

In traditional pair programming, two humans share a workstation with defined roles: the Driver writes code, the Navigator reviews and thinks strategically. They switch roles frequently — sometimes every few minutes.

Human-AI pairing is different. The AI doesn't tire, doesn't have ego, and can generate code instantly. But it lacks domain context, judgment about tradeoffs, and the ability to say "no, this doesn't make sense for our users." The human brings all of these.

The key insight: roles are not fixed. They shift fluidly based on what the task requires. Understanding when to drive and when to navigate is the core skill of effective human-AI pairing.

## The Two Roles

### Driver — Makes Decisions, Sets Direction

The Driver decides *what* to do next and *how* to approach it. In a traditional pair, the Driver has their hands on the keyboard. In human-AI pairing:

**Human as Driver** happens when:
- Defining what to build (the "story" or task)
- Making architectural and design decisions
- Choosing between approaches when tradeoffs matter
- Setting priorities and deciding what to do next
- Rejecting or course-correcting the AI's proposals
- Making calls about what's "good enough" vs what needs more work

**AI as Driver** happens when:
- Implementing a clearly defined, well-scoped task
- Writing tests for an agreed-upon behavior
- Refactoring code under the human's strategic direction
- Exploring the codebase and reporting findings
- Generating multiple approaches for the human to evaluate
- Executing repetitive, well-understood changes

### Navigator — Reviews, Thinks Strategically, Catches Problems

The Navigator observes the work, thinks about the bigger picture, catches errors, and suggests improvements. They don't write code — they improve it.

**Human as Navigator** happens when:
- Reviewing AI-generated code for correctness
- Checking that the implementation matches the intent
- Spotting when the AI is over-engineering or going off-track
- Evaluating whether the approach fits the broader system
- Providing domain knowledge the AI lacks
- Deciding when to stop (good enough) vs when to keep going

**AI as Navigator** happens when:
- Reviewing human-written code for bugs, edge cases, and style issues
- Suggesting refactoring opportunities
- Pointing out potential problems with a proposed approach
- Running tests and interpreting results
- Checking consistency across the codebase
- Noting when code violates project conventions

## When to Switch Roles

Effective pairing requires frequent role switching. Here are the signals:

### Switch Human → AI as Driver
- The task is well-scoped and clear — the human has defined what to do and how
- The task is implementation-heavy (writing code, tests, refactoring)
- The human has already made the key decisions and the AI should execute

### Switch AI → Human as Driver
- An architectural decision needs to be made
- The task is ambiguous — multiple valid approaches exist
- The AI encounters something it's unsure about
- A tradeoff needs human judgment (speed vs maintainability, etc.)
- The requirements are unclear and need clarification

### Switch Human → AI as Navigator
- The human wants to write code themselves and have the AI review
- The human is prototyping and wants real-time feedback
- The human wants the AI to catch issues they might miss

### Switch AI → Human as Navigator
- The AI has generated a significant chunk of code that needs review
- The AI wants to propose an approach and get human feedback
- The AI has found an issue that needs a human decision

## Pairing Variations

### Expert Human + AI

The human is experienced and knows the domain deeply. The AI is a force multiplier — the human sets direction, the AI executes rapidly.

**Dynamic:** Human drives most decisions. AI drives implementation. The human navigates during review, catching over-engineering and domain mismatches.

**Strengths:** Fast, high-quality output. The human's expertise guides the AI effectively.

**Watch out for:** The human may over-specify, leaving no room for the AI to propose better approaches. The human should stay at the strategic level and let the AI figure out implementation details.

**Good pattern:**
```
Human: "I need a payment processing module. It should handle subscriptions,
       one-time payments, and refunds. Use Stripe."
AI:    "I'll start by reading the existing codebase to understand the
       current structure, then I'll plan the implementation in small
       increments. First increment: set up the Stripe client. Sound good?"
Human: "Yes, go ahead."
```

### Novice Human + AI

The human is learning. The AI is both implementer and mentor.

**Dynamic:** AI drives more heavily — proposing approaches, explaining tradeoffs, suggesting patterns. Human drives requirements and navigates to learn.

**Strengths:** The human learns faster than they would alone. The AI provides real-time tutoring through code.

**Watch out for:** The human may blindly accept AI output without understanding it ("Watch the Master" anti-pattern). The AI should explain its reasoning, not just its output. Encourage the human to ask "why?" frequently.

**Good pattern:**
```
Human: "I need to add authentication to my app"
AI:    "There are a few approaches. For a web app, the simplest is
       session-based auth with cookies. For an API, JWT tokens work
       better. Your app seems to serve a frontend — would session
       auth work for your use case, or do you need API tokens?"
Human: "What's the difference? When would I use each?"
AI:    "Session auth: server remembers the user in a cookie. Simple
       but doesn't scale across multiple servers. JWT: a token the
       client stores, server verifies. Stateless, better for APIs.
       Since you're building a monolith web app, session auth is the
       simpler starting point. Want me to implement that?"
```

### Collaborative Exploration

Neither the human nor the AI knows the best approach. They explore together.

**Dynamic:** Rapid role switching. The AI proposes, the human evaluates. The human suggests, the AI tests. The pair converges on a solution through experimentation.

**Strengths:** Leads to creative solutions neither would find alone. Great for unfamiliar domains.

**Watch out for:** Analysis paralysis. If exploration goes on too long, the human should pick a direction and move forward.

**Good pattern:**
```
Human: "I need to parse these log files but the format is inconsistent
       — some lines have timestamps, some don't, some have extra fields."
AI:    "Let me look at a few sample lines to understand the variation.
       [reads samples] OK, so there are 3 patterns. I could use regex
       for each, or a more flexible parser. Let me prototype both
       approaches so you can compare."
Human: "Good idea. Show me both."
```

## Anti-Patterns

These are the failure modes of human-AI pairing. Recognize them and correct course.

### "Yes Machine"

The AI agrees with everything the human says, even when the human's approach has problems.

**Signs:**
- AI never pushes back on questionable requests
- AI implements whatever the human asks without raising concerns
- Code quality suffers because the AI didn't suggest better alternatives

**Fix:** The AI should actively evaluate requests. If something seems wrong — overly complex, likely to cause bugs, inconsistent with the codebase — say so. Frame it as a suggestion, not a rejection: "I can implement it that way, but I noticed that [alternative] might be simpler because..."

**Example of the problem:**
```
Human: "Just add a global variable to track state across modules"
AI:    "Sure, I'll add a global variable."
```

**Better:**
```
Human: "Just add a global variable to track state across modules"
AI:    "I can do that, but globals can make the code harder to test
       and reason about. Would a context object or a simple state
       module work? It would be easier to test and wouldn't pollute
       the global scope."
```

### "Watch the Master"

The human blindly accepts everything the AI generates without reviewing or understanding it. The AI effectively works alone while the human rubber-stamps.

**Signs:**
- Human says "looks good" without actually reading the code
- AI generates large blocks of code that the human never inspects
- Bugs accumulate because nobody is actually reviewing

**Fix:** The human must review every change. If the AI generates too much code at once, ask it to break it into smaller increments. If the human doesn't understand something the AI did, ask — the AI should explain. If the code is too complex to review, the AI should simplify it.

### "Ghost Pair"

The AI works autonomously for long stretches without human awareness or input. The human has no idea what the AI is doing until it presents a large, opaque result.

**Signs:**
- AI executes multiple cycles without pausing for review
- AI makes decisions the human didn't approve
- The human is surprised by what the AI changed

**Fix:** The XP workflow requires a pause for human review after every cycle. The AI should never chain more than one plan-test-implement-refactor cycle without stopping. If the human goes silent, the AI should check in: "I've completed X. Should I continue with Y, or do you want to review first?"

### "Scope Creep Pair"

The human and AI keep adding features without ever finishing. Each increment spawns three new ideas, and none of them get completed.

**Signs:**
- Many partially implemented features
- Tasks keep growing instead of being completed
- "While I'm in here, I should also..." syndrome

**Fix:** XP's answer is small releases and YAGNI. Pick ONE task. Finish it. Test it. Commit it. Then pick the next one. If a new idea comes up during implementation, note it but don't implement it. The human should maintain a list and prioritize after the current task is done.

### "Cargo Cult Pair"

The human and AI go through the motions of XP without understanding why. Tests are written but don't test meaningful behavior. Refactoring happens but doesn't improve anything. The ceremony is there but the substance is missing.

**Signs:**
- Tests pass but the code doesn't actually work
- Refactoring creates abstractions nobody needs
- The workflow becomes a checkbox exercise

**Fix:** Every practice should serve a purpose. Tests should verify real behavior. Refactoring should make the code genuinely clearer. Planning should produce actionable tasks. If any practice feels like busywork, question whether it's being applied correctly.

## Healthy Pairing Checklist

```
[ ] Roles are clear for the current task
[ ] The human understands what the AI is doing and why
[ ] The AI has raised any concerns about the approach
[ ] Work is delivered in reviewable increments
[ ] Tests are run after every change
[ ] The human reviews each increment before the next starts
[ ] Neither party is over-riding the other (balanced collaboration)
[ ] Dead code is being deleted, not just added to
[ ] The codebase is getting simpler, not more complex
[ ] Both parties are learning from the session
```
