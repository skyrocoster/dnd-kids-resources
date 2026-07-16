import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../../api/client'
import type { Quest } from '../../../api/types'
import { QuestEditor } from '../QuestEditor'

describe('QuestEditor', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(api, 'listNPCs').mockResolvedValue([])
    vi.spyOn(api, 'listDungeons').mockResolvedValue([])
  })

  it('creates a quest from the form fields', async () => {
    const created: Quest = { id: 1, title: 'Find the Amulet' }
    const createQuest = vi.spyOn(api, 'createQuest').mockResolvedValue(created)
    const onSaved = vi.fn()
    const user = userEvent.setup()
    render(<QuestEditor onClose={() => {}} onSaved={onSaved} />)

    await user.type(screen.getByLabelText('Title'), 'Find the Amulet')
    await user.click(screen.getByRole('button', { name: 'Create Quest' }))

    await waitFor(() => expect(createQuest).toHaveBeenCalledOnce())
    expect(createQuest).toHaveBeenCalledWith(expect.objectContaining({ title: 'Find the Amulet' }))
    expect(onSaved).toHaveBeenCalledWith(created)
  })

  it('updates an existing quest', async () => {
    const quest: Quest = { id: 4, title: 'Old Quest' }
    const updateQuest = vi.spyOn(api, 'updateQuest').mockResolvedValue(quest)
    const user = userEvent.setup()
    render(<QuestEditor quest={quest} onClose={() => {}} onSaved={() => {}} />)

    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => expect(updateQuest).toHaveBeenCalledWith(4, expect.objectContaining({ title: 'Old Quest' })))
  })

  describe('Dialog contract', () => {
    it('renders with the expected title and focuses the first field', () => {
      render(<QuestEditor onClose={() => {}} onSaved={() => {}} />)
      expect(screen.getByRole('dialog', { name: 'Add New Quest' })).toBeInTheDocument()
      expect(screen.getByLabelText('Title')).toHaveFocus()
    })

    it('uses the quest title when editing', () => {
      const quest: Quest = { id: 4, title: 'Old Quest' }
      render(<QuestEditor quest={quest} onClose={() => {}} onSaved={() => {}} />)
      expect(screen.getByRole('dialog', { name: 'Edit Quest: Old Quest' })).toBeInTheDocument()
    })

    it('closes on Cancel and on Escape', async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()
      render(<QuestEditor onClose={onClose} onSaved={() => {}} />)

      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(onClose).toHaveBeenCalledTimes(1)

      await user.keyboard('{Escape}')
      expect(onClose).toHaveBeenCalledTimes(2)
    })

    it('reports save status via an accessible status region', async () => {
      vi.spyOn(api, 'createQuest').mockRejectedValue(new Error('Unable to save'))
      const user = userEvent.setup()
      render(<QuestEditor onClose={() => {}} onSaved={() => {}} />)

      await user.type(screen.getByLabelText('Title'), 'Failed Quest')
      await user.click(screen.getByRole('button', { name: 'Create Quest' }))

      expect(await screen.findByRole('status')).toHaveTextContent('Unable to save')
    })

    it('disables Cancel and Save while saving, suppressing Escape', async () => {
      let resolveCreate: (quest: Quest) => void = () => {}
      vi.spyOn(api, 'createQuest').mockReturnValue(
        new Promise((resolve) => {
          resolveCreate = resolve
        }),
      )
      const onClose = vi.fn()
      const user = userEvent.setup()
      render(<QuestEditor onClose={onClose} onSaved={() => {}} />)

      await user.type(screen.getByLabelText('Title'), 'Pending Quest')
      await user.click(screen.getByRole('button', { name: 'Create Quest' }))

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Create Quest' })).toBeDisabled()

      await user.keyboard('{Escape}')
      expect(onClose).not.toHaveBeenCalled()

      resolveCreate({ id: 1, title: 'Pending Quest' })
    })
  })
})
