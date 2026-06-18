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
