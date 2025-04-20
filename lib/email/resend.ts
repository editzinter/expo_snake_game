"use server";

import { Resend } from 'resend';

// Initialize the Resend client with API key from environment variable
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Sends a magic link email for user authentication
 */
export async function sendMagicLinkEmail(
  email: string, 
  magicLink: string,
  fromEmail: string = 'noreply@yourapp.com'
) {
  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: 'Your login link',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333; margin-bottom: 24px;">Login Link</h1>
          <p style="margin-bottom: 16px;">Click the button below to log in to your account:</p>
          <a href="${magicLink}" style="display: inline-block; background-color: #4F46E5; color: white; font-weight: bold; padding: 12px 24px; border-radius: 4px; text-decoration: none; margin-bottom: 24px;">Login to your account</a>
          <p style="margin-bottom: 16px;">Or copy and paste this URL into your browser:</p>
          <p style="word-break: break-all; color: #666; margin-bottom: 24px;">${magicLink}</p>
          <p style="color: #999; font-size: 14px;">This link will expire in 24 hours.</p>
        </div>
      `,
    });

    console.log('Magic link email sent:', data);
    return { data, error };
  } catch (error) {
    console.error('Error sending magic link email:', error);
    return { data: null, error };
  }
}

/**
 * Sends a password reset email
 */
export async function sendPasswordResetEmail(
  email: string, 
  resetLink: string,
  fromEmail: string = 'noreply@yourapp.com'
) {
  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: 'Reset your password',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333; margin-bottom: 24px;">Reset Your Password</h1>
          <p style="margin-bottom: 16px;">Click the button below to reset your password:</p>
          <a href="${resetLink}" style="display: inline-block; background-color: #4F46E5; color: white; font-weight: bold; padding: 12px 24px; border-radius: 4px; text-decoration: none; margin-bottom: 24px;">Reset Password</a>
          <p style="margin-bottom: 16px;">Or copy and paste this URL into your browser:</p>
          <p style="word-break: break-all; color: #666; margin-bottom: 24px;">${resetLink}</p>
          <p style="color: #999; font-size: 14px;">This link will expire in 24 hours.</p>
        </div>
      `,
    });

    console.log('Password reset email sent:', data);
    return { data, error };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { data: null, error };
  }
} 