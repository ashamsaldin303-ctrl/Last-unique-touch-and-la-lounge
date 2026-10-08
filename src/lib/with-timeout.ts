/**
 * Network watchdog — rejects if a request hangs (slow/offline network) so
 * the error state surfaces instead of an eternal skeleton. The underlying
 * request is not aborted; callers' seq guards discard any late response.
 *
 * Previously defined per-view (products/la-lounge-products/
 * birthday-products) — byte-identical logic, now the single shared copy.
 */
export function withTimeout<T>(promise: Promise<T>, ms = 8000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })
}
