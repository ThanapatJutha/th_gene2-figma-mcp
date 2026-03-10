type ToggleSwitchProps = {
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}

export default function ToggleSwitch({
  label,
  checked,
  onCheckedChange,
  disabled
}: ToggleSwitchProps) {
  const id = `toggle-${label.replace(/\s+/g, '-').toLowerCase()}`

  return (
    <div className={`toggle ${disabled ? 'is-disabled' : ''}`}>
      <label className="toggle-label" htmlFor={id}>
        {label}
      </label>
      <button
        id={id}
        type="button"
        className={`toggle-button ${checked ? 'is-on' : 'is-off'}`}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
      >
        <span className="toggle-thumb" />
      </button>
    </div>
  )
}
