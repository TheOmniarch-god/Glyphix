# Reverend Insanity — Test Lab (Webnovel Auth & Persistent Storage)

The dedicated staging environment modeling Webnovel's modal-based authentication, 6-digit email verification OTP, and persistent community reviews for **Reverend Insanity** (*The Omniarch Translation*).

## Key Features

1. **Heading Differentiation**:
   - Distinctive `[TEST LAB]` banner and badges on the navbar, hero, and chapter endings.
   - Shows live server connection status and provides a 1-click **Reset Test DB** utility button.

2. **Webnovel-Style Email Verification**:
   - Reader sign-up captures Handle, Email, and Password.
   - Dispatches a 6-digit OTP code to the email.
   - In-app **Test Lab Mailbox Dispatcher** banner displays the dispatched code with a **Click to auto-fill** button.
   - 6 individual digit input boxes with auto-advance, backspace navigation, and paste support.
   - 45s resend timer and real validation against `data/codes.json`.
   - Verified accounts are saved to `data/users.json` with `emailVerified: true` and a green `✓ Verified Reader` badge.

3. **Webnovel Google One-Tap**:
   - Realistic Google Account Chooser dialog (pre-populated test cultivator accounts or custom email).
   - Instant authentication saved to disk.

4. **Webnovel Review & Rating Modal**:
   - Compact popup dialog (`max-width: 480px`).
   - 5-Star overall rating picker with gold stars.
   - 4 aspect score selectors (Story Development, Character Design, World Building, Translation Quality).
   - Headline and detailed body textarea.
   - Spoiler warning checkbox (blurs spoilers by default with a "Show" toggle).
   - Chapter pin selector (e.g. pinned to Chapter 1, 2, 3, etc.).

5. **Persistent Storage (Server + Browser)**:
   - `data/users.json`: Registered reader profiles and credentials.
   - `data/reviews.json`: Community reviews, ratings, and upvotes (`👍 Helpful`).
   - `data/codes.json`: Active verification codes with 15-minute expiration.
   - `data/sessions.json`: Authentication tokens.
   - Browser `localStorage`: Reader sessions persist across tab closes and chapter navigations.

---

## How to Run

```bash
# 1. Start the backend server (serves static files and API endpoints on port 3001)
python3 server.py

# 2. Open in your browser:
http://localhost:3001
```

If deployed to static hosting without a Python backend, the client-side JavaScript automatically falls back to browser `localStorage` so all flows continue to function!
