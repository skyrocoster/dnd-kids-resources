import type { Player, PlayerInput } from '../../api/types'

export interface PlayerFormState {
  name: string
  class_: string
  level: string
}

export function emptyPlayerForm(): PlayerFormState {
  return { name: '', class_: '', level: '' }
}

export function playerToFormState(player: Player): PlayerFormState {
  return {
    name: player.name || '',
    class_: player.class_ || '',
    level: player.level != null ? String(player.level) : '',
  }
}

export function formStateToPlayerInput(form: PlayerFormState): PlayerInput {
  return {
    name: form.name,
    class_: form.class_ || null,
    level: form.level ? Number(form.level) : null,
  }
}
