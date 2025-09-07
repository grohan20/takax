import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { message, chatId } = await request.json()

    const botToken = process.env.TELEGRAM_BOT_TOKEN
    if (!botToken) {
      console.error("[v0] TELEGRAM_BOT_TOKEN not configured")
      return NextResponse.json({ error: "Telegram bot not configured" }, { status: 500 })
    }

    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`

    const response = await fetch(telegramUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("[v0] Telegram API error:", errorData)
      return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
    }

    const data = await response.json()
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("[v0] Error sending Telegram message:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
