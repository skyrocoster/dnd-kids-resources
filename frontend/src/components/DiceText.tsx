import { DiceIcon } from "./icons";
import { GlossaryTerm } from "./GlossaryTerm";
import { matchGlossaryTerms, ruleGlossaryRegistry } from "./glossaryTerms";
import "./DiceText.css";

interface DiceTextProps {
  text: string;
  role?: string;
}

const DICE_PATTERN = /\b\d+d\d+(?:\s*[+-]\s*\d+)?\b/gi;

function renderGlossarySegment(segment: string, keyPrefix: string): React.ReactNode[] {
  const nodes = matchGlossaryTerms(segment, ruleGlossaryRegistry);
  return nodes.map((node, i) => {
    if (node.type === "text") {
      return node.text;
    }
    return (
      <GlossaryTerm key={`${keyPrefix}-${i}`} content={node.definition.definition}>
        {node.text}
      </GlossaryTerm>
    );
  });
}

export function DiceText({ text, role }: DiceTextProps) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  DICE_PATTERN.lastIndex = 0;

  while ((match = DICE_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const segment = text.slice(lastIndex, match.index);
      parts.push(...renderGlossarySegment(segment, `gs-${lastIndex}`));
    }
    parts.push(
      <span className="dice-pill" key={`${match.index}-${match[0]}`}>
        <DiceIcon />
        {match[0].replace(/\s+/g, "")}
      </span>,
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    const segment = text.slice(lastIndex);
    parts.push(...renderGlossarySegment(segment, `gs-${lastIndex}`));
  }

  return (
    <span className="dice-text" {...(role ? { "data-variant": role } : {})}>
      {parts}
    </span>
  );
}
