"use client";
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) { return <div className="empty">Something went wrong. <button className="button" onClick={reset}>Try again</button></div>; }

