const decimals = (n: number) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: n, maximumFractionDigits: n });
const integer = new Intl.NumberFormat('pt-BR');

export const formatCr = (value: number | null): string => (value === null ? 'sem nota' : decimals(3).format(value));
export const formatGrade = (value: number | null): string => (value === null ? '—' : decimals(2).format(value));
export const formatPercent = (value: number): string => `${decimals(2).format(value)}%`;
export const formatHours = (value: number): string => `${integer.format(value)} h`;

const LOWERCASE_WORDS = new Set(['a', 'à', 'ao', 'as', 'da', 'das', 'de', 'do', 'dos', 'e', 'em', 'na', 'no', 'o', 'os', 'para', 'por']);
const ROMAN = /^(?=[IVXLC]+$)C{0,3}(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;

/** "ALGORITMOS E ESTRUTURA DE DADOS II" → "Algoritmos e Estrutura de Dados II" */
export function toTitleCase(name: string): string {
  const words = name.split(/\s+/);
  return words
    .map((word, index) => {
      if (ROMAN.test(word)) return word;
      const lower = word.toLocaleLowerCase('pt-BR');
      if (index > 0 && index < words.length - 1 && LOWERCASE_WORDS.has(lower)) return lower;
      return lower.charAt(0).toLocaleUpperCase('pt-BR') + lower.slice(1);
    })
    .join(' ');
}
