# Sci-Pegasus

Sci-Pegasus is an isolated research-agent workbench for the materials-science, literature-driven discovery direction of GOAI Track 3: AI for Research.

It was cleaned from a Pegasus project copy. The durable agent runtime, workspace, memory, queues, model registry, audit trail, and general raster-evidence support remain. Canvas/scientific drawing, image generation, figure reverse engineering, related skills, samples, and scripts have been removed.

V1 now includes one persistent Agent Team per project, a shared Root/member Agent Loop with independent sessions, conversational delegation through `Agent` and `SendMessage`, optional formal task ledgers, an 8-running/32-identity limit, automatic completion delivery and durable wakeups, path-level Workspace CAS and private ACLs, per-file publication review, execution-scoped budgets/telemetry, and replayable Team status SSE. An Agent returns to idle after each turn and resumes on a direct message; only an explicit Root close marks it completed. The research-method layer now combines `review_update`, `adjacent_tension`, and `hybrid` through six on-demand Skills while keeping C/E/G/H state in Workspace Markdown. Automatic prompt mutation and topology evolution remain a later layer.

Defaults are deliberately isolated: app port `3100`, Mongo port `27018`, database `sci_pegasus`, internal workspace `.sci-pegasus/`, and dedicated cookie, storage, Docker network, and volume namespaces.

See [README.md](README.md), the [research strategy](docs/RESEARCH_STRATEGY.md), the [Agent Team V1 contract](docs/AGENT_TEAM_V1.md), and [docs/ORIGIN_AND_LICENSE.md](docs/ORIGIN_AND_LICENSE.md) before redistribution. No authoritative license file was found in this copy, so do not represent it as MIT-licensed without confirmation from the original rights holder.
