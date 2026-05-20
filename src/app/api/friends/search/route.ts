import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/friends/search?q=username — search users by username
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const query = request.nextUrl.searchParams.get("q")?.trim();
    if (!query) {
      return NextResponse.json({ results: [] });
    }

    // Search users by username (case-insensitive partial match)
    const { data: users } = await supabase
      .from("users")
      .select("id, username, display_number")
      .ilike("username", `%${query}%`)
      .neq("id", user.id)
      .limit(20);

    // Get existing friendship statuses for these users
    const userIds = (users ?? []).map((u) => u.id);
    let friendshipMap: Record<string, string> = {};

    if (userIds.length > 0) {
      const { data: friendships } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id, status")
        .or(
          `and(requester_id.eq.${user.id},addressee_id.in.(${userIds.join(",")})),and(requester_id.in.(${userIds.join(",")}),addressee_id.eq.${user.id})`
        );

      for (const f of friendships ?? []) {
        const otherId =
          f.requester_id === user.id ? f.addressee_id : f.requester_id;
        friendshipMap[otherId] = f.status;
      }
    }

    const results = (users ?? []).map((u) => ({
      id: u.id,
      username: u.username,
      display_number: u.display_number,
      friendship_status: friendshipMap[u.id] ?? null,
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Friend search error:", error);
    return NextResponse.json(
      { error: "Failed to search users" },
      { status: 500 }
    );
  }
}
