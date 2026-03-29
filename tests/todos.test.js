const request = require('supertest');

// Set up the test database before loading the app.
process.env.TODO_DB_PATH = ':memory:';
const { app, db } = require('../server');

// Helper to run SQL queries with promises.
function runSql(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

function 
allSql(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

describe('Todo API', () => {
  beforeAll(async () => {
    // Ensure the todos table exists before any test runs.
    await runSql(
      `CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`
    );
  });

  beforeEach(async () => {
    // Ensure each test starts with an empty todos table.
    await runSql('DELETE FROM todos');
  });

  afterAll(async () => {
    // Close the SQLite connection so Jest can exit cleanly.
    await new Promise((resolve, reject) => {
      db.close((err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  });

  test('GET /todos should return an empty array when no todos exist', async () => {
    const response = await request(app).get('/todos');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  test('GET /todos should return all todos', async () => {
    await runSql('INSERT INTO todos (title, completed) VALUES (?, ?)', ['Test todo', 0]);

    const response = await request(app).get('/todos');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(1);
    expect(response.body[0]).toMatchObject({ title: 'Test todo', completed: 0 });
  });

  test('POST /todos should create a new todo', async () => {
    const response = await request(app).post('/todos').send({ title: 'Buy milk' });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ id: expect.any(Number), title: 'Buy milk', completed: 0 });

    const rows = await allSql('SELECT * FROM todos WHERE id = ?', [response.body.id]);
    expect(rows.length).toBe(1);
    expect(rows[0].title).toBe('Buy milk');
  });

  test('POST /todos should return an error if title is missing or empty', async () => {
    const emptyResponse = await request(app).post('/todos').send({ title: '' });
    expect(emptyResponse.status).toBe(400);
    expect(emptyResponse.body).toEqual({ error: 'Todo title is required' });

    const missingResponse = await request(app).post('/todos').send({});
    expect(missingResponse.status).toBe(400);
    expect(missingResponse.body).toEqual({ error: 'Todo title is required' });
  });

  test('PUT /todos/:id should update the title of an existing todo', async () => {
    const inserted = await runSql('INSERT INTO todos (title, completed) VALUES (?, ?)', ['Original title', 0]);
    const todoId = inserted.lastID;

    const response = await request(app).put(`/todos/${todoId}`).send({ title: 'Updated title' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: todoId, title: 'Updated title', completed: 0 });

    const rows = await allSql('SELECT title, completed FROM todos WHERE id = ?', [todoId]);
    expect(rows[0]).toEqual({ title: 'Updated title', completed: 0 });
  });

  test('PUT /todos/:id should update completed status if sent', async () => {
    const inserted = await runSql('INSERT INTO todos (title, completed) VALUES (?, ?)', ['Finish homework', 0]);
    const todoId = inserted.lastID;

    const response = await request(app)
      .put(`/todos/${todoId}`)
      .send({ title: 'Finish homework', completed: true });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: todoId, title: 'Finish homework', completed: 1 });

    const rows = await allSql('SELECT title, completed FROM todos WHERE id = ?', [todoId]);
    expect(rows[0]).toEqual({ title: 'Finish homework', completed: 1 });
  });

  test('PUT /todos/:id should return 404 if todo does not exist', async () => {
    const response = await request(app).put('/todos/9999').send({ title: 'Missing todo' });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Todo not found' });
  });

  test('DELETE /todos/:id should delete an existing todo', async () => {
    const inserted = await runSql('INSERT INTO todos (title, completed) VALUES (?, ?)', ['Delete me', 0]);
    const todoId = inserted.lastID;

    const response = await request(app).delete(`/todos/${todoId}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Todo deleted' });

    const rows = await allSql('SELECT * FROM todos WHERE id = ?', [todoId]);
    expect(rows).toHaveLength(0);
  });

  test('DELETE /todos/:id should return 404 if todo does not exist', async () => {
    const response = await request(app).delete('/todos/9999');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Todo not found' });
  });

  test('PATCH /todos/:id/toggle should mark a pending todo as completed', async () => {
    const inserted = await runSql('INSERT INTO todos (title, completed) VALUES (?, ?)', ['Toggle me', 0]);
    const todoId = inserted.lastID;

    const response = await request(app).patch(`/todos/${todoId}/toggle`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: todoId, title: 'Toggle me', completed: 1 });
  });

  test('PATCH /todos/:id/toggle should mark a completed todo as pending', async () => {
    const inserted = await runSql('INSERT INTO todos (title, completed) VALUES (?, ?)', ['Toggle back', 1]);
    const todoId = inserted.lastID;

    const response = await request(app).patch(`/todos/${todoId}/toggle`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: todoId, title: 'Toggle back', completed: 0 });
  });

  test('invalid input should return proper status codes', async () => {
    const response = await request(app).put('/todos/1').send({ title: '' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Todo title is required' });
  });

  test('database-related failures should return server error if applicable', async () => {
    const originalAll = db.all;
    db.all = (sql, params, callback) => callback(new Error('Mock DB failure'));

    try {
      const response = await request(app).get('/todos');
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to retrieve todos' });
    } finally {
      db.all = originalAll;
    }
  });
});
