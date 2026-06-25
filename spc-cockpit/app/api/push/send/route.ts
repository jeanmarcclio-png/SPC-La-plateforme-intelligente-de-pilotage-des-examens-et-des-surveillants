import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const webpush = (await import("web-push")).default;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:admin@spc.fr",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
    process.env.VAPID_PRIVATE_KEY ?? ""
  );
  try {
    const body = await req.json().catch(() => ({}));
    const title   = body.title   ?? "SPC Cockpit";
    const message = body.message ?? "Vous avez des relances à traiter aujourd'hui.";
    const url     = body.url     ?? "/dashboard";

    const supabase = await createClient();
    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth");

    if (error || !subs?.length) {
      return NextResponse.json({ sent: 0, note: "No subscriptions found" });
    }

    const payload = JSON.stringify({ title, body: message, url });
    const results = await Promise.allSettled(
      subs.map((s) =>
        webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        )
      )
    );

    const sent   = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - sent;

    // Clean up expired subscriptions (410 Gone)
    const expired = results
      .map((r, i) => ({ r, sub: subs[i] }))
      .filter(({ r }) => r.status === "rejected" && (r as PromiseRejectedResult).reason?.statusCode === 410)
      .map(({ sub }) => sub.endpoint);

    if (expired.length) {
      await supabase.from("push_subscriptions").delete().in("endpoint", expired);
    }

    return NextResponse.json({ sent, failed });
  } catch (err) {
    console.error("push send error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
