import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounce, throttle, memoryCache } from './performance';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should delay function execution', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100);

    debouncedFn();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should cancel previous calls', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100);

    debouncedFn();
    debouncedFn();
    debouncedFn();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should limit function calls', () => {
    const fn = vi.fn();
    const throttledFn = throttle(fn, 100);

    throttledFn();
    throttledFn();
    throttledFn();

    expect(fn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(100);
    throttledFn();
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('memoryCache', () => {
  beforeEach(() => {
    memoryCache.clear();
  });

  it('should store and retrieve values', () => {
    memoryCache.set('key1', 'value1');
    expect(memoryCache.get('key1')).toBe('value1');
  });

  it('should return null for non-existent keys', () => {
    expect(memoryCache.get('nonexistent')).toBeNull();
  });

  it('should expire items after TTL', () => {
    vi.useFakeTimers();
    memoryCache.set('key1', 'value1', 1000); // 1 second TTL
    
    expect(memoryCache.get('key1')).toBe('value1');
    
    vi.advanceTimersByTime(1001);
    expect(memoryCache.get('key1')).toBeNull();
    
    vi.restoreAllMocks();
  });

  it('should check if key exists', () => {
    memoryCache.set('key1', 'value1');
    expect(memoryCache.has('key1')).toBe(true);
    expect(memoryCache.has('nonexistent')).toBe(false);
  });

  it('should clear all items', () => {
    memoryCache.set('key1', 'value1');
    memoryCache.set('key2', 'value2');
    
    memoryCache.clear();
    
    expect(memoryCache.has('key1')).toBe(false);
    expect(memoryCache.has('key2')).toBe(false);
  });
});
