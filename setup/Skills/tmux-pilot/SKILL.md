---
name: tmux-pilot
description: Drive tmux from an AI agent — sessions, windows, panes, send commands, capture output, poll agents, browser-like workflow. Cross-platform (Linux/macOS/WSL). Use when the user wants to control terminal layout, launch parallel agents, run commands in background panes, orchestrate multi-pane workflows, or mentions tmux automation.
---

# tmux-pilot — Agent-Driven tmux Control

tmux-pilot gives AI agents full control over tmux topology: sessions, windows, panes, input routing, and output capture. It's the cross-platform equivalent of cmux for macOS.

## Core Concepts

- **Session** — top-level tmux container (like a project workspace)
- **Window** — a tab within a session (like a workspace tab)
- **Pane** — a split region within a window (where commands run)
- **Target** — tmux addressing: `session:window.pane` (e.g., `main:0.1`)

## Detect tmux in a Shell

```bash
[ -n "$TMUX" ] || exit 0                    # bail if not inside tmux
ORIGIN_PANE=${TMUX_PANE:?}                   # pane running this agent, e.g. %5
CURRENT_SESSION=$(tmux display-message -p -t "$ORIGIN_PANE" '#S')
CURRENT_WINDOW=$(tmux display-message -p -t "$ORIGIN_PANE" '#I')
CURRENT_PANE=$(tmux display-message -p -t "$ORIGIN_PANE" '#P')
echo "Inside tmux: ${CURRENT_SESSION}:${CURRENT_WINDOW}.${CURRENT_PANE}"
```

Key env vars: `$TMUX` (socket path), `$TMUX_PANE` (pane ID like `%5`). Always derive `CURRENT_SESSION` and `CURRENT_WINDOW` from `$TMUX_PANE`, not from the user's active client, so panes are created in the same window as the running agent instance.

## Fast Start — Topology

```bash
# Inspect
tmux list-sessions                           # all sessions
tmux list-windows -t "$SESSION"              # windows in a session
tmux list-panes -t "$SESSION:$WINDOW"        # panes in a window
tmux display-message -p '#S:#I.#P'           # current target

# Create
tmux new-session -d -s work -c /path/to/repo           # detached session
tmux new-window -t work -n build -c /path/to/repo      # new window/tab (only when explicitly requested)
tmux split-window -h -t work:0 -c /path/to/repo        # horizontal split (right) in explicit window
tmux split-window -v -t work:0 -c /path/to/repo        # vertical split (below) in explicit window

# Layout
tmux select-layout -t work:0 even-horizontal   # even-horizontal|even-vertical|main-horizontal|main-vertical|tiled
tmux resize-pane -t work:0.1 -R 20             # resize right 20 cells
tmux resize-pane -t work:0.1 -D 10             # resize down 10 cells

# Navigate (use sparingly — prefer --focus false pattern via -d flag)
tmux select-pane -t work:0.1
tmux select-window -t work:1
```

## Send Input to Panes

```bash
# Send a command (literal text + Enter)
tmux send-keys -t work:0.1 "npm run build" Enter

# Send special keys
tmux send-keys -t work:0.1 C-c              # Ctrl+C (cancel)
tmux send-keys -t work:0.1 C-l              # Ctrl+L (clear)
tmux send-keys -t work:0.1 Escape           # Escape key
tmux send-keys -t work:0.1 Up Enter         # arrow up + enter (re-run last)

# Send without pressing Enter (staging input)
tmux send-keys -t work:0.1 "partial command"
```

## Capture Output (Read Pane Content)

This is the key differentiator — reading what's on screen or in scrollback.

```bash
# Capture visible content of a pane
tmux capture-pane -t work:0.1 -p

# Capture with scrollback (last 100 lines)
tmux capture-pane -t work:0.1 -p -S -100

# Capture entire scrollback history
tmux capture-pane -t work:0.1 -p -S -

# Save capture to file
tmux capture-pane -t work:0.1 -p -S -100 > /tmp/pane-output.txt

# Wait then capture (poll pattern)
sleep 3 && tmux capture-pane -t work:0.1 -p | tail -20
```

