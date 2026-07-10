interface StubPageProps {
  title: string
}

export function StubPage({ title }: StubPageProps) {
  return (
    <div>
      <h2>{title}</h2>
      <p>Not built yet.</p>
    </div>
  )
}
