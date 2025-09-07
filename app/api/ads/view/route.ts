import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, adId, duration, completed, watchPercentage } = body

    if (!userId || !adId) {
      return NextResponse.json({ success: false, error: "User ID and Ad ID required" }, { status: 400 })
    }

    console.log(`[v0] Ad view recorded: User ${userId}, Ad ${adId}, Duration ${duration}s, Completed: ${completed}`)

    // Mock ad data for validation
    const adData = {
      id: adId,
      title: "Premium Mobile Game",
      reward_base: 5.0,
      daily_limit: 5,
      min_watch_percentage: 80,
    }

    // Check daily limit (mock)
    const todayViews = 2 // Mock current views today
    if (todayViews >= adData.daily_limit) {
      return NextResponse.json({ success: false, error: "Daily limit reached for this ad" }, { status: 400 })
    }

    // Calculate reward based on completion
    let reward = 0
    let rewardReason = "Ad view recorded"

    if (completed && watchPercentage >= adData.min_watch_percentage) {
      reward = adData.reward_base
      rewardReason = "Ad completed successfully!"
    } else if (watchPercentage >= 50) {
      reward = adData.reward_base * 0.5 // Partial reward for 50%+ viewing
      rewardReason = "Partial reward for viewing"
    }

    // Mock database operations
    const adView = {
      id: Math.floor(Math.random() * 10000),
      user_id: userId,
      ad_id: adId,
      duration_watched: duration,
      completion_percentage: watchPercentage,
      reward_earned: reward,
      created_at: new Date().toISOString(),
    }

    // Create Telegram notification for significant rewards
    let notificationMessage = ""
    if (reward >= 5.0) {
      notificationMessage =
        `🎬 Ad completed!\n\n` +
        `User: ${userId}\n` +
        `Ad: ${adData.title}\n` +
        `Reward: ${reward} TakaX coins\n` +
        `Watch time: ${duration}s\n\n` +
        `#AdCompleted #TakaX`
    }

    return NextResponse.json({
      success: true,
      reward: reward,
      message: rewardReason,
      adView: adView,
      dailyProgress: {
        views_today: todayViews + 1,
        daily_limit: adData.daily_limit,
        remaining: adData.daily_limit - todayViews - 1,
      },
      notification: notificationMessage,
    })
  } catch (error) {
    console.error("[v0] Error recording ad view:", error)
    return NextResponse.json({ success: false, error: "Failed to record ad view" }, { status: 500 })
  }
}
