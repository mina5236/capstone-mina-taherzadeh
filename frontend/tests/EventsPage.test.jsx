import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EventsPage from '../src/EventsPage'

const API = 'http://localhost:3001/api'
const student = { id: 10, fullName: 'Mina Taherzadeh', sessionToken: 'student-token' }

const welcome = {
  id: 1,
  title: 'Welcome Week',
  description: 'Meet clubs and make friends.',
  date: '2026-11-20 10:00:00',
  location: 'Main Hall',
  clubName: 'Chess Club',
  maxCapacity: 50,
  currentCount: 10,
  isRegistered: false,
}
const fullEvent = { ...welcome, id: 2, title: 'Sold Out Night', maxCapacity: 5, currentCount: 5 }

const eventsResponse = (events) => ({ ok: true, status: 200, json: async () => ({ events }) })

describe('EventsPage', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  test('F7: clicking an event shows its details', async () => {
    const user = userEvent.setup()
    global.fetch.mockResolvedValueOnce(eventsResponse([welcome, fullEvent]))
    render(<EventsPage user={student} onBack={jest.fn()} onLogout={jest.fn()} />)

    const buttons = await screen.findAllByRole('button', { name: /view details/i })
    await user.click(buttons[0])

    expect(await screen.findByRole('heading', { name: 'Welcome Week' })).toBeInTheDocument()
    expect(screen.getByText('Meet clubs and make friends.')).toBeInTheDocument()
    expect(screen.getByText(/2026-11-20 10:00:00/)).toBeInTheDocument()
    expect(screen.getByText(/Main Hall/)).toBeInTheDocument()
    expect(screen.getByText(/Chess Club/)).toBeInTheDocument()
    expect(screen.getByText(/10 \/ 50 registered \(40 left\)/)).toBeInTheDocument()
  })

  test('F8: clicking Register registers the student and shows a confirmation', async () => {
    const user = userEvent.setup()
    global.fetch
      .mockResolvedValueOnce(eventsResponse([welcome]))
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          message: 'You are registered for this event.',
          event: { ...welcome, isRegistered: true, currentCount: 11 },
        }),
      })
    render(<EventsPage user={student} onBack={jest.fn()} onLogout={jest.fn()} />)

    await user.click(await screen.findByRole('button', { name: /view details/i }))
    await user.click(await screen.findByRole('button', { name: 'Register' }))

    expect(await screen.findByText('You are registered for this event.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel Registration' })).toBeInTheDocument()
    expect(screen.getByText(/11 \/ 50 registered/)).toBeInTheDocument()
    expect(global.fetch).toHaveBeenLastCalledWith(
      `${API}/events/1/register`,
      expect.objectContaining({ method: 'POST', headers: { Authorization: 'Bearer student-token' } }),
    )
  })

  test('prevents duplicate registration clicks while a request is in progress (NF5.2)', async () => {
    const user = userEvent.setup()
    let finish
    global.fetch
      .mockResolvedValueOnce(eventsResponse([welcome]))
      .mockReturnValueOnce(new Promise((resolve) => { finish = resolve }))
    render(<EventsPage user={student} onBack={jest.fn()} onLogout={jest.fn()} />)

    await user.click(await screen.findByRole('button', { name: /view details/i }))
    await user.click(await screen.findByRole('button', { name: 'Register' }))

    const busyButton = await screen.findByRole('button', { name: /registering/i })
    expect(busyButton).toBeDisabled()
    await user.click(busyButton)
    expect(global.fetch).toHaveBeenCalledTimes(2)

    await act(async () => {
      finish({
        ok: true,
        status: 201,
        json: async () => ({
          message: 'You are registered for this event.',
          event: { ...welcome, isRegistered: true, currentCount: 11 },
        }),
      })
    })
  })

  test('an event that is already full cannot be registered for', async () => {
    const user = userEvent.setup()
    global.fetch.mockResolvedValueOnce(eventsResponse([welcome, fullEvent]))
    render(<EventsPage user={student} onBack={jest.fn()} onLogout={jest.fn()} />)

    const buttons = await screen.findAllByRole('button', { name: /view details/i })
    await user.click(buttons[1])

    expect(await screen.findByRole('button', { name: 'Event Full' })).toBeDisabled()
  })

  test('shows the server error when the event filled up before registering', async () => {
    const user = userEvent.setup()
    global.fetch
      .mockResolvedValueOnce(eventsResponse([welcome]))
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ message: 'This event is full.', event: { ...welcome, currentCount: 50 } }),
      })
    render(<EventsPage user={student} onBack={jest.fn()} onLogout={jest.fn()} />)

    await user.click(await screen.findByRole('button', { name: /view details/i }))
    await user.click(await screen.findByRole('button', { name: 'Register' }))

    expect(await screen.findByText('This event is full.')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Event Full' })).toBeDisabled()
  })
})