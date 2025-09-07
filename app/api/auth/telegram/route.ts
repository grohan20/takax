import { type NextRequest, NextResponse } from "next/server"
import db from "@/lib/firebase"
import crypto from "crypto"

interface TelegramWebAppData {
  user: {
    id: number
    first_name: string
    last_name?: string
    username?: string
    language_code?: string
  }
  auth_date: number
  hash: string
  start_param?: string
}

function validateTelegramWebAppData(initData: string, botToken: string): TelegramWebAppData | null {
  try {
    const urlParams = new URLSearchParams(initData)
    const hash = urlParams.get("hash")
    urlParams.delete("hash")

    // Create data check string
    const dataCheckArr: string[] = []
    for (const [key, value] of urlParams.entries()) {
      dataCheckArr.push(`${key}=${value}`)
    }
    dataCheckArr.sort()
    const dataCheckString = dataCheckArr.join("\n")

    // Create secret key
    const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest()

    // Calculate hash
    const calculatedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex")

    if (calculatedHash !== hash) {
      return null
    }

    // Parse user data
    const userStr = urlParams.get("user")
    if (!userStr) return null

    const user = JSON.parse(userStr)
    const authDate = Number.parseInt(urlParams.get("auth_date") || "0")
    const startParam = urlParams.get("start_param")

    return {
      user,
      auth_date: authDate,
      hash: hash!,
      start_param: startParam || undefined,
    }
  } catch (error) {
    console.error("[v0] Error validating Telegram data:", error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { initData, startParam } = body

    console.log("[v0] Telegram auth data received:", { initData, startParam })

    const botToken = process.env.TELEGRAM_BOT_TOKEN
    if (!botToken) {
      console.error("[v0] TELEGRAM_BOT_TOKEN not configured")
      return NextResponse.json({ success: false, error: "Bot token not configured" }, { status: 500 })
    }

    const validatedData = validateTelegramWebAppData(initData, botToken)
    if (!validatedData) {
      return NextResponse.json({ success: false, error: "Invalid Telegram data" }, { status: 400 })
    }

    const { user: telegramUser } = validatedData
    const telegramId = telegramUser.id.toString()

    let user = await db.getUser(telegramId)
    let isNewUser = false

    if (!user) {
      // Create new user
      const referralCode = `TAKAX${telegramId.slice(-6)}`
      const userData = {
        telegram_id: telegramId,
        username: telegramUser.username,
        first_name: telegramUser.first_name,
        last_name: telegramUser.last_name,
        referral_code: referralCode,
        balance: 0,
        total_earned: 0,
        is_banned: false,
      }

      user = await db.createUser(telegramId, userData)
      isNewUser = true

      if (startParam && startParam.startsWith("ref_")) {
        const referralCode = startParam.replace("ref_", "")
        try {
          const referrer = await db.getUserByReferralCode(referralCode)
          if (referrer && referrer.telegram_id !== telegramId) {
            const referralBonus = 2.0
            await db.updateUserBalance(telegramId, referralBonus, "refer_add", "Welcome bonus from referral")
            await db.createReferral(referrer.telegram_id, telegramId, referralBonus)

            user.balance = referralBonus
            user.total_earned = referralBonus

            console.log("[v0] Processed referral bonus:", { referrer: referrer.telegram_id, referred: telegramId })
          }
        } catch (referralError) {
          console.error("[v0] Error processing referral:", referralError)
        }
      }
    } else {
      // Update existing user info if needed
      const updates: any = {}
      if (telegramUser.username && telegramUser.username !== user.username) {
        updates.username = telegramUser.username
      }
      if (telegramUser.first_name !== user.first_name) {
        updates.first_name = telegramUser.first_name
      }
      if (telegramUser.last_name !== user.last_name) {
        updates.last_name = telegramUser.last_name
      }

      if (Object.keys(updates).length > 0) {
        await db.updateUser(telegramId, updates)
        user = { ...user, ...updates }
      }
    }

    const [taskSubmissions, adViews, referrals, teamInfo] = await Promise.all([
      db.getUserTaskSubmissions(telegramId),
      db.getUserAdViews(telegramId),
      db.getUserReferrals(telegramId),
      db.getUserTeamInfo(telegramId),
    ])

    const userStats = {
      coins: user.balance,
      totalEarned: user.total_earned,
      teamMembers: teamInfo?.member_count || 0,
      tasksCompleted: taskSubmissions.filter((sub) => sub.status === "approved").length,
      adsWatched: adViews.length,
      referrals: referrals.length,
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.telegram_id,
        telegram_id: user.telegram_id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        referral_code: user.referral_code,
        balance: user.balance,
        total_earned: user.total_earned,
      },
      stats: userStats,
      isNewUser,
    })
  } catch (error) {
    console.error("[v0] Telegram auth error:", error)
    return NextResponse.json({ success: false, error: "Authentication failed" }, { status: 500 })
  }
}
