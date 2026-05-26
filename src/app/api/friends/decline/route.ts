import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { friendship_id?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (!body.friendship_id) {
      return NextResponse.json(
        { error: "friendship_id is required" },
        { status: 400 }
      );
    }

    const { data: friendship } = await supabase
      .from("friendships")
      .select("id, addressee_id")
      .eq("id", body.friendship_id)
      .single();

    if (!friendship) {
      return NextResponse.json(
        { error: "Friendship not found" },
        { status: 404 }
      );
    }

    if (friendship.addressee_id !== user.id) {
      return NextResponse.json(
        { error: "Only the recipient can decline a friend request" },
        { status: 403 }
      );
    }

    const { error: updateError } = await supabase
      .from("friendships")
      .update({ status: "declined" })
      .eq("id", body.friendship_id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Decline friend error:", error);
    return NextResponse.json(
      { error: "Failed to decline friend request" },
      { status: 500 }
    );
  }
}
