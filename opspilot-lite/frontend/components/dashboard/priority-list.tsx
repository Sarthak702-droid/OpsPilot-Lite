import { Badge } from "@/components/ui/badge";
import type { Signal } from "@/types/api";
export function PriorityList({ items }: { items: Signal[] }) { if (items.length === 0) return <div className="empty">No active priorities. Signals refresh every 15 minutes.</div>; return <div>{items.map(item => <div className="priority-row" key={item.id}><Badge value={item.severity} /><div><div className="priority-title">{item.title}</div><div className="priority-desc">{item.description}</div></div></div>)}</div>; }

