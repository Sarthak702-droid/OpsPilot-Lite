import type { Severity } from "@/types/api";
export function Badge({ value }: { value: Severity | string }) { const level = value.toLowerCase(); return <span className={`badge badge-${["critical", "high", "medium", "low", "info"].includes(level) ? level : "info"}`}>{value.replaceAll("_", " ")}</span>; }

