import { type NextRequest, NextResponse } from "next/server"
import {
  getFirebaseDatabase,
  getAllUsers,
  addUser,
  updateUser,
  getUserByReferralCode,
  addReferral,
} from "@/lib/firebase"
import type { User } from "@/lib/firebase-types"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { telegram_id, username, first_name, last_name, referral_code, referred_by_code } = body

    console.log("[v0] Initializing user:", { telegram_id, username, referral_code })

    const db = getFirebaseDatabase()
    let existingUser: User | null = null

    if (db) {
      // Use Firebase if available
      existingUser = await db.getUser(telegram_id.toString())
    } else {
      // Use shared data system as fallback
      const allUsers = getAllUsers()
      existingUser = allUsers.find((u) => u.telegram_id === telegram_id.toString()) || null
    }

    if (existingUser) {
      // User exists, return existing data
      return NextResponse.json({
        success: true,
        user: existingUser,
        referral_bonus: 0,
        message: "Welcome back to TakaX!",
        isNewUser: false,
      })
    }

    // Generate unique referral code if not provided
    const userReferralCode = referral_code || `TAKAX${telegram_id.toString().slice(-6)}`

    const userData: Omit<User, "created_at" | "updated_at"> = {
      telegram_id: telegram_id.toString(),
      username: username || `takax_user${Math.floor(Math.random() * 1000)}`,
      first_name,
      last_name,
      referral_code: userReferralCode,
      referred_by_code,
      balance: 0,
      total_earned: 0,
      is_banned: false,
    }

    let newUser: User
    if (db) {
      // Use Firebase if available
      newUser = await db.createUser(telegram_id.toString(), userData)
    } else {
      // Use shared data system as fallback
      const now = new Date().toISOString()
      newUser = {
        ...userData,
        created_at: now,
        updated_at: now,
      }
      addUser(newUser)
    }

    let referralBonus = 0
    if (referred_by_code) {
      try {
        let referrer: User | null = null
        if (db) {
          referrer = await db.getUserByReferralCode(referred_by_code)
        } else {
          referrer = getUserByReferralCode(referred_by_code)
        }

        if (referrer) {
          referralBonus = 2.0 // 2 TakaX coins for referral

          if (db) {
            // Add bonus to new user
            await db.updateUserBalance(
              telegram_id.toString(),
              referralBonus,
              "refer_add",
              "Welcome bonus from referral",
            )
            // Create referral record and reward referrer
            await db.createReferral(referrer.telegram_id, telegram_id.toString(), referralBonus)
          } else {
            // Update user in shared data system
            newUser.balance = referralBonus
            newUser.total_earned = referralBonus
            updateUser(newUser)
            // Add referral record
            addReferral({
              id: `ref_${Date.now()}`,
              referrer_id: referrer.telegram_id,
              referred_id: telegram_id.toString(),
              bonus_amount: referralBonus,
              created_at: new Date().toISOString(),
            })
          }

          // Update user data with bonus
          newUser.balance = referralBonus
          newUser.total_earned = referralBonus
        }
      } catch (referralError) {
        console.error("[v0] Error processing referral:", referralError)
        // Continue without referral bonus if there's an error
      }
    }

    return NextResponse.json({
      success: true,
      user: newUser,
      referral_bonus: referralBonus,
      message: referred_by_code ? "Welcome! You received 2 TakaX coins from referral." : "Welcome to TakaX!",
      isNewUser: true,
    })
  } catch (error) {
    console.error("[v0] Error initializing user:", error)
    return NextResponse.json({ success: false, error: "Failed to initialize user" }, { status: 500 })
  }
}
