// Mide el contraste (WCAG 2.2) de cada tema de public/style.css. Sale con código 1 si algún par obligatorio no llega al mínimo.
// Uso: npm run contrast
const fs = require('fs'), path = require('path');
const css = fs.readFileSync(path.join(__dirname, '..', 'public', 'style.css'), 'utf8');

const themes = {};
for (const m of css.matchAll(/:root(?:\s*,\s*:root)?\[data-theme="([a-z0-9-]+)"\]\s*\{([^}]*)\}/g)) {
  themes[m[1]] = Object.fromEntries([...m[2].matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\b/g)].map(v => [v[1], v[2]]));
}

const lum = hex => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// [primer plano, fondo, mínimo, descripción]: 4.5 para texto, 3 para elementos de interfaz.
const PAIRS = [
  ['ink', 'bg', 4.5, 'texto sobre fondo'], ['ink', 'surface', 4.5, 'texto sobre tarjeta'], ['ink', 'surface2', 4.5, 'texto sobre tarjeta 2'],
  ['muted', 'bg', 4.5, 'texto atenuado sobre fondo'], ['muted', 'surface', 4.5, 'texto atenuado sobre tarjeta'], ['muted', 'surface2', 4.5, 'texto atenuado sobre tarjeta 2'],
  ['accent-ink', 'accent', 4.5, 'texto sobre botón de acento'], ['accent', 'bg', 3, 'acento sobre fondo'], ['accent', 'surface', 3, 'acento sobre tarjeta'],
  ['danger', 'surface', 4.5, 'error sobre tarjeta'], ['success', 'surface', 4.5, 'éxito sobre tarjeta']
];

let fails = 0;
for (const [name, t] of Object.entries(themes)) {
  const bad = PAIRS.filter(([f, b, min]) => ratio(t[f], t[b]) < min);
  fails += bad.length;
  console.log((bad.length ? '✗ ' : '✓ ') + name);
  for (const [f, b, min, d] of bad) console.log(`    ${d}: ${ratio(t[f], t[b]).toFixed(2)}:1 (mín. ${min}) --${f} ${t[f]} sobre --${b} ${t[b]}`);
}
console.log(fails ? `\n${fails} par(es) por debajo del mínimo.` : `\nTodos los temas (${Object.keys(themes).length}) cumplen WCAG AA.`);
process.exit(fails ? 1 : 0);
