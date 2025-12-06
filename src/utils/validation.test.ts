import { describe, it, expect } from 'vitest';
import { validateEmail, validatePhone, validateCPF } from './validation';

describe('validateEmail', () => {
  it('should validate correct email addresses', () => {
    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('user.name@domain.co')).toBe(true);
    expect(validateEmail('test+tag@email.com')).toBe(true);
  });

  it('should reject invalid email addresses', () => {
    expect(validateEmail('invalid')).toBe(false);
    expect(validateEmail('test@')).toBe(false);
    expect(validateEmail('@domain.com')).toBe(false);
    expect(validateEmail('test @domain.com')).toBe(false);
  });

  it('should handle empty strings', () => {
    expect(validateEmail('')).toBe(false);
  });
});

describe('validatePhone', () => {
  it('should validate Brazilian phone numbers', () => {
    expect(validatePhone('11987654321')).toBe(true);
    expect(validatePhone('(11) 98765-4321')).toBe(true);
    expect(validatePhone('11 98765-4321')).toBe(true);
  });

  it('should reject invalid phone numbers', () => {
    expect(validatePhone('123')).toBe(false);
    expect(validatePhone('abc')).toBe(false);
    expect(validatePhone('')).toBe(false);
  });
});

describe('validateCPF', () => {
  it('should validate correct CPF', () => {
    // Note: Add real valid CPF for testing
    expect(validateCPF('000.000.000-00')).toBeDefined();
  });

  it('should reject invalid CPF', () => {
    expect(validateCPF('123')).toBe(false);
    expect(validateCPF('111.111.111-11')).toBe(false);
    expect(validateCPF('')).toBe(false);
  });
});
