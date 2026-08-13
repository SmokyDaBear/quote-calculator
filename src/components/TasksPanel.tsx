import { useState, useEffect } from "react";
import {
  getTasks,
  addTask,
  updateTask,
  toggleTask,
  removeTask,
  getCustomer,
  getCustomers,
  getCustomerVehicles,
  getAllVehicles,
  Task,
} from "../storage";
import { CustomerSearch } from "./CustomerAutocomplete";
import { ChevronDown } from "../icons";
import { formatPhone } from "../utils/formatPhone";
import type { Customer, Vehicle } from "../types/index";

/** Collapsed state survives reloads — the panel is on every screen. */
const COLLAPSED_KEY = "quote_calculator_tasks_collapsed";

interface TaskForm {
  orderNumber: string;
  label: string;
  note: string;
  customerId: string;
  vehicleId: string;
}

const EMPTY_FORM: TaskForm = {
  orderNumber: "",
  label: "",
  note: "",
  customerId: "",
  vehicleId: "",
};

const vehicleLabel = (v: Vehicle) =>
  [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ");

/**
 * Defined at module scope on purpose: a component declared inside TasksPanel
 * would be a brand-new type on every render, remounting the inputs and
 * stealing focus on each keystroke.
 */
function TaskFormFields({
  form,
  setField,
  linkedCustomer,
  customerVehicles,
  onSelectCustomer,
  onClearCustomer,
  onSubmit,
  onCancel,
  isEditing,
}: {
  form: TaskForm;
  setField: (field: keyof TaskForm, value: string) => void;
  linkedCustomer: Customer | null;
  customerVehicles: Vehicle[];
  onSelectCustomer: (c: Customer) => void;
  onClearCustomer: () => void;
  onSubmit: () => void;
  onCancel: () => void;
  isEditing: boolean;
}) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) onSubmit();
  };

  return (
    <div className="task-form">
      <div className="task-field">
        <label>Order # (optional)</label>
        <input
          type="text"
          placeholder="e.g. 1042"
          value={form.orderNumber}
          onChange={(e) => setField("orderNumber", e.target.value)}
        />
      </div>
      <div className="task-field">
        <label>Label</label>
        <input
          type="text"
          placeholder="e.g. Follow up"
          value={form.label}
          onChange={(e) => setField("label", e.target.value)}
        />
      </div>
      <div className="task-field">
        <label>Customer (optional)</label>
        <CustomerSearch
          selectedCustomer={linkedCustomer}
          onSelect={onSelectCustomer}
          onClear={onClearCustomer}
        />
        {linkedCustomer && linkedCustomer.phones.length > 0 && (
          <div className="task-linked-phone">
            {formatPhone(linkedCustomer.phones[0].number)}
          </div>
        )}
      </div>
      {linkedCustomer && customerVehicles.length > 0 && (
        <div className="task-field">
          <label>Vehicle (optional)</label>
          <select
            value={form.vehicleId}
            onChange={(e) => setField("vehicleId", e.target.value)}
          >
            <option value="">— None —</option>
            {customerVehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {vehicleLabel(v)}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="task-field">
        <label>Note</label>
        <textarea
          className="task-textarea"
          placeholder="Task details..."
          value={form.note}
          onChange={(e) => setField("note", e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      <button className="btn-small btn-success task-submit-btn" onClick={onSubmit}>
        {isEditing ? "Update Task" : "Create Task"}
      </button>
      <button className="btn-small btn-danger task-cancel-btn" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}

function TasksPanel() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<TaskForm>(EMPTY_FORM);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [linkedCustomer, setLinkedCustomer] = useState<Customer | null>(null);
  const [customerVehicles, setCustomerVehicles] = useState<Vehicle[]>([]);
  const [customersById, setCustomersById] = useState<Record<string, Customer>>({});
  const [vehiclesById, setVehiclesById] = useState<Record<string, Vehicle>>({});
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(COLLAPSED_KEY) === "1",
  );

  const toggleCollapsed = () =>
    setCollapsed((c) => {
      localStorage.setItem(COLLAPSED_KEY, c ? "0" : "1");
      return !c;
    });

  const openCount = tasks.filter((t) => !t.completed).length;

  const refresh = () => getTasks().then(setTasks);

  const refreshLinkLookups = async () => {
    const [customers, vehicles] = await Promise.all([
      getCustomers(),
      getAllVehicles(),
    ]);
    setCustomersById(Object.fromEntries(customers.map((c) => [c.id, c])));
    setVehiclesById(Object.fromEntries(vehicles.map((v) => [v.id, v])));
  };

  useEffect(() => {
    refresh();
    refreshLinkLookups();
  }, []);

  const setField = (field: keyof TaskForm, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setLinkedCustomer(null);
    setCustomerVehicles([]);
    setShowForm(false);
    setEditingTaskId(null);
  };

  const handleSelectCustomer = async (c: Customer) => {
    setLinkedCustomer(c);
    setForm((f) => ({ ...f, customerId: c.id, vehicleId: "" }));
    setCustomerVehicles(await getCustomerVehicles(c.id));
  };

  const handleClearCustomer = () => {
    setLinkedCustomer(null);
    setCustomerVehicles([]);
    setForm((f) => ({ ...f, customerId: "", vehicleId: "" }));
  };

  const handleSubmit = async () => {
    if (!form.note.trim() && !form.label.trim()) return;
    if (editingTaskId) {
      await updateTask(editingTaskId, {
        ...form,
        customerId: form.customerId || undefined,
        vehicleId: form.vehicleId || undefined,
      });
    } else {
      await addTask(form);
    }
    await refresh();
    await refreshLinkLookups();
    resetForm();
  };

  const handleToggle = async (id: string) => {
    await toggleTask(id);
    refresh();
  };

  const handleDelete = async (id: string) => {
    await removeTask(id);
    refresh();
  };

  const handleEdit = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    setForm({
      orderNumber: task.orderNumber,
      label: task.label,
      note: task.note,
      customerId: task.customerId || "",
      vehicleId: task.vehicleId || "",
    });
    setEditingTaskId(id);
    setShowForm(false);
    if (task.customerId) {
      const [customer, vehicles] = await Promise.all([
        getCustomer(task.customerId),
        getCustomerVehicles(task.customerId),
      ]);
      setLinkedCustomer(customer);
      setCustomerVehicles(vehicles);
    } else {
      setLinkedCustomer(null);
      setCustomerVehicles([]);
    }
  };

  const formProps = {
    form,
    setField,
    linkedCustomer,
    customerVehicles,
    onSelectCustomer: handleSelectCustomer,
    onClearCustomer: handleClearCustomer,
    onSubmit: handleSubmit,
    onCancel: resetForm,
  };

  return (
    <aside className={`tasks-panel${collapsed ? " tasks-panel--collapsed" : ""}`}>
      <div className="tasks-header">
        <button
          type="button"
          className="tasks-collapse-btn"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          aria-controls="tasks-panel-body"
          title={collapsed ? "Show tasks" : "Hide tasks"}
        >
          <ChevronDown
            className={`tasks-collapse-chevron${collapsed ? " tasks-collapse-chevron--collapsed" : ""}`}
          />
        </button>
        <h3>
          Tasks
          {openCount > 0 && <span className="tasks-count">{openCount}</span>}
        </h3>
        {!collapsed && (
          <button
            className="btn-small"
            onClick={() => {
              const opening = !showForm;
              resetForm();
              setShowForm(opening);
            }}
          >
            {showForm ? "Cancel" : "+ New"}
          </button>
        )}
      </div>

      {collapsed ? null : (
        <div id="tasks-panel-body" className="tasks-panel-body">
          {showForm && !editingTaskId && (
            <TaskFormFields {...formProps} isEditing={false} />
          )}

          <div className="tasks-list">
            {tasks.length === 0 ? (
              <div className="tasks-empty">No tasks yet.</div>
            ) : (
              tasks.map((task) => {
                if (task.id === editingTaskId) {
                  return (
                    <TaskFormFields key={task.id} {...formProps} isEditing />
                  );
                }
                const customer = task.customerId
                  ? customersById[task.customerId]
                  : undefined;
                const vehicle = task.vehicleId
                  ? vehiclesById[task.vehicleId]
                  : undefined;
                return (
                  <div
                    key={task.id}
                    className={`task-item${task.completed ? " completed" : ""}`}
                  >
                    <div className="task-item-top">
                      <input
                        aria-label="Mark task as completed"
                        type="checkbox"
                        className="task-checkbox"
                        checked={task.completed}
                        onChange={() => handleToggle(task.id)}
                      />
                      <div className="task-item-meta">
                        {task.label && (
                          <span className="task-label">{task.label}</span>
                        )}
                        {task.orderNumber && (
                          <span className="task-order">#{task.orderNumber}</span>
                        )}
                      </div>
                      <div className="task-item-actions">
                        <button
                          type="button"
                          className="btn-remove task-action-btn task-edit-btn"
                          title="Edit task"
                          aria-label="Edit task"
                          onClick={() => handleEdit(task.id)}
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          className="btn-remove task-action-btn task-delete-btn"
                          title="Delete task"
                          aria-label="Delete task"
                          onClick={() => handleDelete(task.id)}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    {customer && (
                      <div className="task-customer">
                        <span className="task-customer-name">
                          {customer.name}
                        </span>
                        {customer.phones[0]?.number && (
                          <a
                            className="task-customer-phone"
                            href={`tel:${customer.phones[0].number.replace(/\D/g, "")}`}
                          >
                            {formatPhone(customer.phones[0].number)}
                          </a>
                        )}
                      </div>
                    )}
                    {vehicle && (
                      <div className="task-vehicle">{vehicleLabel(vehicle)}</div>
                    )}
                    {task.note && <div className="task-note">{task.note}</div>}
                    <div className="task-date">
                      {new Date(task.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </aside>
  );
}

export default TasksPanel;
