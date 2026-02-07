# Digital Time Capsule (Future Message Locker)

A full-stack starter for creating encrypted time capsules with scheduled release and secure recipient access. Content is encrypted on the client with AES-256 (Web Crypto), stored as ciphertext on the server, and released only after the unlock condition is met.

## Features
- Create text capsules, attach encrypted files, and store ciphertext only
- Client-side AES-256-GCM encryption with PBKDF2 key derivation
- Scheduled unlocks via background cron
- Event-based triggers for manual release
- Secure sharing with per-recipient access tokens
- JWT authentication and role-scoped access
- Modern, mobile-ready UI

## Tech Stack
- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MongoDB (Mongoose)
- Storage: Local filesystem or AWS S3
- Scheduler: node-cron

## Project Structure
- `backend/` Express API, scheduler, MongoDB models
- `frontend/` React UI and client-side crypto

## Backend Setup
1. Install dependencies
   - `cd backend`
   - `npm install`
2. Configure environment
   - Copy `backend/.env.example` to `backend/.env`
3. Start the API
   - `npm run dev`

## Frontend Setup
1. Install dependencies
   - `cd frontend`
   - `npm install`
2. Configure environment
   - Copy `frontend/.env.example` to `frontend/.env`
3. Start the app
   - `npm run dev`

## Notes on End-to-End Encryption
- The passphrase never leaves the browser.
- The backend stores only ciphertext and metadata (salt/iv), so even if the server is compromised, plaintext remains protected.
- Recipients must receive both their access token and the passphrase out-of-band.

## Release Flow
- Date trigger: Capsules are automatically released once `unlockAt` is reached.
- Event trigger: Owner manually releases the capsule.
- Recipients can only open released capsules using their access ID + secret.

## Security Checklist (Implemented)
- JWT-based authentication and authorization
- AES-256-GCM encryption client-side
- Encrypted storage and transmission
- Scheduled unlock logic via cron

## Next Extensions
- Email notifications for released capsules
- Audit logs per capsule
- Multi-factor authentication
- Download endpoints for encrypted attachments

