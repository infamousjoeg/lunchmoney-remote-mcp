---
name: decompose
description: Break a PRD into independently-grabbable GitHub Issues with a dependency graph using tracer-bullet vertical slices. Use when user wants to convert a PRD to tasks, says "decompose this", "break this down", "create issues", or when a PRD exists in docs/prd.md and implementation hasn't started yet. Also trigger after a /prd session concludes.
---

# Decompose

Read the PRD from `docs/prd.md` (or the current conversation) and break it into independently-grabbable tasks using vertical slices. Each task is a thin tracer bullet cutting through all integration layers, not a horizontal slice of one layer.

For each task, define: a clear title, acceptance criteria pulled from the PRD's user stories, which tasks it blocks on (if any), and a t-shirt size (S/M/L/XL).

Mark the first task as `tracer-bullet` -- it should prove the architecture works end-to-end before anything else runs in parallel.

Write the dependency graph to `docs/dependency-graph.yaml`:

```yaml
tasks:
  - id: "001"
    title: "Short descriptive title"
    description: "What this task accomplishes"
    blocked_by: []
    size: "M"
    labels: ["ready", "tracer-bullet"]
    acceptance_criteria:
      - "Testable criterion from PRD"
```

Label each task: `ready` if blocked_by is empty, `blocked` if not. Only one task gets `tracer-bullet`.

Then file each task as a GitHub Issue and add it to the Project board:

```bash
gh issue create --title "Task 001: [title]" --body "[body with ACs and blocked_by]" --label "ready"
gh project item-add [PROJECT_NUMBER] --owner [OWNER] --url [ISSUE_URL]
```

Finish by printing a summary: how many tasks total, how many are ready to start now, and which one is the tracer bullet.
