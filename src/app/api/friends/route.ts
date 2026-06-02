import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface FriendshipRow {
  id: string;
  status: string;
  requester_id: string;
  addressee_id: string;
  requester: { id: string; username: string; display_number: string | null } | null;
  addressee: { id: string; username: string; display_number: string | null } | null;
}

// GET /api/friends — list friends, incoming requests, outgoing requests
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: friendships } = await supabase
      .from("friendships")
      .select(
        "id, status, requester_id, addressee_id, requester:users!requester_id(id, username, display_number), addressee:users!addressee_id(id, username, display_number)"
      )
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    const friends: Array<{
      id: string;
      username: string;
      display_number: string | null;
      friendship_id: string;
    }> = [];
    const incoming: Array<{
      id: string;
      username: string;
      display_number: string | null;
      friendship_id: string;
    }> = [];
    const outgoing: Array<{
      id: string;
      username: string;
      display_number: string | null;
      friendship_id: string;
    }> = [];

    for (const f of (friendships ?? []) as unknown as FriendshipRow[]) {
      const isRequester = f.requester_id === user.id;
      const otherUser = isRequester ? f.addressee : f.requester;
      if (!otherUser) continue;

      if (f.status === "accepted") {
        friends.push({
          id: otherUser.id,
          username: otherUser.username,
          display_number: otherUser.display_number,
          friendship_id: f.id,
        });
      } else if (f.status === "pending") {
        if (isRequester) {
          outgoing.push({
            id: otherUser.id,
            username: otherUser.username,
            display_number: otherUser.display_number,
            friendship_id: f.id,
          });
        } else {
          incoming.push({
            id: otherUser.id,
            username: otherUser.username,
            display_number: otherUser.display_number,
            friendship_id: f.id,
          });
        }
      }
    }

    return NextResponse.json({ friends, incoming, outgoing });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch friends" },
      { status: 500 }
    );
  }
}

// POST /api/friends/request — send friend request by username
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { username?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (!body.username || typeof body.username !== "string") {
      return NextResponse.json(
        { error: "username is required" },
        { status: 400 }
      );
    }

    const targetUsername = body.username.trim();

    // Parse displayname#002 format — extract just the username part
    const hashIndex = targetUsername.lastIndexOf("#");
    const username = hashIndex !== -1 ? targetUsername.slice(0, hashIndex) : targetUsername;

    // Find target user
    const { data: targetUser } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .single();

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (targetUser.id === user.id) {
      return NextResponse.json(
        { error: "Cannot send request to yourself" },
        { status: 400 }
      );
    }

    // Check if friendship already exists
    const { data: existing } = await supabase
      .from("friendships")
      .select("id, status")
      .or(
        `and(requester_id.eq.${user.id},addressee_id.eq.${targetUser.id}),and(requester_id.eq.${targetUser.id},addressee_id.eq.${user.id})`
      )
      .single();

    if (existing) {
      if (existing.status === "accepted") {
        return NextResponse.json(
          { error: "Already friends" },
          { status: 400 }
        );
      }
      if (existing.status === "pending") {
        return NextResponse.json(
          { error: "Friend request already sent" },
          { status: 400 }
        );
      }
      // If declined, allow re-sending by updating the existing row
      const { error: updateError } = await supabase
        .from("friendships")
        .update({
          status: "pending",
          requester_id: user.id,
          addressee_id: targetUser.id,
        })
        .eq("id", existing.id);

      if (updateError) {
        throw updateError;
      }

      return NextResponse.json({ success: true, status: "pending" });
    }

    // Check friend count limit (50 max)
    const { count: friendCount } = await supabase
      .from("friendships")
      .select("*", { count: "exact", head: true })
      .eq("status", "accepted")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if ((friendCount ?? 0) >= 50) {
      return NextResponse.json(
        { error: "Maximum of 50 friends reached" },
        { status: 400 }
      );
    }

    // Create friendship request
    const { error: insertError } = await supabase
      .from("friendships")
      .insert({
        requester_id: user.id,
        addressee_id: targetUser.id,
        status: "pending",
      });

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({ success: true, status: "pending" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to send friend request" },
      { status: 500 }
    );
  }
}
