export function throttle(
  fn: Function,
  delayMs: number
): (...args: any[]) => any {
  let lastRun = 0;
  return function (...args: any[]) {
    if (Date.now() - lastRun < delayMs) {
      return;
    }
    lastRun = Date.now();
    return fn(...args);
  };
}
