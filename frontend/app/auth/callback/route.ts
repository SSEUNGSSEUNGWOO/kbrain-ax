import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { origin } = new URL(request.url)
  // Auth callback is disabled — redirect to home
  return NextResponse.redirect(`${origin}/`)
}
