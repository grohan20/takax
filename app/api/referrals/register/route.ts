import { type NextRequest, NextResponse } from "next/server"
import db from "@/lib/firebase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { newUserId, referralCode, newUserData } = body

    if (!newUserId || !referralCode) {
      return NextResponse.json({ success: false, error: "User ID and referral code required" }, { status: 400 })
    }

    console.log(`[v0] Processing referral registration for user ${newUserId} with code ${referralCode}`)

    const referrer = await db.getUserByReferralCode(referralCode)
    if (!referrer) {
      return NextResponse.json({ success: false, error: "Invalid referral code" }, { status: 400 })
    }

    const existingReferral = await db.getUserReferralRecord(newUserId)
    if (existingReferral) {
      return NextResponse.json(
        { success: false, error: "User already registered with a referral code" },
        { status: 400 },
      )
    }

    if (referrer.telegram_id === newUserId) {
      return NextResponse.json({ success: false, error: "Cannot refer yourself" }, { status: 400 })
    }

    const referralReward = 2.0 // 2 TakaX coins per referral as per spec
    const newUserBonus = 1.0 // Welcome bonus for new user

    // Create referral record and award bonuses
    const referralRecord = await db.createReferral(referrer.telegram_id, newUserId, referralReward)

    // Award welcome bonus to new user
    await db.updateUserBalance(newUserId, newUserBonus, "refer_add", "Welcome bonus for joining via referral")

    const referrerReferrals = await db.getUserReferrals(referrer.telegram_id)
    const referrerStats = {
      total_referrals: referrerReferrals.length,
      total_earnings: referrerReferrals.reduce((sum, ref) => sum + ref.reward_amount, 0),
      current_tier: await db.getUserTier(referrer.telegram_id),
    }

    await db.createNotification(referrer.telegram_id, {
      title: "New Referral!",
      message: `You earned ${referralReward} TakaX coins for referring user ${newUserId}!`,
      type: "success",
      is_read: false,
      created_at: Date.now(),
    })

    await db.createNotification(newUserId, {
      title: "Welcome Bonus!",
      message: `You received ${newUserBonus} TakaX coins as a welcome bonus!`,
      type: "success",
      is_read: false,
      created_at: Date.now(),
    })

    await db.incrementAppStat("total_referrals")

    // Create Telegram notification message
    const notificationMessage =
      `🎉 New referral success!\n\n` +
      `Referrer: User ${referrer.telegram_id}\n` +
      `New user: User ${newUserId}\n` +
      `Reward: ${referralReward} TakaX coins\n` +
      `Total referrals: ${referrerStats.total_referrals}\n\n` +
      `#NewReferral #TakaX`

    console.log(`[v0] Referral processed:`, referralRecord)

    return NextResponse.json({
      success: true,
      referral: {
        id: `${referrer.telegram_id}_${newUserId}`,
        referrer_id: referrer.telegram_id,
        referred_user_id: newUserId,
        referral_code: referralCode,
        reward_amount: referralReward,
        status: "completed",
        created_at: new Date().toISOString(),
      },
      rewards: {
        referrer_reward: referralReward,
        new_user_bonus: newUserBonus,
      },
      referrer_stats: referrerStats,
      message: "Referral processed successfully",
      notification: notificationMessage,
    })
  } catch (error) {
    console.error("[v0] Error processing referral:", error)
    return NextResponse.json({ success: false, error: "Failed to process referral" }, { status: 500 })
  }
}
