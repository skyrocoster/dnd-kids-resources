import { useLoomThreads } from './loomThreadsContext'

/** One small dot per thread membership — never the sole cue for thread identity
 * (edges and node color carry it too), so color-blind users aren't stuck on hue alone. */
export function ThreadChips({ threadIds }: { threadIds: number[] }) {
  const threads = useLoomThreads()
  if (threadIds.length === 0) return null
  const byId = new Map(threads.map((thread) => [thread.id, thread]))

  return (
    <div className="loom-thread-chips" aria-hidden="true">
      {threadIds.map((id) => {
        const thread = byId.get(id)
        if (!thread) return null
        return (
          <span
            key={id}
            className="loom-thread-chip"
            style={{ backgroundColor: `var(--md-${thread.color})` }}
            title={thread.name}
          />
        )
      })}
    </div>
  )
}
