import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { CONTRAST_PAIRS, contrastRatio, parseHex, type ContrastPair } from './contrast'
import { TOKEN_GROUPS, tokensInGroup, type Token, type TokenGroup } from './tokens'

/*
 * Foundations/Tokens. Renders from the TOKENS manifest; every value shown is
 * read back with getComputedStyle from hidden probe elements, so the page shows
 * what the CSS actually resolves, not what the manifest claims.
 */

type Theme = 'light' | 'dark'
type Density = 'comfortable' | 'compact'
type Values = Record<string, string>
const THEMES: Theme[] = ['light', 'dark']

/** A value column: tokens resolved under one theme, or under one density. */
interface Column {
  label: string
  values: Values
  theme?: Theme
  density?: Density
}

const TYPE_STEPS = ['xs', 'sm', 'base', 'md', 'lg', 'xl', '2xl', 'display-sm', 'display'] as const
const WEIGHTS = ['regular', 'medium', 'semibold'] as const

function readValues(element: HTMLElement): Values {
  const style = getComputedStyle(element)
  const values: Values = {}
  for (const group of TOKEN_GROUPS) {
    for (const { name } of tokensInGroup(group)) {
      values[name] = style.getPropertyValue(name).replace(/\s+/g, ' ').trim()
    }
  }
  return values
}

function ratioFor(values: Values, pair: ContrastPair): number | null {
  const fg = values[pair.fg]
  const bg = values[pair.bg]
  if (!fg || !bg || !parseHex(fg) || !parseHex(bg)) return null
  return contrastRatio(fg, bg)
}

const formatValue = (value: string) =>
  /^#[0-9a-f]{3,6}$/i.test(value) ? value.toUpperCase() : value

/** A themed panel: everything inside resolves against `theme`. */
function Themed({ theme, children }: { theme: Theme; children: ReactNode }) {
  return (
    <div data-theme={theme} className="h-full rounded-md bg-surface p-3 text-fg">
      {children}
    </div>
  )
}

function Badge({ pass }: { pass: boolean }) {
  return (
    <span
      className={
        pass
          ? 'rounded-pill bg-status-success-subtle px-2 text-xs font-medium text-status-success-fg'
          : 'rounded-pill bg-status-danger-subtle px-2 text-xs font-medium text-status-danger-fg'
      }
    >
      {pass ? 'Pass' : 'Fail'}
    </span>
  )
}

function ContrastSample({ pair, ratio }: { pair: ContrastPair; ratio: number | null }) {
  const sample =
    pair.kind === 'graphic' ? (
      <span className="block size-4 rounded-pill" style={{ background: `var(${pair.fg})` }} />
    ) : (
      <span
        style={{
          color: `var(${pair.fg})`,
          fontSize: pair.kind === 'large-text' ? 'var(--font-size-2xl)' : undefined,
          lineHeight: pair.kind === 'large-text' ? 'var(--line-height-2xl)' : undefined,
        }}
      >
        Aa
      </span>
    )
  return (
    <li className="flex items-center gap-2">
      <span
        className="grid h-10 min-w-12 place-items-center rounded-sm px-2"
        style={{ background: `var(${pair.bg})`, boxShadow: 'inset 0 0 0 1px var(--color-border)' }}
      >
        {sample}
      </span>
      <span className="text-xs text-fg-muted">
        on {pair.bg.replace('--color-', '')}
        <br />
        <span className="text-fg tabular">
          {ratio === null ? '—' : `${ratio.toFixed(2)}:1`}
        </span> ≥ {pair.min}
      </span>
      {ratio === null ? null : <Badge pass={ratio >= pair.min} />}
    </li>
  )
}

