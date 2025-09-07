import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ success: false, error: "User ID required" }, { status: 400 })
    }

    // Mock daily progress data
    const dailyProgress = {
      date: new Date().toISOString().split("T")[0],
      ads_watched: 12,
      ads_limit: 30,
      tasks_completed: 3,
      tasks_available: 8,
      coins_earned_today: 18.5,
      daily_goal: 25.0,
      streak_days: 5,
      next_bonus_at: 20, // Next bonus at 20 ads watched
      progress_percentage: Math.round((12 / 30) * 100),
    }

    // Calculate bonuses
    const bonuses = []
    if (dailyProgress.ads_watched >= 10) {
      bonuses.push({ type: "milestone", description: "10 ads watched", reward: 2.0 })
    }
    if (dailyProgress.ads_watched >= 20) {
      bonuses.push({ type: "milestone", description: "20 ads watched", reward: 5.0 })
    }
    if (dailyProgress.streak_days >= 7) {
      bonuses.push({ type: "streak", description: "7-day streak", reward: 10.0 })
    }

    return NextResponse.json({
      success: true,
      dailyProgress: dailyProgress,
      bonuses: bonuses,
      recommendations: [
        {
          type: "ad",
          title: "Watch 8 more ads to unlock bonus",
          reward: 5.0,
          action: "watch_ads",
        },
        {
          type: "task",
          title: "Complete social media task",
          reward: 2.0,
          action: "complete_task",
          taskId: 1,
        },
      ],
    })
  } catch (error) {
    console.error("[v0] Error fetching daily progress:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch daily progress" }, { status: 500 })
  }
}
