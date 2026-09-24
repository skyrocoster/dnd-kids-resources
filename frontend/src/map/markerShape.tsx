import type { ComponentType, CSSProperties, ReactNode } from "react";

interface MarkerHitAreaProps {
  className: string;
  dataState?: string;
  selected?: boolean;
  ariaPressed?: boolean;
  label?: string;
  title: string;
  interactive?: boolean;
  stopPropagation?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onClick?: () => void;
  onContextMenu?: () => void;
  children: ReactNode;
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
  onContextMenu,
  children,
}: MarkerHitAreaProps) {
  return (
    <g
      className={className}
      data-state={dataState}
      data-selected={selected || undefined}
      role={interactive ? "button" : undefined}
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
              if (stopPropagation) event.stopPropagation();
              onClick?.();
            }
          : undefined
      }
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey)) {
                event.preventDefault();
                onContextMenu?.();
                return;
              }
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      onContextMenu={
        interactive
          ? (event) => {
              event.preventDefault();
              onContextMenu?.();
            }
          : undefined
      }
    >
      <title>{title}</title>
      {children}
    </g>
  );
}

interface MarkerGlyphProps {
  icon: ComponentType<{
    width: number;
    height: number;
    className?: string;
    style?: CSSProperties;
  }>;
  cx: number;
  cy: number;
  size: number;
  colorToken: string;
  className?: string;
  simplified?: boolean;
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
  if (simplified) return null;
  return (
    <g transform={`translate(${cx - size / 2}, ${cy - size / 2})`}>
      <Icon
        width={size}
        height={size}
        className={className}
        style={{ color: `var(${colorToken})` }}
      />
    </g>
  );
}
