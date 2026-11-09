// Country flag emoji from a country name or code (players default to USA).
const CODES = { USA: 'US', 'United States': 'US', Canada: 'CA', Mexico: 'MX', Brazil: 'BR', England: 'GB', UK: 'GB', Germany: 'DE',
  France: 'FR', Spain: 'ES', Italy: 'IT', Nigeria: 'NG', Ghana: 'GH', Jamaica: 'JM', Japan: 'JP', Australia: 'AU', Samoa: 'WS', Tonga: 'TO', Russia: 'RU', Serbia: 'RS', Croatia: 'HR', Poland: 'PL', Ukraine: 'UA' };

export function flagFor(country) {
  const code = CODES[country] || (country && country.length === 2 ? country.toUpperCase() : null);
  if (!code) return '🏳️';
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}
