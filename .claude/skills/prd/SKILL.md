---
name: prd
description: Create a Product Requirements Document through interactive interview, codebase exploration, and module design, then file it as a GitHub Issue. Use when user wants to write a PRD, plan a new feature, says "let's write the PRD", "what are we building", or when a design decisions doc exists and it's time to formalize requirements. Also trigger after a /grill session concludes.
---

# PRD

Write a PRD for this project or feature. If a design decisions doc exists in `docs/design-decisions.md`, use it as your starting point and skip questions already resolved there.

Walk through these steps, skipping any that are already covered:

1. Ask for a detailed description of the problem and proposed solution
2. Explore the repo to verify assertions and understand current state
3. Interview relentlessly about scope -- what we ARE building and what we are NOT
4. Sketch major modules, looking for deep modules (small interface, complex internals, testable in isolation)
5. Write the PRD using the template below and file it as a GitHub Issue

User stories must include acceptance criteria. Tag each story P0 (must-have), P1 (should-have), or P2 (nice-to-have). P0 stories form the tracer bullet first pass.

File the PRD:
```bash
gh issue create --title "PRD: [name]" --body-file docs/prd.md --label "prd"
```

Also write `docs/architecture.md` with a mermaid component diagram of the major modules.

<prd-template>
## Problem Statement
The problem from the user's perspective.

## Solution
The proposed solution from the user's perspective.

## Technical Constraints
Language, runtime, deployment targets, external dependencies, performance requirements.

## User Stories

1. **[P0]** As a [actor], I want [feature], so that [benefit]
   - AC: [testable acceptance criterion]
   - AC: [testable acceptance criterion]

## Implementation Decisions
Modules to build/modify, interfaces, architectural decisions, schema changes, API contracts. No file paths or code snippets -- they go stale.

## Testing Decisions
Which modules get tested, what makes a good test for this project, prior art in the codebase.

## Out of Scope
What we are explicitly NOT building.

## Further Notes
Anything else relevant.
</prd-template>
