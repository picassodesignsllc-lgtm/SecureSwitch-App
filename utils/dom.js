/** DOM helpers shared by components to keep rendering code small and safe. */
export const qs = (selector, scope = document) => scope.querySelector(selector);
export const qsa = (selector, scope = document) => [...scope.querySelectorAll(selector)];

export function html(strings, ...values) {
  return strings.reduce((result, string, index) => `${result}${string}${values[index] ?? ''}`, '');
}

export function unique(values) {
  return [...new Set(values.filter(Boolean))];
}
