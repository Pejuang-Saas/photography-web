import {
  EMAIL_VARIABLES,
  emptyValues,
  extractVariables,
  isVariableKey,
  SAMPLE_VALUES,
  unknownVariables,
} from './email-variables';

describe('email variables', () => {
  it('has unique keys, and a label and sample for each', () => {
    const keys = EMAIL_VARIABLES.map((variable) => variable.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const variable of EMAIL_VARIABLES) {
      expect(variable.label).toBeTruthy();
      expect(variable.sample).toBeTruthy();
    }
  });

  it('extracts distinct placeholder names in order', () => {
    expect(extractVariables('{customer_name} {booking_code} {customer_name}')).toEqual([
      'customer_name',
      'booking_code',
    ]);
    expect(extractVariables(null)).toEqual([]);
    expect(extractVariables('tanpa variabel { bukan } {spasi di dalam}')).toEqual([]);
    // Anything shaped like a placeholder is reported, including near-misses of real keys.
    expect(extractVariables('{Customer_Name} {typo2}')).toEqual(['Customer_Name', 'typo2']);
  });

  it('finds the placeholders that are not in the registry', () => {
    expect(unknownVariables('{customer_name} {typo_nama} {site_url} {x} {Customer_Name}')).toEqual([
      'typo_nama',
      'x',
      'Customer_Name',
    ]);
    expect(isVariableKey('customer_name')).toBe(true);
    expect(isVariableKey('nope')).toBe(false);
  });

  it('can produce an all-empty and an all-sample value set', () => {
    expect(Object.values(emptyValues()).every((value) => value === '')).toBe(true);
    expect(SAMPLE_VALUES.customer_name).toBe('Anisa Rahmawati');
    expect(Object.keys(SAMPLE_VALUES)).toHaveLength(EMAIL_VARIABLES.length);
  });
});
