export type Result<TValue, TError> =
  | { ok: true; value: TValue }
  | { ok: false; error: TError }

export function ok<TValue>(value: TValue): Result<TValue, never> {
  return { ok: true, value }
}

export function err<TError>(error: TError): Result<never, TError> {
  return { ok: false, error }
}

export function matchResult<TValue, TError, TOutput>(
  result: Result<TValue, TError>,
  branches: {
    ok: (value: TValue) => TOutput
    err: (error: TError) => TOutput
  },
): TOutput {
  if (result.ok) {
    return branches.ok(result.value)
  }

  return branches.err(result.error)
}

