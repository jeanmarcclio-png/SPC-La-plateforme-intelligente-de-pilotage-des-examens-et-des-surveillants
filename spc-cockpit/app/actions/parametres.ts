"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateDisplayName(formData: FormData) {
  const supabase = await createClient();
  const displayName = formData.get("display_name") as string;
  const { error } = await supabase.auth.updateUser({
    data: { display_name: displayName },
  });
  if (error) throw new Error(error.message);
  revalidatePath("/parametres");
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  const password = formData.get("password") as string;
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(error.message);
}

export async function updateNotificationPref(key: string, value: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("user_preferences").upsert(
    { user_id: user.id, key, value },
    { onConflict: "user_id,key" }
  );
}

export async function getNotificationPrefs(): Promise<Record<string, boolean>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};
  const { data } = await supabase.from("user_preferences").select("key,value").eq("user_id", user.id);
  if (!data) return {};
  return Object.fromEntries(data.map((r) => [r.key, r.value]));
}

export async function getTeamMembers() {
  const supabase = await createClient();
  const { data } = await supabase.from("team_members").select("*").order("created_at");
  return data ?? [];
}

export async function inviteTeamMember(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("team_members").insert({
    email: formData.get("email") as string,
    nom: formData.get("nom") as string,
    role: formData.get("role") as string,
  });
  revalidatePath("/parametres");
}

export async function updateTeamMemberRole(id: string, role: string) {
  const supabase = await createClient();
  await supabase.from("team_members").update({ role }).eq("id", id);
  revalidatePath("/parametres");
}

export async function removeTeamMember(id: string) {
  const supabase = await createClient();
  await supabase.from("team_members").delete().eq("id", id);
  revalidatePath("/parametres");
}