/** The visual for one token in one theme. */
function TokenPreview({ token, values }: { token: Token; values: Values }) {
  const { name } = token
  const value = values[name] ?? ''
  let visual: ReactNode = null

  if (name.startsWith('--color-') || name.startsWith('--gradient-')) {
    visual = (
      <span
        className="block size-10 shrink-0 rounded-sm"
        style={{ background: `var(${name})`, boxShadow: 'inset 0 0 0 1px var(--color-border)' }}
      />
    )
  } else if (name.startsWith('--radius-')) {
    visual = (
      <span
        className="block h-10 w-16 shrink-0 bg-accent-subtle"
        style={{ borderRadius: `var(${name})`, boxShadow: 'inset 0 0 0 1px var(--color-accent)' }}
      />
    )
  } else if (name.startsWith('--shadow-')) {
    visual = (
      <span className="block rounded-md bg-canvas p-3">
        <span
          className="block h-8 w-16 rounded-sm bg-surface"
          style={{ boxShadow: `var(${name})` }}
        />
      </span>
    )
  } else if (
    name.startsWith('--space-') ||
    name.startsWith('--gap-') ||
    token.group === 'Density'
  ) {
    visual = (
      <span
        className="block h-2 shrink-0 rounded-pill bg-accent"
        style={{ width: `var(${name})` }}
      />
    )
  }

  const pairs = CONTRAST_PAIRS.filter((pair) => pair.fg === name)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        {visual}
        <code className="font-mono text-xs break-all text-fg-muted">
          {formatValue(value) || '—'}
        </code>
      </div>
      {pairs.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {pairs.map((pair) => (
            <ContrastSample key={pair.bg} pair={pair} ratio={ratioFor(values, pair)} />
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function ColumnCell({ column, token }: { column: Column; token: Token }) {
  const preview = <TokenPreview token={token} values={column.values} />
  if (column.theme) return <Themed theme={column.theme}>{preview}</Themed>
  return (
    <div data-density={column.density} className="h-full rounded-md bg-surface p-3">
      {preview}
    </div>
  )
}

function TokenTable({ group, columns }: { group: TokenGroup; columns: [Column, Column] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] table-fixed border-separate border-spacing-y-2 text-left">
        <thead>
          <tr className="text-xs text-fg-muted">
            <th scope="col" className="w-2/5 font-medium">
              Token
            </th>
            {columns.map((column) => (
              <th key={column.label} scope="col" className="font-medium">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tokensInGroup(group).map((token) => (
            <tr key={token.name} className="align-top">
              <th scope="row" className="pr-4 font-normal">
                <code className="font-mono text-sm font-medium">{token.name}</code>
                <p className="mt-1 text-fg-muted">{token.description}</p>
                {token.usage ? (
                  <p className="mt-1 text-xs text-fg-muted">
                    Use: <code className="font-mono">{token.usage}</code>
                  </p>
                ) : null}
              </th>
              {token.scope === 'theme' || group === 'Density' ? (
                columns.map((column) => (
                  <td key={column.label} className="pr-2">
                    <ColumnCell column={column} token={token} />
                  </td>
                ))
              ) : (
                <td colSpan={2} className="pr-2">
                  <div className="rounded-md bg-surface p-3">
                    <TokenPreview token={token} values={columns[0].values} />
                    <p className="mt-1 text-xs text-fg-muted">Same in both themes.</p>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const sizeStyle = (step: (typeof TYPE_STEPS)[number]): CSSProperties => ({
  fontSize: `var(--font-size-${step})`,
  lineHeight: `var(--line-height-${step})`,
  ...(step.startsWith('display')
    ? { fontWeight: 'var(--font-weight-regular)', letterSpacing: 'var(--letter-spacing-display)' }
    : {}),
})

function TypeScale({ values }: { values: Values }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg bg-surface p-card">
      <h3 className="font-semibold">Scale</h3>
      <ul className="flex flex-col gap-3">
        {TYPE_STEPS.map((step) => (
          <li key={step} className="flex items-baseline gap-4">
            <span className="w-40 shrink-0 text-xs text-fg-muted">
              text-{step}{' '}
              <span className="tabular">
                ({values[`--font-size-${step}`]} / {values[`--line-height-${step}`]})
              </span>
            </span>
            <span className="min-w-0 truncate tabular" style={sizeStyle(step)}>
              Revenue $48,210
            </span>
          </li>
        ))}
      </ul>
      <h3 className="mt-2 font-semibold">Weights</h3>
      <ul className="flex flex-wrap gap-6 text-md">
        {WEIGHTS.map((weight) => (
          <li key={weight} style={{ fontWeight: `var(--font-weight-${weight})` }}>
            {weight} {values[`--font-weight-${weight}`]}
          </li>
        ))}
      </ul>
    </div>
  )
}

function DensitySamples() {
  return (
    <div className="grid gap-grid md:grid-cols-2">
      {(['comfortable', 'compact'] as const).map((density) => (
        <div key={density} data-density={density} className="rounded-lg bg-surface p-card">
          <h3 className="font-semibold">data-density=&quot;{density}&quot;</h3>
          <div className="mt-3 overflow-hidden rounded-md">
            <div className="flex h-row items-center bg-surface-subtle px-4 text-xs text-fg-muted">
              Order · Customer · Amount
            </div>
            {['ORD-000123 · Ada Lovelace', 'ORD-000124 · Alan Turing'].map((row) => (
              <div key={row} className="flex h-row items-center justify-between px-4">
                <span>{row}</span>
                <span className="tabular">$1,240.00</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            {(['sm', 'md', 'lg'] as const).map((size) => (
              <span
                key={size}
                className="grid place-items-center rounded-pill bg-surface-muted px-4 text-sm font-medium"
                style={{ height: `var(--control-h-${size})` }}
              >
                control-{size}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function TokensPage() {
  const lightProbe = useRef<HTMLDivElement>(null)
  const darkProbe = useRef<HTMLDivElement>(null)
  const comfortableProbe = useRef<HTMLDivElement>(null)
  const compactProbe = useRef<HTMLDivElement>(null)
  const [values, setValues] = useState<Record<Theme | Density, Values> | null>(null)

  useLayoutEffect(() => {
    const probes = [lightProbe, darkProbe, comfortableProbe, compactProbe].map((ref) => ref.current)
    const [light, dark, comfortable, compact] = probes
    if (!light || !dark || !comfortable || !compact) return
    setValues({
      light: readValues(light),
      dark: readValues(dark),
      comfortable: readValues(comfortable),
      compact: readValues(compact),
    })
  }, [])

  const results = values
    ? THEMES.flatMap((theme) => CONTRAST_PAIRS.map((pair) => ratioFor(values[theme], pair)))
    : []
  const failing = results.filter(
    (ratio, index) => ratio === null || ratio < CONTRAST_PAIRS[index % CONTRAST_PAIRS.length]!.min,
  ).length

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <div ref={lightProbe} data-theme="light" hidden />
      <div ref={darkProbe} data-theme="dark" hidden />
      <div ref={comfortableProbe} data-density="comfortable" hidden />
      <div ref={compactProbe} data-density="compact" hidden />

      <header>
        <h1 className="text-display-sm">Tokens</h1>
        <p className="mt-2 max-w-2xl text-fg-muted">
          Rendered from the token manifest (src/tokens/tokens.ts). Values are read with
          getComputedStyle from a light and a dark container, so they show what tokens.css actually
          resolves. Contrast ratios use the WCAG formula; thresholds match the contrast guard test.
        </p>
        {values ? (
          <p className="mt-3 flex items-center gap-2" data-testid="contrast-summary">
            <Badge pass={failing === 0} />
            <span className="tabular">
              {results.length - failing} of {results.length} contrast checks pass (
              {CONTRAST_PAIRS.length} pairs × 2 themes)
            </span>
          </p>
        ) : null}
      </header>

      {values
        ? TOKEN_GROUPS.map((group) => (
            <section key={group} aria-labelledby={`group-${group}`} className="flex flex-col gap-3">
              <h2 id={`group-${group}`} className="text-xl font-semibold">
                {group}
              </h2>
              {group === 'Typography' ? <TypeScale values={values.light} /> : null}
              {group === 'Density' ? <DensitySamples /> : null}
              <TokenTable
                group={group}
                columns={
                  group === 'Density'
                    ? [
                        {
                          label: 'Comfortable',
                          values: values.comfortable,
                          density: 'comfortable',
                        },
                        { label: 'Compact', values: values.compact, density: 'compact' },
                      ]
                    : [
                        { label: 'Light', values: values.light, theme: 'light' },
                        { label: 'Dark', values: values.dark, theme: 'dark' },
                      ]
                }
              />
            </section>
          ))
        : null}
    </div>
  )
}
