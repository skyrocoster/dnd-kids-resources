import './DiceText.css'

interface DiceTextProps {
  text: string
  role?: string // TODO(X2): role-aware chip inherits surrounding variant color
}

const DICE_PATTERN = /\b\d+d\d+(?:\s*[+-]\s*\d+)?\b/gi

/**
 * Renders inline prose, wrapping dice notation (e.g. "2d6+3") in the
 * gold monospace pill — the app's one signature motif, since dice
 * notation is the thing spells, monsters, and weapons all share.
 *
 * TODO(X2): redesign into role-aware rollable-die chip.
 */
export function DiceText({ text }: DiceTextProps) {
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  DICE_PATTERN.lastIndex = 0

  while ((match = DICE_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    parts.push(
      <span className="dice-pill" key={`${match.index}-${match[0]}`}>
        {match[0].replace(/\s+/g, '')}
      </span>,
    )
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return <span className="dice-text">{parts}</span>
}
