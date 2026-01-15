import { NextResponse } from "next/server";
import { sendPushNotificationToAll } from "@/lib/utils/push-notifications";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    const count = await sendPushNotificationToAll({
      title: "Test Notification",
      body: message || "This is a test notification",
      tag: "test",
      data: {
        url: "/",
        type: "test",
      },
    });

    return NextResponse.json({
      success: true,
      sentTo: count,
      message: `Sent test notification to ${count} subscribers`,
    });
  } catch (error) {
    console.error("Error sending test notification:", error);
    return NextResponse.json(
      {
        error: "Failed to send test notification",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