## Polling Pattern — Launch & Monitor

When launching a process in another pane and waiting for results:

```bash
# 1. Send command
tmux send-keys -t work:0.1 "npm test" Enter

# 2. Poll with short intervals (2-5s for fast commands)
sleep 3
OUTPUT=$(tmux capture-pane -t work:0.1 -p -S -50)

# 3. Check for completion signals
echo "$OUTPUT" | grep -qE "(PASS|FAIL|Error|✓|✗|done)" && echo "Complete"
```

**Keep sleep intervals short (2–5s)** for typical commands. Use longer (10–15s) only for builds, installs, or known-slow operations.

## Launch Pi Agent in a Pane

```bash
# Create a pane for a sub-agent in the same window as this Pi instance.
# Never use a bare split-window or new-window for sub-agents.
[ -n "$TMUX" ] || exit 1
ORIGIN_PANE=${TMUX_PANE:?}
CURRENT_SESSION=$(tmux display-message -p -t "$ORIGIN_PANE" '#S')
CURRENT_WINDOW=$(tmux display-message -p -t "$ORIGIN_PANE" '#I')
NEW_PANE=$(tmux split-window -h -t "$CURRENT_SESSION:$CURRENT_WINDOW" -d -P -F '#P')  # -d = don't focus
TARGET="$CURRENT_SESSION:$CURRENT_WINDOW.$NEW_PANE"

# Launch pi with a task
tmux send-keys -t "$TARGET" "pi --print 'Run the tests and fix failures'" Enter

# Poll for completion
for i in $(seq 1 30); do
  sleep 5
  OUTPUT=$(tmux capture-pane -t "$TARGET" -p -S -30)
  if echo "$OUTPUT" | grep -qE '(❯|→|\$)\s*$'; then
    echo "Agent finished"
    break
  fi
done
```

## Multi-Pane Workspace Setup

```bash
# Create a dev workspace with editor + server + tests
tmux new-session -d -s dev -c ~/Projects/myapp
tmux rename-window -t dev:0 "code"

# Split into 3 panes: main | top-right / bottom-right
tmux split-window -h -t dev:0 -d -l 40%
tmux split-window -v -t dev:0.1 -d

# Label panes (optional, for display-panes)
# Pane 0 = editor, Pane 1 = server, Pane 2 = tests

# Launch services
tmux send-keys -t dev:0.0 "nvim ." Enter
tmux send-keys -t dev:0.1 "npm run dev" Enter
tmux send-keys -t dev:0.2 "npm test -- --watch" Enter
```

## Window/Pane Management

```bash
# Close
tmux kill-pane -t work:0.1                  # kill specific pane
tmux kill-window -t work:1                  # kill window
tmux kill-session -t old                    # kill session

# Swap/Move
tmux swap-pane -s work:0.0 -t work:0.1     # swap two panes
tmux move-pane -s work:1.0 -t work:0       # move pane to another window
tmux join-pane -s work:1.0 -t work:0 -h    # join as horizontal split

# Zoom (toggle fullscreen for a pane)
tmux resize-pane -t work:0.1 -Z

# Break pane out to its own window
tmux break-pane -t work:0.1 -d
```

## Notifications & Status

```bash
# Display a message in tmux status line
tmux display-message "Build complete ✓"

# Cleanup reminder for panes created by the agent but no longer needed
tmux display-message "Agent pane work: done. Close unused pane with: tmux kill-pane -t work:0.1"
tmux send-keys -t work:0.1 "echo 'Done. If this pane is no longer needed, close it with: tmux kill-pane -t work:0.1'" Enter

# Set window name to reflect status
tmux rename-window -t work:0 "✓ tests"

# Visual bell / activity monitoring
tmux set-option -t work:0.1 monitor-activity on
tmux set-option -t work:0.1 monitor-silence 30  # alert after 30s silence
```

