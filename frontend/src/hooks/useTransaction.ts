import { useState, useCallback } from 'react'

export type TransactionStatus =
  | 'idle'
  | 'simulating'
  | 'signing'
  | 'submitting'
  | 'polling'
  | 'success'
  | 'error'

// ── Reconciliation policy ───────────────────────────────────────────────────
//
// Every write-path component MUST follow this policy:
//
// 1. No optimistic cache mutation.
//    Never add/update/remove entries in any shared cache (useTokens,
//    useFactoryState, TokenDashboard, etc.) before the transaction is
//    confirmed on-chain. A phantom entry that looks real but doesn't exist
//    on the ledger is worse than a brief loading state.
//
// 2. Only call refresh() after a CONFIRMED success.
//    The `onSuccess` callback (or equivalent) is the one place where
//    caches should be invalidated. Listen for `status === 'success'` (not
//    just "the promise resolved") and call refresh() / refetch() / re-run
//    the relevant query hook.
//
// 3. On failure or timeout, do NOT mutate any cache.
//    Show an error toast. If the transaction timed out, communicate
//    uncertainty: "Transaction submitted but not yet confirmed — check
//    the explorer for the final status." Never silently treat a timeout
//    as either success or failure.
//
//    Timeout guards are the component's responsibility — wrap the
//    builder call with Promise.race against a timeout and surface the
//    uncertainty banner when the race is lost.
//
// 4. Prefer useTransaction over ad-hoc loading states.
//    The hook centralises simulate → sign → submit → poll. Components
//    that roll their own isDeploying / isSubmitting state bypass this
//    lifecycle and risk drifting from the policy.

export interface UseTransactionResult<T> {
  /** Run the transaction. Resolves with the result or throws on error. */
  execute: () => Promise<T>
  reset: () => void
  status: TransactionStatus
  result: T | null
  error: Error | null
}

/**
 * Centralises transaction lifecycle: simulate → sign → submit → poll.
 *
 * @param builder - Async function that performs the full transaction and returns a result.
 *                  Use the `onStatusChange` callback to report fine-grained status transitions.
 */
export function useTransaction<T>(
  builder: (onStatusChange: (status: TransactionStatus) => void) => Promise<T>,
): UseTransactionResult<T> {
  const [status, setStatus] = useState<TransactionStatus>('idle')
  const [result, setResult] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const execute = useCallback(async (): Promise<T> => {
    setStatus('simulating')
    setResult(null)
    setError(null)
    try {
      const value = await builder(setStatus)
      setResult(value)
      setStatus('success')
      return value
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      setError(e)
      setStatus('error')
      throw e
    }
  }, [builder])

  const reset = useCallback(() => {
    setStatus('idle')
    setResult(null)
    setError(null)
  }, [])

  return { execute, reset, status, result, error }
}
