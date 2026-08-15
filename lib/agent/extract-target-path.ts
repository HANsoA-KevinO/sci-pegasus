// Map a mutating tool call to the workspace artifact it changes. Read-only
// tools return null and therefore never put a tab into an editing state.

function normalizePath(path: string): string {
  return path.replace(/^\/workspace\//, '').replace(/^workspace\//, '').replace(/^\//, '')
}

export function extractTargetPath(tool: string, input: Record<string, unknown>): string | null {
  if (tool !== 'Write' && tool !== 'Edit') return null
  const filePath = input.file_path
  return typeof filePath === 'string' && filePath.length > 0
    ? normalizePath(filePath)
    : null
}
