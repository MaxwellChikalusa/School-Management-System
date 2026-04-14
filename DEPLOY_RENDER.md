# Render Deployment Guide

This repository is now prepared for a Render Blueprint deploy using `render.yaml`.

## What I already prepared

- Added a root `render.yaml` so Render can create:
  - `school-management-frontend` as a static site
  - `school-management-api` as a FastAPI web service
  - `school-management-db` as a Render Postgres database
- Updated the frontend to accept either `VITE_API_URL` or a Render-provided `VITE_API_HOST`.
- Updated the backend to:
  - accept a Render-provided `FRONTEND_HOST` for CORS
  - normalize Render-style Postgres URLs for SQLAlchemy

## Important note before deploying

Your backend code is built for PostgreSQL. The local file `school-management-backend/school_management.db` does not appear to be part of the active connection setup. That means your Render Postgres database will start empty unless:

- your current real data is already in PostgreSQL, or
- we import existing data into the new Render Postgres database after deployment

If you want, I can help with a data migration next.

## What you need to do in Render

1. Push the latest code to GitHub.
2. Sign in to Render.
3. In Render, click `New` -> `Blueprint`.
4. Connect your GitHub account to Render if prompted.
5. Select this repository:
   `MaxwellChikalusa/School-Management-System`
6. Render should detect the root `render.yaml`.
7. Review the three resources that will be created:
   - static site: `school-management-frontend`
   - web service: `school-management-api`
   - postgres: `school-management-db`
8. Click `Apply`.

## What Render should use

These values are already defined in `render.yaml`:

- Frontend
  - Type: `Static Site`
  - Root Directory: `school-management-frontend`
  - Build Command: `npm install && npm run build`
  - Publish Directory: `school-management-frontend/dist`
- Backend
  - Type: `Web Service`
  - Runtime: `Python`
  - Root Directory: `school-management-backend`
  - Build Command: `pip install -r requirements.txt`
  - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
  - Health Check Path: `/health`
- Database
  - Type: `PostgreSQL`
  - Database Name: `school_management_system`

## What happens automatically

- Render injects the Postgres `DATABASE_URL` into the backend.
- Render injects the backend host into the frontend as `VITE_API_HOST`.
- Render injects the frontend host into the backend as `FRONTEND_HOST`.
- The frontend rewrites all routes to `index.html`, which is required for React Router.

## What you should verify after deploy

1. Open the backend health endpoint:
   `https://<your-backend>.onrender.com/health`
2. Open the frontend URL from Render.
3. Try:
   - login page load
   - signup page load
   - API-backed pages after login
4. Confirm there are no CORS errors in the browser console.

## If the deploy fails

Check these places in Render:

- Backend logs
- Frontend build logs
- Database creation event logs

Common causes:

- Render account not yet connected to GitHub
- Free Postgres limit already used in your workspace
- Existing database data needs migration

## Important Render limits

According to Render's current docs:

- Free web services spin down after idle time.
- Free Postgres databases expire after 30 days.
- Static sites are free.

## If you want me to continue

After you do the Render dashboard steps, send me:

- the frontend Render URL
- the backend Render URL
- any build or runtime error from Render logs

Then I'll help you finish the last mile and fix anything that appears.
