import { CloseIcon } from '../../components/icons'
import './LoomEditor.css'

interface LoomErrorBannerProps {
  message: string
  onDismiss: () => void
}

export function LoomErrorBanner({ message, onDismiss }: LoomErrorBannerProps) {
  return (
    <div className="loom-error-banner" role="alert">
      <span>{message}</span>
      <button
        type="button"
        className="loom-error-banner-dismiss"
        onClick={onDismiss}
        aria-label="Dismiss error"
      >
        <CloseIcon width={16} height={16} aria-hidden="true" />
      </button>
    </div>
  )
}
