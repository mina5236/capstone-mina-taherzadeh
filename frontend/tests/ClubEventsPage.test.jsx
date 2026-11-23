import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ClubEventsPage from '../src/ClubEventsPage'

const API = 'http://localhost:3001/api'
const clubAdmin = { id: 20, fullName: 'Club Admin', sessionToken: 'club-token' }

const chessClub = { id: 1, name: 'Chess Club' }
const welcome = {
  id: 1,
  clubId: 1,
  clubName: 'Chess Club',
  title: 'Welcome Week',
  description: 'Meet clubs and make friends.',
  date: '2026-11-20 10:00:00',
  location: 'Main Hall',
  maxCapacity: 50,
  currentCount: 10,
}
const sara = { fullName: 'Sara Ahmadi', studentId: '00000042', email: 'sara@test.com', registeredAt: '2026-11-01 09:00:00' }

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

const listHandlers = (events = [welcome], clubs = [chessClub]) => ({
  'GET /club-admin/events': json({ events }),
  'GET /club-admin/clubs': json({ clubs }),
})

const renderPage = (props = {}) =>
  render(<ClubEventsPage user={clubAdmin} onBack={jest.fn()} onLogout={jest.fn()} {...props} />)

const requestsWith = (method) => global.fetch.mock.calls.filter(([, options]) => options?.method === method)

const fill = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } })

function fillValidForm() {
  fill(/event title/i, 'Chess Tournament')
  fill(/description/i, 'A friendly tournament for everyone.')
  fill(/date/i, '2099-01-15')
  fill(/time/i, '18:00')
  fill(/location/i, 'Room 204')
  fill(/maximum capacity/i, '30')
}

