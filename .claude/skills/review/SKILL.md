---
name: review
description: Explore a codebase for architectural improvement opportunities, focusing on deepening shallow modules and improving testability. Use when user says "review architecture", "check code health", "improve architecture", "ralph review", or after completing a batch of tasks. Run this periodically, especially after a surge of development.
---

# Review

Explore this codebase and look for architectural improvement opportunities. Focus on:

- **Shallow modules:** Where does a large interface hide thin implementation? These should be consolidated or deepened.
- **Scattered understanding:** Where does grasping one concept require bouncing between many small files? These should be merged.
- **Tight coupling:** Where do changes in one module force changes in another? These need interface boundaries.
- **Testability gaps:** Where are pure functions extracted just for testability, but real bugs hide in how they're called? These need integration-level tests.
- **Deep module candidates:** Where could several small pieces be combined behind a simple interface that hides complexity?

For each finding, classify severity: **critical** (actively causing problems), **moderate** (will cause problems at scale), or **low** (improvement opportunity).

Write findings to `docs/architecture-review.md` with severity, affected modules, recommended action, and estimated effort (S/M/L).

For critical findings, file a GitHub Issue with the `tech-debt` label:
```bash
gh issue create --title "Tech Debt: [finding]" --body "[description and recommendation]" --label "tech-debt"
```

End with a one-paragraph summary of overall codebase health.
