---
name: do-work
description: Execute ready tasks from the dependency graph, spawning parallel subagents for independent work. Use when user says "start working", "pick up tasks", "ralph work", "do work", or when tasks exist in docs/dependency-graph.yaml that are labeled ready. This is the main execution skill that drives the Ralph loop.
---

# Do Work

Read `docs/dependency-graph.yaml` and identify all tasks labeled `ready`. Cross-reference with GitHub Issues via `gh issue list` to confirm which are still open.

For the first execution on a new project, start with the task labeled `tracer-bullet`. Complete it fully before parallelizing. It proves the architecture works end-to-end.

After the tracer bullet is done (or if it's already complete), spawn parallel subagents for all independent ready tasks. Each subagent:

1. Creates a branch: `git checkout -b task/NNN-short-description`
2. Reads its task's acceptance criteria from the GitHub Issue
3. Implements using the /tdd skill (red-green-refactor, vertical slices)
4. Commits frequently with descriptive messages: `git add -A && git commit -m "Task NNN: [what changed]"`
5. Updates `docs/tasks/NNN/progress.md` after significant completions
6. When all acceptance criteria pass, pushes and opens a PR:
   ```bash
   git push -u origin task/NNN-short-description
   gh pr create --title "Task NNN: [title]" --body "Closes #[issue-number]" --base main
   ```
7. Merges the PR (if no conflicts): `gh pr merge --squash --delete-branch`
8. Closes the issue: `gh issue close [issue-number]`

After each task completion, re-evaluate the dependency graph. Tasks whose `blocked_by` dependencies are all closed become `ready`. Update their GitHub Issue labels from `blocked` to `ready` with `gh issue edit`.

Keep working until all tasks are done or all remaining tasks are blocked on something that requires human input. If blocked, report what's blocking and stop.
