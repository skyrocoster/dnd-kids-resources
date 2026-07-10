import { useState } from 'react'
import { Card } from '../components/Card'
import { DiceText } from '../components/DiceText'
import { CheckboxField } from '../components/form/CheckboxField'
import { MultiSelectField } from '../components/form/MultiSelectField'
import { SelectField } from '../components/form/SelectField'
import { TextField } from '../components/form/TextField'
import { SearchList } from '../components/SearchList'
import { SplitPane } from '../components/SplitPane'

const spells = [
  { id: 1, name: 'Fireball', level: '3rd', text: 'A bright streak flashes, dealing 8d6 fire damage.' },
  { id: 2, name: 'Magic Missile', level: '1st', text: 'Three darts, each dealing 1d4+1 force damage.' },
  { id: 3, name: 'Cure Wounds', level: '1st', text: 'A creature regains 1d8+3 hit points.' },
]

export function ComponentDemoPage() {
  const [selectedId, setSelectedId] = useState<number>(spells[0].id)
  const [classes, setClasses] = useState<string[]>(['wizard'])
  const selected = spells.find((s) => s.id === selectedId)!

  return (
    <div>
      <h2>Component demo</h2>
      <p>Scratch route for reviewing Task 8 shared components in isolation. Not part of the shipped nav.</p>

      <section style={{ height: 280, marginBottom: '2rem' }}>
        <SplitPane
          leftLabel="spell list"
          left={
            <SearchList
              items={spells}
              getId={(s) => s.id}
              getLabel={(s) => s.name}
              getMeta={(s) => s.level}
              selectedId={selectedId}
              onSelect={(s) => setSelectedId(s.id)}
              variant="spell"
              searchPlaceholder="Search spells…"
            />
          }
          right={
            <div style={{ padding: '1rem' }}>
              <Card title={selected.name} subtitle={`${selected.level}-level`} tag="Evocation" variant="spell">
                <DiceText text={selected.text} />
              </Card>
            </div>
          }
        />
      </section>

      <section style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <Card title="Owlbear" subtitle="Large monstrosity" tag="CR 3" variant="monster">
          <DiceText text="Beak attack: 1d10+5 piercing damage." />
        </Card>
        <Card title="Longsword" subtitle="Martial melee weapon" tag="Rare" variant="weapon">
          <DiceText text="Deals 1d8 slashing damage, or 1d10 when used with two hands." />
        </Card>
      </section>

      <section style={{ maxWidth: 420 }}>
        <h3>Form primitives</h3>
        <TextField label="Spell name" value={selected.name} onChange={() => {}} />
        <TextField label="Description" multiline value={selected.text} onChange={() => {}} />
        <SelectField
          label="School"
          value="evocation"
          onChange={() => {}}
          options={[
            { value: 'evocation', label: 'Evocation' },
            { value: 'necromancy', label: 'Necromancy' },
          ]}
        />
        <CheckboxField label="Concentration" checked={false} onChange={() => {}} />
        <MultiSelectField
          label="Classes"
          options={[
            { value: 'wizard', label: 'Wizard' },
            { value: 'sorcerer', label: 'Sorcerer' },
            { value: 'cleric', label: 'Cleric' },
          ]}
          selected={classes}
          onChange={setClasses}
        />
      </section>
    </div>
  )
}
