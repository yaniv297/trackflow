# TrackFlow

A music management system with separate frontend and backend components.

## Project Structure

```
trackflow/
├── frontend/          # React frontend application
│   ├── Dockerfile     # Frontend Dockerfile for Railway
│   ├── railway.json   # Railway configuration for frontend
│   └── src/           # React source code
├── backend/           # FastAPI backend application
│   ├── Dockerfile     # Backend Dockerfile for Railway
│   ├── railway.json   # Railway configuration for backend
│   ├── main.py        # FastAPI application entry point
│   ├── api/           # API route modules
│   ├── models.py      # Database models
│   ├── database.py    # Database configuration
│   └── requirements.txt # Python dependencies
└── README.md          # This file
```

## Deployment

### Backend (Railway)

1. Create a new Railway project for the backend
2. Connect your GitHub repository
3. Set the **Root Directory** to `backend`
4. Add environment variables:
   - `DATABASE_URL` - Your Supabase PostgreSQL URL
   - `SPOTIFY_CLIENT_ID` - Your Spotify API client ID
   - `SPOTIFY_CLIENT_SECRET` - Your Spotify API client secret

### Frontend (Railway)

1. Create a new Railway project for the frontend
2. Connect the same GitHub repository
3. Set the **Root Directory** to `frontend`
4. Add environment variables:
   - `REACT_APP_API_URL` - Your backend Railway URL (e.g., `https://your-backend-app.railway.app`)

## Local Development

### Backend

```bash
cd backend
pip install -r requirements.txt
python main.py
```

The backend will run on `http://localhost:8000`

### Frontend

```bash
cd frontend
npm install
npm start
```

The frontend will run on `http://localhost:3000` and automatically connect to the backend on `http://localhost:8001`

## Environment Variables

### Backend (.env)

```
DATABASE_URL=your_supabase_url
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
```

### Frontend (.env)

```
REACT_APP_API_URL=http://localhost:8001
```

## Features

- Music library management
- Spotify integration for metadata
- Album series management
- Bulk operations
- Collaboration tracking
- Statistics and analytics
