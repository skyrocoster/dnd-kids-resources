import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GlossaryTerm } from '../GlossaryTerm'

describe('GlossaryTerm', () => {
  afterEach(() => vi.restoreAllMocks())
  // --- rendering/content ---

  it('renders trigger children inside the button', () => {
    render(<GlossaryTerm content="popover body">saving throw</GlossaryTerm>)
    expect(screen.getByRole('button', { name: 'saving throw' })).toBeInTheDocument()
  })

  it('shows popover content when opened', async () => {
    const user = userEvent.setup()
    render(<GlossaryTerm content="A roll to resist.">saving throw</GlossaryTerm>)
    await user.click(screen.getByRole('button'))
    expect(screen.getByText('A roll to resist.')).toBeInTheDocument()
  })

  it('does not show popover content initially', () => {
    render(<GlossaryTerm content="popover body">term</GlossaryTerm>)
    expect(screen.queryByText('popover body')).toBeNull()
  })

  // --- hover-focus-tap opening ---

  it('opens on hover', async () => {
    const user = userEvent.setup()
    render(<GlossaryTerm content="definition text">term</GlossaryTerm>)
    await user.hover(screen.getByRole('button'))
    expect(screen.getByText('definition text')).toBeInTheDocument()
  })

  it('opens on focus', async () => {
    const user = userEvent.setup()
    render(<GlossaryTerm content="definition text">term</GlossaryTerm>)
    await user.tab()
    expect(screen.getByRole('button')).toHaveFocus()
    expect(screen.getByText('definition text')).toBeInTheDocument()
  })

  it('opens on click', async () => {
    const user = userEvent.setup()
    render(<GlossaryTerm content="definition text">term</GlossaryTerm>)
    await user.click(screen.getByRole('button'))
    expect(screen.getByText('definition text')).toBeInTheDocument()
  })

  // --- cross-instance exclusivity ---

  it('closes first popover when second is opened', async () => {
    const user = userEvent.setup()
    render(
      <div>
        <GlossaryTerm content="first popover">first</GlossaryTerm>
        <GlossaryTerm content="second popover">second</GlossaryTerm>
      </div>,
    )
    const buttons = screen.getAllByRole('button')
    await user.click(buttons[0])
    expect(screen.getByText('first popover')).toBeInTheDocument()
    await user.click(buttons[1])
    expect(screen.queryByText('first popover')).toBeNull()
    expect(screen.getByText('second popover')).toBeInTheDocument()
  })

  // --- Escape/outside/blur dismissal ---

  it('closes on Escape key', async () => {
    const user = userEvent.setup()
    render(<GlossaryTerm content="definition text">term</GlossaryTerm>)
    const button = screen.getByRole('button')
    await user.click(button)
    expect(screen.getByText('definition text')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByText('definition text')).toBeNull()
  })

  it('refocuses trigger after Escape', async () => {
    const user = userEvent.setup()
    render(<GlossaryTerm content="definition text">term</GlossaryTerm>)
    const button = screen.getByRole('button')
    await user.click(button)
    await user.keyboard('{Escape}')
    expect(button).toHaveFocus()
  })

  it('closes on outside click', async () => {
    const user = userEvent.setup()
    render(
      <div>
        <span data-testid="outside">outside</span>
        <GlossaryTerm content="definition text">term</GlossaryTerm>
      </div>,
    )
    await user.click(screen.getByRole('button'))
    expect(screen.getByText('definition text')).toBeInTheDocument()
    await user.click(screen.getByTestId('outside'))
    expect(screen.queryByText('definition text')).toBeNull()
  })

  it('closes on blur when focus moves to another element', async () => {
    const user = userEvent.setup()
    render(
      <div>
        <GlossaryTerm content="definition text">term</GlossaryTerm>
        <button data-testid="other">other</button>
      </div>,
    )
    await user.click(screen.getByRole('button', { name: 'term' }))
    expect(screen.getByText('definition text')).toBeInTheDocument()
    await user.click(screen.getByTestId('other'))
    expect(screen.queryByText('definition text')).toBeNull()
  })

  // --- viewport clamping ---

  it('clamps the popover inside the viewport and flips it above the trigger', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.classList.contains('glossary-term-popover')) {
        return new DOMRect(0, 0, 80, 40)
      }
      return new DOMRect(95, 90, 10, 10)
    })
    vi.stubGlobal('innerWidth', 120)
    vi.stubGlobal('innerHeight', 110)
    const user = userEvent.setup()
    const { container } = render(<GlossaryTerm content="definition text">term</GlossaryTerm>)
    await user.click(screen.getByRole('button'))
    const popover = container.querySelector('.glossary-term-popover') as HTMLElement
    expect(popover).not.toBeNull()
    expect(popover.style.left).toBe('36px')
    expect(popover.style.top).toBe('46px')
  })
})