## Session Persistence & Restore

```bash
# List and attach
tmux ls
tmux attach -t work

# Detach current client (won't kill session)
tmux detach-client

# Rename session
tmux rename-session -t old new
```

For persistent layouts across reboots, use tmux-resurrect or tmuxinator configs.

## Environment & Options

```bash
# Pass env vars to new panes
tmux set-environment -t work MY_VAR "value"
tmux split-window -h -t work:0 "MY_VAR=value bash"

# Useful options
tmux set-option -g mouse on                 # enable mouse
tmux set-option -g history-limit 50000      # scrollback size
tmux set-option -g remain-on-exit on        # keep pane after process exits
```

## Critical Rules — Non-Disruptive Automation

1. **Create panes in the same window as the running agent.** If this Pi instance is running in window `1`, every agent-created pane must be inside window `1`. Derive the target from `$TMUX_PANE` with `tmux display-message -p -t "$TMUX_PANE" '#S'` and `'#I'`, then split `"$CURRENT_SESSION:$CURRENT_WINDOW"`. Never use bare `tmux split-window`, `{last}` as the authority for window selection, or `tmux new-window` for sub-agents unless the user explicitly asks for a new window.
2. **Use `-d` flag when creating panes/windows.** This prevents stealing focus from the user's active pane.
3. **Anchor to session:window.pane targets.** Never assume the active pane is your target — always use explicit targets.
4. **Capture before sending.** If unsure of pane state, `capture-pane` first to avoid sending input into the wrong context (e.g., a vim session).
5. **Don't kill panes you didn't create.** Only manage panes the agent spawned.
6. **Clean up or announce cleanup.** Track every pane/window you create. When it is no longer useful, either close it (`tmux kill-pane -t <target>`) after capturing needed output, or clearly notify the user with the exact `tmux kill-pane -t <target>` command so idle panes do not stay open unnoticed. Ask before closing long-lived processes the user may want to keep.
7. **Short poll intervals.** 2–5s for fast commands, 10–15s for builds. Don't `sleep 30` unless genuinely needed.
8. **Check if tmux exists first.** Always guard with `[ -n "$TMUX" ]` before automation.

## Common Pitfalls

- **Nested tmux.** If pi is already in tmux, `tmux new-session` inside it creates a nested session. Use `tmux split-window -t "$CURRENT_SESSION:$CURRENT_WINDOW"` for sub-agents; use `tmux new-window` only when the user explicitly asks for a separate window.
- **Target syntax.** `session:window.pane` — window can be name or index, pane is always index.
- **send-keys literal vs. key names.** `Enter`, `Escape`, `Space`, `C-c` are key names. Quoted text is literal. Don't quote key names: `tmux send-keys -t t Enter` not `"Enter"`.
- **capture-pane encoding.** Pane content may have ANSI escape codes. Pipe through `sed 's/\x1b\[[0-9;]*m//g'` to strip colors if parsing output.
- **Pane indices shift.** After killing a pane, remaining panes may be renumbered. Always re-query with `list-panes` before targeting.
- **Wrong window from active client.** `tmux display-message -p '#I'` can reflect the active client/window instead of the pane running the agent. Use `tmux display-message -p -t "$TMUX_PANE" '#I'` before creating panes.
- **No socket API like cmux.** tmux uses the CLI or `tmux -L socketname` for alternate sockets. All control is via `tmux` subcommands.

## Quick Reference: Target Formats

| Target | Meaning |
|--------|---------|
| `work` | Session "work", current window+pane |
| `work:0` | Session "work", window 0, current pane |
| `work:0.1` | Session "work", window 0, pane 1 |
| `work:build` | Session "work", window named "build" |
| `{last}` | Last active pane/window |
| `{next}` | Next pane/window |
| `%5` | Pane with unique ID %5 (from $TMUX_PANE) |
