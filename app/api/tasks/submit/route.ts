import { type NextRequest, NextResponse } from "next/server"
import db from "@/lib/firebase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, taskId, submissionData, taskType } = body

    if (!userId || !taskId || !submissionData) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    console.log(`[v0] Task submitted: User ${userId}, Task ${taskId}`, submissionData)

    const task = await db.getTask(taskId)
    if (!task) {
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 })
    }

    if (!task.is_active) {
      return NextResponse.json({ success: false, error: "Task is no longer active" }, { status: 400 })
    }

    const existingSubmission = await db.getTaskSubmission(userId, taskId)
    if (existingSubmission) {
      return NextResponse.json({ success: false, error: "Task already submitted" }, { status: 400 })
    }

    const todaySubmissions = await db.getUserTodayTaskSubmissions(userId, taskId)
    if (todaySubmissions.length >= task.daily_limit) {
      return NextResponse.json(
        {
          success: false,
          error: `Daily limit reached for this task (${task.daily_limit} per day)`,
        },
        { status: 400 },
      )
    }

    let validationResult = { valid: true, message: "" }

    if (task.requirements?.proof_required) {
      switch (task.requirements.proof_type) {
        case "username":
          if (!submissionData.username) {
            validationResult = { valid: false, message: "Username is required for this task" }
          }
          break
        case "screenshot":
          if (!submissionData.screenshot) {
            validationResult = { valid: false, message: "Screenshot proof is required for this task" }
          }
          break
        case "text":
          if (!submissionData.proof_text) {
            validationResult = { valid: false, message: "Text proof is required for this task" }
          }
          break
      }
    }

    if (!validationResult.valid) {
      return NextResponse.json({ success: false, error: validationResult.message }, { status: 400 })
    }

    const autoApprove =
      task.requirements?.auto_approve || (task.reward_amount < 5.0 && !task.requirements?.proof_required)
    const status = autoApprove ? "approved" : "pending"
    const reward = autoApprove ? task.reward_amount : 0

    const taskSubmission = await db.submitTask(userId, taskId, {
      proof_media_url: submissionData.screenshot || null,
      proof_text: submissionData.username || submissionData.proof_text || submissionData.review || null,
      status: status,
      submitted_at: Date.now(),
      reviewed_at: autoApprove ? Date.now() : null,
    })

    if (autoApprove) {
      await db.updateUserBalance(userId, reward, "task_add", `Task completion: ${task.title}`)

      // Update app statistics
      await db.incrementAppStat("total_tasks_completed")
    }

    await db.createNotification(userId, {
      title: autoApprove ? "Task Completed!" : "Task Submitted",
      message: autoApprove
        ? `You earned ${reward} TakaX coins for completing "${task.title}"`
        : `Your submission for "${task.title}" is under review. You'll be notified when approved.`,
      type: autoApprove ? "success" : "info",
      is_read: false,
      created_at: Date.now(),
    })

    let notificationMessage = ""
    if (autoApprove) {
      notificationMessage =
        `✅ Task completed!\n\n` +
        `User: ${userId}\n` +
        `Task: ${task.title}\n` +
        `Reward: ${reward} TakaX coins\n` +
        `Type: ${task.task_type}\n\n` +
        `#TaskCompleted #TakaX`
    } else {
      notificationMessage =
        `📋 Task submitted for review!\n\n` +
        `User: ${userId}\n` +
        `Task: ${task.title}\n` +
        `Potential reward: ${task.reward_amount} TakaX coins\n` +
        `Type: ${task.task_type}\n\n` +
        `#TaskSubmitted #TakaX`
    }

    return NextResponse.json({
      success: true,
      status: status,
      reward: reward,
      taskSubmission: {
        id: `${userId}_${taskId}`,
        user_id: userId,
        task_id: taskId,
        status: status,
        reward_earned: reward,
        submitted_at: new Date().toISOString(),
        reviewed_at: autoApprove ? new Date().toISOString() : null,
      },
      message: autoApprove
        ? "Task completed and approved!"
        : "Task submitted for review. You'll be notified when approved.",
      estimatedReviewTime: autoApprove ? "immediate" : "1-24 hours",
      notification: notificationMessage,
    })
  } catch (error) {
    console.error("[v0] Error submitting task:", error)
    return NextResponse.json({ success: false, error: "Failed to submit task" }, { status: 500 })
  }
}
