# LeadFlow CRM Frontend

## 1. Install
Open a terminal in this `client` folder:

```bash
npm install
```

## 2. Environment
Create `.env` from `.env.example`:

```env
VITE_API_URL=http://localhost:5000/api
```

## 3. Run
```bash
npm run dev
```

Open the URL Vite shows, normally `http://localhost:5173`.

## 4. Backend
Keep the existing backend running in another terminal:

```bash
cd ../server
npm run dev
```

## API assumptions
The frontend calls:
- POST `/api/auth/register`
- POST `/api/auth/login`
- GET `/api/leads`
- POST `/api/leads`
- PUT `/api/leads/:id`
- PATCH `/api/leads/:id`
- DELETE `/api/leads/:id`

The login response should expose an access token as:
`session.access_token`, `access_token`, or `token`.

If your existing update/delete route names differ, only `src/api.js` needs to be changed.
