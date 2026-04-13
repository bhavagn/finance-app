const CHEVRON = (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ pointerEvents: 'none', flexShrink: 0 }}>
    <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

// options: [{ value, label }]
// groupedOptions: [{ group, options: [{ value, label }] }]
export default function FilterSelect({ value, onChange, options, groupedOptions, placeholder }) {
  const isActive = Boolean(value)

  const style = {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    background: 'var(--bg-surface)',
    border: `0.5px solid ${isActive ? 'rgba(201,168,76,0.35)' : 'var(--border)'}`,
    borderRadius: 'var(--radius-md)',
    color: isActive ? 'var(--gold)' : 'var(--text-secondary)',
    cursor: 'pointer',
    transition: 'border-color 0.15s',
  }

  return (
    <div style={style}
      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)' }}
      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.borderColor = 'var(--border)' }}
    >
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          appearance: 'none',
          WebkitAppearance: 'none',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          padding: '6px 28px 6px 12px',
          fontSize: 12,
          fontFamily: 'var(--font-sans)',
          color: 'inherit',
          cursor: 'pointer',
          minWidth: 100,
        }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {groupedOptions
          ? groupedOptions.map((g) => (
              <optgroup key={g.group} label={g.group}>
                {g.options.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </optgroup>
            ))
          : options?.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))
        }
      </select>
      <span style={{ position: 'absolute', right: 8, color: 'inherit', display: 'flex', alignItems: 'center' }}>
        {CHEVRON}
      </span>
    </div>
  )
}
