// SPDX-License-Identifier: Apache-2.0
import i18n from '../i18n'

/**
 * Wraps a promise with a timeout. If the promise doesn't resolve within
 * the specified milliseconds, the returned promise rejects with a timeout error.
 *
 * Pass an optional AbortController to abort the underlying HTTP request on
 * timeout — this closes the 15-30s ghost window where a mutation could succeed
 * in the DB after the UI has shown a timeout error (see FINDING-7).
 */
export function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number,
  message = i18n.t('errors.requestTimedOut'),
  controller?: AbortController
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      controller?.abort()
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
