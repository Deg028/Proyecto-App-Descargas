// Interpreta la URL de licencia de una fuente (Creative Commons / dominio público) y arma el crédito que exige CC-BY.
// Si la licencia no se reconoce, `known` es false y la app debe tratar el contenido como NO descargable.

function parseLicense(url) {
  const raw = String(url || '').trim();
  if (!raw) return { known: false, code: '', label: 'Sin licencia declarada', url: '', attribution: false, commercial: false, derivatives: false };

  let m = /creativecommons\.org\/publicdomain\/zero\/([\d.]+)/i.exec(raw);
  if (m) return { known: true, code: 'cc0', label: 'CC0 ' + m[1], url: raw, attribution: false, commercial: true, derivatives: true };

  if (/creativecommons\.org\/(?:publicdomain|licenses\/publicdomain)/i.test(raw)) {
    return { known: true, code: 'pd', label: 'Dominio público', url: raw, attribution: false, commercial: true, derivatives: true };
  }

  m = /creativecommons\.org\/licenses\/(by(?:-nc)?(?:-nd|-sa)?)\/([\d.]+)/i.exec(raw);
  if (m) {
    const code = m[1].toLowerCase();
    return {
      known: true, code, label: 'CC ' + code.toUpperCase() + ' ' + m[2], url: raw,
      attribution: true, commercial: !code.includes('nc'), derivatives: !code.includes('nd')
    };
  }
  return { known: false, code: '', label: 'Licencia no reconocida', url: raw, attribution: false, commercial: false, derivatives: false };
}

// Texto de crédito para guardar junto al archivo (obligatorio en CC-BY y recomendable siempre).
function credit(item) {
  const l = item.license || {};
  const by = item.artist ? ' de ' + item.artist : '';
  const lic = l.known ? l.label + (l.url ? ' (' + l.url + ')' : '') : 'licencia no verificada';
  return '«' + (item.title || 'Sin título') + '»' + by + ' · ' + lic + (item.pageUrl ? ' · ' + item.pageUrl : '');
}

module.exports = { parseLicense, credit };
