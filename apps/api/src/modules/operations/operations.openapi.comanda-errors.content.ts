export function buildDefaultConflictErrors(conflictDescription: string) {
  return [
    { status: 400 as const, description: 'Invalid request payload.' },
    { status: 401 as const, description: 'Authentication required.' },
    { status: 409 as const, description: conflictDescription },
  ] as const
}

export function buildComandaItemMutationErrors(notFoundDescription: string) {
  return [
    { status: 400 as const, description: 'Invalid request payload.' },
    { status: 401 as const, description: 'Authentication required.' },
    { status: 404 as const, description: notFoundDescription },
    { status: 409 as const, description: 'Comanda cannot accept new items.' },
  ] as const
}

export function buildComandaMutationErrors(notFoundDescription: string, conflictDescription: string) {
  return [
    { status: 400 as const, description: 'Invalid request payload.' },
    { status: 401 as const, description: 'Authentication required.' },
    { status: 404 as const, description: notFoundDescription },
    { status: 409 as const, description: conflictDescription },
  ] as const
}

export function buildComandaReadErrors() {
  return [
    { status: 401 as const, description: 'Authentication required.' },
    { status: 404 as const, description: 'Comanda not found.' },
  ] as const
}
