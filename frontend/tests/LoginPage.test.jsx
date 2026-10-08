import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../src/App'
import LoginPage from '../src/LoginPage'

describe('LoginPage', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  test('U9: submits credentials, displays the welcome message, and calls onLoginSuccess', async () => {
    const user = userEvent.setup()
    const authenticatedUser = {
      id: 12,
      fullName: 'Mina Taherzadeh',
      email: 'mina.taherzadeh@test.com',
      studentId: '00092277',
    }
    const sessionToken = 'signed-session-token'
    const onLoginSuccess = jest.fn()
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ user: authenticatedUser, token: sessionToken }),
    })
    render(<LoginPage onLoginSuccess={onLoginSuccess} />)

    await user.type(screen.getByLabelText('Email'), authenticatedUser.email)
    await user.type(screen.getByLabelText('Password'), 'Password1')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/login',
      expect.objectContaining({ method: 'POST' }),
    ))
    expect(await screen.findByText('Welcome back, Mina Taherzadeh!')).toBeInTheDocument()
    expect(onLoginSuccess).toHaveBeenCalledWith({
      ...authenticatedUser,
      sessionToken,
    })
  })

  test('displays the login error returned by the API', async () => {
    const user = userEvent.setup()
    global.fetch.mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Invalid email or password.' }),
    })
    render(<LoginPage />)

    await user.type(screen.getByLabelText('Email'), 'mina.taherzadeh@test.com')
    await user.type(screen.getByLabelText('Password'), 'WrongPassword1')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText('Invalid email or password.')).toBeInTheDocument()
  })

  test('calls onCreateAccount when the create account button is clicked', async () => {
    const user = userEvent.setup()
    const onCreateAccount = jest.fn()
    render(<LoginPage onCreateAccount={onCreateAccount} />)

    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(onCreateAccount).toHaveBeenCalledTimes(1)
  })
})

describe('App login flow', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  test('F1: login with correct credentials opens the dashboard', async () => {
    const user = userEvent.setup()
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        user: { id: 1, fullName: 'Test User', email: 'test@test.com', studentId: '12345678' },
        token: 'signed-session-token',
      }),
    })
    render(<App />)

    await user.type(screen.getByLabelText('Email'), 'test@test.com')
    await user.type(screen.getByLabelText('Password'), 'P@ssword1')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByRole('heading', { name: /hey, test/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument()
  })

  test('F2: login with incorrect credentials shows an error and stays on the login page', async () => {
    const user = userEvent.setup()
    global.fetch.mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Invalid email or password.' }),
    })
    render(<App />)

    await user.type(screen.getByLabelText('Email'), 'test@test.com')
    await user.type(screen.getByLabelText('Password'), 'WrongPass')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText('Invalid email or password.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /hey,/i })).not.toBeInTheDocument()
  })
})