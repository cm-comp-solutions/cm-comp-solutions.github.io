type Reply = { id: number; result?: unknown; error?: string }
type Pending = { resolve: (result: unknown) => void; reject: (error: Error) => void }
let worker: Worker | undefined
let nextId = 0
const pending = new Map<number, Pending>()

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('./database.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (event: MessageEvent<Reply>) => {
      const message = event.data
      const request = pending.get(message.id)
      if (!request) return
      pending.delete(message.id)
      if (message.error) request.reject(new Error(message.error))
      else request.resolve(message.result)
    }
    worker.onerror = () => {
      for (const request of pending.values()) request.reject(new Error('Não foi possível iniciar a consulta dos dados.'))
      pending.clear()
      worker?.terminate()
      worker = undefined
    }
  }
  return worker
}

export function queryDatabase<T>(route: string, params: URLSearchParams, signal?: AbortSignal): Promise<T> {
  if (signal?.aborted) return Promise.reject(new DOMException('Consulta cancelada', 'AbortError'))
  const id = ++nextId
  return new Promise<T>((resolve, reject) => {
    const cancel = () => { pending.delete(id); reject(new DOMException('Consulta cancelada', 'AbortError')) }
    signal?.addEventListener('abort', cancel, { once: true })
    pending.set(id, {
      resolve: result => { signal?.removeEventListener('abort', cancel); resolve(result as T) },
      reject: error => { signal?.removeEventListener('abort', cancel); reject(error) },
    })
    getWorker().postMessage({ id, route, params: params.toString() })
  })
}
