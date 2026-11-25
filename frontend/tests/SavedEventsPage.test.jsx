import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SavedEventsPage from '../src/SavedEventsPage'

const API = 'http://localhost:3001/api'
const student = { id: 10, fullName: 'Mina Taherzadeh', sessionToken: 'student-token' }

const base = {
  description: 'Meet clubs and make friends.',
  date: '2026-11-20 10:00:00',
  location: 'Main Hall',
  clubName: 'Chess Club',
  maxCapacity: 50,
  currentCount: 10,
  isRegistered: false,
}
const savedOne = { ...base, id: 1, title: 'Welcome Week', isSaved: true }
const savedTwo = { ...base, id: 2, title: 'Quiz Night', clubName: 'Trivia Club', isSaved: true, isRegistered: true }
const notSaved = { ...base, id: 3, title: 'Game Night', isSaved: false }

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

const requestsWith = (method) => global.fetch.mock.calls.filter(([, options]) => options?.method === method)

const renderPage = (props = {}) =>
  render(<SavedEventsPage user={student} onBack={jest.fn()} onBrowse={jest.fn()} onLogout={jest.fn()} {...props} />)

describe('SavedEventsPage (wish list)', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('F13: shows only the saved events, and marks the ones the student registered for', async () => {
    mockApi({ 'GET /events': json({ events: [savedOne, savedTwo, notSaved] }) })
    renderPage()

    expect(await screen.findByText('Welcome Week')).toBeInTheDocument()
    expect(screen.getByText('Quiz Night')).toBeInTheDocument()
    expect(screen.queryByText('Game Night')).not.toBeInTheDocument()
    expect(screen.getByText(/Trivia Club/)).toBeInTheDocument()
    expect(screen.getAllByText(/✅ Registered/)).toHaveLength(1)
    expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer student-token')
  })

  test('shows a message and a Browse Events button when nothing is saved', async () => {
    const user = userEvent.setup()
    const onBrowse = jest.fn()
    mockApi({ 'GET /events': json({ events: [notSaved] }) })
    renderPage({ onBrowse })

    expect(await screen.findByText("You haven't saved any events yet")).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Browse Events' }))

    expect(onBrowse).toHaveBeenCalledTimes(1)
  })

  test('F13: Remove takes the event off the wish list and shows a confirmation', async () => {
    const user = userEvent.setup()
    mockApi({
      'GET /events': json({ events: [savedOne, savedTwo] }),
      'DELETE /events/1/save': json({ message: 'Event removed from your wish list.', event: { ...savedOne, isSaved: false } }),
    })
    renderPage()

    await user.click((await screen.findAllByRole('button', { name: 'Remove' }))[0])

    expect(await screen.findByText('Event removed from your wish list.')).toBeInTheDocument()
    expect(screen.queryByText('Welcome Week')).not.toBeInTheDocument()
    expect(screen.getByText('Quiz Night')).toBeInTheDocument()
    expect(requestsWith('DELETE')).toHaveLength(1)
  })

  test('keeps the event and shows the error when removing fails', async () => {
    const user = userEvent.setup()
    mockApi({
      'GET /events': json({ events: [savedOne] }),
      'DELETE /events/1/save': json({ message: 'This event is not in your wish list.' }, 404),
    })
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Remove' }))

    expect(await screen.findByText('This event is not in your wish list.')).toBeInTheDocument()
    expect(screen.getByText('Welcome Week')).toBeInTheDocument()
  })

  test('the Remove button is disabled while a request is running, so it is sent only once', async () => {
    const user = userEvent.setup()
    let release
    mockApi({
      'GET /events': json({ events: [savedOne] }),
      'DELETE /events/1/save': () =>
        new Promise((resolve) => {
          release = () => resolve(json({ message: 'Event removed from your wish list.' }))
        }),
    })
    renderPage()

    const removeButton = await screen.findByRole('button', { name: 'Remove' })
    await user.click(removeButton)
    await user.click(removeButton)

    expect(screen.getByRole('button', { name: 'Removing...' })).toBeDisabled()
    expect(requestsWith('DELETE')).toHaveLength(1)

    await act(async () => {
      release()
    })
    expect(await screen.findByText('Event removed from your wish list.')).toBeInTheDocument()
  })

  test('shows an error message when the wish list cannot be loaded', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'))
    renderPage()

    expect(await screen.findByText('Could not load your saved events.')).toBeInTheDocument()
  })

  test('logs out when the session is no longer valid', async () => {
    const onLogout = jest.fn()
    mockApi({ 'GET /events': json({ message: 'Invalid or expired session.' }, 401) })
    renderPage({ onLogout })

    await waitFor(() => expect(onLogout).toHaveBeenCalled())
  })
})