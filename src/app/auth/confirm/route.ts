import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") ?? "signup";
  const next = searchParams.get("next") ?? "/dashboard";

  if (token_hash) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as "signup" | "magiclink" | "recovery" | "email_change",
    });

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Confirmation+failed`);
}
