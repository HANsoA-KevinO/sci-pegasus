import { connectDB } from '../../db/mongodb'
import {
  WorkspaceCanonicalArtifact,
  WorkspaceCapacity,
  WorkspaceFile,
  WorkspaceFileRevision,
} from './models'
import type {
  CanonicalArtifactClaim,
  CanonicalArtifactRecord,
  WorkspaceCapacityState,
  WorkspaceFileSnapshot,
} from './types'

export interface MultiAgentWorkspaceStore {
  createCapacityIfMissing(state: WorkspaceCapacityState): Promise<WorkspaceCapacityState>
  getCapacity(workspaceId: string): Promise<WorkspaceCapacityState | null>
  compareAndSwapCapacity(expectedRevision: number, next: WorkspaceCapacityState): Promise<boolean>

  getFile(workspaceId: string, path: string): Promise<WorkspaceFileSnapshot | null>
  listFiles(workspaceId: string): Promise<WorkspaceFileSnapshot[]>
  compareAndSwapFile(
    expectedRevision: number | null,
    candidate: WorkspaceFileSnapshot,
  ): Promise<{ committed: true } | { committed: false; actualRevision: number | null }>
  /** Delete unpublished heads owned by an abandoned whole-set reservation. */
  deleteStagedFiles(workspaceId: string, reservationId: string): Promise<number>

  claimCanonicalArtifact(record: CanonicalArtifactRecord): Promise<CanonicalArtifactClaim>
  getCanonicalArtifact(
    workspaceId: string,
    canonicalArtifactKey: string,
  ): Promise<CanonicalArtifactRecord | null>
  markCanonicalArtifactPublished(
    workspaceId: string,
    canonicalArtifactKey: string,
    fileRevision: number,
  ): Promise<void>
  markCanonicalArtifactFailed(
    workspaceId: string,
    canonicalArtifactKey: string,
  ): Promise<void>
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

function capacityFrom(value: unknown): WorkspaceCapacityState {
  const doc = value as WorkspaceCapacityState
  return clone({
    workspace_id: doc.workspace_id,
    max_files: doc.max_files,
    revision: doc.revision,
    published_paths: doc.published_paths ?? [],
    reservations: doc.reservations ?? [],
  })
}

function canonicalFrom(value: unknown): CanonicalArtifactRecord {
  const doc = value as CanonicalArtifactRecord
  return clone({
    workspace_id: doc.workspace_id,
    canonical_artifact_key: doc.canonical_artifact_key,
    idempotency_key: doc.idempotency_key,
    path: doc.path,
    content_sha256: doc.content_sha256,
    status: doc.status,
    file_revision: doc.file_revision,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
  })
}

function isDuplicateKey(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 11000)
}

/** Production MongoDB implementation. All publication authority is fenced by CAS. */
export class MongooseMultiAgentWorkspaceStore implements MultiAgentWorkspaceStore {
  async createCapacityIfMissing(state: WorkspaceCapacityState): Promise<WorkspaceCapacityState> {
    await connectDB()
    try {
      const doc = await WorkspaceCapacity.findOneAndUpdate(
        { workspace_id: state.workspace_id },
        { $setOnInsert: state },
        { upsert: true, returnDocument: 'after', lean: true },
      )
      return capacityFrom(doc)
    } catch (error) {
      // Concurrent first access can make two upserts race the unique index.
      if (!isDuplicateKey(error)) throw error
      const existing = await WorkspaceCapacity.findOne({ workspace_id: state.workspace_id }).lean()
      if (!existing) throw error
      return capacityFrom(existing)
    }
  }

  async getCapacity(workspaceId: string): Promise<WorkspaceCapacityState | null> {
    await connectDB()
    const doc = await WorkspaceCapacity.findOne({ workspace_id: workspaceId }).lean()
    return doc ? capacityFrom(doc) : null
  }

  async compareAndSwapCapacity(
    expectedRevision: number,
    next: WorkspaceCapacityState,
  ): Promise<boolean> {
    await connectDB()
    const result = await WorkspaceCapacity.updateOne(
      { workspace_id: next.workspace_id, revision: expectedRevision },
      {
        $set: {
          max_files: next.max_files,
          revision: next.revision,
          published_paths: next.published_paths,
          reservations: next.reservations,
        },
      },
    )
    return result.modifiedCount === 1
  }

  async getFile(workspaceId: string, path: string): Promise<WorkspaceFileSnapshot | null> {
    await connectDB()
    const head = await WorkspaceFile.findOne({ workspace_id: workspaceId, path }).lean()
    if (!head) return null
    const version = await WorkspaceFileRevision.findOne({
      version_id: head.current_version_id,
    }).lean()
    if (!version) throw new Error(`Workspace file ${path} points to a missing immutable revision`)
    return clone({
      workspace_id: version.workspace_id,
      path: version.path,
      revision: version.revision,
      version_id: version.version_id,
      visibility: version.visibility,
      owner_agent_id: version.owner_agent_id,
      storage_ref: version.storage_ref,
      metadata: version.metadata,
      writer: version.writer,
      canonical_artifact_key: version.canonical_artifact_key,
      publication_key: version.publication_key,
      publication_source: version.publication_source,
      capacity_reservation_id: version.capacity_reservation_id,
      created_at: head.created_at,
      updated_at: head.updated_at,
    })
  }

