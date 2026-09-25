import { SignUp } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth/auth-shell";

export default function SignUpPage() {
  return (
    <AuthShell mode="sign-up">
      <SignUp path="/sign-up" forceRedirectUrl="/onboarding" routing="path" />
    </AuthShell>
  );
}
