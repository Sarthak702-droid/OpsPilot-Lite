import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth/auth-shell";

export default function SignInPage() {
  return (
    <AuthShell mode="sign-in">
      <SignIn path="/sign-in" forceRedirectUrl="/dashboard" routing="path" />
    </AuthShell>
  );
}
