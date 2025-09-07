import { type NextRequest, NextResponse } from "next/server"
import db from "@/lib/firebase"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const telegramId = searchParams.get("telegram_id")

    if (!telegramId) {
      return NextResponse.json({ success: false, error: "Telegram ID is required" }, { status: 400 })
    }

    console.log("[v0] Loading stats for user:", telegramId)

    const user = await db.getUser(telegramId)
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    // Get comprehensive user statistics from Firebase
    const [taskSubmissions, adViews, referrals, teamInfo, balanceHistory] = await Promise.all([
      db.getUserTaskSubmissions(telegramId),
      db.getUserAdViews(telegramId),
      db.getUserReferrals(telegramId),
      db.getUserTeamInfo(telegramId),
      db.getUserBalanceHistory(telegramId),
    ])

    // Calculate statistics
    const stats = {
      coins: user.balance || 0,
      totalEarned: user.total_earned || 0,
      teamMembers: teamInfo?.member_count || 0,
      tasksCompleted: taskSubmissions.filter((sub) => sub.status === "approved").length,
      adsWatched: adViews.length,
      referrals: referrals.length,
      teamEarnings: teamInfo?.total_task_earnings || 0,
      referralEarnings: balanceHistory.filter((h) => h.type === "refer_add").reduce((sum, h) => sum + h.amount, 0),
      pendingTasks: taskSubmissions.filter((sub) => sub.status === "pending").length,
      rejectedTasks: taskSubmissions.filter((sub) => sub.status === "rejected").length,
      todayEarnings: balanceHistory
        .filter((h) => {
          const today = new Date()
          const historyDate = new Date(h.created_at)
          return historyDate.toDateString() === today.toDateString() && h.amount > 0
        })
        .reduce((sum, h) => sum + h.amount, 0),
    }

    return NextResponse.json({
      success: true,
      stats,
      user: {
        telegram_id: user.telegram_id,
        username: user.username,
        first_name: user.first_name,
        referral_code: user.referral_code,
        is_banned: user.is_banned,
      },
    })
  } catch (error) {
    console.error("[v0] Error loading user stats:", error)
    return NextResponse.json({ success: false, error: "Failed to load user stats" }, { status: 500 })
  }
}
