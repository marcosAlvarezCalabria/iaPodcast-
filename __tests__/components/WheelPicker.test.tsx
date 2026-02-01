import { render, screen, fireEvent } from '@testing-library/react'
import { WheelPicker } from '@/app/components/WheelPicker'

describe('WheelPicker', () => {
    beforeAll(() => {
        // Mock scrollTo since JSDOM doesn't implement it fully
        Element.prototype.scrollTo = jest.fn()
    })

    const options = [
        { value: 'opt1', label: 'Option 1' },
        { value: 'opt2', label: 'Option 2' },
        { value: 'opt3', label: 'Option 3' },
    ]

    it('renders correctly', () => {
        render(
            <WheelPicker
                options={options}
                value="opt1"
                onChange={() => { }}
            />
        )

        expect(screen.getByText('Option 1')).toBeInTheDocument()
        expect(screen.getByText('Option 2')).toBeInTheDocument()
        expect(screen.getByText('Option 3')).toBeInTheDocument()
    })

    it('calls onChange when clicking an option', () => {
        const handleChange = jest.fn()
        render(
            <WheelPicker
                options={options}
                value="opt1"
                onChange={handleChange}
            />
        )

        fireEvent.click(screen.getByText('Option 2'))
        expect(handleChange).toHaveBeenCalledWith('opt2')
    })
})
