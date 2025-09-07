import { type NextRequest, NextResponse } from "next/server"
import { getAdminDashboardStats, isUserAdmin } from "@/lib/firebase"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const adminId = searchParams.get("adminId")

    if (!adminId || !(await isUserAdmin(adminId))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const stats = await getAdminDashboardStats()

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Admin dashboard stats error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
