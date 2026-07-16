interface MapLabRouteStateProps {
  title: string
  message: string
  className?: string
  variant?: 'loading' | 'error' | 'idle'
}

export function MapLabRouteState({ title, message, className, variant = 'idle' }: MapLabRouteStateProps) {
  const role = variant === 'error' ? 'alert' : variant === 'loading' ? 'status' : undefined

  return (
    <div className={className} role={role}>
      <h1 className="maplab-title">{title}</h1>
      <p className="maplab-subtitle">{message}</p>
    </div>
  )
}
