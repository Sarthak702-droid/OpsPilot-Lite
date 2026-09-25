import Link from "next/link";
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
    <div className="stack" style={{ alignItems: "center" }}>
      <Link href="/login" className="brand"><span className="brand-mark">O</span>OpsPilot Lite</Link>
      <SignUp path="/sign-up" forceRedirectUrl="/onboarding" />
      <p>Already have an account? <Link href="/sign-in">Sign in</Link></p>
    </div>
  </main>;
}
