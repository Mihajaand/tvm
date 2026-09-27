import { describe, expect, it } from 'vitest';
import { toNullableReviewDate } from '../utils/reviewCycleDates';

describe('toNullableReviewDate', () => {
  it('keeps a selected date', () => {
    expect(toNullableReviewDate('2026-09-27')).toBe('2026-09-27');
  });

  it('converts empty or whitespace-only optional dates to null', () => {
    expect(toNullableReviewDate('')).toBeNull();
    expect(toNullableReviewDate('   ')).toBeNull();
    expect(toNullableReviewDate(undefined)).toBeNull();
  });
});