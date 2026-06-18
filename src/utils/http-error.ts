export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code = 'ERROR'
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

export function sanitizeError(error: unknown): { status: number; body: { error: string; code: string } } {
  if (error instanceof HttpError) {
    return { status: error.status, body: { error: error.message, code: error.code } }
  }
  console.error('[internal-error]', error)
  return { status: 500, body: { error: 'Internal server error', code: 'INTERNAL_ERROR' } }
}
