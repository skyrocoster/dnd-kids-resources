import { describe, expect, it } from 'vitest'
import type { Quest } from '../../../api/types'
import { emptyQuestForm, formStateToQuestInput, questToFormState } from '../questForm'

const baseQuest: Quest = {
  id: 1,
  title: 'Lost Puppy',
  summary: 'A puppy went missing.',
  reward: ['5 gp', 'a pie'],
  objectives: ['Find the puppy', 'Return it'],
  details: ['The puppy is muddy.'],
  quest_giver: 1,
  dungeon_id: null,
  location: 'Village',
}

describe('questToFormState', () => {
  it('flattens list columns into newline-separated text', () => {
    const form = questToFormState(baseQuest)
    expect(form.title).toBe('Lost Puppy')
    expect(form.rewardText).toBe('5 gp\na pie')
    expect(form.objectivesText).toBe('Find the puppy\nReturn it')
    expect(form.questGiver).toBe('1')
    expect(form.dungeonId).toBe('')
  })
})

describe('formStateToQuestInput', () => {
  it('round-trips a quest form back into API-shaped input', () => {
    const input = formStateToQuestInput(questToFormState(baseQuest))
    expect(input.reward).toEqual(['5 gp', 'a pie'])
    expect(input.objectives).toEqual(['Find the puppy', 'Return it'])
    expect(input.quest_giver).toBe(1)
    expect(input.dungeon_id).toBeNull()
  })

  it('nulls out empty structured fields for a blank form', () => {
    const input = formStateToQuestInput(emptyQuestForm())
    expect(input.reward).toBeNull()
    expect(input.objectives).toBeNull()
    expect(input.quest_giver).toBeNull()
  })
})
