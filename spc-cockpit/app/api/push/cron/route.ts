import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const webpush = (await import("web-push")).default;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:admin@spc.fr",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
    process.env.VAPID_PRIVATE_KEY ?? ""
  );

  try {
    const supabase = await createClient();

    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth");

    if (!subs?.length) {
      return NextResponse.json({ sent: 0, note: "No subscriptions" });
    }

    const payload = JSON.stringify({
      title: "SPC — Relances du jour",
      body:  "Consultez votre file d'action et relancez vos prospects.",
      url:   "/dashboard",
    });

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

    const expired = results
      .map((r, i) => ({ r, sub: subs[i] }))
      .filter(({ r }) => r.status === "rejected" && (r as PromiseRejectedResult).reason?.statusCode === 410)
      .map(({ sub }) => sub.endpoint);

    if (expired.length) {
      await supabase.from("push_subscriptions").delete().in("endpoint", expired);
    }

    return NextResponse.json({ sent, failed, cleaned: expired.length });
  } catch (err) {
    console.error("cron push error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
