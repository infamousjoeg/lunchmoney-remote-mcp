---
name: tdd
description: Test-driven development with a red-green-refactor loop. Use when implementing any feature or fixing any bug, when user says "use TDD", "write tests first", "red-green-refactor", or when the /do-work skill invokes implementation on a task. This is the default implementation method for all tasks.
---

# TDD

Build this feature or fix using strict red-green-refactor in vertical slices.

Before writing any code, confirm with me: what interface changes are needed, which behaviors matter most, and can we design for deep modules (small interface, complex internals, testable in isolation)?

Then work in cycles:

1. **RED:** Write ONE test that fails. Just one. It should test behavior through a public interface, not implementation details. A good test reads like a spec: "user can checkout with valid cart." A bad test mocks internal collaborators or checks private state.
2. **GREEN:** Write the minimal code to make that test pass. Nothing speculative.
3. **REFACTOR:** Only after all tests pass. Extract duplication, deepen shallow modules, apply SOLID. Never refactor while RED.
4. **COMMIT:** After each green-refactor cycle, commit: `git add -A && git commit -m "Task NNN: [behavior implemented]"`

Repeat. Each cycle is a vertical slice responding to what you learned from the previous one. Do NOT write all tests first then all implementation -- that's horizontal slicing and it produces brittle, behavior-insensitive tests.

If a task has a GitHub Issue, read its acceptance criteria. Each criterion maps to at least one test. When all acceptance criteria pass, close the issue with `gh issue close`.

If you cannot make a test pass after 3 attempts, comment the blocker on the GitHub Issue with `gh issue comment` and move to the next unblocked task.
