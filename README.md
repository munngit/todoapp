# Todo App

A beginner-friendly Todo application built with Node.js, Express.js, SQLite, HTML, CSS, and vanilla JavaScript.

## Folder structure

- `package.json` - project metadata and dependencies
- `server.js` - Express backend and SQLite initialization
- `todos.db` - SQLite database file created automatically on first run
- `public/index.html` - frontend markup
- `public/style.css` - frontend styling
- `public/script.js` - frontend logic and API calls

## Setup instructions

1. Open a terminal in the project folder.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the app:

   ```bash
   npm start
   ```

4. Open your browser at:

   ```text
   http://localhost:3000
   ```

## How it works

- The server creates `todos.db` automatically if it does not exist.
- The SQLite `todos` table stores:
  - `id`
  - `title`
  - `completed`
  - `created_at`
- The frontend uses `fetch()` to call backend routes for CRUD operations.
- Todo actions include:
  - add new todo
  - view all todos
  - edit a todo
  - delete a todo
  - toggle completed / pending status

## API routes

- `GET /todos` - fetch all todos
- `POST /todos` - create a new todo
- `PUT /todos/:id` - update a todo title and completed state
- `DELETE /todos/:id` - delete a todo
- `PATCH /todos/:id/toggle` - toggle completed status

## Notes

- The UI updates dynamically after each action.
- All code is kept simple so it is easy to understand for beginners.

