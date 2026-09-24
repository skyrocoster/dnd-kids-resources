import { CloseIcon } from '../../components/icons'
import { IconButton } from '../../components/IconButton'
import './LoomEditor.css'

interface LoomErrorBannerProps {
  message: string
  onDismiss: () => void
}

export function LoomErrorBanner({ message, onDismiss }: LoomErrorBannerProps) {
  return (
    <div className="loom-error-banner" role="alert">
      <span>{message}</span>
      <IconButton
        label="Dismiss error"
        className="loom-error-banner-dismiss"
        onClick={onDismiss}
      >
        <CloseIcon width={16} height={16} aria-hidden="true" />
      </IconButton>
    </div>
  )
}
