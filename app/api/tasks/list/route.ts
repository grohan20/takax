import { type NextRequest, NextResponse } from "next/server"
import db from "@/lib/firebase"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("user_id")
    const taskType = searchParams.get("type")

    let tasks = await db.getActiveTasks()

    // Filter by task type if specified
    if (taskType && taskType !== "all") {
      tasks = tasks.filter((task) => task.task_type === taskType)
    }

    if (userId) {
      const tasksWithStatus = await Promise.all(
        tasks.map(async (task) => {
          const [submission, todaySubmissions] = await Promise.all([
            db.getTaskSubmission(userId, task.id),
            db.getUserTodayTaskSubmissions(userId, task.id),
          ])

          return {
            ...task,
            completed: !!submission,
            completion_status: submission?.status || null,
            daily_completed: todaySubmissions.length,
            can_complete: !submission && todaySubmissions.length < task.daily_limit,
          }
        }),
      )

      return NextResponse.json({
        success: true,
        tasks: tasksWithStatus,
        total: tasksWithStatus.length,
        available: tasksWithStatus.filter((t) => t.can_complete).length,
      })
    }

    // Return tasks without user-specific data
    return NextResponse.json({
      success: true,
      tasks: tasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        reward_amount: task.reward_amount,
        task_type: task.task_type,
        external_link: task.external_link,
        daily_limit: task.daily_limit,
        requirements: task.requirements,
      })),
      total: tasks.length,
    })
  } catch (error) {
    console.error("[v0] Error fetching tasks:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch tasks" }, { status: 500 })
  }
}
