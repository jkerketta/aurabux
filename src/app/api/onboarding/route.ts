import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function PATCH() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("users")
      .update({ has_seen_onboarding: true })
      .eq("id", user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update" },
      { status: 500 }
    );
  }
}
