import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ClubRequestPage from '../src/ClubRequestPage'

const API = 'http://localhost:3001/api'
const student = {
  id: 10,
  fullName: 'Mina Taherzadeh',
  email: 'mina.taherzadeh@test.com',
  studentId: '00092277',
  sessionToken: 'student-token',
}

const noRequests = { ok: true, status: 200, json: async () => ({ requests: [] }) }
const submittedResponse = {
  ok: true,
  status: 201,
  json: async () => ({
    message: 'Your club request has been submitted. An administrator will review it soon.',
    request: { id: 3, clubName: 'Chess Club', status: 'pending', submittedAt: '2026-11-04 10:00:00' },
  }),
}

async function fillForm(user, clubName = 'Chess Club') {
  await user.type(screen.getByLabelText(/proposed club name/i), clubName)
  await user.type(screen.getByLabelText(/club description/i), 'A friendly club for chess players of every skill level.')
  await user.type(screen.getByLabelText(/purpose and planned activities/i), 'Weekly games, tournaments and beginner lessons.')
}

describe('ClubRequestPage', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  test('shows the request form with the student name, ID and email filled in', async () => {
    global.fetch.mockResolvedValueOnce(noRequests)
    render(<ClubRequestPage user={student} onBack={jest.fn()} onLogout={jest.fn()} />)

    expect(await screen.findByText(/you haven't requested a club yet/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/your name/i)).toHaveValue('Mina Taherzadeh')
    expect(screen.getByLabelText(/student id/i)).toHaveValue('00092277')
    expect(screen.getByLabelText(/contact email/i)).toHaveValue('mina.taherzadeh@test.com')
    expect(screen.getByLabelText(/proposed club name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/club description/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/purpose and planned activities/i)).toBeInTheDocument()
  })

  test('submits a valid request, shows a success message and lists it as pending', async () => {
    const user = userEvent.setup()
    global.fetch.mockResolvedValueOnce(noRequests).mockResolvedValueOnce(submittedResponse)
    render(<ClubRequestPage user={student} onBack={jest.fn()} onLogout={jest.fn()} />)
    await screen.findByText(/you haven't requested a club yet/i)

    await fillForm(user)
    await user.click(screen.getByRole('button', { name: /submit request/i }))

    expect(await screen.findByText(/your club request has been submitted/i)).toBeInTheDocument()
    expect(screen.getByText('Chess Club')).toBeInTheDocument()
    expect(screen.getByText('pending')).toBeInTheDocument()
    expect(global.fetch).toHaveBeenLastCalledWith(
      `${API}/club-requests`,
      expect.objectContaining({ method: 'POST' }),
    )
    expect(JSON.parse(global.fetch.mock.calls[1][1].body)).toMatchObject({
      clubName: 'Chess Club',
      contactEmail: 'mina.taherzadeh@test.com',
    })
  })

  test('shows an error and sends nothing when the club name is too short', async () => {
    const user = userEvent.setup()
    global.fetch.mockResolvedValueOnce(noRequests)
    render(<ClubRequestPage user={student} onBack={jest.fn()} onLogout={jest.fn()} />)
    await screen.findByText(/you haven't requested a club yet/i)

    await fillForm(user, 'ab')
    await user.click(screen.getByRole('button', { name: /submit request/i }))

    expect(await screen.findByText(/club name must be between 3 and 60 characters/i)).toBeInTheDocument()
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  test('shows the server error when the club name is already taken', async () => {
    const user = userEvent.setup()
    global.fetch
      .mockResolvedValueOnce(noRequests)
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ message: 'A club with this name already exists or has been requested.' }),
      })
    render(<ClubRequestPage user={student} onBack={jest.fn()} onLogout={jest.fn()} />)
    await screen.findByText(/you haven't requested a club yet/i)

    await fillForm(user)
    await user.click(screen.getByRole('button', { name: /submit request/i }))

    expect(await screen.findByText(/already exists or has been requested/i)).toBeInTheDocument()
  })

  test('prevents duplicate submissions while the request is being sent (NF5.2)', async () => {
    const user = userEvent.setup()
    let finish
    global.fetch
      .mockResolvedValueOnce(noRequests)
      .mockReturnValueOnce(new Promise((resolve) => { finish = resolve }))
    render(<ClubRequestPage user={student} onBack={jest.fn()} onLogout={jest.fn()} />)
    await screen.findByText(/you haven't requested a club yet/i)

    await fillForm(user)
    await user.click(screen.getByRole('button', { name: /submit request/i }))

    const busyButton = await screen.findByRole('button', { name: /submitting/i })
    expect(busyButton).toBeDisabled()
    await user.click(busyButton)
    expect(global.fetch).toHaveBeenCalledTimes(2)

    await act(async () => {
      finish(submittedResponse)
    })
  })

  test('a student with a pending request sees a notice instead of the form', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        requests: [{ id: 3, clubName: 'Chess Club', status: 'pending', submittedAt: '2026-11-04 10:00:00' }],
      }),
    })
    render(<ClubRequestPage user={student} onBack={jest.fn()} onLogout={jest.fn()} />)

    expect(await screen.findByText(/already have a request waiting for review/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /submit request/i })).not.toBeInTheDocument()
  })
})