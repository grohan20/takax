import { type NextRequest, NextResponse } from "next/server"
import { getUserSupportTickets } from "@/lib/firebase"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ success: false, error: "User ID is required" }, { status: 400 })
    }

    const tickets = await getUserSupportTickets(userId)

    return NextResponse.json({
      success: true,
      tickets,
    })
  } catch (error) {
    console.error("[v0] Error fetching support tickets:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch support tickets" }, { status: 500 })
  }
}
