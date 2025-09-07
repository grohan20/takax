import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { referrerCode, newUserId, action } = await request.json()

    // Validate required fields
    if (!referrerCode || !newUserId || !action) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 })
    }

    console.log(`[v0] Referral tracked: ${referrerCode} -> ${newUserId}, Action: ${action}`)

    // Calculate bonus based on action
    const bonusAmount = action === "signup" ? 5.0 : action === "first_task" ? 3.0 : 0

    return NextResponse.json({
      success: true,
      bonusAmount,
      message: bonusAmount > 0 ? `Referral bonus of ${bonusAmount} coins awarded!` : "Referral tracked",
    })
  } catch (error) {
    console.error("[v0] Error tracking referral:", error)
    return NextResponse.json({ success: false, message: "Failed to track referral" }, { status: 500 })
  }
}
