import { signInAction, signInWithMagicLinkAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Key } from "lucide-react";

export default async function Login(props: { searchParams: Promise<Message> }) {
  const searchParams = await props.searchParams;
  return (
    <div className="w-full bg-card p-6 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-center mb-2">Sign in</h1>
      <p className="text-sm text-muted-foreground text-center mb-6">
        Don't have an account?{" "}
        <Link className="text-primary font-medium underline" href="/sign-up">
          Sign up
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
                Sign in with Password
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
              We'll send a magic link to your email that will sign you in instantly.
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
