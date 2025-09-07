import { type NextRequest, NextResponse } from "next/server"
import { getFirebaseDatabase, getAllUsers } from "@/lib/firebase"
import { ref, get } from "firebase/database"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const limit = Number.parseInt(searchParams.get("limit") || "10")

    console.log(`[v0] Fetching referral leaderboard for user ${userId}`)

    const db = getFirebaseDatabase()

    let users: any = {}

    if (!db) {
      console.log("[v0] Firebase not available, using shared data system for leaderboard")
      const allUsers = await getAllUsers()
      // Convert array to object format for compatibility
      users = allUsers.reduce((acc, user) => {
        acc[user.id || user.telegram_id] = user
        return acc
      }, {})
    } else {
      // Get all users with referral data from Firebase
      const usersSnapshot = await get(ref(db, "users"))
      users = usersSnapshot.val() || {}
    }

    // Calculate referral stats for each user
    const leaderboardData = Object.entries(users)
      .map(([id, user]: [string, any]) => ({
        userId: id,
        name: user.name || `${user.first_name} ${user.last_name || ""}`.trim(),
        referrals: user.total_referrals || 0,
        earnings: user.referral_earnings || 0,
      }))
      .filter((user) => user.referrals > 0)
      .sort((a, b) => b.referrals - a.referrals)
      .slice(0, limit)
      .map((user, index) => ({
        ...user,
        rank: index + 1,
      }))

    // Find current user's rank
    const currentUserRank = leaderboardData.findIndex((user) => user.userId === userId) + 1

    return NextResponse.json({
      success: true,
      leaderboard: leaderboardData,
      userRank: currentUserRank || null,
      totalReferrers: leaderboardData.length,
    })
  } catch (error) {
    console.error("[v0] Error fetching leaderboard:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch leaderboard" }, { status: 500 })
  }
}
