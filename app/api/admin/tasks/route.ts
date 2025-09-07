import { type NextRequest, NextResponse } from "next/server"
import db from "@/lib/firebase"

export async function GET(request: NextRequest) {
  try {
    const tasks = await db.getAllTasks()

    // Get submission statistics for each task
    const tasksWithStats = await Promise.all(
      tasks.map(async (task) => {
        const submissions = await db.getTaskSubmissions(task.id)
        const submissionStats = {
          total: submissions.length,
          pending: submissions.filter((s) => s.status === "pending").length,
          approved: submissions.filter((s) => s.status === "approved").length,
          rejected: submissions.filter((s) => s.status === "rejected").length,
        }

        return {
          id: task.id,
          title: task.title,
          description: task.description,
          reward: task.reward_amount,
          type: task.task_type,
          is_active: task.is_active,
          daily_limit: task.daily_limit,
          submissions: submissionStats.total,
          pending_reviews: submissionStats.pending,
          approval_rate:
            submissionStats.total > 0 ? Math.round((submissionStats.approved / submissionStats.total) * 100) : 0,
          created_at: task.created_at,
          updated_at: task.updated_at,
        }
      }),
    )

    return NextResponse.json({
      success: true,
      tasks: tasksWithStats,
      total: tasksWithStats.length,
      statistics: {
        active_tasks: tasksWithStats.filter((t) => t.is_active).length,
        total_submissions: tasksWithStats.reduce((sum, t) => sum + t.submissions, 0),
        pending_reviews: tasksWithStats.reduce((sum, t) => sum + t.pending_reviews, 0),
      },
    })
  } catch (error) {
    console.error("Admin tasks fetch error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { title, description, reward_amount, task_type, external_link, daily_limit, requirements } =
      await request.json()

    // TODO: Implement proper admin authentication

    if (!title || !reward_amount || !task_type) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    if (reward_amount < 0.1 || reward_amount > 100) {
      return NextResponse.json({ success: false, error: "Reward amount must be between 0.1 and 100" }, { status: 400 })
    }

    const taskData = {
      title,
      description: description || "",
      reward_amount: Number.parseFloat(reward_amount),
      task_type,
      external_link: external_link || null,
      is_active: true,
      daily_limit: daily_limit || 1,
      requirements: requirements || {
        proof_required: task_type === "app_download" || task_type === "survey",
        proof_type: task_type === "social_media" ? "username" : "screenshot",
        auto_approve: task_type === "website_visit" || task_type === "survey",
        instructions: `Complete this ${task_type} task to earn ${reward_amount} TakaX coins`,
      },
    }

    const newTask = await db.createTask(taskData)

    await db.incrementAppStat("total_tasks_available")

    return NextResponse.json({
      success: true,
      task: newTask,
      message: "Task created successfully",
    })
  } catch (error) {
    console.error("Admin task creation error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { taskId, updates } = await request.json()

    if (!taskId) {
      return NextResponse.json({ success: false, error: "Task ID is required" }, { status: 400 })
    }

    // Get existing task
    const existingTask = await db.getTask(taskId)
    if (!existingTask) {
      return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 })
    }

    // Update task in Firebase
    await db.updateTask(taskId, updates)

    return NextResponse.json({
      success: true,
      message: "Task updated successfully",
    })
  } catch (error) {
    console.error("Admin task update error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
