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
      .select("id, requester_id, status")
      .eq("id", body.friendship_id)
      .single();

    if (!friendship) {
      return NextResponse.json(
        { error: "Friendship not found" },
        { status: 404 }
      );
    }

    if (friendship.requester_id !== user.id) {
      return NextResponse.json(
        { error: "Only the sender can cancel a friend request" },
        { status: 403 }
      );
    }

    if (friendship.status !== "pending") {
      return NextResponse.json(
        { error: "Request is no longer pending" },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from("friendships")
      .delete()
      .eq("id", body.friendship_id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to cancel friend request" },
      { status: 500 }
    );
  }
}
