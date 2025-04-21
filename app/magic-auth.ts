"use server";

import { encodedRedirect } from "@/utils/utils";
import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Magic link authentication with Supabase
 * This helps bypass rate limits that apply to password-based authentication
 */
export const signInWithMagicLinkAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  if (!email) {
    return encodedRedirect(
      "error",
      "/sign-in",
      "Email is required"
    );
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    console.error(error.message);
    return encodedRedirect(
      "error",
      "/sign-in",
      error.message
    );
  }

  return encodedRedirect(
    "success",
    "/sign-in",
    "Check your email for a magic link to sign in. You can close this window."
  );
}; 