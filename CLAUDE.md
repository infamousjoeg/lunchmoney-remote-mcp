# lunchmoney-remote-mcp

## Workflow

This project uses ralph skills in `.claude/skills/`. The workflow is:

1. `/grill` to stress-test designs before committing to code
2. `/prd` to write the PRD (filed as GitHub Issue)
3. `/decompose` to break the PRD into tasks with dependency graph
4. `/do-work` to execute tasks (spawns parallel subagents for independent tasks)
5. `/tdd` for implementation (red-green-refactor, vertical slices)
6. `/review` for periodic architecture health checks

## GitHub Integration

- Issues and Project board are managed via `gh` CLI
- Tasks use labels: ready, blocked, in-progress, done, tracer-bullet, tech-debt, bug
- Project board columns: Backlog, Ready, In Progress, Done
- Update issue status as work progresses

## Git Workflow

- Branch per task: `task/NNN-short-description`
- Commit after each TDD green-refactor cycle with descriptive messages
- Push and open a PR when all acceptance criteria pass: `gh pr create --body "Closes #N"`
- Squash merge PRs to main: `gh pr merge --squash --delete-branch`
- Never commit directly to main

## Conventions

- Table-driven tests, stdlib preferred, testify if needed
- Shell out to `gh` and `claude` CLIs rather than using their APIs directly
- Do not ask for confirmation on obvious actions, execute and report
- Write progress to docs/tasks/NNN/progress.md after significant completions
