import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SignUpPage from '../src/SignUpPage'

describe('SignUpPage', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  test('shows an error and does not submit when passwords do not match', async () => {
    const user = userEvent.setup()
    render(<SignUpPage />)

    await user.type(screen.getByLabelText('Password'), 'Password1')
    await user.type(screen.getByLabelText('Confirm password'), 'Different1')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  test('F3: registers a new student by submitting the completed form', async () => {
    const user = userEvent.setup()
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Registration successful.' }),
    })
    render(<SignUpPage />)

    await user.type(screen.getByLabelText('Full Name'), 'Mina Taherzadeh')
    await user.type(screen.getByLabelText('Email'), 'Mina.taherzadeh@test.com')
    await user.type(screen.getByLabelText('Student ID'), '00092277')
    await user.type(screen.getByLabelText('Password'), 'Password1')
    await user.type(screen.getByLabelText('Confirm password'), 'Password1')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/signup',
      expect.objectContaining({ method: 'POST' }),
    ))
    expect(await screen.findByText('Account created successfully!')).toBeInTheDocument()
    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({
      fullName: 'Mina Taherzadeh',
      email: 'Mina.taherzadeh@test.com',
      studentId: '00092277',
      password: 'Password1',
    })
  })

  test('displays a duplicate-account error returned by the API', async () => {
    const user = userEvent.setup()
    global.fetch.mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Email address is already registered.' }),
    })
    render(<SignUpPage />)

    await user.type(screen.getByLabelText('Full Name'), 'Mina Taherzadeh')
    await user.type(screen.getByLabelText('Email'), 'Mina.taherzadeh@test.com')
    await user.type(screen.getByLabelText('Student ID'), '00092277')
    await user.type(screen.getByLabelText('Password'), 'Password1')
    await user.type(screen.getByLabelText('Confirm password'), 'Password1')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByText('Email address is already registered.')).toBeInTheDocument()
  })

  test('calls onBackToLogin when the sign-in button is clicked', async () => {
    const user = userEvent.setup()
    const onBackToLogin = jest.fn()
    render(<SignUpPage onBackToLogin={onBackToLogin} />)

    await user.click(screen.getByRole('button', { name: /already have an account/i }))

    expect(onBackToLogin).toHaveBeenCalledTimes(1)
  })
})