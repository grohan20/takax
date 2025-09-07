import { type NextRequest, NextResponse } from "next/server"
import { createSupportTicket } from "@/lib/firebase"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Support ticket submission started")

    const body = await request.json()
    console.log("[v0] Parsed request body:", body)

    const { userId, subject, message, image } = body

    console.log("[v0] Extracted fields:", {
      userId: userId,
      subject: subject,
      message: message,
      hasImage: !!image,
    })

    if (!userId || !subject || !message) {
      console.log("[v0] Missing required fields:", {
        hasUserId: !!userId,
        hasSubject: !!subject,
        hasMessage: !!message,
      })
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    console.log("[v0] Creating support ticket...")
    const ticketId = await createSupportTicket({
      userId: userId.toString(),
      subject: subject.trim(),
      message: message.trim(),
      image: image || null,
      category: "general",
      priority: "medium",
      status: "pending",
      createdAt: Date.now(),
    })

    console.log("[v0] Support ticket created successfully:", ticketId)
    return NextResponse.json({
      success: true,
      ticketId,
      message: "Support ticket created successfully",
    })
  } catch (error) {
    console.error("[v0] Error creating support ticket:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create support ticket",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
