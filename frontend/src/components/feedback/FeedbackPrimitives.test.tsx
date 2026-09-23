import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FeedbackCore } from './FeedbackCore'
import { InlineFeedback } from './InlineFeedback'
import { PageFeedback } from './PageFeedback'
import { PanelFeedback } from './PanelFeedback'
import { FEEDBACK_VARIANTS } from './feedbackTypes'

describe('feedback primitives', () => {
  it('renders the four semantic feedback severities with their production tokens', () => {
    render(
      <>
        <FeedbackCore severity="information" message="A tip" />
        <FeedbackCore severity="success" message="Saved" />
        <FeedbackCore severity="warning" message="Check this" />
        <FeedbackCore severity="error" message="Could not save" />
      </>,
    )

    expect(screen.getByText('A tip')).toBeVisible()
    expect(screen.getByText('Saved')).toBeVisible()
    expect(screen.getByText('Check this')).toBeVisible()
    expect(screen.getByText('Could not save')).toBeVisible()
    expect(FEEDBACK_VARIANTS.information.tokens.accent).toBe('--md-skill')
    expect(FEEDBACK_VARIANTS.success.tokens.accent).toBe('--md-nature')
    expect(FEEDBACK_VARIANTS.warning.tokens.accent).toBe('--md-secondary')
    expect(FEEDBACK_VARIANTS.error.tokens.accent).toBe('--md-error')
  })

  it('forwards only the supplied live-region settings', () => {
    render(
      <InlineFeedback
        severity="information"
        message="Read this hint"
        role="status"
        aria-live="polite"
      />,
    )

    const core = screen.getByTestId('core-information')
    expect(core).toHaveAttribute('role', 'status')
    expect(core).toHaveAttribute('aria-live', 'polite')
    expect(core).not.toHaveAttribute('aria-atomic')
  })

  it('applies the page and panel presentations without changing the shared message', () => {
    render(
      <>
        <PageFeedback severity="warning" message="Page warning" />
        <PanelFeedback severity="error" heading="Panel error" message="Details" />
      </>,
    )

    expect(screen.getByText('Page warning').closest('[data-severity="warning"]')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Panel error' })).toBeVisible()
    expect(screen.getByText('Details')).toBeVisible()
  })
})
