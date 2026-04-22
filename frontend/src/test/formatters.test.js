import { describe, it, expect } from 'vitest';
import { formatRelativeTime, truncateText } from '../utils/formatters.js';

describe('formatRelativeTime', () => {
  it('returns "Just now" for very recent timestamps', () => {
    const now = new Date().toISOString();
    expect(formatRelativeTime(now)).toBe('Just now');
  });

  it('returns formatted minutes for recent timestamps', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(formatRelativeTime(fiveMinutesAgo)).toBe('5 min ago');
  });
});

describe('truncateText', () => {
  it('truncates text correctly', () => {
    const longText = 'This is a very long piece of text that should definitely be truncated.';
    expect(truncateText(longText, 10)).toBe('This is a...');
  });

  it('does not truncate short text', () => {
    const shortText = 'Short';
    expect(truncateText(shortText, 10)).toBe('Short');
  });
});
