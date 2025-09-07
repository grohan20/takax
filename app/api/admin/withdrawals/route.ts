import { type NextRequest, NextResponse } from "next/server"
import {
  getWithdrawalsByStatus,
  updateWithdrawalStatus,
  getUserById,
  updateUserCoins,
  logAdminAction,
  isUserAdmin,
  sendNotification,
} from "@/lib/firebase"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "pending"

    const withdrawals = await getWithdrawalsByStatus(status)

    // Enrich with user information
    const enrichedWithdrawals = await Promise.all(
      withdrawals.map(async (withdrawal) => {
        const user = await getUserById(withdrawal.userId)
        return {
          ...withdrawal,
          user: user?.name || "Unknown User",
          username: user?.username || "N/A",
        }
      }),
    )

    return NextResponse.json({
      withdrawals: enrichedWithdrawals,
      total: enrichedWithdrawals.length,
    })
  } catch (error) {
    console.error("Admin withdrawals fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { withdrawalId, action, reason, adminId } = await request.json()

    if (!adminId || !(await isUserAdmin(adminId))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    if (!withdrawalId || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const withdrawal = await updateWithdrawalStatus(withdrawalId, action, reason, adminId)

    if (!withdrawal) {
      return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 })
    }

    // If rejected, refund coins to user
    if (action === "rejected") {
      await updateUserCoins(withdrawal.userId, withdrawal.amount)
    }

    // Send notification to user
    await sendNotification(withdrawal.userId, {
      type: "withdrawal_update",
      title: `Withdrawal ${action}`,
      message:
        action === "approved"
          ? `Your withdrawal of $${withdrawal.amount} has been approved and processed.`
          : `Your withdrawal of $${withdrawal.amount} has been rejected. ${reason || "Please contact support for details."}`,
    })

    // Log admin action
    await logAdminAction(adminId, "withdrawal_management", {
      withdrawalId,
      action,
      reason,
      amount: withdrawal.amount,
      userId: withdrawal.userId,
    })

    return NextResponse.json({
      success: true,
      message: `Withdrawal ${action} successfully`,
    })
  } catch (error) {
    console.error("Admin withdrawal action error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
