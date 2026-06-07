export const fmt = (n: number) => new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
export const uid = () => Math.random().toString(36).slice(2, 10);
export function clone<T>(input: T): T { return JSON.parse(JSON.stringify(input)); }
