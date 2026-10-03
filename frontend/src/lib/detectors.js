// MedAnon Local — modular PII/PHI detection engine
// Everything runs locally. Combines regex + dictionaries + heuristics.
// Designed so Microsoft Presidio (local) could replace this later.

export const CATEGORIES = {
  identity: 'identity',
  contact: 'contact',
  dates: 'dates',
  admin: 'admin',
  healthpro: 'healthpro',
  other: 'other',
};

// Swiss-specific dictionaries
const CIVILITIES = ['M.', 'Mme', 'Mlle', 'Mr', 'Mrs', 'Ms', 'Herr', 'Frau', 'Signor', 'Signora', 'Dr', 'Dre', 'Dr.', 'Prof', 'Prof.', 'Docteur', 'Doctoresse'];
const HEALTHPRO_TITLES = ['Dr', 'Dre', 'Dr.', 'Docteur', 'Doctoresse', 'Prof', 'Prof.', 'Professeur', 'Doktor', 'Dott.', 'Dott', 'Medico', 'Médecin'];
const HOSPITAL_KEYWORDS = ['hôpital', 'hopital', 'clinique', 'cabinet', 'centre médical', 'centre medical', 'polyclinique', 'CHUV', 'HUG', 'USZ', 'Spital', 'Krankenhaus', 'Ospedale', 'laboratoire', 'labor', 'laboratorio'];

// Common Swiss French/German/Italian first names (small sample — for heuristics)
const COMMON_FIRST_NAMES = new Set([
  'sophie','marie','anne','catherine','isabelle','nathalie','christine','françoise','francoise','martine','sylvie','valerie','valérie','celine','céline','sandrine','stephanie','stéphanie','patricia','laurence','veronique','véronique','julie','emma','chloe','chloé','camille','sarah','laura','lea','léa','manon','clara','elise','élise','lucie','lisa',
  'jean','pierre','michel','philippe','alain','nicolas','christophe','patrick','david','thomas','laurent','pascal','olivier','stephane','stéphane','eric','éric','frederic','frédéric','vincent','julien','antoine','maxime','lucas','hugo','louis','arthur','paul','pauline','martin','dupont','henri','claude','francois','françois',
  'hans','peter','urs','walter','markus','andreas','thomas','stefan','daniel','thomas','christian','martin','anna','maria','ursula','ruth','elisabeth','monika','claudia','sandra',
  'giovanni','giuseppe','antonio','marco','luca','matteo','francesco','alessandro','andrea','stefano','maria','anna','giulia','sara','martina','francesca'
]);

