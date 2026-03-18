import { render, screen, fireEvent } from '@testing-library/react'
import { TagSelector } from '@/app/components/TagSelector'
import type { Tag } from '@/src/lib/tags/types'

const tags: Tag[] = [
    { id: 'technology', label: 'Technology', icon: 'devices' },
    { id: 'science', label: 'Science', icon: 'science' },
    { id: 'history', label: 'History', icon: 'history_edu' },
]

describe('TagSelector', () => {
    it('renders all tags', () => {
        render(
            <TagSelector tags={tags} selectedIds={[]} onChange={() => {}} />
        )

        expect(screen.getByText('Technology')).toBeInTheDocument()
        expect(screen.getByText('Science')).toBeInTheDocument()
        expect(screen.getByText('History')).toBeInTheDocument()
    })

    it('calls onChange with the clicked tag added when not selected', () => {
        const handleChange = jest.fn()
        render(
            <TagSelector tags={tags} selectedIds={[]} onChange={handleChange} />
        )

        fireEvent.click(screen.getByText('Science'))
        expect(handleChange).toHaveBeenCalledWith(['science'])
    })

    it('calls onChange with the clicked tag removed when already selected', () => {
        const handleChange = jest.fn()
        render(
            <TagSelector
                tags={tags}
                selectedIds={['technology', 'science']}
                onChange={handleChange}
            />
        )

        fireEvent.click(screen.getByText('Science'))
        expect(handleChange).toHaveBeenCalledWith(['technology'])
    })

    it('applies selected styling to selected tags', () => {
        render(
            <TagSelector tags={tags} selectedIds={['history']} onChange={() => {}} />
        )

        const historyButton = screen.getByText('History').closest('button')
        expect(historyButton).toHaveClass('bg-[#231b0f]')

        const techButton = screen.getByText('Technology').closest('button')
        expect(techButton).toHaveClass('bg-[#f5e8d0]')
    })
})
