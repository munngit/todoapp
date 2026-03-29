const todoInput = document.getElementById('todo-input');
const addButton = document.getElementById('add-button');
const todoList = document.getElementById('todo-list');
const statusMessage = document.getElementById('status-message');

// Load all todos when the page opens.
window.addEventListener('DOMContentLoaded', () => {
  loadTodos();
});

// Add a new todo when the button is clicked.
addButton.addEventListener('click', async () => {
  const title = todoInput.value.trim();
  if (!title) {
    showStatus('Please enter a todo title.');
    return;
  }

  await createTodo(title);
  todoInput.value = '';
  await loadTodos();
});

// Show a short status message to the user.
function showStatus(message) {
  statusMessage.textContent = message;
  setTimeout(() => {
    statusMessage.textContent = '';
  }, 2500);
}

// Fetch all todos from the backend.
async function loadTodos() {
  try {
    const response = await fetch('/todos');
    const todos = await response.json();
    renderTodos(todos);
  } catch (error) {
    console.error('Error loading todos:', error);
    showStatus('Could not load todos.');
  }
}

// Create a new todo on the server.
async function createTodo(title) {
  try {
    const response = await fetch('/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create todo');
    }
  } catch (error) {
    console.error('Create todo error:', error);
    showStatus('Could not create todo.');
  }
}

// Update a todo title.
async function updateTodo(id, title, completed) {
  try {
    const response = await fetch(`/todos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, completed }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update todo');
    }
  } catch (error) {
    console.error('Update todo error:', error);
    showStatus('Could not update todo.');
  }
}

// Delete a todo by id.
async function deleteTodo(id) {
  try {
    const response = await fetch(`/todos/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete todo');
    }
  } catch (error) {
    console.error('Delete todo error:', error);
    showStatus('Could not delete todo.');
  }
}

// Toggle the completed status on the server.
async function toggleTodo(id) {
  try {
    const response = await fetch(`/todos/${id}/toggle`, {
      method: 'PATCH',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to toggle todo');
    }
  } catch (error) {
    console.error('Toggle todo error:', error);
    showStatus('Could not toggle todo status.');
  }
}

// Render the list of todos in the page.
function renderTodos(todos) {
  todoList.innerHTML = '';

  if (!todos.length) {
    todoList.innerHTML = '<li class="todo-item"><p class="todo-title">No todos yet. Add your first task above.</p></li>';
    return;
  }

  todos.forEach((todo) => {
    const item = document.createElement('li');
    item.className = `todo-item${todo.completed ? ' completed' : ''}`;

    const title = document.createElement('div');
    title.innerHTML = `
      <p class="todo-title">${escapeHtml(todo.title)}</p>
      <div class="todo-meta">${todo.completed ? 'Completed' : 'Pending'} • Created: ${new Date(todo.created_at).toLocaleString()}</div>
    `;

    const actions = document.createElement('div');
    actions.className = 'todo-actions';

    const toggleButton = document.createElement('button');
    toggleButton.className = 'complete';
    toggleButton.textContent = todo.completed ? 'Mark Pending' : 'Mark Complete';
    toggleButton.addEventListener('click', async () => {
      await toggleTodo(todo.id);
      await loadTodos();
    });

    const editButton = document.createElement('button');
    editButton.textContent = 'Edit';
    editButton.addEventListener('click', async () => {
      const newTitle = window.prompt('Edit todo title:', todo.title);
      if (!newTitle || !newTitle.trim()) {
        return;
      }
      await updateTodo(todo.id, newTitle.trim(), todo.completed);
      await loadTodos();
    });

    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete';
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', async () => {
      const confirmed = window.confirm('Delete this todo?');
      if (!confirmed) {
        return;
      }
      await deleteTodo(todo.id);
      await loadTodos();
    });

    actions.append(toggleButton, editButton, deleteButton);
    item.append(title, actions);
    todoList.appendChild(item);
  });
}

// Simple helper to escape HTML content.
function escapeHtml(text) {
  return text.replace(/[&<>"]+/g, (match) => {
    const escapeMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
    };
    return escapeMap[match] || match;
  });
}
