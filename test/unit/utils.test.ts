/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import {
  formatPhoneNumber,
  isValidE164,
  cleanObject,
  parseCustomAttributes,
  parseProductItems,
  getTimestamp,
} from '../../nodes/Attentive/utils';

describe('Utility Functions', () => {
  describe('formatPhoneNumber', () => {
    it('should add + prefix to digits only', () => {
      expect(formatPhoneNumber('19148440001')).toBe('+19148440001');
    });

    it('should keep + prefix if already present', () => {
      expect(formatPhoneNumber('+19148440001')).toBe('+19148440001');
    });

    it('should strip non-digit characters', () => {
      expect(formatPhoneNumber('1-914-844-0001')).toBe('+19148440001');
      expect(formatPhoneNumber('(914) 844-0001')).toBe('+9148440001');
    });

    it('should handle international numbers', () => {
      expect(formatPhoneNumber('+442071838750')).toBe('+442071838750');
    });

    it('should return empty string for empty input', () => {
      expect(formatPhoneNumber('')).toBe('');
    });
  });

  describe('isValidE164', () => {
    it('should validate correct E.164 numbers', () => {
      expect(isValidE164('+19148440001')).toBe(true);
      expect(isValidE164('+442071838750')).toBe(true);
      expect(isValidE164('+861012345678')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(isValidE164('19148440001')).toBe(false);
      expect(isValidE164('+0123456789')).toBe(false);
      expect(isValidE164('phone')).toBe(false);
      expect(isValidE164('')).toBe(false);
    });
  });

  describe('cleanObject', () => {
    it('should remove undefined and null values', () => {
      const input = {
        a: 'value',
        b: undefined,
        c: null,
        d: '',
      };
      expect(cleanObject(input)).toEqual({ a: 'value' });
    });

    it('should keep valid values', () => {
      const input = {
        a: 'value',
        b: 0,
        c: false,
        d: [],
      };
      expect(cleanObject(input)).toEqual({ a: 'value', b: 0, c: false });
    });

    it('should clean nested objects', () => {
      const input = {
        a: 'value',
        nested: {
          b: 'keep',
          c: undefined,
        },
      };
      expect(cleanObject(input)).toEqual({
        a: 'value',
        nested: { b: 'keep' },
      });
    });

    it('should remove empty nested objects', () => {
      const input = {
        a: 'value',
        nested: {
          b: undefined,
        },
      };
      expect(cleanObject(input)).toEqual({ a: 'value' });
    });
  });

  describe('parseCustomAttributes', () => {
    it('should parse attributes array', () => {
      const input = {
        attributes: [
          { key: 'firstName', value: 'John' },
          { key: 'lastName', value: 'Doe' },
        ],
      };
      expect(parseCustomAttributes(input)).toEqual({
        firstName: 'John',
        lastName: 'Doe',
      });
    });

    it('should handle empty input', () => {
      expect(parseCustomAttributes({})).toEqual({});
      expect(parseCustomAttributes(null as any)).toEqual({});
    });

    it('should skip items without key or value', () => {
      const input = {
        attributes: [
          { key: 'valid', value: 'value' },
          { key: '', value: 'nokey' },
          { key: 'novalue', value: undefined },
        ],
      };
      expect(parseCustomAttributes(input)).toEqual({ valid: 'value' });
    });
  });

  describe('parseProductItems', () => {
    it('should parse product items', () => {
      const input = {
        items: [
          {
            productId: 'SKU123',
            name: 'Test Product',
            price: '29.99',
            currency: 'USD',
            quantity: '2',
          },
        ],
      };

      const result = parseProductItems(input);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        productId: 'SKU123',
        name: 'Test Product',
        price: { value: 29.99, currency: 'USD' },
        quantity: 2,
      });
    });

    it('should handle optional fields', () => {
      const input = {
        items: [
          {
            productId: 'SKU123',
            name: 'Test Product',
            price: '19.99',
            productVariantId: 'VAR1',
            productImage: 'https://example.com/img.jpg',
            productUrl: 'https://example.com/product',
            category: 'Electronics',
          },
        ],
      };

      const result = parseProductItems(input);
      expect(result[0]).toMatchObject({
        productVariantId: 'VAR1',
        productImage: 'https://example.com/img.jpg',
        productUrl: 'https://example.com/product',
        category: ['Electronics'],
      });
    });

    it('should handle empty input', () => {
      expect(parseProductItems({})).toEqual([]);
      expect(parseProductItems(null as any)).toEqual([]);
    });
  });

  describe('getTimestamp', () => {
    it('should return ISO timestamp for valid date', () => {
      const result = getTimestamp('2024-01-15T10:30:00Z');
      expect(result).toBe('2024-01-15T10:30:00.000Z');
    });

    it('should return current timestamp when no date provided', () => {
      const before = new Date().toISOString();
      const result = getTimestamp();
      const after = new Date().toISOString();

      expect(result >= before).toBe(true);
      expect(result <= after).toBe(true);
    });

    it('should handle various date formats', () => {
      const result = getTimestamp('January 15, 2024');
      expect(result).toMatch(/2024-01-15/);
    });
  });
});
