export type Column<T> = { label: string; render: (item: T) => React.ReactNode };
export function DataTable<T extends { id: string }>({ items, columns, empty }: { items: T[]; columns: Column<T>[]; empty: string }) { return <div className="card table-wrap"><table><thead><tr>{columns.map(c => <th key={c.label}>{c.label}</th>)}</tr></thead><tbody>{items.map(item => <tr key={item.id}>{columns.map(c => <td key={c.label}>{c.render(item)}</td>)}</tr>)}</tbody></table>{items.length === 0 && <div className="empty">{empty}</div>}</div>; }

