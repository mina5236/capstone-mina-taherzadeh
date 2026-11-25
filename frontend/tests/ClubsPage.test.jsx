import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ClubsPage from '../src/ClubsPage'

const API = 'http://localhost:3001/api'
const student = { id: 10, fullName: 'Mina Taherzadeh', sessionToken: 'student-token' }

const chess = { id: 1, name: 'Chess Club', description: 'Weekly chess games', eventCount: 2 }
const art = { id: 2, name: 'Art Club', description: '', eventCount: 1 }
const chessDetails = {
  id: 1,
  name: 'Chess Club',
  description: 'Weekly chess games',
  events: [
    { id: 5, title: 'Chess Night', date: '2026-11-25 19:00:00', location: 'Room 204', maxCapacity: 20, currentCount: 3 },
  ],
}
const artDetails = { id: 2, name: 'Art Club', description: '', events: [] }

const json = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body })

// Answers each request by "METHOD /path". Anything unexpected makes the test fail.
function mockApi(handlers) {
  global.fetch = jest.fn(async (url, options = {}) => {
    const key = `${options.method || 'GET'} ${String(url).replace(API, '')}`
    const handler = handlers[key]
    if (!handler) throw new Error(`Unexpected request: ${key}`)
    return typeof handler === 'function' ? handler(options) : handler
  })
}

const renderPage = (props = {}) =>
  render(<ClubsPage user={student} onBack={jest.fn()} onLogout={jest.fn()} {...props} />)

describe('ClubsPage (browse clubs)', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('F6: lists the approved clubs with their description and number of events', async () => {
    mockApi({ 'GET /clubs': json({ clubs: [chess, art] }) })
    renderPage()

    expect(await screen.findByText('Chess Club')).toBeInTheDocument()
    expect(screen.getByText('Weekly chess games')).toBeInTheDocument()
    expect(screen.getByText('🎪 2 events')).toBeInTheDocument()
    expect(screen.getByText('Art Club')).toBeInTheDocument()
    expect(screen.getByText('🎪 1 event')).toBeInTheDocument()
    expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer student-token')
  })

  test('shows a message when there are no clubs yet', async () => {
    mockApi({ 'GET /clubs': json({ clubs: [] }) })
    renderPage()

    expect(await screen.findByText('No clubs available yet')).toBeInTheDocument()
  })

  test('F6: View Club shows the club description and its events', async () => {
    const user = userEvent.setup()
    mockApi({
      'GET /clubs': json({ clubs: [chess, art] }),
      'GET /clubs/1': json({ club: chessDetails }),
    })
    renderPage()

    await user.click((await screen.findAllByRole('button', { name: 'View Club' }))[0])

    expect(await screen.findByRole('heading', { name: 'Chess Club' })).toBeInTheDocument()
    expect(screen.getByText('About This Club')).toBeInTheDocument()
    expect(screen.getByText('Weekly chess games')).toBeInTheDocument()
    expect(screen.getByText('Chess Night')).toBeInTheDocument()
    expect(screen.getByText(/Room 204/)).toBeInTheDocument()
    expect(screen.getByText(/3 \/ 20 registered/)).toBeInTheDocument()
  })

  test('a club with no description or events says so', async () => {
    const user = userEvent.setup()
    mockApi({
      'GET /clubs': json({ clubs: [chess, art] }),
      'GET /clubs/2': json({ club: artDetails }),
    })
    renderPage()

    await user.click((await screen.findAllByRole('button', { name: 'View Club' }))[1])

    expect(await screen.findByText('No description provided.')).toBeInTheDocument()
    expect(screen.getByText('This club has no events yet')).toBeInTheDocument()
  })

  test('the back button returns from a club to the clubs list', async () => {
    const user = userEvent.setup()
    mockApi({
      'GET /clubs': json({ clubs: [chess] }),
      'GET /clubs/1': json({ club: chessDetails }),
    })
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'View Club' }))
    await user.click(await screen.findByRole('button', { name: 'Back to clubs' }))

    expect(await screen.findByRole('heading', { name: 'Campus Clubs' })).toBeInTheDocument()
  })

  test('shows the error and stays on the list when a club cannot be opened', async () => {
    const user = userEvent.setup()
    mockApi({
      'GET /clubs': json({ clubs: [chess] }),
      'GET /clubs/1': json({ message: 'Club not found.' }, 404),
    })
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'View Club' }))

    expect(await screen.findByText('Club not found.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Campus Clubs' })).toBeInTheDocument()
  })

  test('shows the error when the clubs cannot be loaded', async () => {
    mockApi({ 'GET /clubs': json({ message: 'Failed to load clubs.' }, 500) })
    renderPage()

    expect(await screen.findByText('Failed to load clubs.')).toBeInTheDocument()
  })

  test('logs out when the session is no longer valid', async () => {
    const onLogout = jest.fn()
    mockApi({ 'GET /clubs': json({ message: 'Invalid or expired session.' }, 401) })
    renderPage({ onLogout })

    await waitFor(() => expect(onLogout).toHaveBeenCalled())
  })
})