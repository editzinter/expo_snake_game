import { signUpAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { SmtpMessage } from "../smtp-message";

export default async function Signup(props: {
  searchParams: Promise<Message>;
}) {
  const searchParams = await props.searchParams;
  if ("message" in searchParams) {
    return (
      <div className="w-full flex-1 flex items-center justify-center">
        <FormMessage message={searchParams} />
      </div>
    );
  }

  return (
    <div className="w-full bg-card p-6 rounded-lg shadow-md">
      <form className="flex flex-col w-full">
        <h1 className="text-2xl font-bold text-center mb-2">Sign up</h1>
        <p className="text-sm text-muted-foreground text-center mb-6">
          Already have an account?{" "}
          <Link className="text-primary font-medium underline" href="/sign-in">
            Sign in
          </Link>
        </p>
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input name="email" placeholder="you@example.com" required />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              type="password"
              name="password"
              placeholder="Your password"
              minLength={6}
              required
            />
          </div>
          
          <SubmitButton 
            className="mt-4 w-full" 
            formAction={signUpAction} 
            pendingText="Signing up..."
          >
            Sign up
          </SubmitButton>
          
          <FormMessage message={searchParams} />
        </div>
      </form>
      
      <SmtpMessage />
    </div>
  );
}
