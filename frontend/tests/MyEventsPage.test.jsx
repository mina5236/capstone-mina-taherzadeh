import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MyEventsPage from '../src/MyEventsPage'

const API = 'http://localhost:3001/api'
const student = { id: 10, sessionToken: 'student-token' }

const registered = {
  id: 1,
  title: 'Welcome Week',
  date: '2026-11-20 10:00:00',
  location: 'Main Hall',
  clubName: 'Chess Club',
  isRegistered: true,
}
const notRegistered = { ...registered, id: 2, title: 'Game Night', isRegistered: false }

const eventsResponse = (events) => ({ ok: true, status: 200, json: async () => ({ events }) })

describe('MyEventsPage', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  test('shows only the events the student registered for', async () => {
    global.fetch.mockResolvedValueOnce(eventsResponse([registered, notRegistered]))
    render(<MyEventsPage user={student} onBack={jest.fn()} onBrowse={jest.fn()} onLogout={jest.fn()} />)

    expect(await screen.findByText('Welcome Week')).toBeInTheDocument()
    expect(screen.queryByText('Game Night')).not.toBeInTheDocument()
  })

  test('F9: clicking Cancel removes the event from the list', async () => {
    const user = userEvent.setup()
    global.fetch
      .mockResolvedValueOnce(eventsResponse([registered, notRegistered]))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ message: 'Your registration has been cancelled.' }),
      })
    render(<MyEventsPage user={student} onBack={jest.fn()} onBrowse={jest.fn()} onLogout={jest.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Cancel' }))

    expect(await screen.findByText('Your registration has been cancelled.')).toBeInTheDocument()
    expect(screen.queryByText('Welcome Week')).not.toBeInTheDocument()
    expect(screen.getByText(/you haven't registered for any events yet/i)).toBeInTheDocument()
    expect(global.fetch).toHaveBeenLastCalledWith(
      `${API}/events/1/register`,
      expect.objectContaining({ method: 'DELETE', headers: { Authorization: 'Bearer student-token' } }),
    )
  })

  test('keeps the event and shows the error if cancelling fails', async () => {
    const user = userEvent.setup()
    global.fetch
      .mockResolvedValueOnce(eventsResponse([registered]))
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ message: 'You are not registered for this event.' }),
      })
    render(<MyEventsPage user={student} onBack={jest.fn()} onBrowse={jest.fn()} onLogout={jest.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'Cancel' }))

    expect(await screen.findByText('You are not registered for this event.')).toBeInTheDocument()
    expect(screen.getByText('Welcome Week')).toBeInTheDocument()
  })
})