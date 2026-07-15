interface MapLabRouteStateProps {
  title: string
  message: string
  className?: string
}

export function MapLabRouteState({ title, message, className }: MapLabRouteStateProps) {
  return (
    <div className={className}>
      <h1 className="maplab-title">{title}</h1>
      <p className="maplab-subtitle">{message}</p>
    </div>
  )
}
