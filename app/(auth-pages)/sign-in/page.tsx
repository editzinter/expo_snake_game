import { signInAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default async function Login(props: { searchParams: Promise<Message> }) {
  const searchParams = await props.searchParams;
  return (
    <div className="w-full bg-card p-6 rounded-lg shadow-md">
      <form className="flex flex-col w-full">
        <h1 className="text-2xl font-bold text-center mb-2">Sign in</h1>
        <p className="text-sm text-muted-foreground text-center mb-6">
          Don't have an account?{" "}
          <Link className="text-primary font-medium underline" href="/sign-up">
            Sign up
          </Link>
        </p>
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input name="email" placeholder="you@example.com" required />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="password">Password</Label>
              <Link
                className="text-xs text-muted-foreground underline"
                href="/forgot-password"
              >
                Forgot Password?
              </Link>
            </div>
            <Input
              type="password"
              name="password"
              placeholder="Your password"
              required
            />
          </div>
          
          <SubmitButton 
            className="mt-4 w-full" 
            pendingText="Signing In..." 
            formAction={signInAction}
          >
            Sign in
          </SubmitButton>

          <div className="text-center text-sm text-muted-foreground">
            <Link 
              href="/magic-link" 
              className="hover:text-foreground underline"
            >
              Or sign in with a magic link
            </Link>
          </div>
          
          <FormMessage message={searchParams} />
        </div>
      </form>
    </div>
  );
}
