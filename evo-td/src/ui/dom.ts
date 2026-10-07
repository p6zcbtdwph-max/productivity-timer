/** Kleine DOM-Helfer, damit die UI-Module ohne Framework lesbar bleiben. */
export function $<T extends HTMLElement>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`Element nicht gefunden: ${selector}`);
  return el;
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<Omit<HTMLElementTagNameMap[K], 'style'>> & { className?: string; style?: string } = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  const { style, ...rest } = props;
  Object.assign(node, rest);
  if (style) node.style.cssText = style;
  for (const child of children) node.append(child);
  return node;
}

const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

/** Kurze Zahlendarstellung bis in astronomische Bereiche (Welle 1000+). */
export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return '∞';
  const abs = Math.abs(n);
  if (abs < 10_000) return Math.round(n).toLocaleString('de-DE');
  const group = Math.floor(Math.log10(abs) / 3);
  if (group >= SUFFIXES.length) return n.toExponential(2).replace('+', '');
  const scaled = n / 10 ** (group * 3);
  return `${scaled.toFixed(scaled >= 100 ? 0 : 1)}${SUFFIXES[group]}`;
}
