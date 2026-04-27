---
description: Close open gaps after exploration or planning
---

## Arguments

```text
$ARGUMENTS
```

- **No arguments provided with prior context**: Use the current conversation and available context as the gap-closing subject.
- **No arguments provided and no prior context**: Ask the user what exploration, plan, topic, or open thread they want to close gaps on before proceeding.
- **Clear arguments** (a topic, feature, problem, plan, decision, prior exploration, or list of open questions): Use that as the gap-closing subject.
- **Unclear or ambiguous arguments**: Stop and ask the user what gaps should be closed before proceeding.

## Task

Turn prior exploration, planning, or an initial subject into implementation-ready shared understanding by finding unresolved gaps, closing the ones that matter, and making the resulting assumptions explicit.

This command is a convergence checkpoint before implementation. It may inspect existing project context to answer open questions, but it does not create plans, specifications, tasks, proposals, or implementation changes.

## Workflow

1. Establish the gap-closing subject from **Arguments** and the current conversation.
2. If there is no prior context or clear subject, ask the user what exploration, plan, topic, or open thread they want to close gaps on before proceeding.
3. Review relevant context already available from the conversation.
4. Build a concise working synthesis of what seems settled, what is implied, and what remains open.
5. Turn the open items into a gap list.
6. For each gap, decide whether it can be resolved from existing project context, needs user judgment, or can remain as a non-blocking risk.
7. Explore the codebase only when a specific gap can likely be answered from existing files.
8. Ask one focused question at a time for the highest-priority gap that needs user judgment (`question` tool). Include your recommended answer.
9. Incorporate the answer, update the gap list, and repeat until all implementation-blocking gaps are closed or explicitly accepted as assumptions.
10. Present the final grounded understanding for explicit acknowledgment.

## Rules

- **You MUST use the `question` tool** when asking the user to choose or clarify.
- Ask one question at a time.
- Include your recommended answer with every question.
- Do not ask questions that can be answered by reading available project context.
- If there is no prior exploration or plan, gather only enough context to define the gap-closing subject.
- Do not reopen settled decisions unless there is a contradiction or missing dependency.
- Do not expand into broad discovery; investigate only the smallest scope needed to close a concrete gap.
- Prefer closing gaps through existing evidence over creating new options.
- When evidence is incomplete but the risk is acceptable, state the assumption instead of over-exploring.
- Do not create implementation plans, specifications, tasks, proposals, or code changes.
- Do not recommend a next action or next command.
- Keep the process focused on shared understanding, not persuasion.
- Stop asking once the remaining uncertainty is non-blocking or captured as an explicit assumption.

## Output

Once gap closing is complete, summarize:

- final shared understanding
- settled decisions and assumptions
- gaps closed and how they were closed
- remaining non-blocking risks or uncertainties
- any explicit implementation boundaries
