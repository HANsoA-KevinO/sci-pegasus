import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { buildWorkspaceProjection } from '../../agent/compaction'
import { executeGlob } from '../glob'
import { executRead } from '../read'
import { createInMemoryWorkspace } from '../__test-utils__/in-memory-workspace'
import type { WorkspaceDocumentWrite } from '../../workspace/types'

const PDF = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n', 'ascii')

function documentInput(buffer = PDF): WorkspaceDocumentWrite {
  return {
    path: 'references/papers/arxiv-1234/original.pdf',
    buffer,
    filename: 'arxiv-1234.pdf',
    mimeType: 'application/pdf; charset=binary',
    source: {
      provider: 'arxiv',
      canonical_url: 'https://arxiv.org/abs/1234.5678',
      external_id: '1234.5678v1',
    },
    provenance: {
      retrieved_at: '2026-08-07T00:00:00.000Z',
      version: 'v1',
      license: 'arXiv.org perpetual, non-exclusive license',
      provenance_path: 'references/papers/arxiv-1234/provenance.json',
    },
  }
}

async function verifyDocumentLifecycle(): Promise<void> {
  const workspace = createInMemoryWorkspace()
  const input = documentInput()
  const expectedHash = createHash('sha256').update(PDF).digest('hex')

  const written = await workspace.writeDocument(input)
  assert.equal(written.path, input.path)
  assert.equal(written.mimeType, 'application/pdf')
  assert.equal(written.sizeBytes, PDF.length)
  assert.equal(written.sha256, expectedHash)
  assert.equal(written.source.provider, 'arxiv')

  assert.deepEqual(await workspace.readDocument(input.path), written)
  assert.deepEqual(await workspace.readDocumentBuffer(input.path), PDF)
  assert.equal(await workspace.readText(input.path), null)

  const stat = await workspace.stat(input.path)
  assert.equal(stat?.kind, 'document')
  assert.equal(stat?.sha256, expectedHash)
  assert.equal(stat?.filename, input.filename)

  const idempotent = await workspace.writeDocument(input)
  assert.deepEqual(idempotent, written)
  assert.equal(Object.keys(workspace.dumpDocuments()).length, 1)

  const glob = await executeGlob({ pattern: '**/*.pdf', kind: 'document' }, workspace)
  assert.match(glob.content, /original\.pdf · document · application\/pdf/)

  const read = await executRead({ file_path: input.path }, workspace, new Map())
  assert.equal(read.is_error, undefined)
  assert.match(read.content, /Binary document bytes are intentionally not returned/)
  assert.match(read.content, new RegExp(expectedHash))
  assert.doesNotMatch(read.content, /1 0 obj/)

  const projection = await buildWorkspaceProjection(workspace)
  assert.match(projection.content, /original\.pdf \[document; application\/pdf;/)
}

async function verifyValidationAndImmutability(): Promise<void> {
  const workspace = createInMemoryWorkspace()
  const input = documentInput()
  await workspace.writeDocument(input)

  await assert.rejects(
    workspace.writeDocument(documentInput(Buffer.from('%PDF-1.7\ndifferent\n%%EOF\n', 'ascii'))),
    /already exists with different content/,
  )
  await assert.rejects(
    workspace.writeDocument({ ...input, path: 'references/papers/arxiv-1234/original.txt' }),
    /must end in \.pdf/,
  )
  await assert.rejects(
    workspace.write('references/papers/arxiv-1234/other.pdf', 'not a pdf'),
    /writeDocument/,
  )
  await assert.rejects(
    createInMemoryWorkspace().writeDocument(documentInput(Buffer.from('<html>upstream error</html>'))),
    /PDF magic header/,
  )
  await assert.rejects(
    createInMemoryWorkspace().writeDocument({ ...input, mimeType: 'text/html' }),
    /Unsupported document MIME type/,
  )
  await assert.rejects(
    createInMemoryWorkspace().writeDocument({ ...input, filename: '../paper.pdf' }),
    /filename is invalid/,
  )
  await assert.rejects(
    createInMemoryWorkspace().writeDocument({
      ...input,
      source: { provider: 'arxiv', canonical_url: 'javascript:alert(1)' },
    }),
    /must use http or https/,
  )
  await assert.rejects(
    createInMemoryWorkspace().writeDocument({ ...input, buffer: Buffer.alloc(0) }),
    /cannot be empty/,
  )
}

async function main(): Promise<void> {
  await verifyDocumentLifecycle()
  await verifyValidationAndImmutability()
  console.log('document-workspace:verify passed')
}

void main()
