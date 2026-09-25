import Link from "next/link";
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
    <div className="stack" style={{ alignItems: "center" }}>
      <Link href="/login" className="brand"><span className="brand-mark">O</span>OpsPilot Lite</Link>
      <SignIn path="/sign-in" forceRedirectUrl="/dashboard" />
      <p>New to OpsPilot? <Link href="/sign-up">Create an account</Link></p>
    </div>
  </main>;
}
