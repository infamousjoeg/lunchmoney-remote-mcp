---
name: grill
description: Relentlessly interview the user about a plan, design, or architecture to stress-test it before committing to code. Use when user presents a plan and wants it challenged, says "grill me", "stress-test this", "poke holes", "what am I missing", or asks "does this plan make sense?" Also trigger when a design hasn't been fully explored before building begins.
---

# Grill

Interview me relentlessly about every aspect of this plan until we reach a shared understanding. Walk down each branch of the design tree depth-first, resolving dependencies between decisions one by one. For each question, provide your recommended answer so I can accept, reject, or modify. If a question can be answered by exploring the codebase, explore the codebase instead of asking me.

Ask one question per turn. Do not dump multiple questions at once.

Match your drilling depth to the project's maturity: go light on prototypes, deep on production systems.

When we're done, write the resolved decisions to `docs/design-decisions.md` and optionally file them as a GitHub Issue with `gh issue create`.
