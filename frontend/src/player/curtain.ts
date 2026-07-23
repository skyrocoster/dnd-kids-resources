/**
 * Player-view transform ("the curtain").
 *
 * Takes the full dungeon layout plus party knowledge and returns the kid-visible subset.
 * Currently a pass-through: output equals input. Plan 1 (fog/war) will make it filter
 * by revealed cells and session state.
 */
import type { MapLayout } from '../model/maplabModel'

export function playerViewTransform(layout: MapLayout): MapLayout {
  return layout
}
