import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/friends/search?q=displayname#002 — exact match by display name + number
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

    // Parse displayname#002 format
    const hashIndex = query.lastIndexOf("#");
    if (hashIndex === -1) {
      return NextResponse.json({ results: [] });
    }

    const username = query.slice(0, hashIndex);
    const displayNumber = query.slice(hashIndex);

    // Exact match on username + display_number
    const { data: foundUser } = await supabase
      .from("users")
      .select("id, username, display_number")
      .eq("username", username)
      .eq("display_number", displayNumber)
      .neq("id", user.id)
      .single();

    if (!foundUser) {
      return NextResponse.json({ results: [] });
    }

    // Check friendship status
    const { data: friendship } = await supabase
      .from("friendships")
      .select("status")
      .or(
        `and(requester_id.eq.${user.id},addressee_id.eq.${foundUser.id}),and(requester_id.eq.${foundUser.id},addressee_id.eq.${user.id})`
      )
      .single();

    const result = {
      id: foundUser.id,
      username: foundUser.username,
      display_number: foundUser.display_number,
      friendship_status: friendship?.status ?? null,
    };

    return NextResponse.json({ results: [result] });
  } catch (error) {
    console.error("Friend search error:", error);
    return NextResponse.json(
      { error: "Failed to search users" },
      { status: 500 }
    );
  }
}
