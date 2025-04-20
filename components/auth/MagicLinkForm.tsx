"use client";

import { useState } from "react";
import { toast } from "sonner";

interface MagicLinkFormProps {
  // You can add additional props here if needed
}

export default function MagicLinkForm({}: MagicLinkFormProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }
    
    try {
      setIsLoading(true);
      
      const response = await fetch("/api/send-magic-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to send magic link");
      }
      
      setSuccess(true);
      toast.success("Magic link sent to your email");
    } catch (error: any) {
      console.error("Error sending magic link:", error);
      toast.error(error.message || "Failed to send magic link");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {success ? (
        <div className="p-6 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900">
          <h2 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-2">
            Check your inbox
          </h2>
          <p className="text-green-700 dark:text-green-400">
            We've sent a magic link to <strong>{email}</strong>. Click the link in the email to sign in.
          </p>
          <p className="mt-4 text-sm text-green-600 dark:text-green-500">
            If you don't see the email, check your spam folder.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label 
              htmlFor="email" 
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="block w-full rounded-md border border-gray-300 dark:border-gray-700 py-2 px-3 
                        text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 shadow-sm 
                        focus:ring-primary focus:border-primary"
              disabled={isLoading}
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent 
                     rounded-md shadow-sm text-sm font-medium text-white bg-black 
                     hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 
                     focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Sending..." : "Send Magic Link"}
          </button>
          
          <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-4">
            We'll email you a magic link for a password-free sign in.
          </p>
        </form>
      )}
    </div>
  );
} 