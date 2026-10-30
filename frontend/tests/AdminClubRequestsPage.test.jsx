import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminClubRequestsPage from '../src/AdminClubRequestsPage'

const API = 'http://localhost:3001/api'
const admin = { id: 1, fullName: 'Admin User', role: 'platform_admin', sessionToken: 'admin-token' }

const pendingRequest = {
  id: 5,
  clubName: 'Chess Club',
  requesterName: 'Sara Ahmed',
  studentId: '00123456',
  contactEmail: 'chess@test.com',
  description: 'A friendly club for chess players of every skill level.',
  purpose: 'Weekly games, tournaments and beginner lessons.',
  status: 'pending',
  submittedAt: '2026-11-04 10:00:00',
}

const listResponse = (requests) => ({ ok: true, status: 200, json: async () => ({ requests }) })

describe('AdminClubRequestsPage', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  test('lists the pending requests with the details the admin needs', async () => {
    global.fetch.mockResolvedValueOnce(listResponse([pendingRequest]))
    render(<AdminClubRequestsPage user={admin} onBack={jest.fn()} onLogout={jest.fn()} />)

    expect(await screen.findByText('Chess Club')).toBeInTheDocument()
    expect(screen.getByText(/Sara Ahmed/)).toBeInTheDocument()
    expect(screen.getByText(/00123456/)).toBeInTheDocument()
    expect(screen.getByText(/chess@test\.com/)).toBeInTheDocument()
    expect(screen.getByText(/friendly club for chess players/i)).toBeInTheDocument()
    expect(screen.getByText(/Weekly games, tournaments/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument()
    expect(global.fetch).toHaveBeenCalledWith(
      `${API}/admin/club-requests`,
      expect.objectContaining({ headers: { Authorization: 'Bearer admin-token' } }),
    )
  })

  test('shows a message when there are no pending requests', async () => {
    global.fetch.mockResolvedValueOnce(listResponse([]))
    render(<AdminClubRequestsPage user={admin} onBack={jest.fn()} onLogout={jest.fn()} />)

    expect(await screen.findByText(/no pending club requests/i)).toBeInTheDocument()
  })

  test('approving a request shows a success message and removes it from the list', async () => {
    const user = userEvent.setup()
    global.fetch
      .mockResolvedValueOnce(listResponse([pendingRequest]))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ message: 'Club request approved. The club is now active.' }),
      })
      .mockResolvedValueOnce(listResponse([]))
    render(<AdminClubRequestsPage user={admin} onBack={jest.fn()} onLogout={jest.fn()} />)

    await user.click(await screen.findByRole('button', { name: /approve/i }))

    expect(await screen.findByText(/club request approved/i)).toBeInTheDocument()
    expect(await screen.findByText(/no pending club requests/i)).toBeInTheDocument()
    expect(global.fetch).toHaveBeenCalledWith(
      `${API}/admin/club-requests/5/approve`,
      expect.objectContaining({ method: 'POST', headers: { Authorization: 'Bearer admin-token' } }),
    )
  })

  test('rejecting a request shows a message and removes it from the list', async () => {
    const user = userEvent.setup()
    global.fetch
      .mockResolvedValueOnce(listResponse([pendingRequest]))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ message: 'Club request rejected.' }),
      })
      .mockResolvedValueOnce(listResponse([]))
    render(<AdminClubRequestsPage user={admin} onBack={jest.fn()} onLogout={jest.fn()} />)

    await user.click(await screen.findByRole('button', { name: /reject/i }))

    expect(await screen.findByText(/club request rejected/i)).toBeInTheDocument()
    expect(await screen.findByText(/no pending club requests/i)).toBeInTheDocument()
    expect(global.fetch).toHaveBeenCalledWith(
      `${API}/admin/club-requests/5/reject`,
      expect.objectContaining({ method: 'POST' }),
    )
  })

  test('shows the server error when the review fails', async () => {
    const user = userEvent.setup()
    global.fetch
      .mockResolvedValueOnce(listResponse([pendingRequest]))
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ message: 'This request has already been reviewed.' }),
      })
      .mockResolvedValueOnce(listResponse([pendingRequest]))
    render(<AdminClubRequestsPage user={admin} onBack={jest.fn()} onLogout={jest.fn()} />)

    await user.click(await screen.findByRole('button', { name: /approve/i }))

    expect(await screen.findByText(/already been reviewed/i)).toBeInTheDocument()
  })

  test('a non-admin sees "Administrator access required" and cannot review requests', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ message: 'Administrator access required.' }),
    })
    render(<AdminClubRequestsPage user={admin} onBack={jest.fn()} onLogout={jest.fn()} />)

    expect(await screen.findByText(/administrator access required/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument()
  })
})