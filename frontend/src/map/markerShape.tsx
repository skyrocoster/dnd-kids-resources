import { type ComponentType, type CSSProperties, type ReactNode } from 'react'
import {
  GROUPED_MARKER_RADIUS_FRACTION,
  MARKER_RADIUS_FRACTION,
  WALL_PROP_ICON_SCALE,
  WALL_PROP_RADIUS_FRACTION,
  doorWallSegment,
  type CardinalSide,
  type MapCell,
} from '../model/maplabModel'

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

export interface MarkerGeometry {
  cx: number
  cy: number
  radius: number
  iconSize: number
}

export function onSquareMarkerGeometry(
  cell: MapCell,
  cellSize: number,
  options?: { offset?: { dx: number; dy: number }; grouped?: boolean },
): MarkerGeometry {
  const offset = options?.offset
  const grouped = options?.grouped

  const cx = (cell[0] + 0.5 + (offset?.dx ?? 0)) * cellSize
  const cy = (cell[1] + 0.5 + (offset?.dy ?? 0)) * cellSize
  const radius = grouped
    ? cellSize * GROUPED_MARKER_RADIUS_FRACTION
    : cellSize * MARKER_RADIUS_FRACTION
  const iconSize = grouped
    ? cellSize * GROUPED_MARKER_RADIUS_FRACTION * 1.1
    : cellSize * 0.34

  return { cx, cy, radius, iconSize }
}

export function wallAttachedMarkerGeometry(
  cell: MapCell,
  side: CardinalSide,
  cellSize: number,
): MarkerGeometry {
  const segment = doorWallSegment({ cell, side }, cellSize)
  const cx = (segment.x1 + segment.x2) / 2
  const cy = (segment.y1 + segment.y2) / 2
  const radius = cellSize * WALL_PROP_RADIUS_FRACTION
  const iconSize = cellSize * WALL_PROP_ICON_SCALE
  return { cx, cy, radius, iconSize }
}

// ---------------------------------------------------------------------------
// Hit area wrapper
// ---------------------------------------------------------------------------

interface MarkerHitAreaProps {
  className: string
  dataState?: string
  selected?: boolean
  ariaPressed?: boolean
  label?: string
  title: string
  interactive?: boolean
  stopPropagation?: boolean
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  onFocus?: () => void
  onBlur?: () => void
  onClick?: () => void
  children: ReactNode
}

export function MarkerHitArea({
  className,
  dataState,
  selected,
  ariaPressed,
  label,
  title,
  interactive = true,
  stopPropagation = false,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  onClick,
  children,
}: MarkerHitAreaProps) {
  return (
    <g
      className={className}
      data-state={dataState}
      data-selected={selected || undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-pressed={interactive ? ariaPressed : undefined}
      aria-label={interactive ? label : undefined}
      onMouseEnter={interactive ? onMouseEnter : undefined}
      onMouseLeave={interactive ? onMouseLeave : undefined}
      onFocus={interactive ? onFocus : undefined}
      onBlur={interactive ? onBlur : undefined}
      onClick={
        interactive
          ? (event) => {
              if (stopPropagation) event.stopPropagation()
              onClick?.()
            }
          : undefined
      }
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onClick?.()
              }
            }
          : undefined
      }
    >
      <title>{title}</title>
      {children}
    </g>
  )
}

// ---------------------------------------------------------------------------
// Simplified-gated glyph
// ---------------------------------------------------------------------------

interface MarkerGlyphProps {
  icon: ComponentType<{
    width: number
    height: number
    className?: string
    style?: CSSProperties
  }>
  cx: number
  cy: number
  size: number
  colorToken: string
  className?: string
  simplified?: boolean
}

export function MarkerGlyph({
  icon: Icon,
  cx,
  cy,
  size,
  colorToken,
  className,
  simplified,
}: MarkerGlyphProps) {
  if (simplified) return null
  return (
    <g transform={`translate(${cx - size / 2}, ${cy - size / 2})`}>
      <Icon
        width={size}
        height={size}
        className={className}
        style={{ color: `var(${colorToken})` }}
      />
    </g>
  )
}

// ---------------------------------------------------------------------------
// Kid marker family / icon lookup
// ---------------------------------------------------------------------------

import {
  DoorOpen as DoorOpenIcon,
  ArrowUpToLine as StairsUpIcon,
  ArrowDownToLine as StairsDownIcon,
  Sparkles as PortalIcon,
  Box as PropChestIcon,
  Table2 as PropTableIcon,
  Frame as PropMirrorIcon,
  Barrel as PropBarrelIcon,
  Landmark as PropStatueIcon,
  Layers as PropWindowIcon,
  Package as PropIcon,
  User as UserIcon,
} from 'lucide-react'

/** Disc-family for a kid-visible marker. */
export type MarkerFamily = 'transition' | 'opening' | 'fixture' | 'person'

/** Stair direction shown as an up/down chevron. */
export type StairDirection = 'up' | 'down'

/** Every kid-visible marker kind that can appear on the player map. */
export type KidMarkerKind =
  | { kind: 'stair'; stairDir: StairDirection }
  | { kind: 'portal' }
  | { kind: 'door' }
  | { kind: 'window' }
  | { kind: 'chest' }
  | { kind: 'table' }
  | { kind: 'mirror' }
  | { kind: 'barrel' }
  | { kind: 'statue' }
  | { kind: 'other' }
  | { kind: 'npc' }

const FAMILY_TOKENS: Record<MarkerFamily, { fill: string; on: string }> = {
  transition: { fill: '--kid-transition', on: '--kid-on-transition' },
  opening: { fill: '--kid-opening', on: '--kid-on-opening' },
  fixture: { fill: '--kid-fixture', on: '--kid-on-fixture' },
  person: { fill: '--kid-people', on: '--kid-on-people' },
}

/** Resolve the disc family for a marker kind. */
export function kidMarkerFamily(kind: KidMarkerKind): MarkerFamily {
  switch (kind.kind) {
    case 'stair':
    case 'portal':
      return 'transition'
    case 'door':
    case 'window':
      return 'opening'
    case 'chest':
    case 'table':
    case 'mirror':
    case 'barrel':
    case 'statue':
    case 'other':
      return 'fixture'
    case 'npc':
      return 'person'
  }
}

/** CSS custom-property token pair for a marker family. */
export function kidFamilyTokens(family: MarkerFamily): { fill: string; on: string } {
  return FAMILY_TOKENS[family]
}

/** Icon component for a marker kind. */
export function kidMarkerIcon(
  kind: KidMarkerKind,
): ComponentType<{ width: number; height: number; className?: string; style?: CSSProperties }> {
  switch (kind.kind) {
    case 'stair':
      return kind.stairDir === 'up' ? StairsUpIcon : StairsDownIcon
    case 'portal':
      return PortalIcon
    case 'door':
      return DoorOpenIcon
    case 'window':
      return PropWindowIcon
    case 'chest':
      return PropChestIcon
    case 'table':
      return PropTableIcon
    case 'mirror':
      return PropMirrorIcon
    case 'barrel':
      return PropBarrelIcon
    case 'statue':
      return PropStatueIcon
    case 'other':
      return PropIcon
    case 'npc':
      return UserIcon
  }
}

/** Convenience: CSS `--kid-on-*` token for a marker kind's glyph colour. */
export function kidGlyphColorToken(kind: KidMarkerKind): string {
  return FAMILY_TOKENS[kidMarkerFamily(kind)].on
}
