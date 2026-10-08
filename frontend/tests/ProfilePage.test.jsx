import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProfilePage from '../src/ProfilePage'

const signedInUser = { id: 12 }

const profileResponse = {
  ok: true,
  json: async () => ({
    user: {
      id: 12,
      fullName: 'Mina Taherzadeh',
      email: 'mina.taherzadeh@test.com',
      studentId: '00092277',
      memberSince: '2026-01-15 10:00:00',
    },
    clubs: [{ id: 1, name: 'Chess Club' }],
    events: [{ id: 1, title: 'Welcome Week', date: '2026-09-01' }],
    points: 25,
  }),
}

describe('ProfilePage', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  test('F4: displays the profile information', async () => {
    global.fetch.mockResolvedValueOnce(profileResponse)
    render(<ProfilePage user={signedInUser} />)

    expect(await screen.findByRole('heading', { name: 'Mina Taherzadeh' })).toBeInTheDocument()
    expect(global.fetch).toHaveBeenCalledWith('http://localhost:3001/api/profile/12')
    expect(screen.getByText(/00092277/)).toBeInTheDocument()
    expect(screen.getByText('mina.taherzadeh@test.com')).toBeInTheDocument()
    expect(screen.getByText('Member Since')).toBeInTheDocument()
    expect(screen.getByText('Chess Club')).toBeInTheDocument()
    expect(screen.getByText('Welcome Week')).toBeInTheDocument()
    expect(screen.getByText('25')).toBeInTheDocument()
  })

  test('F5: saves changes to the name, email, and password', async () => {
    const user = userEvent.setup()
    global.fetch
      .mockResolvedValueOnce(profileResponse)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: {
            id: 12,
            fullName: 'Mina Updated',
            email: 'mina.updated@test.com',
            studentId: '00092277',
            memberSince: '2026-01-15 10:00:00',
          },
        }),
      })
    render(<ProfilePage user={signedInUser} />)

    await screen.findByRole('heading', { name: 'Mina Taherzadeh' })
    await user.click(screen.getByRole('button', { name: /account settings/i }))

    await user.clear(screen.getByLabelText(/full name/i))
    await user.type(screen.getByLabelText(/full name/i), 'Mina Updated')
    await user.clear(screen.getByLabelText(/email/i))
    await user.type(screen.getByLabelText(/email/i), 'mina.updated@test.com')
    await user.type(screen.getByLabelText(/new password/i), 'NewPassword1')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/profile/12',
      expect.objectContaining({ method: 'PUT' }),
    ))
    expect(JSON.parse(global.fetch.mock.calls[1][1].body)).toEqual({
      fullName: 'Mina Updated',
      email: 'mina.updated@test.com',
      password: 'NewPassword1',
    })
    expect(await screen.findByText('Profile updated successfully!')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Mina Updated' })).toBeInTheDocument()
  })
})
