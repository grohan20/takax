import { type NextRequest, NextResponse } from "next/server"
import { getAllUsers, updateUserStatus, logAdminAction, isUserAdmin } from "@/lib/firebase"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || "all"

    const { users, total } = await getAllUsers({
      page,
      limit,
      search,
      status: status === "all" ? undefined : status,
    })

    return NextResponse.json({
      users,
      total,
      page,
      limit,
    })
  } catch (error) {
    console.error("Admin users fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId, action, reason, adminId } = await request.json()

    if (!adminId || !(await isUserAdmin(adminId))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    if (!userId || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    await updateUserStatus(userId, action, reason)

    // Log admin action
    await logAdminAction(adminId, "user_management", {
      targetUserId: userId,
      action,
      reason,
    })

    return NextResponse.json({
      success: true,
      message: `User ${action} successfully`,
    })
  } catch (error) {
    console.error("Admin user action error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
