export type CreditStatus = 'below' | 'within' | 'above';

/** Adding stays allowed in every state: this only drives the warning or error text. */
export function creditStatus(credits: number, min: number, max: number): CreditStatus {
  if (credits > max) return 'above';
  if (credits < min) return 'below';
  return 'within';
}
