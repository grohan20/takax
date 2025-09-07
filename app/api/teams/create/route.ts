import { type NextRequest, NextResponse } from "next/server"
import db from "@/lib/firebase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, teamName } = body

    if (!userId || !teamName) {
      return NextResponse.json({ success: false, error: "User ID and team name required" }, { status: 400 })
    }

    // Validate team name
    if (teamName.length < 3 || teamName.length > 30) {
      return NextResponse.json({ success: false, error: "Team name must be 3-30 characters" }, { status: 400 })
    }

    console.log(`[v0] Team created: ${teamName} by user ${userId}`)

    const existingTeamInfo = await db.getUserTeamInfo(userId)
    if (existingTeamInfo) {
      return NextResponse.json({ success: false, error: "User is already in a team" }, { status: 400 })
    }

    const existingTeam = await db.getTeamByName(teamName)
    if (existingTeam) {
      return NextResponse.json({ success: false, error: "Team name already exists" }, { status: 400 })
    }

    let teamCode: string
    let codeExists = true
    do {
      teamCode = `TX${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      codeExists = (await db.getTeamByInvitationCode(teamCode)) !== null
    } while (codeExists)

    const teamData = {
      name: teamName,
      division: "Bronze", // Default division
      leader_id: userId,
      invitation_code: teamCode,
      total_task_earnings: 0,
      total_referral_earnings: 0,
      member_count: 1,
      is_banned: false,
    }

    const team = await db.createTeam(teamData)

    await db.joinTeam(team.id, userId, "leader")

    await db.updateUser(userId, { team_id: team.id })

    await db.createNotification(userId, {
      title: "Team Created!",
      message: `Your team "${teamName}" has been created successfully. Share code ${teamCode} to invite members.`,
      type: "success",
      is_read: false,
      created_at: Date.now(),
    })

    await db.incrementAppStat("total_teams")

    // Create Telegram notification
    const notificationMessage =
      `🎉 New team created!\n\n` +
      `Team: ${teamName}\n` +
      `Code: ${teamCode}\n` +
      `Leader: User ${userId}\n` +
      `Members: 1/4\n\n` +
      `#TeamCreated #TakaX`

    return NextResponse.json({
      success: true,
      team: {
        id: team.id,
        name: team.name,
        code: teamCode,
        leader_id: userId,
        member_count: 1,
        max_members: 4,
        total_earnings: 0,
        created_at: new Date(team.created_at).toISOString(),
        status: "active",
      },
      membership: {
        team_id: team.id,
        user_id: userId,
        role: "leader",
        joined_at: new Date().toISOString(),
        earnings: 0,
      },
      inviteLink: `https://t.me/takax_bot?start=team_${teamCode}`,
      message: "Team created successfully!",
      notification: notificationMessage,
      benefits: [
        "5% bonus on all team member earnings",
        "Access to exclusive team challenges",
        "Priority access to high-paying tasks",
        "Team leaderboard participation",
      ],
    })
  } catch (error) {
    console.error("[v0] Error creating team:", error)
    return NextResponse.json({ success: false, error: "Failed to create team" }, { status: 500 })
  }
}
