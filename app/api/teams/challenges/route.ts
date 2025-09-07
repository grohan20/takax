import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get("teamId")

    if (!teamId) {
      return NextResponse.json({ success: false, error: "Team ID required" }, { status: 400 })
    }

    // Mock team challenges data
    const challenges = [
      {
        id: 1,
        title: "Team Ad Marathon",
        description: "Watch 50 ads as a team this week",
        type: "weekly",
        target: 50,
        progress: 32,
        reward: 25.0,
        bonus_type: "coins",
        start_date: "2024-01-15",
        end_date: "2024-01-22",
        status: "active",
        participants: 3,
      },
      {
        id: 2,
        title: "Social Media Boost",
        description: "Complete 10 social media tasks together",
        type: "weekly",
        target: 10,
        progress: 7,
        reward: 15.0,
        bonus_type: "coins",
        start_date: "2024-01-15",
        end_date: "2024-01-22",
        status: "active",
        participants: 2,
      },
      {
        id: 3,
        title: "Full Team Bonus",
        description: "Reach maximum team size (4 members)",
        type: "milestone",
        target: 4,
        progress: 3,
        reward: 50.0,
        bonus_type: "coins",
        status: "active",
        participants: 3,
      },
    ]

    // Calculate team performance
    const teamStats = {
      total_challenges: challenges.length,
      active_challenges: challenges.filter((c) => c.status === "active").length,
      completed_challenges: challenges.filter((c) => c.progress >= c.target).length,
      total_rewards_available: challenges.reduce((sum, c) => sum + c.reward, 0),
      team_rank: 15, // Mock ranking
      weekly_progress: 68, // Percentage
    }

    return NextResponse.json({
      success: true,
      challenges: challenges,
      teamStats: teamStats,
      recommendations: [
        {
          type: "challenge",
          title: "Focus on Ad Marathon",
          description: "18 more ads needed to complete this week's challenge",
          priority: "high",
          reward: 25.0,
        },
        {
          type: "recruitment",
          title: "Invite 1 more member",
          description: "Unlock the Full Team Bonus by reaching 4 members",
          priority: "medium",
          reward: 50.0,
        },
      ],
    })
  } catch (error) {
    console.error("[v0] Error fetching team challenges:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch team challenges" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { challengeId, teamId, userId, action } = body

    if (!challengeId || !teamId || !userId || !action) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    let result = {}
    let notificationMessage = ""

    switch (action) {
      case "join_challenge":
        result = {
          challengeId: challengeId,
          teamId: teamId,
          userId: userId,
          status: "joined",
        }
        notificationMessage = `🎯 User joined team challenge!\n\nChallenge: ${challengeId}\nTeam: ${teamId}\nUser: ${userId}\n\n#ChallengeJoined #TakaX`
        break

      case "update_progress":
        const { progress } = body
        result = {
          challengeId: challengeId,
          teamId: teamId,
          newProgress: progress,
          status: "updated",
        }
        notificationMessage = `📈 Challenge progress updated!\n\nChallenge: ${challengeId}\nTeam: ${teamId}\nProgress: ${progress}\n\n#ProgressUpdate #TakaX`
        break

      case "complete_challenge":
        const { reward } = body
        result = {
          challengeId: challengeId,
          teamId: teamId,
          status: "completed",
          reward: reward,
        }
        notificationMessage = `🏆 Team challenge completed!\n\nChallenge: ${challengeId}\nTeam: ${teamId}\nReward: ${reward} coins\n\n#ChallengeCompleted #TakaX`
        break

      default:
        return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
    }

    console.log(`[v0] Team challenge action: ${action}`, result)

    return NextResponse.json({
      success: true,
      result: result,
      message: `Challenge action completed: ${action}`,
      notification: notificationMessage,
    })
  } catch (error) {
    console.error("[v0] Error managing team challenge:", error)
    return NextResponse.json({ success: false, error: "Failed to manage challenge" }, { status: 500 })
  }
}
