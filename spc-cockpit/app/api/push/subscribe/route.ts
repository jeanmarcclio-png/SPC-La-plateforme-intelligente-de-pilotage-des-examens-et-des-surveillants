import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const subscription = await req.json();
    if (!subscription?.endpoint) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        endpoint: subscription.endpoint,
        p256dh:   subscription.keys?.p256dh,
        auth:     subscription.keys?.auth,
      },
      { onConflict: "endpoint" }
    );

    if (error) {
      console.error("push_subscriptions upsert error:", error.message);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("subscribe route error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
