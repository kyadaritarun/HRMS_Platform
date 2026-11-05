import { describe, it, expect } from 'vitest';
import { parseDatesAndReason } from '../services/assistantAgent.js';

describe('AI Assistant Date and Slot Parser Unit Tests', () => {
  const refDate = new Date('2026-11-04T08:00:00Z');

  it('1. User prompt: "Apply sick leave for 14-nov due to fever"', () => {
    const result = parseDatesAndReason('Apply sick leave for 14-nov due to fever', refDate);
    expect(result.startDate).toBe('2026-11-14');
    expect(result.endDate).toBe('2026-11-14');
    expect(result.days).toBe(1);
    expect(result.reason).toBe('Fever');
    expect(result.inferredCategory).toBe('SICK');
  });

  it('2. User prompt: "apply leave from 10-nov to 12-nov from traving"', () => {
    const result = parseDatesAndReason('apply leave from 10-nov to 12-nov from traving', refDate);
    expect(result.startDate).toBe('2026-11-10');
    expect(result.endDate).toBe('2026-11-12');
    expect(result.days).toBe(3);
    expect(result.reason).toBe('Traveling');
    expect(result.inferredCategory).toBe('CASUAL');
  });

  it('3. User prompt without "from": "apply leave 10-nov to 12-nov from traving"', () => {
    const result = parseDatesAndReason('apply leave 10-nov to 12-nov from traving', refDate);
    expect(result.startDate).toBe('2026-11-10');
    expect(result.endDate).toBe('2026-11-12');
    expect(result.days).toBe(3);
    expect(result.reason).toBe('Traveling');
    expect(result.inferredCategory).toBe('CASUAL');
  });

  it('4. User prompt: "apply casual leave from 10 to 12 nov for personal work"', () => {
    const result = parseDatesAndReason('apply casual leave from 10 to 12 nov for personal work', refDate);
    expect(result.startDate).toBe('2026-11-10');
    expect(result.endDate).toBe('2026-11-12');
    expect(result.days).toBe(3);
    expect(result.reason).toBe('Personal work');
    expect(result.inferredCategory).toBe('CASUAL');
  });

  it('5. User prompt: "apply leave for 14th nov due to severe fever"', () => {
    const result = parseDatesAndReason('apply leave for 14th nov due to severe fever', refDate);
    expect(result.startDate).toBe('2026-11-14');
    expect(result.endDate).toBe('2026-11-14');
    expect(result.days).toBe(1);
    expect(result.reason).toBe('Fever');
    expect(result.inferredCategory).toBe('SICK');
  });

  it('6. Relative prompt: "apply leave tomorrow because of cold"', () => {
    const result = parseDatesAndReason('apply leave tomorrow because of cold', refDate);
    expect(result.startDate).toBe('2026-11-05');
    expect(result.endDate).toBe('2026-11-05');
    expect(result.days).toBe(1);
    expect(result.reason).toBe('Cold & flu symptoms');
    expect(result.inferredCategory).toBe('SICK');
  });

  it('7. Duration offset: "apply leave for 3 days starting tomorrow for wedding"', () => {
    const result = parseDatesAndReason('apply leave for 3 days starting tomorrow for wedding', refDate);
    expect(result.startDate).toBe('2026-11-05');
    expect(result.endDate).toBe('2026-11-07');
    expect(result.days).toBe(3);
    expect(result.reason).toBe('Attending wedding function');
    expect(result.inferredCategory).toBe('CASUAL');
  });
});

