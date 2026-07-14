import type { Feature, Monster } from '../../api/types'
import { DiceText } from '../../components/DiceText'
import {
  describeFeature,
  formatAc,
  formatCr,
  formatDamageList,
  formatHp,
  formatSavingThrows,
  formatSenses,
  formatSkills,
  formatSpeed,
  getAbilityScores,
  formatModifier,
  identityLine,
} from './monsterModel'
import './MonsterStatBlock.css'

interface MonsterStatBlockProps {
  monster: Monster
}

function RegionHeading({ children }: { children: string }) {
  return <h4 className="monster-stat-block-region-heading">{children}</h4>
}

function SectionHeading({ children }: { children: string }) {
  return <h5 className="monster-stat-block-section-heading">{children}</h5>
}

function FeatureBlock({ feature }: { feature: Feature }) {
  return (
    <p className="monster-stat-block-feature">
      <DiceText text={describeFeature(feature)} />
    </p>
  )
}

export function MonsterStatBlock({ monster }: MonsterStatBlockProps) {
  const abilityScores = getAbilityScores(monster)
  const saves = formatSavingThrows(monster)
  const skills = formatSkills(monster)
  const identity = identityLine(monster)
  const ac = formatAc(monster)
  const hp = formatHp(monster)
  const speed = formatSpeed(monster)
  const senses = formatSenses(monster)
  const resist = formatDamageList(monster.damage_resistances)
  const immune = formatDamageList(monster.damage_immunities)
  const vulnerable = formatDamageList(monster.damage_vulnerabilities)
  const condImmune = monster.condition_immunities.length ? monster.condition_immunities.join(', ') : null
  const cr = formatCr(monster)
  const hasActions = monster.features.actions.length > 0 || monster.features.bonus_actions.length > 0 || monster.features.reactions.length > 0 || monster.features.legendary_actions.length > 0 || monster.features.mythic_actions.length > 0 || monster.features.spellcasting.length > 0
  const hasLore = monster.features.traits.length > 0 || monster.languages.length > 0 || monster.audio_path

  return (
    <article className="monster-stat-block" data-variant="monster" data-testid="monster-stat-block">
      <section className="monster-stat-block-region" data-region="identity">
        <h3 className="monster-stat-block-name">{monster.name}</h3>
        {identity && <p className="monster-stat-block-identity-line">{identity}</p>}
        {cr && <p className="monster-stat-block-cr">{cr}</p>}
      </section>

      {(ac || hp || speed) && (
        <div className="monster-stat-block-strip">
          {ac && (
            <div className="monster-stat-block-strip-item">
              <span className="monster-stat-block-strip-label">AC</span>
              <span className="monster-stat-block-strip-value">{ac}</span>
            </div>
          )}
          {hp && (
            <div className="monster-stat-block-strip-item">
              <span className="monster-stat-block-strip-label">HP</span>
              <span className="monster-stat-block-strip-value">{hp}</span>
            </div>
          )}
          {speed && (
            <div className="monster-stat-block-strip-item monster-stat-block-strip-wide">
              <span className="monster-stat-block-strip-label">Speed</span>
              <span className="monster-stat-block-strip-value">{speed}</span>
            </div>
          )}
        </div>
      )}

      {(resist || immune || vulnerable || condImmune || senses) && (
        <>
          <div className="monster-stat-block-rule" aria-hidden />
          <section className="monster-stat-block-region" data-region="defenses">
            <RegionHeading>Defenses</RegionHeading>
            {resist && (
              <div className="monster-stat-block-def-row">
                <span className="monster-stat-block-def-label">Damage Resistances</span>
                <span className="monster-stat-block-def-value">{resist}</span>
              </div>
            )}
            {immune && (
              <div className="monster-stat-block-def-row">
                <span className="monster-stat-block-def-label">Damage Immunities</span>
                <span className="monster-stat-block-def-value">{immune}</span>
              </div>
            )}
            {vulnerable && (
              <div className="monster-stat-block-def-row">
                <span className="monster-stat-block-def-label">Damage Vulnerabilities</span>
                <span className="monster-stat-block-def-value">{vulnerable}</span>
              </div>
            )}
            {condImmune && (
              <div className="monster-stat-block-def-row">
                <span className="monster-stat-block-def-label">Condition Immunities</span>
                <span className="monster-stat-block-def-value">{condImmune}</span>
              </div>
            )}
            {senses && (
              <div className="monster-stat-block-def-row">
                <span className="monster-stat-block-def-label">Senses</span>
                <span className="monster-stat-block-def-value">{senses}</span>
              </div>
            )}
          </section>
        </>
      )}

      {(abilityScores.length > 0 || saves.length > 0 || skills.length > 0) && (
        <>
          <div className="monster-stat-block-rule" aria-hidden />
          <section className="monster-stat-block-region" data-region="abilities">
            <RegionHeading>Abilities</RegionHeading>
            {abilityScores.length > 0 && (
              <div className="monster-stat-block-abilities" role="group" aria-label="Ability scores">
                {abilityScores.map((ability) => (
                  <div className="monster-stat-block-ability" key={ability.key}>
                    <span className="monster-stat-block-ability-key">{ability.key}</span>
                    <span className="monster-stat-block-ability-score">{ability.score}</span>
                    <span className="monster-stat-block-ability-mod">{formatModifier(ability.modifier)}</span>
                  </div>
                ))}
              </div>
            )}
            {saves.length > 0 && (
              <p className="monster-stat-block-saves-skills">
                <span className="monster-stat-block-section-label">Saving Throws </span>
                {saves.map((entry) => `${entry.label} ${entry.value}`).join(', ')}
              </p>
            )}
            {skills.length > 0 && (
              <p className="monster-stat-block-saves-skills">
                <span className="monster-stat-block-section-label">Skills </span>
                {skills.map((entry) => `${entry.label} ${entry.value}`).join(', ')}
              </p>
            )}
          </section>
        </>
      )}

      {hasActions && (
        <>
          <div className="monster-stat-block-rule" aria-hidden />
          <section className="monster-stat-block-region" data-region="actions">
            <RegionHeading>Actions</RegionHeading>
            {monster.features.spellcasting.map((block, i) => (
              <div key={i} className="monster-stat-block-spellcasting">
                <SectionHeading>{block.name}</SectionHeading>
                {block.description && <p><DiceText text={block.description} /></p>}
                {block.groups.map((group, gi) => (
                  <p key={gi}>
                    <span className="monster-stat-block-spell-label">{group.label}: </span>
                    {group.spells.map((s) => s.name).join(', ')}
                  </p>
                ))}
                {block.footer && <p><DiceText text={block.footer} /></p>}
              </div>
            ))}
            {monster.features.actions.length > 0 && <SectionHeading>Attacks & Actions</SectionHeading>}
            {monster.features.reaction_intro && <p><DiceText text={monster.features.reaction_intro} /></p>}
            {monster.features.actions.map((action, i) => <FeatureBlock key={`action-${i}`} feature={action} />)}
            {monster.features.bonus_actions.length > 0 && <SectionHeading>Bonus Actions</SectionHeading>}
            {monster.features.bonus_actions.map((action, i) => <FeatureBlock key={`bonus-${i}`} feature={action} />)}
            {monster.features.reactions.length > 0 && <SectionHeading>Reactions</SectionHeading>}
            {monster.features.reactions.map((action, i) => <FeatureBlock key={`reaction-${i}`} feature={action} />)}
            {(monster.features.legendary_actions.length > 0 || monster.features.legendary_intro || monster.features.legendary_actions_per_round != null) && (
              <SectionHeading>Legendary Actions</SectionHeading>
            )}
            {monster.features.legendary_intro && <p><DiceText text={monster.features.legendary_intro} /></p>}
            {monster.features.legendary_actions_per_round != null && (
              <p className="monster-stat-block-legendary-note">
                Legendary actions per round: {monster.features.legendary_actions_per_round}
              </p>
            )}
            {monster.features.legendary_actions.map((action, i) => <FeatureBlock key={`legendary-${i}`} feature={action} />)}
            {monster.features.mythic_actions.length > 0 && <SectionHeading>Mythic Actions</SectionHeading>}
            {monster.features.mythic_actions.map((action, i) => <FeatureBlock key={`mythic-${i}`} feature={action} />)}
          </section>
        </>
      )}

      {hasLore && (
        <>
          <div className="monster-stat-block-rule" aria-hidden />
          <section className="monster-stat-block-region" data-region="lore">
            <RegionHeading>Lore</RegionHeading>
            {monster.features.traits.map((trait, i) => <FeatureBlock key={`trait-${i}`} feature={trait} />)}
            {monster.languages.length > 0 && (
              <p className="monster-stat-block-def-row">
                <span className="monster-stat-block-def-label">Languages</span>
                <span className="monster-stat-block-def-value">{monster.languages.join(', ')}</span>
              </p>
            )}
            {monster.audio_path && (
              <p className="monster-stat-block-audio">Audio: {monster.audio_path}</p>
            )}
          </section>
        </>
      )}
    </article>
  )
}
