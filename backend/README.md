# Backend configuration

Password reset emails are sent with the [Brevo](https://www.brevo.com) transactional email API.
Free plan: 300 emails/day, and it can send to any recipient (no domain purchase needed).

## Setup (one time)

1. Create a free account at https://app.brevo.com.
2. Add and verify a sender: **Settings > Senders, Domains & Dedicated IPs > Senders > Add a sender**,
   then click the confirmation link Brevo emails you.
3. Create an API key: **SMTP & API > API Keys > Generate a new API key**.
4. Create `backend/.env` (git-ignored) and add:

```
BREVO_API_KEY=your_api_key
BREVO_SENDER_EMAIL=the_sender_address_you_verified
```

5. Start the backend normally - the values load automatically:

```powershell
cd backend
node index.js
```

## Environment variables

All go in `backend/.env`:

- `BREVO_API_KEY` (required) - Brevo API key.
- `BREVO_SENDER_EMAIL` (required) - sender address verified in Brevo.
- `BREVO_SENDER_NAME` (optional) - display name, defaults to `Campus Connect`.
- `FRONTEND_URL` (optional) - app origin used in reset links, defaults to `http://localhost:5173`.
- `PASSWORD_RESET_SECRET` (optional) - stable private secret of at least 32 characters. Defaults to `JWT_SECRET`.

## Notes

- Brevo cannot authenticate free-mail domains such as gmail.com. A verified Gmail sender may work for
  testing, but messages can be marked as spam or rejected by some recipients. For reliable delivery,
  verify a domain you own in Brevo and use an address on it.
- Reset links expire after 30 minutes. No password-reset table is used; links are
  signed tokens and are invalidated when the account password changes.
- Never commit `.env` - it is already listed in the root `.gitignore`.