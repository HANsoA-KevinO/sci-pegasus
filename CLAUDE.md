# Sci-Pegasus repository guide

Sci-Pegasus is a materials-science literature-discovery agent, not a scientific drawing product.

## Non-negotiable boundaries

- Keep the project isolated from Pegasus: port `3100`, Mongo port `27018`, database `sci_pegasus`, `.sci-pegasus/`, dedicated cookies, secrets, volumes, networks, and media prefix.
- Do not reintroduce Canvas, mxGraph/draw.io, image generation, figure reverse engineering, or drawing-specific Skills without an explicit new product decision.
- Preserve the durable Agent Runtime, recovery leases, queues, memory, audit logs, generic workspace, and evidence-image support. They are the base for the future self-evolving multi-agent loop.
- Treat citations, source locations, extraction provenance, and tool-call records as first-class scientific evidence.
- Never claim an unsupported scientific discovery. Label facts, inference, hypotheses, and validation status separately.

## Important paths

- `lib/agent-runtime/`: durable runs, leasing, recovery, and background execution
- `lib/agent/`: main loop, prompt composition, compaction, queues, streaming
- `lib/memory-v2/`: cross-project history and preference memory
- `lib/workspace/definitions/materials-discovery.ts`: workspace contract
- `lib/agent/project-guide.ts`: materials-discovery workflow guidance
- `lib/tools/`: deliberately small generic tool surface
- `docs/COMPETITION_ALIGNMENT.md`: competition requirements
- `docs/NEXT_MULTI_AGENT_LOOP.md`: next-phase extension seams

Before handoff, run focused verifiers, TypeScript, and a production build sequentially to avoid unnecessary memory pressure.

