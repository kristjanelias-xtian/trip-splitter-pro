/**
 * Wraps a promise with a timeout. If the promise doesn't resolve within
 * the specified milliseconds, the returned promise rejects with a timeout error.
 */
export function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number,
  message = 'Request timed out'
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(message))
    }, ms)

    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      }
    )
  })
}
