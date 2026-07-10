/**
 * Stack-based navigation for nested drawer flows.
 */
export function createNavigationContext() {
  const stack = [];
  const listeners = new Set();

  function notify() {
    listeners.forEach((fn) => fn(stack));
  }

  return {
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    push(entry) {
      stack.push({ ...entry });
      notify();
      return stack.length;
    },

    replace(entry) {
      if (stack.length) stack[stack.length - 1] = { ...entry };
      else stack.push({ ...entry });
      notify();
    },

    pop() {
      if (stack.length <= 1) return null;
      stack.pop();
      notify();
      return stack[stack.length - 1] || null;
    },

    peek() {
      return stack[stack.length - 1] || null;
    },

    canGoBack() {
      return stack.length > 1;
    },

    depth() {
      return stack.length;
    },

    clear() {
      stack.length = 0;
      notify();
    },

    getStack() {
      return [...stack];
    },
  };
}

/**
 * Decide whether a new drawer entry should stack on top or replace the current one.
 */
export function shouldPushEntry(current, next) {
  if (!current) return false;
  if (next.push === true) return true;
  if (next.push === false) return false;

  const curType = current.selectedItem?.type;
  const nextType = next.selectedItem?.type;

  if (nextType === 'booking') return true;
  if (nextType === 'form' && curType === 'detail') return true;
  if (curType === 'detail' && nextType === 'detail') return false;
  if (curType === 'form' && nextType === 'form') return false;
  return Boolean(next.push);
}
