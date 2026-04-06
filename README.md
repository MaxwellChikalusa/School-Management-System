# School Management System

This project now runs with:

- `FastAPI` backend
- `PostgreSQL` persistence
- automatic database and table creation on backend startup
- `React + Vite` frontend
- delete confirmation prompts in the format `Ara You Sure you Want to Delete "name"`
- an MSCE-style printable timetable layout

## Default PostgreSQL setup

The backend is configured to use these defaults if you do not provide environment variables:

- `POSTGRES_HOST=127.0.0.1`
- `POSTGRES_PORT=5432`
- `POSTGRES_USER=postgres`
- `POSTGRES_PASSWORD=2096`
- `POSTGRES_DB=school_management_system`

When the backend starts, it first connects to PostgreSQL, creates the `school_management_system` database if it does not exist, and then creates all required tables automatically.

## Run the backend

1. Open pgAdmin or PostgreSQL and make sure the `postgres` user password is `2096`.
2. Open a terminal in [school-management-backend](C:/Users/USER/Desktop/school%20management%20system/school-management-backend).
3. Create and activate a virtual environment.
4. Install packages with `pip install -r requirements.txt`.
5. Start the API with `uvicorn main:app --reload`.

The backend will be available at `http://127.0.0.1:8000`.

## Run the frontend

1. Open a second terminal in [school-management-frontend](C:/Users/USER/Desktop/school%20management%20system/school-management-frontend).
2. Install packages with `npm install`.
3. Start the app with `npm run dev`.

The frontend will be available at `http://127.0.0.1:5173`.

## Deployment notes

- Set `DATABASE_URL` in production if your hosting platform provides one.
- Set `ALLOWED_ORIGINS` to your deployed frontend URL.
- Set `VITE_API_URL` in the frontend build environment to your deployed backend URL.

## Default login

On first startup the backend creates this admin account automatically:

- username: `admin`
- password: `admin123`
