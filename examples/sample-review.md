# Architecture Decision: Agent Skills Ownership

## Context

We need to decide where the Agent Skills directory lives and who owns its
synchronization across adapters.

## Option A

Keep the Agent Skills directory coupled to each adapter and sync on build.

## Option B

Decouple the Agent Skills directory entirely from adapters.

## Option C

Introduce a dedicated `sync.sh` that owns the directory and pushes to adapters.

---

## How to try this extension

1. Press F5 to launch the Extension Development Host (this folder opens there).
2. Hover the gutter (left of the line numbers) on the "Decouple..." line under
   "Option B" above — a "+" appears. Click it.
   (Or select the line and press Ctrl+Alt+M.)
3. Type a note in the inline box that opens below the line, then click
   "Add review note".
4. Watch the "# Unresolved Comments" section appear at the bottom of the file,
   and an inline thread appear under the line.
5. Click "Resolve" on the thread (or the CodeLens) to remove the comment again.
