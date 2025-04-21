import { signUpAction, signInWithMagicLinkAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Key } from "lucide-react";

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
          <TabsTrigger value="password" className="flex items-center gap-2">
            <Key size={16} />
            <span>Password</span>
          </TabsTrigger>
          <TabsTrigger value="magic-link" className="flex items-center gap-2">
            <Mail size={16} />
            <span>Magic Link</span>
          </TabsTrigger>
        </TabsList>

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
                Sign up with Password
              </SubmitButton>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="magic-link">
          <form className="flex flex-col w-full">
            <div className="space-y-2 mb-2">
              <Label htmlFor="email">Email</Label>
              <Input name="email" placeholder="you@example.com" required />
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              We'll send a magic link to your email that will sign you up instantly.
              No password needed!
            </p>
            
            <SubmitButton 
              className="w-full" 
              pendingText="Sending Magic Link..." 
              formAction={signInWithMagicLinkAction}
            >
              Send Magic Link
            </SubmitButton>
          </form>
        </TabsContent>
      </Tabs>
      
      <div className="mt-4">
        <FormMessage message={searchParams} />
      </div>
    </div>
  );
}
