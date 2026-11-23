// Colores del tema "Coral nocturno" de Tonea (los mismos que public/style.css).
export const C = {
  bg: '#191829', surface: '#232238', surface2: '#2C2B45', border: '#3F3E5E',
  ink: '#F2EEF6', muted: '#AEABC6', accent: '#D08A78', accentInk: '#1A1424', danger: '#FF9C94', success: '#7ED9AE'
};

export const fmtDur = s => {
  s = Math.round(Number(s) || 0);
  if (!s) return '';
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(r).padStart(2, '0');
};

export const fmtSize = b => {
  b = Number(b) || 0;
  if (!b) return '';
  return b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
};
