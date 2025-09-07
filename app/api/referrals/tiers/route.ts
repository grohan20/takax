import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    // Define tier system
    const tiers = [
      {
        name: "Bronze",
        min_referrals: 0,
        max_referrals: 4,
        bonus_per_referral: 2.0,
        monthly_bonus: 0,
        color: "#CD7F32",
        benefits: ["Basic referral rewards", "Access to referral tools"],
      },
      {
        name: "Silver",
        min_referrals: 5,
        max_referrals: 14,
        bonus_per_referral: 2.5,
        monthly_bonus: 5.0,
        color: "#C0C0C0",
        benefits: ["Increased referral rewards", "Monthly bonus", "Priority support"],
      },
      {
        name: "Gold",
        min_referrals: 15,
        max_referrals: 49,
        bonus_per_referral: 3.0,
        monthly_bonus: 15.0,
        color: "#FFD700",
        benefits: ["Higher referral rewards", "Larger monthly bonus", "Exclusive challenges", "VIP support"],
      },
      {
        name: "Diamond",
        min_referrals: 50,
        max_referrals: null,
        bonus_per_referral: 4.0,
        monthly_bonus: 50.0,
        color: "#B9F2FF",
        benefits: [
          "Maximum referral rewards",
          "Premium monthly bonus",
          "All exclusive features",
          "Personal account manager",
        ],
      },
    ]

    // Mock user data
    const userReferrals = userId ? 5 : 0
    const currentTier =
      tiers.find(
        (tier) =>
          userReferrals >= tier.min_referrals && (tier.max_referrals === null || userReferrals <= tier.max_referrals),
      ) || tiers[0]

    // Calculate progress to next tier
    const nextTier = tiers.find((tier) => tier.min_referrals > userReferrals)
    const progress = nextTier
      ? {
          current: userReferrals,
          target: nextTier.min_referrals,
          percentage: Math.min((userReferrals / nextTier.min_referrals) * 100, 100),
          remaining: Math.max(nextTier.min_referrals - userReferrals, 0),
        }
      : null

    // Calculate tier rewards earned
    const tierRewards = {
      total_bonus_earned: userReferrals * currentTier.bonus_per_referral,
      monthly_bonus_earned: currentTier.monthly_bonus,
      lifetime_tier_earnings: userReferrals * currentTier.bonus_per_referral + currentTier.monthly_bonus * 3, // 3 months example
    }

    return NextResponse.json({
      success: true,
      tiers: tiers,
      current_tier: currentTier,
      next_tier: nextTier,
      progress: progress,
      user_referrals: userReferrals,
      tier_rewards: tierRewards,
      tier_history: [
        {
          tier: "Bronze",
          achieved_date: "2024-01-01",
          referrals_at_achievement: 0,
        },
        {
          tier: "Silver",
          achieved_date: "2024-01-15",
          referrals_at_achievement: 5,
        },
      ],
    })
  } catch (error) {
    console.error("[v0] Error fetching tier information:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch tier information" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, action, data } = body

    if (!userId || !action) {
      return NextResponse.json({ success: false, error: "User ID and action required" }, { status: 400 })
    }

    let result = {}
    let notificationMessage = ""

    switch (action) {
      case "claim_monthly_bonus":
        const monthlyBonus = 5.0 // Silver tier bonus
        result = {
          action: "monthly_bonus_claimed",
          user_id: userId,
          bonus_amount: monthlyBonus,
          claim_date: new Date().toISOString(),
        }
        notificationMessage = `💰 Monthly bonus claimed!\n\nUser: ${userId}\nBonus: ${monthlyBonus} TakaX coins\nTier: Silver\n\n#MonthlyBonus #TakaX`
        break

      case "tier_upgrade":
        const { newTier, referralCount } = data
        result = {
          action: "tier_upgraded",
          user_id: userId,
          new_tier: newTier,
          referrals_at_upgrade: referralCount,
          upgrade_date: new Date().toISOString(),
        }
        notificationMessage = `🎉 Tier upgrade!\n\nUser: ${userId}\nNew tier: ${newTier}\nReferrals: ${referralCount}\n\n#TierUpgrade #TakaX`
        break

      default:
        return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
    }

    console.log(`[v0] Tier action: ${action}`, result)

    return NextResponse.json({
      success: true,
      result: result,
      message: `Tier action completed: ${action}`,
      notification: notificationMessage,
    })
  } catch (error) {
    console.error("[v0] Error processing tier action:", error)
    return NextResponse.json({ success: false, error: "Failed to process tier action" }, { status: 500 })
  }
}
