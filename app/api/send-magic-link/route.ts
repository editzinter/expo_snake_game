import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Resend with your API key
const resend = new Resend(process.env.RESEND_API_KEY);

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Step 1: Generate the magic link from Supabase
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        // This prevents Supabase from sending its own email
        emailRedirectTo: `${new URL(request.url).origin}/auth/callback`,
      },
    });

    if (error) {
      console.error('Error generating magic link:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Extract the magic link from the response
    // The response type from Supabase for OTP sign-ins has properties as any
    const magicLink = (data as any)?.properties?.action_link;

    if (!magicLink) {
      console.error('No magic link generated');
      return NextResponse.json({ error: 'Failed to generate magic link' }, { status: 500 });
    }

    // Step 2: Send the email using Resend's API
    const emailResult = await resend.emails.send({
      from: 'onboarding@resend.dev', // No domain required
      to: email,
      subject: 'Your Magic Link for Snake.io',
      html: `
        <div style="font-family: system-ui, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; margin-bottom: 16px;">Login to Snake.io</h2>
          <p style="margin-bottom: 24px;">Click the button below to sign in to your account. This link will expire in 24 hours.</p>
          <a href="${magicLink}" style="display: inline-block; background-color: #000; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">Sign In</a>
          <p style="margin-top: 24px; font-size: 14px; color: #666;">If you didn't request this email, you can safely ignore it.</p>
          <p style="margin-top: 24px; font-size: 12px; color: #999;">
            If the button doesn't work, copy and paste this link into your browser:
            <br>
            <a href="${magicLink}" style="color: #999; word-break: break-all;">${magicLink}</a>
          </p>
        </div>
      `,
    });

    console.log('Email sent:', emailResult);

    return NextResponse.json({ 
      success: true, 
      message: 'Magic link sent' 
    });
  } catch (error: any) {
    console.error('Error sending magic link:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to send magic link' 
    }, { 
      status: 500 
    });
  }
} 