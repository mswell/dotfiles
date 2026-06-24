# TASK

Review the changes on branch `{{BRANCH}}` before they are merged.

# INSTRUCTIONS

1. Run `git log --oneline main..HEAD` to see what commits were made.
2. Run `git diff main..HEAD` to see all changes.
3. Check for:
   - Correctness: Does the code do what the issue asks?
   - Code quality: Is it clean, readable, well-structured?
   - Tests: Are there tests? Do they pass?
   - Edge cases: Are error cases handled?
   - Style: Does it follow the project's existing patterns?
4. If you find issues, fix them directly and commit the fixes.
5. If the implementation looks good, do nothing.

# IMPORTANT

- Do NOT merge the branch.
- Do NOT close any issues.
- Only commit fixes if you find real problems.
