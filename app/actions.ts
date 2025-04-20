"use server";

import { encodedRedirect } from "@/utils/utils";
import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { sendMagicLinkEmail, sendPasswordResetEmail } from "@/lib/email/resend";

export const signUpAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  if (!email || !password) {
    return encodedRedirect(
      "error",
      "/sign-up",
      "Email and password are required",
    );
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    console.error(error.code + " " + error.message);
    return encodedRedirect("error", "/sign-up", error.message);
  } else {
    return encodedRedirect(
      "success",
      "/sign-up",
      "Thanks for signing up! Please check your email for a verification link.",
    );
  }
};

export const signInWithMagicLinkAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  if (!email) {
    return encodedRedirect("error", "/sign-in", "Email is required");
  }

  // Generate OTP (Magic Link)
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true, // Create a new user if they don't exist
      emailRedirectTo: `${origin}/auth/callback`, // Where to redirect after verification
    },
  });

  if (error) {
    console.error("Magic link error:", error);
    return encodedRedirect("error", "/sign-in", error.message);
  }

  // Get action link from data
  const actionLink = data?.identityChangedAt;
  
  // Check if we have the magic link to send
  const magicLink = typeof actionLink === 'string' ? actionLink : `${origin}/auth/callback`;
  
  // Send email via Resend
  const emailResult = await sendMagicLinkEmail(email, magicLink);
  
  if (!emailResult.success) {
    console.error("Failed to send magic link email:", emailResult.error);
    return encodedRedirect(
      "error",
      "/sign-in",
      "Could not send magic link email. Please try again."
    );
  }

  return encodedRedirect(
    "success",
    "/sign-in",
    "Check your email for a magic link to sign in."
  );
};

export const signInAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return encodedRedirect("error", "/sign-in", error.message);
  }

  return redirect("/protected");
};

export const forgotPasswordAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const supabase = await createClient();
  const origin = (await headers()).get("origin");
  const callbackUrl = formData.get("callbackUrl")?.toString();

  if (!email) {
    return encodedRedirect("error", "/forgot-password", "Email is required");
  }

  // Generate password reset token
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?redirect_to=/protected/reset-password`,
  });

  if (error) {
    console.error("Password reset error:", error);
    return encodedRedirect(
      "error",
      "/forgot-password",
      "Could not reset password",
    );
  }

  // Get the reset link from the response
  const resetLink = data?.identityChangedAt || `${origin}/auth/callback?redirect_to=/protected/reset-password`;

  // Send email via Resend
  const emailResult = await sendPasswordResetEmail(email, resetLink);
  
  if (!emailResult.success) {
    console.error("Failed to send password reset email:", emailResult.error);
    return encodedRedirect(
      "error",
      "/forgot-password",
      "Could not send password reset email. Please try again."
    );
  }

  if (callbackUrl) {
    return redirect(callbackUrl);
  }

  return encodedRedirect(
    "success",
    "/forgot-password",
    "Check your email for a link to reset your password.",
  );
};

export const resetPasswordAction = async (formData: FormData) => {
  const supabase = await createClient();

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Password and confirm password are required",
    );
  }

  if (password !== confirmPassword) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Passwords do not match",
    );
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Password update failed",
    );
  }

  encodedRedirect("success", "/protected/reset-password", "Password updated");
};

export const signOutAction = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect("/sign-in");
};

export async function ensurePlayTimeField() {
  const supabase = await createClient();
  
  try {
    // First, check if the column exists
    const { data, error } = await supabase
      .from('player_stats')
      .select('total_play_time')
      .limit(1);
    
    if (error) {
      // If column doesn't exist, add it
      if (error.message.includes('column "total_play_time" does not exist')) {
        console.log("Adding total_play_time column to player_stats table");
        // You would need admin privileges to alter table schema
        // This is just a placeholder - you'd need to perform this in Supabase dashboard
        // or using a migration script
        return { success: false, message: "Please add total_play_time column to player_stats table in Supabase dashboard" };
      } else {
        return { success: false, message: error.message };
      }
    }
    
    // Column exists, update any NULL values to 0
    console.log("Updating NULL total_play_time values to 0");
    const { error: updateError } = await supabase
      .rpc('initialize_play_time');
    
    if (updateError) {
      return { success: false, message: updateError.message };
    }
    
    return { success: true, message: "Play time field verified and updated" };
  } catch (error) {
    console.error("Error ensuring play time field:", error);
    return { success: false, message: "An unexpected error occurred" };
  }
}