// Regex library
const PATTERNS = [
  // Emails
  { key: 'email', category: CATEGORIES.contact, re: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g, label: 'Email' },
  // Swiss phone (+41 22 xxx xx xx, 0XX XXX XX XX, etc.)
  { key: 'phone_ch', category: CATEGORIES.contact, re: /(?:\+41[\s.\-]?|0041[\s.\-]?|\b0)(?:\d{2})[\s.\-]?\d{3}[\s.\-]?\d{2}[\s.\-]?\d{2}\b/g, label: 'Téléphone' },
  // Generic international phone
  { key: 'phone_intl', category: CATEGORIES.contact, re: /\+\d{1,3}[\s.\-]?\d{2,4}[\s.\-]?\d{2,4}[\s.\-]?\d{2,4}[\s.\-]?\d{0,4}\b/g, label: 'Téléphone' },
  // AVS/AHV 13-digit new format: 756.XXXX.XXXX.XX
  { key: 'avs', category: CATEGORIES.admin, re: /\b756[\.\s\-]?\d{4}[\.\s\-]?\d{4}[\.\s\-]?\d{2}\b/g, label: 'N° AVS/AHV' },
  // Swiss postal code (4 digits) + city  — captured as "1000 Lausanne"
  { key: 'ch_addr_line', category: CATEGORIES.contact, re: /\b(?:CH-)?[1-9]\d{3}\s+[A-ZÉÈÀÂÊÎÔÛÄÖÜ][a-zA-Zéèàâêîôûäöüç\-\s]{2,40}\b/g, label: 'Adresse (NPA + ville)' },
  // Dates DD.MM.YYYY / DD/MM/YYYY / DD-MM-YYYY
  { key: 'date_dmy', category: CATEGORIES.dates, re: /\b(?:0?[1-9]|[12]\d|3[01])[\.\/\-](?:0?[1-9]|1[0-2])[\.\/\-](?:19|20)\d{2}\b/g, label: 'Date' },
  // Long date format: 14 mars 2024
  { key: 'date_long', category: CATEGORIES.dates, re: /\b(?:0?[1-9]|[12]\d|3[01])\s+(?:janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre|Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember|gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre|January|February|March|April|May|June|July|August|September|October|November|December)\s+(?:19|20)\d{2}\b/gi, label: 'Date' },
  // Patient/Insurance/Record numbers (labelled)
  { key: 'patient_id', category: CATEGORIES.admin, re: /(?:N[°o]\s*(?:patient|dossier|assur[eé]|police|facture|assurance)|Patient(?:en)?[\-\s]?(?:Nr|ID|Nummer)|N[°o]\s*d['\s]assur[eé]|Nr\.?\s*(?:paziente|assicurazione)|Insurance\s*(?:No\.?|Number)|Patient\s*ID)[\s:.]*[A-Z0-9\-\/\.]{4,20}/gi, label: 'N° administratif' },
  // Insurance number pattern (BAG-Nr) or long numeric IDs on their own line-ish
  { key: 'long_id', category: CATEGORIES.admin, re: /\b\d{7,12}\b/g, label: 'Identifiant numérique' },
  // Accession / lab numbers (labelled)
  { key: 'accession', category: CATEGORIES.admin, re: /(?:Accession|Barcode|Code[\-\s]?barres|Sample\s*ID|N[°o]\s*(?:labo|laboratoire|échantillon|echantillon))[\s:.#]*[A-Z0-9\-]{4,20}/gi, label: 'N° laboratoire' },
];

// Full name detector: <FirstName> <LastName>, or <Civility> <FirstName> <LastName>
const NAME_RE = /\b(?:(?:M\.|Mme|Mlle|Mr|Mrs|Ms|Herr|Frau|Signor|Signora|Dr\.?|Dre\.?|Prof\.?|Docteur|Doctoresse)\s+)?([A-ZÉÈÀÂÊÎÔÛÄÖÜÇ][a-zéèàâêîôûäöüçñ\-']{1,25})(?:\s+([A-ZÉÈÀÂÊÎÔÛÄÖÜÇ][a-zéèàâêîôûäöüçñ\-']{1,25}))(?:\s+([A-ZÉÈÀÂÊÎÔÛÄÖÜÇ][a-zéèàâêîôûäöüçñ\-']{1,25}))?\b/g;

// Labelled context detectors: "Nom: Dupont" / "Patient: Marie Dupont" / "Née le: 14.03.1987"
const LABELLED_FIELDS = [
  { label: 'Nom', category: CATEGORIES.identity, re: /(?:Nom(?:\s+de\s+famille)?|Patient(?:e)?|Name|Cognome)\s*:\s*([A-ZÉÈÀÂÊÎÔÛÄÖÜÇ][A-Za-zÉÈÀÂÊÎÔÛÄÖÜÇéèàâêîôûäöüçñ\-'\s]{1,50})/g },
  { label: 'Prénom', category: CATEGORIES.identity, re: /(?:Pr[eé]nom|Vorname|First\s*Name|Nome)\s*:\s*([A-ZÉÈÀÂÊÎÔÛÄÖÜÇ][A-Za-zÉÈÀÂÊÎÔÛÄÖÜÇéèàâêîôûäöüçñ\-'\s]{1,40})/g },
  { label: 'Date de naissance', category: CATEGORIES.dates, re: /(?:N[eé]e?\s+le|Date\s+de\s+naissance|Geburtsdatum|Date\s+of\s+Birth|DOB|Data\s+di\s+nascita)\s*:?\s*(\d{1,2}[\.\/\-]\d{1,2}[\.\/\-]\d{2,4})/gi },
  { label: 'Adresse', category: CATEGORIES.contact, re: /(?:Adresse|Address|Indirizzo|Anschrift)\s*:\s*([^\n]{5,80})/gi },
];

// Healthcare pro detection: "Dr. <Name>"
const HEALTHPRO_RE = /\b(?:Dr\.?|Dre\.?|Docteur|Doctoresse|Prof\.?|Professeur|Doktor|Dott\.?)\s+[A-ZÉÈÀÂÊÎÔÛÄÖÜÇ][a-zéèàâêîôûäöüçñ\-']{2,30}(?:\s+[A-ZÉÈÀÂÊÎÔÛÄÖÜÇ][a-zéèàâêîôûäöüçñ\-']{2,30}){0,2}/g;

// Utility: dedupe overlapping ranges (keep the widest/highest priority)
function dedupeRanges(items) {
  items.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
  const out = [];
  for (const it of items) {
    const last = out[out.length - 1];
    if (last && it.start < last.end) {
      // Overlap: keep the longer one; prefer higher priority category
      if ((it.end - it.start) > (last.end - last.start)) out[out.length - 1] = it;
      continue;
    }
    out.push(it);
  }
  return out;
}

function priority(cat) {
  // Identity/admin/contact are the most critical, dates next, healthpro then other.
  return { identity: 5, admin: 4, contact: 4, dates: 3, healthpro: 2, other: 1 }[cat] || 0;
}

export function detectPII(text) {
  if (!text) return [];
  const results = [];

  // 1) Labelled fields first (most reliable)
  for (const field of LABELLED_FIELDS) {
    let m;
    const re = new RegExp(field.re.source, field.re.flags);
    while ((m = re.exec(text)) !== null) {
      const captured = m[1];
      if (!captured) continue;
      const start = m.index + m[0].indexOf(captured);
      results.push({
        start, end: start + captured.length,
        value: captured.trim(),
        category: field.category,
        label: field.label,
        source: 'labelled',
      });
    }
  }

  // 2) Healthcare professional (Dr. XXX)
  {
    let m;
    while ((m = HEALTHPRO_RE.exec(text)) !== null) {
      results.push({
        start: m.index, end: m.index + m[0].length,
        value: m[0], category: CATEGORIES.healthpro,
        label: 'Professionnel de santé', source: 'regex',
      });
    }
  }

  // 3) Regex patterns
  for (const p of PATTERNS) {
    let m;
    const re = new RegExp(p.re.source, p.re.flags);
    while ((m = re.exec(text)) !== null) {
      // Skip trivially short matches / months of dates false-positives
      if (m[0].length < 3) continue;
      // For long_id, skip if it's just a year
      if (p.key === 'long_id' && /^(19|20)\d{2}$/.test(m[0])) continue;
      results.push({
        start: m.index, end: m.index + m[0].length,
        value: m[0], category: p.category, label: p.label,
        source: 'regex', key: p.key,
      });
    }
  }

  // 4) Name detector (last, lower priority than labelled)
  {
    let m;
    while ((m = NAME_RE.exec(text)) !== null) {
      const full = m[0];
      const first = m[1];
      // Heuristic: at least one part must be a common first name OR preceded by a civility
      const hasCivility = /^(?:M\.|Mme|Mlle|Mr|Mrs|Ms|Herr|Frau|Signor|Signora|Dr\.?|Dre\.?|Prof\.?|Docteur|Doctoresse)\s/.test(full);
      const firstLower = (first || '').toLowerCase();
      const isCommonFirstName = COMMON_FIRST_NAMES.has(firstLower);
      if (!hasCivility && !isCommonFirstName) continue;
      // Skip if it's likely a hospital/clinic name (contains hospital keywords nearby)
      const contextBefore = text.slice(Math.max(0, m.index - 20), m.index).toLowerCase();
      if (/(?:h[ôo]pital|clinique|centre|cabinet|spital|krankenhaus|ospedale)/.test(contextBefore)) continue;
      const cat = hasCivility && /Dr|Dre|Docteur|Doctoresse|Prof|Doktor|Dott/i.test(full) ? CATEGORIES.healthpro : CATEGORIES.identity;
      results.push({
        start: m.index, end: m.index + full.length,
        value: full, category: cat, label: cat === CATEGORIES.healthpro ? 'Professionnel de santé' : 'Nom complet',
        source: 'name-heuristic',
      });
    }
  }

  // 5) Hospital / clinic names (labelled context)
  {
    const re = new RegExp('\\b(?:H[ôo]pital|Clinique|Centre\\s+m[eé]dical|Cabinet|Polyclinique|CHUV|HUG|USZ|Spital|Krankenhaus|Ospedale|Laboratoire|Labor|Laboratorio)\\s+(?:[A-ZÉÈÀÂÊÎÔÛÄÖÜÇ][A-Za-zÉÈéèàâêîôûäöüç\\-\'\\.\\s]{2,40})', 'g');
    let m;
    while ((m = re.exec(text)) !== null) {
      results.push({
        start: m.index, end: m.index + m[0].length,
        value: m[0], category: CATEGORIES.healthpro,
        label: 'Établissement de santé', source: 'dict',
      });
    }
  }

  // Deduplicate by priority + range
  const withPriority = results.map(r => ({ ...r, _p: priority(r.category) }));
  withPriority.sort((a, b) => a.start - b.start || b._p - a._p || (b.end - b.start) - (a.end - a.start));
  const merged = [];
  for (const r of withPriority) {
    const last = merged[merged.length - 1];
    if (last && r.start < last.end) {
      // overlap — keep higher priority; if same priority, keep longer
      if (r._p > last._p || (r._p === last._p && (r.end - r.start) > (last.end - last.start))) {
        merged[merged.length - 1] = r;
      }
      continue;
    }
    merged.push(r);
  }

  // Assign stable IDs
  return merged.map((r, i) => ({
    id: `pii-${i}-${r.start}`,
    start: r.start,
    end: r.end,
    value: r.value,
    category: r.category,
    label: r.label,
    source: r.source,
  }));
}

// Category metadata
export const CATEGORY_META = {
  identity:  { key: 'identity',   colorBg: '#E0E7FF', colorText: '#3730A3', colorBorder: '#818CF8', dot: '#4F46E5' },
  contact:   { key: 'contact',    colorBg: '#D1FAE5', colorText: '#065F46', colorBorder: '#34D399', dot: '#10B981' },
  dates:     { key: 'dates',      colorBg: '#FEF3C7', colorText: '#92400E', colorBorder: '#FBBF24', dot: '#F59E0B' },
  admin:     { key: 'admin',      colorBg: '#EDE9FE', colorText: '#5B21B6', colorBorder: '#A78BFA', dot: '#8B5CF6' },
  healthpro: { key: 'healthpro',  colorBg: '#FFE4E6', colorText: '#9F1239', colorBorder: '#FB7185', dot: '#F43F5E' },
  other:     { key: 'other',      colorBg: '#F1F5F9', colorText: '#334155', colorBorder: '#94A3B8', dot: '#64748B' },
};

// Generate a pseudonym for a given detection using a session counter.
export function makePseudonymizer() {
  const counters = { identity: 0, contact: 0, dates: 0, admin: 0, healthpro: 0, other: 0 };
  const seen = new Map(); // value -> pseudonym
  const prefixes = {
    identity: 'PATIENT',
    contact: 'CONTACT',
    dates: 'DATE',
    admin: 'ID',
    healthpro: 'MEDECIN',
    other: 'INFO',
  };
  return (detection) => {
    const norm = detection.value.trim().toLowerCase();
    const key = `${detection.category}::${norm}`;
    if (seen.has(key)) return seen.get(key);
    counters[detection.category] = (counters[detection.category] || 0) + 1;
    const n = String(counters[detection.category]).padStart(2, '0');
    const p = `${prefixes[detection.category] || 'INFO'}_${n}`;
    seen.set(key, p);
    return p;
  };
}

// Given original text + detections + mode, produce anonymized text
export function anonymizeText(text, detections, mode = 'suppress') {
  if (!detections || detections.length === 0) return text;
  const pseudo = makePseudonymizer();
  const sorted = [...detections].sort((a, b) => a.start - b.start);
  let out = '';
  let cursor = 0;
  for (const d of sorted) {
    if (d.start < cursor) continue;
    out += text.slice(cursor, d.start);
    if (mode === 'pseudo') out += `[${pseudo(d)}]`;
    else out += '[' + labelFor(d.category) + ']';
    cursor = d.end;
  }
  out += text.slice(cursor);
  return out;
}

function labelFor(cat) {
  return {
    identity: 'IDENTITÉ',
    contact: 'CONTACT',
    dates: 'DATE',
    admin: 'ID',
    healthpro: 'MÉDECIN',
    other: 'INFO',
  }[cat] || 'ANONYMISÉ';
}
