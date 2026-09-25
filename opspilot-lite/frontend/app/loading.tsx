import { Sparkles } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen w-full auth-bg-gradient flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 auth-grid-overlay opacity-50" />
      
      <div className="relative z-10 flex flex-col items-center space-y-4">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#145f55] to-[#1e8275] flex items-center justify-center text-white shadow-xl shadow-[#145f55]/25 animate-pulse">
            <span className="font-extrabold text-2xl">O</span>
          </div>
          <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white"></span>
          </span>
        </div>

        <div className="flex flex-col items-center space-y-1">
          <h3 className="font-bold text-slate-800 text-base tracking-tight flex items-center gap-1.5">
            OpsPilot Lite
          </h3>
          <p className="text-xs text-slate-500 font-medium animate-pulse">
            Synchronizing workspace data...
          </p>
        </div>

        <div className="w-48 h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#145f55] to-emerald-400 rounded-full auth-shimmer w-full" />
        </div>
      </div>
    </div>
  );
}
