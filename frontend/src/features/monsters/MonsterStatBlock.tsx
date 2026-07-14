import type { Monster } from '../../api/types'
import './MonsterStatBlock.css'

interface MonsterStatBlockProps {
  monster: Monster // eslint-disable-line @typescript-eslint/no-unused-vars
}

export function MonsterStatBlock(_props: MonsterStatBlockProps) {
  return (
    <article className="monster-stat-block" data-variant="monster" data-testid="monster-stat-block">
      <section className="monster-stat-block-region" data-region="identity">
        <h3 className="monster-stat-block-heading">Identity</h3>
      </section>

      <div className="monster-stat-block-rule" aria-hidden />

      <section className="monster-stat-block-region" data-region="defenses">
        <h3 className="monster-stat-block-heading">Defenses</h3>
      </section>

      <div className="monster-stat-block-rule" aria-hidden />

      <section className="monster-stat-block-region" data-region="abilities">
        <h3 className="monster-stat-block-heading">Abilities</h3>
      </section>

      <div className="monster-stat-block-rule" aria-hidden />

      <section className="monster-stat-block-region" data-region="actions">
        <h3 className="monster-stat-block-heading">Actions</h3>
      </section>

      <div className="monster-stat-block-rule" aria-hidden />

      <section className="monster-stat-block-region" data-region="lore">
        <h3 className="monster-stat-block-heading">Lore</h3>
      </section>
    </article>
  )
}
