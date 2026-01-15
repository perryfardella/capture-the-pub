import { NextResponse } from "next/server";

// VAPID keys should be stored as environment variables
// Generate them using: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export async function GET() {
  if (!VAPID_PUBLIC_KEY) {
    return NextResponse.json(
      { error: "VAPID public key not configured" },
      { status: 500 }
    );
  }

  return NextResponse.json({ publicKey: VAPID_PUBLIC_KEY });
}
