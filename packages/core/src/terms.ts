/** Terms are 'YYYY.S' strings, S ∈ {1,2}. */
export function termFromLabel(label: string): string | null {
  const m = /(\d)\s*[°º]?\s*Semestre\s+de\s+(\d{4})/i.exec(label);
  return m ? `${m[2]}.${m[1]}` : null;
}

export function termFromAdmission(label: string): string | null {
  const m = /(\d{4})\s*\/\s*(\d)/.exec(label);
  return m ? `${m[1]}.${m[2]}` : null;
}

export function termIndex(term: string): number {
  const [year, sem] = term.split('.');
  return Number(year) * 2 + Number(sem) - 1;
}

function fromIndex(index: number): string {
  return `${Math.floor(index / 2)}.${(index % 2) + 1}`;
}

export function compareTerms(a: string, b: string): number {
  return termIndex(a) - termIndex(b);
}

export function nextTerm(term: string): string {
  return fromIndex(termIndex(term) + 1);
}

export function addTerms(term: string, n: number): string {
  return fromIndex(termIndex(term) + n);
}

export function formatTerm(term: string): string {
  return term.replace('.', '/');
}
