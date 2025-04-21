import { signUpAction } from "@/app/actions";
import { signInWithMagicLinkAction } from "@/app/magic-auth";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";

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
      <h1 className="text-2xl font-bold text-center mb-2">Sign up</h1>
      <p className="text-sm text-muted-foreground text-center mb-6">
        Already have an account?{" "}
        <Link className="text-primary font-medium underline" href="/sign-in">
          Sign in
        </Link>
      </p>

      <Tabs defaultValue="password" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="password">Password</TabsTrigger>
          <TabsTrigger value="magic-link">Magic Link</TabsTrigger>
        </TabsList>
        
        {/* Password Sign-Up */}
        <TabsContent value="password">
          <form className="flex flex-col w-full">
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
            </div>
          </form>
        </TabsContent>
        
        {/* Magic Link Sign-Up */}
        <TabsContent value="magic-link">
          <form className="flex flex-col w-full">
            <div className="space-y-2 mb-2">
              <Label htmlFor="email">Email</Label>
              <Input name="email" placeholder="you@example.com" required />
            </div>
            
            <div className="text-sm text-muted-foreground mb-4">
              We'll send a magic link to your email that will sign you up and sign you in instantly.
              <br />
              <span className="text-xs text-indigo-400 mt-1 block">
                No password needed! You can always set one later.
              </span>
            </div>
            
            <SubmitButton 
              className="mt-2 w-full" 
              pendingText="Sending Link..." 
              formAction={signInWithMagicLinkAction}
            >
              Send Magic Link
            </SubmitButton>
          </form>
        </TabsContent>
      </Tabs>
      
      <FormMessage message={searchParams} />
    </div>
  );
}
