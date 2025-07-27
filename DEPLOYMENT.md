# TrackFlow Deployment Guide

This guide will help you deploy both the frontend and backend to Railway.

## Prerequisites

1. A Railway account
2. A GitHub repository with your TrackFlow code
3. A Supabase database (for the backend)
4. Spotify API credentials (for the backend)

## Step 1: Deploy Backend

1. **Create a new Railway project**

   - Go to [Railway](https://railway.app)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your TrackFlow repository

2. **Configure the backend**

   - In the Railway project settings, set **Root Directory** to `backend`
   - This tells Railway to use the `backend/Dockerfile`

3. **Add environment variables**

   - Go to the "Variables" tab
   - Add the following variables:
     ```
     DATABASE_URL=your_supabase_postgresql_url
     SPOTIFY_CLIENT_ID=your_spotify_client_id
     SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
     ```

4. **Deploy**
   - Railway will automatically build and deploy your backend
   - Note the generated URL (e.g., `https://your-backend-app.railway.app`)

## Step 2: Deploy Frontend

1. **Create another Railway project**

   - Go to [Railway](https://railway.app)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose the same TrackFlow repository

2. **Configure the frontend**

   - In the Railway project settings, set **Root Directory** to `frontend`
   - This tells Railway to use the `frontend/Dockerfile`

3. **Add environment variables**

   - Go to the "Variables" tab
   - Add the following variable:
     ```
     REACT_APP_API_URL=https://your-backend-app.railway.app
     ```
   - Replace `your-backend-app.railway.app` with your actual backend URL

4. **Deploy**
   - Railway will automatically build and deploy your frontend
   - Your frontend will be available at the generated URL

## Step 3: Test the Deployment

1. **Test the backend**

   - Visit your backend URL + `/docs` (e.g., `https://your-backend-app.railway.app/docs`)
   - You should see the FastAPI documentation

2. **Test the frontend**
   - Visit your frontend URL
   - The app should load and connect to your backend

## Troubleshooting

### Backend Issues

- **Database connection errors**: Check your `DATABASE_URL` environment variable
- **Spotify API errors**: Verify your Spotify credentials
- **Build failures**: Check the Railway build logs for Python dependency issues

### Frontend Issues

- **API connection errors**: Verify the `REACT_APP_API_URL` points to your backend
- **Build failures**: Check the Railway build logs for Node.js dependency issues
- **CORS errors**: The backend is configured to allow requests from any origin

### Environment Variables

Make sure all environment variables are set correctly:

- Backend: `DATABASE_URL`, `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`
- Frontend: `REACT_APP_API_URL`

## Local Development

To run both services locally:

```bash
# From the trackflow root directory
./dev.sh
```

This will start:

- Backend on `http://localhost:8000`
- Frontend on `http://localhost:3000`
