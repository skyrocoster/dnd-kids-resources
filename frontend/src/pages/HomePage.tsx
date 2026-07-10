import { useEffect, useState } from 'react'
import { getAbilities } from '../api/client'
import type { Ability } from '../api/types'

export function HomePage() {
  const [abilities, setAbilities] = useState<Ability[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getAbilities()
      .then(setAbilities)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
  }, [])

  return (
    <div>
      <h2>Welcome</h2>
      <p>Pick a section from the left, or use this as a proof the API connection works.</p>
      {error && <p style={{ color: 'crimson' }}>API error: {error}</p>}
      {!error && !abilities && <p>Loading abilities from the API…</p>}
      {abilities && (
        <ul>
          {abilities.map((a) => (
            <li key={a.id}>{a.name}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