  async listFiles(workspaceId: string): Promise<WorkspaceFileSnapshot[]> {
    await connectDB()
    const heads = await WorkspaceFile.find({ workspace_id: workspaceId }).sort({ path: 1 }).lean()
    if (heads.length === 0) return []
    const versions = await WorkspaceFileRevision.find({
      version_id: { $in: heads.map(head => head.current_version_id) },
    }).lean()
    const byId = new Map(versions.map(version => [version.version_id, version]))
    return heads.map(head => {
      const version = byId.get(head.current_version_id)
      if (!version) throw new Error(`Workspace file ${head.path} points to a missing immutable revision`)
      return clone({
        workspace_id: version.workspace_id,
        path: version.path,
        revision: version.revision,
        version_id: version.version_id,
        visibility: version.visibility,
        owner_agent_id: version.owner_agent_id,
        storage_ref: version.storage_ref,
        metadata: version.metadata,
        writer: version.writer,
        canonical_artifact_key: version.canonical_artifact_key,
        publication_key: version.publication_key,
        publication_source: version.publication_source,
        capacity_reservation_id: version.capacity_reservation_id,
        created_at: head.created_at,
        updated_at: head.updated_at,
      })
    })
  }

  async compareAndSwapFile(
    expectedRevision: number | null,
    candidate: WorkspaceFileSnapshot,
  ): Promise<{ committed: true } | { committed: false; actualRevision: number | null }> {
    await connectDB()
    // Content records are append-only. A losing CAS can leave an unreachable
    // revision, which is safe and can be reclaimed asynchronously.
    await WorkspaceFileRevision.create({
      version_id: candidate.version_id,
      workspace_id: candidate.workspace_id,
      path: candidate.path,
      revision: candidate.revision,
      visibility: candidate.visibility,
      owner_agent_id: candidate.owner_agent_id,
      storage_ref: clone(candidate.storage_ref),
      metadata: clone(candidate.metadata),
      writer: clone(candidate.writer),
      canonical_artifact_key: candidate.canonical_artifact_key,
      publication_key: candidate.publication_key,
      publication_source: candidate.publication_source,
      capacity_reservation_id: candidate.capacity_reservation_id,
      created_at: candidate.updated_at,
    })

    const headFields = {
      revision: candidate.revision,
      current_version_id: candidate.version_id,
      visibility: candidate.visibility,
      owner_agent_id: candidate.owner_agent_id,
      writer: clone(candidate.writer),
      canonical_artifact_key: candidate.canonical_artifact_key,
      publication_key: candidate.publication_key,
      publication_source: candidate.publication_source,
      capacity_reservation_id: candidate.capacity_reservation_id,
    }

    if (expectedRevision === null) {
      try {
        await WorkspaceFile.create({
          workspace_id: candidate.workspace_id,
          path: candidate.path,
          ...headFields,
        })
        return { committed: true }
      } catch (error) {
        if (!isDuplicateKey(error)) throw error
      }
    } else {
      const result = await WorkspaceFile.updateOne(
        {
          workspace_id: candidate.workspace_id,
          path: candidate.path,
          revision: expectedRevision,
        },
        { $set: headFields },
      )
      if (result.modifiedCount === 1) return { committed: true }
    }

    const actual = await WorkspaceFile.findOne({
      workspace_id: candidate.workspace_id,
      path: candidate.path,
    }).select({ revision: 1 }).lean()
    return { committed: false, actualRevision: actual?.revision ?? null }
  }

  async deleteStagedFiles(workspaceId: string, reservationId: string): Promise<number> {
    await connectDB()
    const result = await WorkspaceFile.deleteMany({
      workspace_id: workspaceId,
      capacity_reservation_id: reservationId,
    })
    return result.deletedCount
  }

  async claimCanonicalArtifact(record: CanonicalArtifactRecord): Promise<CanonicalArtifactClaim> {
    await connectDB()
    try {
      await WorkspaceCanonicalArtifact.create(record)
      return { state: 'claimed', record: clone(record) }
    } catch (error) {
      if (!isDuplicateKey(error)) throw error
      const existing = await this.getCanonicalArtifact(
        record.workspace_id,
        record.canonical_artifact_key,
      )
      if (!existing) throw error
      return { state: 'existing', record: existing }
    }
  }

  async getCanonicalArtifact(
    workspaceId: string,
    canonicalArtifactKey: string,
  ): Promise<CanonicalArtifactRecord | null> {
    await connectDB()
    const doc = await WorkspaceCanonicalArtifact.findOne({
      workspace_id: workspaceId,
      canonical_artifact_key: canonicalArtifactKey,
    }).lean()
    return doc ? canonicalFrom(doc) : null
  }

  async markCanonicalArtifactPublished(
    workspaceId: string,
    canonicalArtifactKey: string,
    fileRevision: number,
  ): Promise<void> {
    await connectDB()
    await WorkspaceCanonicalArtifact.updateOne(
      { workspace_id: workspaceId, canonical_artifact_key: canonicalArtifactKey },
      { $set: { status: 'published', file_revision: fileRevision } },
    )
  }

  async markCanonicalArtifactFailed(
    workspaceId: string,
    canonicalArtifactKey: string,
  ): Promise<void> {
    await connectDB()
    await WorkspaceCanonicalArtifact.updateOne(
      {
        workspace_id: workspaceId,
        canonical_artifact_key: canonicalArtifactKey,
        status: 'staging',
      },
      { $set: { status: 'failed' } },
    )
  }
}
