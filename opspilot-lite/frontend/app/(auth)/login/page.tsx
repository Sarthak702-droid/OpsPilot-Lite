"use client";

import Link from "next/link";
import { SignInButton, SignUpButton, UserButton, useAuth } from "@clerk/nextjs";

export default function Login() {
  const { isLoaded, isSignedIn } = useAuth();
  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
    <section className="card section-card stack" style={{ width: "min(100% - 32px, 440px)", textAlign: "center", alignItems: "center" }}>
      <div className="brand"><span className="brand-mark">O</span>OpsPilot Lite</div>
      <h1 className="section-title">Your operations workspace</h1>
      <p>Sign in to your workspace or create your first account.</p>
      {!isLoaded && <div className="button-row" style={{ justifyContent: "center" }}>
        <Link className="button primary" href="/sign-in">Sign in</Link>
        <Link className="button" href="/sign-up">Create account</Link>
      </div>}
      {isLoaded && !isSignedIn &&
        <div className="button-row" style={{ justifyContent: "center" }}>
          <SignInButton mode="redirect"><button className="button primary">Sign in</button></SignInButton>
          <SignUpButton mode="redirect"><button className="button">Create account</button></SignUpButton>
        </div>
      }
      {isLoaded && isSignedIn &&
        <div className="button-row" style={{ alignItems: "center" }}><UserButton /><Link className="button primary" href="/dashboard">Open workspace</Link></div>
      }
    </section>
  </main>;
}
