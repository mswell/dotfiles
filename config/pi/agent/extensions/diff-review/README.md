# local-pi-diff-review

Local Pi extension for visual diff review in the style shown by Mario Zechner: it opens a native window with Monaco Diff Editor, supports inline comments on original/modified lines, file-level comments, and an overall note, then inserts the generated feedback prompt into Pi's editor.

## Command

```text
/diff-review
```

After adding comments and clicking **Finish review**, the extension does **not** send the prompt automatically. It stages the generated prompt in Pi's editor so you can review, edit, and submit it manually.

## Dependencies

The extension needs the `glimpseui` npm package. It is listed in `package.json` and is installed automatically the first time `/diff-review` runs if `node_modules` is missing.

Manual install, if needed:

```bash
cd ~/.pi/agent/extensions/diff-review
npm ci --omit=dev --ignore-scripts
```

Set `PI_DIFF_REVIEW_AUTO_INSTALL=0` to disable automatic install and require the manual command.

## Workflow

1. Open a Git project in Pi.
2. Run `/diff-review`.
3. Pick a scope in the native window:
   - `Git diff`: working tree against `HEAD`
   - `Last commit`: latest commit against its parent
   - `Commits`: a selected recent commit
   - `All files`: current file snapshot
4. Hover/click the gutter or line area in Monaco Diff Editor to add inline comments.
5. Use **Add file comment** for file-level feedback.
6. Use **Overall note** for change-level feedback.
7. Click **Finish review** to insert the feedback prompt into Pi's editor.

## Implementation

Structure:

```text
index.ts       # registers /diff-review, opens Glimpse, bridges native window ↔ Pi
git.ts         # collects files/scopes/content via Git
prompt.ts      # generates the review feedback prompt for the agent
types.ts       # shared payload types
ui.ts          # injects web/index.html + web/app.js
web/           # visual review window with Monaco + Tailwind CDN
```

Based on the architecture of `badlogic/pi-diff-review`.
