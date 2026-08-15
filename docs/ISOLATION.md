# 与 Pegasus 的隔离契约

## 固定命名空间

| 层 | Sci-Pegasus 值 |
|---|---|
| npm / Compose project | `sci-pegasus` |
| Web | `3100` |
| Mongo host | `127.0.0.1:27018` |
| Mongo database | `sci_pegasus` |
| Internal workspace | `.sci-pegasus/` |
| Auth cookies | `sci-pegasus.*` / `__Secure-sci-pegasus.*` |
| Browser active conversation | `sci_pegasus_active_conversation_id` |
| Internal HMAC headers | `x-sci-pegasus-agent-runner-*` |
| Docker network/volumes | `sci-pegasus-*` |
| OSS object prefix | `sci-pegasus/raster-assets/` |

## 强制规则

- `MONGODB_URI` 没有默认回退；运行脚本也必须显式提供 URI。
- durable runner 使用独立的 `AGENT_RUNTIME_INTERNAL_SECRET`，不回退复用 `AUTH_SECRET`。
- 不复制 Pegasus 的 `.env`、数据库、volume、Cookie、对象存储 bucket/prefix 或内部密钥。
- Docker Compose 把 Mongo 只映射到 host loopback 的 `27018`，并使用独立 volume。
- `_archive/`、`_temp/` 和根目录旧镜像包不进入 Docker build context，也不应进入未来版本控制。

若未来需要迁移 Pegasus 中的真实数据，应另写显式、可审计、一次性的迁移程序；不要通过连接同一数据库实现“临时兼容”。

