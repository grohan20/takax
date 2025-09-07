import { type NextRequest, NextResponse } from "next/server"
import db from "@/lib/firebase"

export async function POST(request: NextRequest) {
  try {
    const { userId, teamCode } = await request.json()

    if (!userId || !teamCode) {
      return NextResponse.json({ success: false, error: "User ID and team code required" }, { status: 400 })
    }

    console.log(`[v0] User ${userId} joining team with code ${teamCode}`)

    const existingTeamInfo = await db.getUserTeamInfo(userId)
    if (existingTeamInfo) {
      return NextResponse.json({ success: false, error: "User is already in a team" }, { status: 400 })
    }

    const team = await db.getTeamByInvitationCode(teamCode)
    if (!team) {
      return NextResponse.json({ success: false, error: "Invalid team code" }, { status: 400 })
    }

    if (team.is_banned) {
      return NextResponse.json({ success: false, error: "Team is banned" }, { status: 400 })
    }

    if (team.member_count >= 4) {
      return NextResponse.json({ success: false, error: "Team is full (maximum 4 members)" }, { status: 400 })
    }

    await db.joinTeam(team.id, userId, "member")

    await db.updateUser(userId, { team_id: team.id })

    await db.createNotification(userId, {
      title: "Joined Team!",
      message: `You have successfully joined team "${team.name}". Start earning together!`,
      type: "success",
      is_read: false,
      created_at: Date.now(),
    })

    // Notify team leader
    await db.createNotification(team.leader_id, {
      title: "New Team Member!",
      message: `User ${userId} has joined your team "${team.name}".`,
      type: "info",
      is_read: false,
      created_at: Date.now(),
    })

    return NextResponse.json({
      success: true,
      team: {
        id: team.id,
        name: team.name,
        code: teamCode,
        memberCount: team.member_count + 1,
        leader_id: team.leader_id,
        division: team.division,
      },
      message: "Successfully joined team!",
    })
  } catch (error) {
    console.error("[v0] Error joining team:", error)
    return NextResponse.json({ success: false, error: "Failed to join team" }, { status: 500 })
  }
}
