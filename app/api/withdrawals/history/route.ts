import { type NextRequest, NextResponse } from "next/server"
import { getFirebaseDatabase } from "@/lib/firebase"
import { ref, get } from "firebase/database"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const status = searchParams.get("status")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    if (!userId) {
      return NextResponse.json({ success: false, error: "User ID required" }, { status: 400 })
    }

    const db = await getFirebaseDatabase()
    const withdrawalsSnapshot = await get(ref(db, "withdrawals"))
    const allWithdrawals = withdrawalsSnapshot.val() || {}

    // Filter withdrawals for this user
    let userWithdrawals = Object.entries(allWithdrawals)
      .map(([id, withdrawal]: [string, any]) => ({ id, ...withdrawal }))
      .filter((w: any) => w.user_id === userId)

    // Filter by status if provided
    if (status && status !== "all") {
      userWithdrawals = userWithdrawals.filter((w: any) => w.status === status)
    }

    // Sort by created_at descending
    userWithdrawals.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    // Apply pagination
    const paginatedWithdrawals = userWithdrawals.slice(offset, offset + limit)

    // Calculate summary statistics
    const summary = {
      total_withdrawals: userWithdrawals.length,
      total_amount: userWithdrawals.reduce((sum: number, w: any) => sum + (w.amount || 0), 0),
      total_fees: userWithdrawals.reduce((sum: number, w: any) => sum + (w.fee || 0), 0),
      total_net: userWithdrawals.reduce((sum: number, w: any) => sum + (w.net_amount || w.amount || 0), 0),
      status_counts: {
        completed: userWithdrawals.filter((w: any) => w.status === "completed").length,
        processing: userWithdrawals.filter((w: any) => w.status === "processing").length,
        pending: userWithdrawals.filter((w: any) => w.status === "pending").length,
        rejected: userWithdrawals.filter((w: any) => w.status === "rejected").length,
      },
    }

    return NextResponse.json({
      success: true,
      withdrawals: paginatedWithdrawals,
      summary: summary,
      pagination: {
        total: userWithdrawals.length,
        limit: limit,
        offset: offset,
        has_more: offset + limit < userWithdrawals.length,
      },
    })
  } catch (error) {
    console.error("[v0] Error fetching withdrawal history:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch withdrawal history" }, { status: 500 })
  }
}
