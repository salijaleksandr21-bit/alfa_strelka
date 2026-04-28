import { sanitize } from '../src/app.js';

describe('Функция sanitize', () => {
  test('должна экранировать HTML-символы', () => {
    const input = '<script>alert("xss")</script>';
    const output = sanitize(input);
    expect(output).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    expect(output).not.toContain('<');
    expect(output).not.toContain('>');
    expect(output).not.toContain('"');
  });

  test('должна экранировать амперсанд', () => {
    expect(sanitize('A&B')).toBe('A&amp;B');
  });

  test('должна экранировать одинарные кавычки', () => {
    expect(sanitize("it's")).toBe('it&#x27;s');
  });

  test('должна возвращать пустую строку для null или undefined', () => {
    expect(sanitize(null)).toBe('');
    expect(sanitize(undefined)).toBe('');
  });

  test('должна корректно обрабатывать обычный текст без спецсимволов', () => {
    expect(sanitize('Hello, мир!')).toBe('Hello, мир!');
  });

  test('должна экранировать вложенные опасные конструкции', () => {
    const input = '<img src=x onerror=alert(1)>';
    const output = sanitize(input);
    expect(output).not.toContain('<img');
  });
});
