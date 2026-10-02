/**
 * Diagonal hatch fill for "previous period" / "pending" chart series, so a
 * secondary series differs by texture and not only by color.
 *
 * Render inside an <svg>'s <defs> and reference it by id:
 *
 *   <svg>
 *     <defs><HatchPattern id="hatch" /></defs>
 *     <rect fill="url(#hatch)" … />
 *   </svg>
 *
 * Ids must be unique per document (use React's useId() when rendering more
 * than one chart). Colors come from --color-chart-hatch-fg/-bg, so the
 * pattern follows the nearest [data-theme].
 */
export function HatchPattern({
  id,
  size = 6,
  strokeWidth = 2,
}: {
  id: string
  /** Distance between stripes, in px. */
  size?: number
  strokeWidth?: number
}) {
  return (
    <pattern
      id={id}
      width={size}
      height={size}
      patternUnits="userSpaceOnUse"
      patternTransform="rotate(45)"
    >
      <rect width={size} height={size} style={{ fill: 'var(--color-chart-hatch-bg)' }} />
      <line
        x1={size / 2}
        y1={0}
        x2={size / 2}
        y2={size}
        style={{ stroke: 'var(--color-chart-hatch-fg)', strokeWidth }}
      />
    </pattern>
  )
}
