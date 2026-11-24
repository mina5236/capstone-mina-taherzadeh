import { act, render, screen, waitFor } from '@testing-library/react'
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
  isSaved: false,
}
const quiz = { ...welcome, id: 2, title: 'Quiz Night', clubName: 'Trivia Club', isRegistered: true, isSaved: true }

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
  render(<EventsPage user={student} onBack={jest.fn()} onLogout={jest.fn()} {...props} />)

const openFirstEvent = async (user) => {
  await user.click((await screen.findAllByRole('button', { name: 'View Details' }))[0])
  await screen.findByRole('heading', { name: 'Event Details' === '' ? '' : /./ })
}

describe('EventsPage (browse events)', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('lists every event with date and club, and marks registered and saved ones', async () => {
    mockApi({ 'GET /events': json({ events: [welcome, quiz] }) })
    renderPage()

    expect(await screen.findByText('Welcome Week')).toBeInTheDocument()
    expect(screen.getByText('Quiz Night')).toBeInTheDocument()
    expect(screen.getByText(/Trivia Club/)).toBeInTheDocument()
    expect(screen.getAllByText(/2026-11-20 10:00:00/)).toHaveLength(2)
    expect(screen.getByText(/✅ Registered/)).toBeInTheDocument()
    expect(screen.getByText(/⭐ Saved/)).toBeInTheDocument()
  })

  test('shows a message when there are no events', async () => {
    mockApi({ 'GET /events': json({ events: [] }) })
    renderPage()

    expect(await screen.findByText('No events available yet')).toBeInTheDocument()
  })

  test('the back button returns from the event details to the events list', async () => {
    const user = userEvent.setup()
    mockApi({ 'GET /events': json({ events: [welcome] }) })
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'View Details' }))
    await user.click(await screen.findByRole('button', { name: 'Back to events' }))

    expect(await screen.findByRole('heading', { name: 'Campus Events' })).toBeInTheDocument()
  })

  test('shows the error when the events cannot be loaded', async () => {
    mockApi({ 'GET /events': json({ message: 'Failed to load events.' }, 500) })
    renderPage()

    expect(await screen.findByText('Failed to load events.')).toBeInTheDocument()
  })

  test('logs out when the session is no longer valid', async () => {
    const onLogout = jest.fn()
    mockApi({ 'GET /events': json({ message: 'Invalid or expired session.' }, 401) })
    renderPage({ onLogout })

    await waitFor(() => expect(onLogout).toHaveBeenCalled())
  })
})

describe('EventsPage (favorite an event)', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('F13: Save Event adds the event to the wish list, and clicking again removes it', async () => {
    const user = userEvent.setup()
    mockApi({
      'GET /events': json({ events: [welcome] }),
      'POST /events/1/save': json({ message: 'Event saved to your wish list.', event: { ...welcome, isSaved: true } }, 201),
      'DELETE /events/1/save': json({ message: 'Event removed from your wish list.', event: welcome }),
    })
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'View Details' }))
    await user.click(await screen.findByRole('button', { name: '☆ Save Event' }))

    expect(await screen.findByText('Event saved to your wish list.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '★ Saved (click to remove)' })).toBeInTheDocument()
    expect(requestsWith('POST')[0][1].headers.Authorization).toBe('Bearer student-token')

    await user.click(screen.getByRole('button', { name: '★ Saved (click to remove)' }))

    expect(await screen.findByText('Event removed from your wish list.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '☆ Save Event' })).toBeInTheDocument()
  })

  test('F13: a saved event is marked as saved in the events list', async () => {
    const user = userEvent.setup()
    mockApi({
      'GET /events': json({ events: [welcome] }),
      'POST /events/1/save': json({ message: 'Event saved to your wish list.', event: { ...welcome, isSaved: true } }, 201),
    })
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'View Details' }))
    await user.click(await screen.findByRole('button', { name: '☆ Save Event' }))
    await screen.findByText('Event saved to your wish list.')
    await user.click(screen.getByRole('button', { name: 'Back to events' }))

    expect(await screen.findByText(/⭐ Saved/)).toBeInTheDocument()
  })

  test('the server\'s error is shown when saving fails', async () => {
    const user = userEvent.setup()
    mockApi({
      'GET /events': json({ events: [welcome] }),
      'POST /events/1/save': json({ message: 'Event not found.' }, 404),
    })
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'View Details' }))
    await user.click(await screen.findByRole('button', { name: '☆ Save Event' }))

    expect(await screen.findByText('Event not found.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '☆ Save Event' })).toBeEnabled()
  })

  test('the save button is disabled while a request is running, so it is sent only once', async () => {
    const user = userEvent.setup()
    let release
    mockApi({
      'GET /events': json({ events: [welcome] }),
      'POST /events/1/save': () =>
        new Promise((resolve) => {
          release = () =>
            resolve(json({ message: 'Event saved to your wish list.', event: { ...welcome, isSaved: true } }, 201))
        }),
    })
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'View Details' }))
    const saveButton = await screen.findByRole('button', { name: '☆ Save Event' })
    await user.click(saveButton)
    await user.click(saveButton)

    expect(saveButton).toBeDisabled()
    expect(requestsWith('POST')).toHaveLength(1)

    await act(async () => {
      release()
    })
    expect(await screen.findByText('Event saved to your wish list.')).toBeInTheDocument()
  })
})

describe('EventsPage (share an event)', () => {
  const shareText = 'Welcome Week - 2026-11-20 10:00:00 at Main Hall (Chess Club) #CampusConnect'
  const pageLink = () => window.location.origin + window.location.pathname

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('F14: Share on X opens the X share page with the event details', async () => {
    const user = userEvent.setup()
    const open = jest.spyOn(window, 'open').mockImplementation(() => null)
    mockApi({ 'GET /events': json({ events: [welcome] }) })
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'View Details' }))
    await user.click(await screen.findByRole('button', { name: /share on x/i }))

    expect(open).toHaveBeenCalledTimes(1)
    const [url, target, features] = open.mock.calls[0]
    expect(url).toContain('https://twitter.com/intent/tweet')
    expect(new URL(url).searchParams.get('text')).toBe(shareText)
    expect(new URL(url).searchParams.get('url')).toBe(pageLink())
    expect(target).toBe('_blank')
    expect(features).toBe('noopener,noreferrer')
  })

  test('F14: Copy for Instagram copies the event details and confirms it', async () => {
    const user = userEvent.setup()
    const writeText = jest.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    mockApi({ 'GET /events': json({ events: [welcome] }) })
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'View Details' }))
    await user.click(await screen.findByRole('button', { name: /copy for instagram/i }))

    expect(writeText).toHaveBeenCalledWith(`${shareText} ${pageLink()}`)
    expect(
      await screen.findByText('Event details copied. Paste them into your Instagram post or story.')
    ).toBeInTheDocument()
  })

  test('shows a message when the details could not be copied', async () => {
    const user = userEvent.setup()
    const writeText = jest.fn().mockRejectedValue(new Error('denied'))
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    mockApi({ 'GET /events': json({ events: [welcome] }) })
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'View Details' }))
    await user.click(await screen.findByRole('button', { name: /copy for instagram/i }))

    expect(
      await screen.findByText('Could not copy automatically. Please copy the event details by hand.')
    ).toBeInTheDocument()
  })
})