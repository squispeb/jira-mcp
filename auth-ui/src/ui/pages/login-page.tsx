import { FormEvent, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
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
import { getAuthEmail, setAuthEmail } from "@/lib/storage";
import { useAuth } from "@/lib/auth-context";

export function LoginPage() {
  const location = useLocation();
  const { signIn } = useAuth();
  const [email, setEmail] = useState(() => {
    const queryEmail = new URLSearchParams(location.search).get("email") || "";
    return queryEmail || getAuthEmail();
  });
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);

    try {
      setAuthEmail(email);
      await signIn(email, password);
      toast.success("Welcome back!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid credentials.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Sign In</CardTitle>
          <CardDescription>Sign in to manage your Jira workspaces and API tokens.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} id="login-form" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="flex gap-2">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center text-sm text-muted-foreground">
          <div className="flex flex-col items-center gap-2">
            <Link
              to={
                email ? `/forgot-password?email=${encodeURIComponent(email)}` : "/forgot-password"
              }
              className="font-medium text-primary hover:underline"
            >
              Forgot password?
            </Link>
            <div>
              Don&apos;t have an account?{" "}
              <Link to="/register" className="ml-1 font-medium text-primary hover:underline">
                Create one
              </Link>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
