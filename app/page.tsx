"use client"

import { useEffect, useState } from "react"
import { LoadingScreen } from "@/components/loading-screen"
import { OnboardingScreen } from "@/components/onboarding-screen"
import { Navigation } from "@/components/navigation"
import { HomePage } from "@/components/pages/home-page"
import { AdsPage } from "@/components/pages/ads-page"
import { TeamPage } from "@/components/pages/team-page"
import { ReferPage } from "@/components/pages/refer-page"
import { ProfilePage } from "@/components/pages/profile-page"
import { WithdrawPage } from "@/components/pages/withdraw-page"
import { SupportPage } from "@/components/pages/support-page"

interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
}

interface UserStats {
  coins: number
  totalEarned: number
  teamMembers: number
  tasksCompleted: number
  adsWatched: number
  referrals: number
}

type AppState = "loading" | "onboarding" | "main"

export default function TakaXApp() {
  const [appState, setAppState] = useState<AppState>("loading")
  const [user, setUser] = useState<TelegramUser | null>(null)
  const [stats, setStats] = useState<UserStats>({
    coins: 0,
    totalEarned: 0,
    teamMembers: 0,
    tasksCompleted: 0,
    adsWatched: 0,
    referrals: 0,
  })
  const [currentPage, setCurrentPage] = useState("home")

  useEffect(() => {
    // Initialize Telegram WebApp
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp
      tg.ready()
      tg.expand()

      // Get user data from Telegram
      if (tg.initDataUnsafe?.user) {
        setUser(tg.initDataUnsafe.user)
      }
    } else {
      // Development mode - create mock user data for testing
      console.log("[v0] Telegram WebApp not available - using mock user data for development")
      const mockUser = {
        id: 123456789,
        first_name: "Dev",
        last_name: "User",
        username: "devuser",
      }
      setUser(mockUser)
    }
  }, [])

  const handleLoadingComplete = () => {
    setAppState("onboarding")
  }

  const handleOnboardingComplete = async (referralCode?: string) => {
    try {
      // Process referral code and initialize user
      await initializeUser(referralCode)
      setAppState("main")
    } catch (error) {
      console.error("[v0] Error during onboarding:", error)
      setAppState("main") // Continue to main app even if there's an error
    }
  }

  const initializeUser = async (referralCode?: string) => {
    try {
      if (!user) return

      console.log("[v0] Initializing user with referral code:", referralCode)

      const response = await fetch("/api/auth/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegram_id: user.id,
          username: user.username,
          first_name: user.first_name,
          last_name: user.last_name,
          referral_code: referralCode,
        }),
      })

      if (response.ok) {
        const userData = await response.json()
        console.log("[v0] User initialized:", userData)
      }

      // Load real user stats from Firebase
      await loadUserStats(user.id)
    } catch (error) {
      console.error("[v0] Error initializing user:", error)
    }
  }

  const loadUserStats = async (telegramId: number) => {
    try {
      console.log("[v0] Loading stats for user:", telegramId)

      const response = await fetch(`/api/user/stats?userId=${telegramId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setStats({
            coins: data.stats.balance || 0,
            totalEarned: data.stats.total_earned || 0,
            teamMembers: data.stats.team_members || 0,
            tasksCompleted: data.stats.tasks_completed || 0,
            adsWatched: data.stats.ads_watched || 0,
            referrals: data.stats.total_referrals || 0,
          })
        }
      }
    } catch (error) {
      console.error("[v0] Error loading user stats:", error)
    }
  }

  const handleNavigate = (page: string) => {
    setCurrentPage(page)
  }

  const handleUpdateCoins = (newCoins: number) => {
    setStats((prevStats) => ({
      ...prevStats,
      coins: newCoins,
      totalEarned: prevStats.totalEarned + (newCoins - prevStats.coins),
    }))
  }

  const renderCurrentPage = () => {
    switch (currentPage) {
      case "home":
        return <HomePage user={user} stats={stats} onNavigate={handleNavigate} />
      case "ads":
        return <AdsPage user={user} stats={stats} onUpdateCoins={handleUpdateCoins} />
      case "team":
        return <TeamPage user={user} stats={stats} />
      case "refer":
        return <ReferPage user={user} stats={stats} />
      case "profile":
        return <ProfilePage user={user} stats={stats} />
      case "withdraw":
        return <WithdrawPage user={user} stats={stats} />
      case "support":
        return <SupportPage user={user} stats={stats} />
      default:
        return <HomePage user={user} stats={stats} onNavigate={handleNavigate} />
    }
  }

  if (appState === "loading") {
    return <LoadingScreen onComplete={handleLoadingComplete} />
  }

  if (appState === "onboarding") {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation currentPage={currentPage} onNavigate={handleNavigate} userCoins={stats.coins} />

      {/* Main Content */}
      <div className="md:ml-64 pb-16 md:pb-0">{renderCurrentPage()}</div>
    </div>
  )
}
