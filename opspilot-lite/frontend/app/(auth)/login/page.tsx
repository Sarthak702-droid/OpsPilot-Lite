"use client";
import { SignIn } from "@clerk/nextjs";
export default function Login() { return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}><div className="stack" style={{ alignItems: "center" }}><div className="brand"><span className="brand-mark">O</span>OpsPilot Lite</div><SignIn routing="hash" forceRedirectUrl="/dashboard" /></div></main>; }

