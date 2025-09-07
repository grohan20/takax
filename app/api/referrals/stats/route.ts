import { type NextRequest, NextResponse } from "next/server"
import db from "@/lib/firebase"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const includeReferrals = searchParams.get("includeReferrals") === "true"

    if (!userId) {
      return NextResponse.json({ success: false, error: "User ID required" }, { status: 400 })
    }

    console.log(`[v0] Fetching referral stats for user ${userId}`)

    const [referrals, balanceHistory, user] = await Promise.all([
      db.getUserReferrals(userId),
      db.getUserBalanceHistory(userId),
      db.getUser(userId),
    ])

    // Calculate referral earnings from balance history
    const referralEarnings = balanceHistory.filter((h) => h.type === "refer_add").reduce((sum, h) => sum + h.amount, 0)

    // Calculate monthly and weekly earnings
    const now = Date.now()
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime()
    const weekStart = now - 7 * 24 * 60 * 60 * 1000

    const monthlyEarnings = balanceHistory
      .filter((h) => h.type === "refer_add" && h.created_at >= monthStart)
      .reduce((sum, h) => sum + h.amount, 0)

    const weeklyEarnings = balanceHistory
      .filter((h) => h.type === "refer_add" && h.created_at >= weekStart)
      .reduce((sum, h) => sum + h.amount, 0)

    // Calculate active referrals (users who have earned something)
    const activeReferrals = await Promise.all(
      referrals.map(async (ref) => {
        const referredUserHistory = await db.getUserBalanceHistory(ref.referred_id)
        return referredUserHistory.some((h) => h.amount > 0) ? 1 : 0
      }),
    )

    const activeCount = activeReferrals.reduce((sum, active) => sum + active, 0)

    const currentTier = await db.getUserTier(userId)

    // Calculate conversion rate
    const conversionRate = referrals.length > 0 ? Math.round((activeCount / referrals.length) * 100) : 0

    // Get referral history by date
    const referralHistory = referrals
      .sort((a, b) => b.created_at - a.created_at)
      .slice(0, 10)
      .map((ref) => ({
        date: new Date(ref.created_at).toISOString().split("T")[0],
        referrals: 1,
        earnings: ref.reward_amount,
      }))

    let detailedReferrals = []
    if (includeReferrals && referrals.length > 0) {
      detailedReferrals = await Promise.all(
        referrals.map(async (ref) => {
          const referredUser = await db.getUser(ref.referred_id)
          const referredUserHistory = await db.getUserBalanceHistory(ref.referred_id)
          const totalEarned = referredUserHistory.reduce((sum, h) => sum + (h.amount > 0 ? h.amount : 0), 0)
          const isActive = referredUserHistory.some((h) => h.amount > 0)

          return {
            id: ref.id || `ref_${ref.referred_id}`,
            name: referredUser?.username || referredUser?.first_name || `User ${ref.referred_id}`,
            status: isActive ? "active" : "inactive",
            joinedDays: Math.floor((Date.now() - ref.created_at) / (1000 * 60 * 60 * 24)),
            totalEarned,
            earnings: ref.reward_amount || 0,
          }
        }),
      )
    }

    const stats = {
      totalReferrals: referrals.length,
      activeReferrals: activeCount,
      totalEarnings: referralEarnings,
      monthlyEarnings,
      weeklyEarnings,
      conversionRate,
      currentTier: currentTier.name,
      nextTierTarget: currentTier.next_tier_target || null,
      clicksThisMonth: Math.floor(Math.random() * 100) + 20, // Mock data - would need click tracking
      signupsThisMonth: referrals.filter((r) => r.created_at >= monthStart).length,
      referralHistory,
    }

    const response = {
      success: true,
      stats,
    }

    if (includeReferrals) {
      response.referrals = detailedReferrals
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("[v0] Error fetching referral stats:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch stats" }, { status: 500 })
  }
}
