export type RemoteStatus = 'idle' | 'loading' | 'success' | 'error'

interface RemoteIdle {
  status: 'idle'
}

interface RemoteLoading {
  status: 'loading'
}

interface RemoteSuccess<T> {
  status: 'success'
  data: T
}

interface RemoteError {
  status: 'error'
  error: string
}

export type RemoteState<T> = RemoteIdle | RemoteLoading | RemoteSuccess<T> | RemoteError

export function initialRemoteState<T>(): RemoteState<T> {
  return { status: 'idle' }
}

export function remoteLoading<T>(): RemoteState<T> {
  return { status: 'loading' }
}

export function remoteSuccess<T>(data: T): RemoteState<T> {
  return { status: 'success', data }
}

export function remoteError(error: string): RemoteState<never> {
  return { status: 'error', error }
}
