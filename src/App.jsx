import { useState, useEffect } from 'react'
import './App.css'

const STORAGE_KEY = '411-todos'

const PERIODS = {
  month: { label: 'This month', days: 30 },
  week: { label: 'This week', days: 7 },
  day: { label: 'Today', days: 1 },
}

function normalizeItem(item) {
  const status = item.status != null ? String(item.status) : (item.done ? 'Done' : '')
  return { ...item, status }
}

function getStoredTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        month: (parsed.month || []).map(normalizeItem),
        week: (parsed.week || []).map(normalizeItem),
        day: (parsed.day || []).map(normalizeItem),
      }
    }
  } catch (_) {}
  return { month: [], week: [], day: [] }
}

function saveTodos(todos) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
  } catch (_) {}
}

function TodoSection({ periodKey, period, items, onAdd, onStatusChange, onTextChange, onReorder, onRemove }) {
  const [input, setInput] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)

  const handleDragStart = (e, index) => {
    e.dataTransfer.setData('text/plain', String(index))
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/json', JSON.stringify({ periodKey, index }))
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const handleDragLeave = () => setDragOverIndex(null)

  const handleDrop = (e, toIndex) => {
    e.preventDefault()
    setDragOverIndex(null)
    try {
      const { periodKey: _pk, index: fromIndex } = JSON.parse(e.dataTransfer.getData('application/json') || '{}')
      if (_pk === periodKey && fromIndex !== toIndex) onReorder(periodKey, fromIndex, toIndex)
    } catch (_) {}
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const text = input.trim()
    if (text) {
      onAdd(periodKey, text)
      setInput('')
    }
  }

  const handleTextSave = (itemId, newText) => {
    const trimmed = (newText || '').trim()
    if (trimmed) onTextChange(periodKey, itemId, trimmed)
    setEditingId(null)
  }

  return (
    <section className={`todo-section todo-section--${periodKey}`}>
      <h2 className="todo-section__title">{period.label}</h2>
      <form className="todo-section__form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="todo-section__input"
          placeholder={`Add ${period.label.toLowerCase()}…`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label={`New todo for ${period.label}`}
        />
        <button type="submit" className="todo-section__add" aria-label="Add todo">
          Add
        </button>
      </form>
      <ul className="todo-list" aria-label={`Todos for ${period.label}`}>
        {items.length === 0 && (
          <li className="todo-list__empty">No items yet</li>
        )}
        {items.map((item, index) => (
          <li
            key={item.id}
            className={`todo-item ${(item.status || '').trim() ? 'todo-item--has-status' : ''} ${dragOverIndex === index ? 'todo-item--drag-over' : ''}`}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
          >
            <span
              className="todo-item__grip"
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              aria-label="Drag to reorder"
            >
              ⋮⋮
            </span>
            {editingId === item.id ? (
              <input
                type="text"
                className="todo-item__text-input"
                value={item.text}
                onChange={(e) => onTextChange(periodKey, item.id, e.target.value)}
                onBlur={(e) => handleTextSave(item.id, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleTextSave(item.id, e.target.value)
                  }
                  if (e.key === 'Escape') {
                    setEditingId(null)
                  }
                }}
                autoFocus
                aria-label="Edit task"
              />
            ) : (
              <button
                type="button"
                className="todo-item__text"
                onClick={() => setEditingId(item.id)}
                aria-label={`Edit task: ${item.text}`}
              >
                {item.text}
              </button>
            )}
            <input
              type="text"
              className="todo-item__status"
              placeholder="Status…"
              value={item.status || ''}
              onChange={(e) => onStatusChange(periodKey, item.id, e.target.value)}
              aria-label={`Status for ${item.text}`}
            />
            <input
              type="checkbox"
              className="todo-item__remove"
              checked={false}
              onChange={() => onRemove(periodKey, item.id)}
              aria-label="Remove todo"
            />
          </li>
        ))}
      </ul>
    </section>
  )
}

function App() {
  const [todos, setTodos] = useState(getStoredTodos)

  useEffect(() => {
    saveTodos(todos)
  }, [todos])

  const addTodo = (period, text) => {
    setTodos((prev) => ({
      ...prev,
      [period]: [
        ...prev[period],
        { id: crypto.randomUUID(), text, status: 'todo' },
      ],
    }))
  }

  const setStatus = (period, id, status) => {
    setTodos((prev) => ({
      ...prev,
      [period]: prev[period].map((item) =>
        item.id === id ? { ...item, status } : item
      ),
    }))
  }

  const setTodoText = (period, id, text) => {
    setTodos((prev) => ({
      ...prev,
      [period]: prev[period].map((item) =>
        item.id === id ? { ...item, text } : item
      ),
    }))
  }

  const removeTodo = (period, id) => {
    setTodos((prev) => ({
      ...prev,
      [period]: prev[period].filter((item) => item.id !== id),
    }))
  }

  const reorderTodos = (period, fromIndex, toIndex) => {
    setTodos((prev) => {
      const list = [...prev[period]]
      const [removed] = list.splice(fromIndex, 1)
      list.splice(toIndex, 0, removed)
      return { ...prev, [period]: list }
    })
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">4-1-1</h1>
        <p className="app-subtitle">Month · Week · Day</p>
      </header>
      <main className="app-main">
        {Object.entries(PERIODS).map(([key, period]) => (
          <TodoSection
            key={key}
            periodKey={key}
            period={period}
            items={todos[key]}
            onAdd={addTodo}
            onStatusChange={setStatus}
            onTextChange={setTodoText}
            onReorder={reorderTodos}
            onRemove={removeTodo}
          />
        ))}
      </main>
    </div>
  )
}

export default App
