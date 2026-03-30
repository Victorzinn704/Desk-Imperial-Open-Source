import { NextResponse } from 'next/server'

export function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'imperial-desk-web',
    timestamp: new Date().toISOString(),
  })
}
