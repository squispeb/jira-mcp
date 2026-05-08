import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/lib/api";
import { getAuthEmail, setAuthEmail } from "@/lib/storage";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState(() => getAuthEmail());
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);

    try {
      const redirectTo = getResetRedirectTo();
      setAuthEmail(email);
      await requestPasswordReset(email, redirectTo);
      toast.success("Reset link requested. Check your email or the worker logs.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to request password reset.");
    } finally {
      setIsLoading(false);
    }
  }

  function getResetRedirectTo() {
    const basePath =
      import.meta.env.VITE_ROUTER_BASENAME || (window.location.pathname.startsWith("/auth") ? "/auth" : "");
    const uiOrigin = import.meta.env.VITE_AUTH_UI_ORIGIN || window.location.origin;
    return `${uiOrigin}${basePath}/reset-password`;
  }

  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Mail className="h-5 w-5" />
          </div>
          <CardTitle className="text-2xl">Recover Password</CardTitle>
          <CardDescription>Send a reset link to your email. In development, the worker logs it.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending link...
                </>
              ) : (
                "Send Reset Link"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center text-sm text-muted-foreground">
          <Link to="/login" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to sign in
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
