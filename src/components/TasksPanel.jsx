import { useState } from 'react';
import { getTasks, addTask, toggleTask, removeTask } from '../storage';

const EMPTY_FORM = { orderNumber: '', label: '', note: '' };

function TasksPanel() {
  const [tasks, setTasks] = useState(() => getTasks());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const refresh = () => setTasks(getTasks());

  const setField = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleCreate = () => {
    if (!form.note.trim() && !form.label.trim()) return;
    addTask(form);
    refresh();
    setForm(EMPTY_FORM);
    setShowForm(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleCreate();
  };

  const handleToggle = (id) => { toggleTask(id); refresh(); };
  const handleDelete = (id) => { removeTask(id); refresh(); };

  return (
    <aside className="tasks-panel">
      <div className="tasks-header">
        <h3>Tasks</h3>
        <button
          className="btn-small"
          onClick={() => { setShowForm((s) => !s); setForm(EMPTY_FORM); }}
        >
          {showForm ? 'Cancel' : '+ New'}
        </button>
      </div>

      {showForm && (
        <div className="task-form">
          <div className="task-field">
            <label>Order # (optional)</label>
            <input
              type="text"
              placeholder="e.g. 1042"
              value={form.orderNumber}
              onChange={(e) => setField('orderNumber', e.target.value)}
            />
          </div>
          <div className="task-field">
            <label>Label</label>
            <input
              type="text"
              placeholder="e.g. Follow up"
              value={form.label}
              onChange={(e) => setField('label', e.target.value)}
            />
          </div>
          <div className="task-field">
            <label>Note</label>
            <textarea
              className="task-textarea"
              placeholder="Task details..."
              value={form.note}
              onChange={(e) => setField('note', e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <button className="btn-small btn-success task-submit-btn" onClick={handleCreate}>
            Create Task
          </button>
        </div>
      )}

      <div className="tasks-list">
        {tasks.length === 0 ? (
          <div className="tasks-empty">No tasks yet.</div>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className={`task-item${task.completed ? ' completed' : ''}`}>
              <div className="task-item-top">
                <input
                  type="checkbox"
                  className="task-checkbox"
                  checked={task.completed}
                  onChange={() => handleToggle(task.id)}
                />
                <div className="task-item-meta">
                  {task.label && <span className="task-label">{task.label}</span>}
                  {task.orderNumber && (
                    <span className="task-order">#{task.orderNumber}</span>
                  )}
                </div>
                <button
                  className="btn-remove task-delete-btn"
                  title="Delete task"
                  onClick={() => handleDelete(task.id)}
                >
                  ×
                </button>
              </div>
              {task.note && <div className="task-note">{task.note}</div>}
              <div className="task-date">
                {new Date(task.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

export default TasksPanel;