describe('ClubEventsPage (event management)', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('lists the club admin\'s events with date, location, club and registrations', async () => {
    mockApi(listHandlers())
    renderPage()

    expect(await screen.findByText('Welcome Week')).toBeInTheDocument()
    expect(screen.getByText(/2026-11-20 10:00:00/)).toBeInTheDocument()
    expect(screen.getByText(/Main Hall/)).toBeInTheDocument()
    expect(screen.getByText(/Chess Club/)).toBeInTheDocument()
    expect(screen.getByText(/10 \/ 50 registered/)).toBeInTheDocument()
  })

  test('shows a message when there are no events yet', async () => {
    mockApi(listHandlers([]))
    renderPage()

    expect(await screen.findByText("You haven't created any events yet")).toBeInTheDocument()
  })

  test('without an active club there is no Create Event button', async () => {
    mockApi(listHandlers([], []))
    renderPage()

    expect(await screen.findByText(/you need an active club/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /create event/i })).not.toBeInTheDocument()
  })

  test('logs out when the session is no longer valid', async () => {
    const onLogout = jest.fn()
    mockApi({
      'GET /club-admin/events': json({ message: 'Invalid or expired session.' }, 401),
      'GET /club-admin/clubs': json({ message: 'Invalid or expired session.' }, 401),
    })
    renderPage({ onLogout })

    await waitFor(() => expect(onLogout).toHaveBeenCalled())
  })

  test('F4.1: creating an event sends the form and shows a confirmation', async () => {
    const user = userEvent.setup()
    let events = []
    const created = {
      ...welcome,
      id: 2,
      title: 'Chess Tournament',
      date: '2099-01-15 18:00:00',
      location: 'Room 204',
      maxCapacity: 30,
      currentCount: 0,
    }
    mockApi({
      'GET /club-admin/events': () => json({ events }),
      'GET /club-admin/clubs': json({ clubs: [chessClub] }),
      'POST /club-admin/events': () => {
        events = [created]
        return json({ message: 'Event created.', event: created }, 201)
      },
    })
    renderPage()

    await user.click(await screen.findByRole('button', { name: /create event/i }))
    expect(screen.getByRole('heading', { name: 'Create Event' })).toBeInTheDocument()

    fillValidForm()
    await user.click(screen.getByRole('button', { name: 'Create Event' }))

    expect(await screen.findByText('Event created.')).toBeInTheDocument()
    expect(await screen.findByText('Chess Tournament')).toBeInTheDocument()

    const [, options] = requestsWith('POST')[0]
    expect(options.headers.Authorization).toBe('Bearer club-token')
    expect(JSON.parse(options.body)).toEqual({
      clubId: 1,
      title: 'Chess Tournament',
      description: 'A friendly tournament for everyone.',
      date: '2099-01-15',
      time: '18:00',
      location: 'Room 204',
      maxCapacity: 30,
    })
  })

  test('F4.2: an invalid form shows an error and sends nothing', async () => {
    const user = userEvent.setup()
    mockApi(listHandlers())
    renderPage()

    await user.click(await screen.findByRole('button', { name: /create event/i }))
    await user.click(screen.getByRole('button', { name: 'Create Event' }))

    expect(screen.getByText('Event title must be between 3 and 100 characters.')).toBeInTheDocument()
    expect(requestsWith('POST')).toHaveLength(0)
  })

  test('F4.1: the server\'s error is shown and the form stays open', async () => {
    const user = userEvent.setup()
    mockApi({
      ...listHandlers(),
      'POST /club-admin/events': json({ message: 'You can only create events for your own active clubs.' }, 403),
    })
    renderPage()

    await user.click(await screen.findByRole('button', { name: /create event/i }))
    fillValidForm()
    await user.click(screen.getByRole('button', { name: 'Create Event' }))

    expect(await screen.findByText('You can only create events for your own active clubs.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Create Event' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create Event' })).toBeEnabled()
  })

  test('F4.3: editing shows the current values and saves the changes', async () => {
    const user = userEvent.setup()
    mockApi({
      ...listHandlers(),
      'PUT /club-admin/events/1': json({ message: 'Event updated.', event: { ...welcome, title: 'Welcome Week 2' } }),
    })
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Edit' }))

    expect(screen.getByRole('heading', { name: 'Edit Event' })).toBeInTheDocument()
    expect(screen.getByLabelText(/event title/i)).toHaveValue('Welcome Week')
    expect(screen.getByLabelText(/date/i)).toHaveValue('2026-11-20')
    expect(screen.getByLabelText(/time/i)).toHaveValue('10:00')
    expect(screen.getByLabelText(/maximum capacity/i)).toHaveValue(50)
    expect(screen.queryByLabelText(/club/i)).not.toBeInTheDocument()

    fill(/event title/i, 'Welcome Week 2')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(await screen.findByText('Event updated.')).toBeInTheDocument()
    const [url, options] = requestsWith('PUT')[0]
    expect(url).toBe(`${API}/club-admin/events/1`)
    expect(JSON.parse(options.body)).toEqual({
      clubId: 1,
      title: 'Welcome Week 2',
      description: 'Meet clubs and make friends.',
      date: '2026-11-20',
      time: '10:00',
      location: 'Main Hall',
      maxCapacity: 50,
    })
  })

  test('F4.3: capacity lower than the registered students is blocked', async () => {
    const user = userEvent.setup()
    mockApi(listHandlers())
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Edit' }))
    fill(/maximum capacity/i, '5')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(screen.getByText('Capacity cannot be lower than the 10 students already registered.')).toBeInTheDocument()
    expect(requestsWith('PUT')).toHaveLength(0)
  })

  test('F4.4: deleting asks for confirmation, then removes the event', async () => {
    const user = userEvent.setup()
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true)
    let events = [welcome]
    mockApi({
      'GET /club-admin/events': () => json({ events }),
      'GET /club-admin/clubs': json({ clubs: [chessClub] }),
      'DELETE /club-admin/events/1': () => {
        events = []
        return json({ message: 'Event deleted.' })
      },
    })
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Delete' }))

    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('10 registered student(s)'))
    expect(await screen.findByText('Event deleted.')).toBeInTheDocument()
    expect(screen.queryByText('Welcome Week')).not.toBeInTheDocument()
    expect(requestsWith('DELETE')).toHaveLength(1)
  })

  test('F4.4: cancelling the confirmation deletes nothing', async () => {
    const user = userEvent.setup()
    jest.spyOn(window, 'confirm').mockReturnValue(false)
    mockApi(listHandlers())
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Delete' }))

    expect(requestsWith('DELETE')).toHaveLength(0)
    expect(screen.getByText('Welcome Week')).toBeInTheDocument()
  })

  test('F4.5: View Students lists the registered students, and Back returns to the events', async () => {
    const user = userEvent.setup()
    mockApi({
      ...listHandlers(),
      'GET /club-admin/events/1/registrations': json({ event: welcome, students: [sara] }),
    })
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'View Students' }))

    expect(await screen.findByRole('heading', { name: 'Registered Students' })).toBeInTheDocument()
    expect(screen.getByText('Sara Ahmadi')).toBeInTheDocument()
    expect(screen.getByText(/00000042/)).toBeInTheDocument()
    expect(screen.getByText(/sara@test.com/)).toBeInTheDocument()
    expect(screen.getByText(/1 \/ 50 registered/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Back to my events' }))

    expect(await screen.findByRole('heading', { name: 'Manage Events' })).toBeInTheDocument()
  })

  test('F4.5: shows a message when nobody has registered yet', async () => {
    const user = userEvent.setup()
    mockApi({
      ...listHandlers(),
      'GET /club-admin/events/1/registrations': json({ event: welcome, students: [] }),
    })
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'View Students' }))

    expect(await screen.findByText('No students have registered yet')).toBeInTheDocument()
  })
})