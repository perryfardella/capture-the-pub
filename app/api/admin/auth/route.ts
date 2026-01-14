import { NextResponse } from "next/server";

/**
 * Admin authentication endpoint
 * Validates admin password server-side to keep it secure
 *
 * Returns a success/failure response
 * In a real production app, this would set a session cookie with an expiry
 */
export async function POST(req: Request) {
  try {
    const { password } = await req.json();

    if (!password) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

    if (!adminPassword) {
      console.error("NEXT_PUBLIC_ADMIN_PASSWORD is not set");
      return NextResponse.json(
        { error: "Admin authentication not configured" },
        { status: 500 }
      );
    }

    if (password === adminPassword) {
      // In a real app, you'd set a secure session cookie here
      // For simplicity in a bucks party app, we'll just return success
      // The client will store this in sessionStorage
      return NextResponse.json({
        success: true,
        message: "Authentication successful",
      });
    } else {
      // Small delay to prevent brute force attacks
      await new Promise(resolve => setTimeout(resolve, 1000));

      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error("Error in admin auth:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
