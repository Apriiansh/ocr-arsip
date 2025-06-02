import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;
  const redirectTo = requestUrl.searchParams.get("redirect_to")?.toString();

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error("Auth callback error:", error.message);
      return NextResponse.redirect(`${origin}/sign-in?error=${encodeURIComponent(error.message)}`);
    }
  }

  if (redirectTo) {
    return NextResponse.redirect(`${origin}${redirectTo}`);
  }

  // PERBAIKAN: Redirect ke home page, bukan /protected
  // Home page akan handle role-based routing
  return NextResponse.redirect(`${origin}/`);
}