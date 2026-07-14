import { DiceIcon } from './icons'
import './DiceText.css'

interface DiceTextProps {
  text: string
  role?: string
}

const DICE_PATTERN = /\b\d+d\d+(?:\s*[+-]\s*\d+)?\b/gi

export function DiceText({ text, role }: DiceTextProps) {
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
        <DiceIcon />
        {match[0].replace(/\s+/g, '')}
      </span>,
    )
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return <span className="dice-text" {...(role ? { 'data-variant': role } : {})}>{parts}</span>
}
