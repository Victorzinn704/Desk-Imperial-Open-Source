import * as Sentry from '@sentry/nextjs'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (process.env.SENTRY_EXAMPLE_ENABLED !== 'true') {
    return NextResponse.json({ message: 'Not found' }, { status: 404 })
  }

  const error = new Error('Desk Imperial Next.js server test error')
  Sentry.captureException(error)
  await Sentry.flush(2_000)

  return NextResponse.json(
    {
      message: error.message,
      sentryCaptured: true,
    },
    { status: 500 },
  )
}
