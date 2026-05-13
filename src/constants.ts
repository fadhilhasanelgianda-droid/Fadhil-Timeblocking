// Fixed color palette — full Tailwind classes are listed here so the JIT compiler keeps them.
export const COLOR_PALETTE: { key: string; label: string; bg: string; ring: string }[] = [
  { key: 'blue',   label: 'Blue',   bg: 'bg-blue-500',   ring: 'ring-blue-500' },
  { key: 'purple', label: 'Purple', bg: 'bg-purple-500', ring: 'ring-purple-500' },
  { key: 'teal',   label: 'Teal',   bg: 'bg-teal-500',   ring: 'ring-teal-500' },
  { key: 'orange', label: 'Orange', bg: 'bg-orange-500', ring: 'ring-orange-500' },
  { key: 'pink',   label: 'Pink',   bg: 'bg-pink-500',   ring: 'ring-pink-500' },
  { key: 'green',  label: 'Green',  bg: 'bg-green-500',  ring: 'ring-green-500' },
  { key: 'red',    label: 'Red',    bg: 'bg-red-500',    ring: 'ring-red-500' },
  { key: 'yellow', label: 'Yellow', bg: 'bg-yellow-500', ring: 'ring-yellow-500' },
  { key: 'indigo', label: 'Indigo', bg: 'bg-indigo-500', ring: 'ring-indigo-500' },
  { key: 'gray',   label: 'Gray',   bg: 'bg-gray-500',   ring: 'ring-gray-500' },
];

export const COLOR_BG_MAP: Record<string, string> = COLOR_PALETTE.reduce((acc, c) => {
  acc[c.key] = c.bg;
  return acc;
}, {} as Record<string, string>);

export function colorClassFor(colorKey: string | undefined): string {
  if (!colorKey) return 'bg-gray-300';
  return COLOR_BG_MAP[colorKey] || 'bg-gray-300';
}

export const STATUS_COLORS: Record<string, string> = {
  'Todo': 'bg-gray-400',
  'In Progress': 'bg-blue-500',
  'Done': 'bg-green-500',
  'Cancelled': 'bg-red-500',
};

export const PRIORITIES = ['🔴 High', '🟡 Medium', '🟢 Low'];
export const STATUSES = ['Todo', 'In Progress', 'Done', 'Cancelled'];

// Default seed projects (used when storage is empty)
export const DEFAULT_PROJECTS: { name: string; color: string }[] = [
  { name: 'Boleh Belajar',     color: 'blue' },
  { name: 'Faith Industries',  color: 'purple' },
  { name: 'Auffan',            color: 'teal' },
  { name: 'Toko AC BDG',       color: 'orange' },
  { name: 'Suga Coat',         color: 'pink' },
  { name: 'Personal',          color: 'gray' },
];
