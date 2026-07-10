/** Debounce helper for search inputs and filter fields */
export function debounce(fn, delayMs = 400) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  };
}
