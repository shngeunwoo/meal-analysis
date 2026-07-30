import { describe, it, expect } from 'vitest';
import { FOODS } from '@/data/foods';
import { defaultIntakeGrams } from '@/lib/analysis';
import { matchFoods } from '@/lib/match';

describe('school meal fixes', () => {
  it('숭늉은 밥이 아니라 음료로 매칭', () => {
    const rows = matchFoods(['숭늉'], FOODS, FOODS);
    expect(rows[0].food?.id).toBe('beverage');
  });

  it('양념초장은 기본 12g', () => {
    const sauce = {
      id: 's',
      name: '양념초장',
      nutrientsPerServing: { sodium_mg: 4784 },
      meta: { basis: '100ml', categoryLarge: '장류, 양념류' },
    };
    expect(defaultIntakeGrams(sauce as any)).toBe(12);
  });

  it('오이무침은 기본 40g', () => {
    const side = {
      id: 'o',
      name: '오이무침',
      nutrientsPerServing: { sodium_mg: 800 },
      meta: { basis: '100ml', categoryLarge: '생채·무침류' },
    };
    expect(defaultIntakeGrams(side as any)).toBe(40);
  });
});
