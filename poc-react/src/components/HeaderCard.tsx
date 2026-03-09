type HeaderCardProps = {
  title: string
  subtitle?: string
}

export default function HeaderCard({ title, subtitle }: HeaderCardProps) {
  return (
    <header className="card header">
      <div>
        <h1>{title}</h1>
        {subtitle ? <p className="muted">{subtitle}</p> : null}
      </div>
      <a
        className="link"
        href="https://developers.figma.com/docs/figma-mcp-server/"
        target="_blank"
        rel="noreferrer"
      >
        Figma MCP docs
      </a>
    </header>
  )
}
