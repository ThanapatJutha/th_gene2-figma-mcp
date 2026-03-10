import { useMemo, useState } from 'react'

export default function CounterCard() {
  const [count, setCount] = useState(0)
  const parity = useMemo(() => (count % 2 === 0 ? 'even' : 'odd'), [count])

  return (
    <section className="card">
      <h2>Counter</h2>
      <p className="muted">Current value is {parity}.</p>
      <div className="row">
        <button type="button" onClick={() => setCount((c) => c - 1)}>
          -
        </button>
        <div className="pill" aria-label="count">
          {count}
        </div>
        <button type="button" onClick={() => setCount((c) => c + 1)}>
          +
        </button>
      </div>
    </section>
  )
}
