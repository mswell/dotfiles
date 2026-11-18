# Issue tracker: GitHub

Issues and PRDs for this repo live as GitHub issues in `mswell/dotfiles`. Use the `gh` CLI for all operations.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> --comments`, filtering comments by `jq` and also fetching labels.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

Infer the repo from `git remote -v` — `gh` does this automatically when run inside a clone.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.

## Wayfinding operations

Use a GitHub issue labelled `wayfinder:map` to hold the destination and decision index.
Link each decision as a sub-issue and label it `wayfinder:research`, `wayfinder:prototype`, `wayfinder:grilling`, or `wayfinder:task`.
Where sub-issues are unavailable, use a task list in the map and a link back to the map in each child.
Record blocking relationships using GitHub issue dependencies, or links to named blockers in the child when the tracker lacks dependency support.

To resume, list the map's open children and select an unassigned decision whose blockers are closed.
Claim it by assigning the engineer driving the map.
Record the answer on the child, close it, then add its linked title and a one-line decision to the map.
Keep implementation issues separate from these decisions.
