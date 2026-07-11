import type { Quest, QuestInput } from '../../api/types'

export interface QuestFormState {
  title: string
  summary: string
  rewardText: string
  objectivesText: string
  detailsText: string
  questGiver: string
  dungeonId: string
  location: string
}

function linesToList(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

export function emptyQuestForm(): QuestFormState {
  return {
    title: '',
    summary: '',
    rewardText: '',
    objectivesText: '',
    detailsText: '',
    questGiver: '',
    dungeonId: '',
    location: '',
  }
}

export function questToFormState(quest: Quest): QuestFormState {
  return {
    title: quest.title || '',
    summary: quest.summary || '',
    rewardText: (quest.reward || []).join('\n'),
    objectivesText: (quest.objectives || []).join('\n'),
    detailsText: (quest.details || []).join('\n'),
    questGiver: quest.quest_giver != null ? String(quest.quest_giver) : '',
    dungeonId: quest.dungeon_id != null ? String(quest.dungeon_id) : '',
    location: quest.location || '',
  }
}

export function formStateToQuestInput(form: QuestFormState): QuestInput {
  return {
    title: form.title,
    summary: form.summary || null,
    reward: form.rewardText ? linesToList(form.rewardText) : null,
    objectives: form.objectivesText ? linesToList(form.objectivesText) : null,
    details: form.detailsText ? linesToList(form.detailsText) : null,
    quest_giver: form.questGiver ? Number(form.questGiver) : null,
    dungeon_id: form.dungeonId ? Number(form.dungeonId) : null,
    location: form.location || null,
  }
}
