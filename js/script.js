// Todo App: add/delete/complete with localStorage + custom confirm modal + undo

const STORAGE_KEY = "todoApp.tasks";
let pendingDeletion = null; // {task, index, timeoutId}

function getTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTasks(tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function createTaskElement(task, idx) {
  const li = document.createElement("li");
  li.className = "task-item";
  li.dataset.index = idx;

  const left = document.createElement("div");
  left.className = "task-left";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "task-check";
  checkbox.checked = !!task.completed;
  checkbox.setAttribute("aria-label", `Segna "${task.text}" come completato`);
  checkbox.addEventListener("change", () => toggleTaskCompleted(idx));

  const text = document.createElement("span");
  text.className = "task-text";
  if (task.completed) text.classList.add("completed");
  text.textContent = task.text;

  left.appendChild(checkbox);
  left.appendChild(text);

  const actions = document.createElement("div");
  actions.className = "task-actions";

  const removeBtn = document.createElement("button");
  removeBtn.className = "task-remove";
  removeBtn.setAttribute("aria-label", `Rimuovi "${task.text}"`);
  removeBtn.textContent = "Elimina";
  removeBtn.addEventListener("click", () => askRemoveTask(idx));

  actions.appendChild(removeBtn);
  li.appendChild(left);
  li.appendChild(actions);
  return li;
}

function renderTasks() {
  const list = document.getElementById("tasks-list");
  list.innerHTML = "";
  const tasks = getTasks();
  if (tasks.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "Nessun task. Aggiungi il primo!";
    list.appendChild(empty);
    return;
  }
  tasks.forEach((t, idx) => list.appendChild(createTaskElement(t, idx)));
}

function addTask(text) {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const tasks = getTasks();
  tasks.push({ text: trimmed, createdAt: Date.now(), completed: false });
  saveTasks(tasks);
  renderTasks();
  return true;
}

/* --- Removal with modal + undo --- */

function askRemoveTask(index) {
  const tasks = getTasks();
  const task = tasks[index];
  if (!task) return;
  showConfirm(`Confermi l'eliminazione del task: "${task.text}"?`, () =>
    scheduleRemoveTask(index)
  );
}

function scheduleRemoveTask(index) {
  // remove visually immediately, but keep copy to allow undo
  const tasks = getTasks();
  const task = tasks[index];
  if (!task) return;
  // remove from storage now
  tasks.splice(index, 1);
  saveTasks(tasks);
  renderTasks();

  // clear previous pending deletion
  if (pendingDeletion && pendingDeletion.timeoutId)
    clearTimeout(pendingDeletion.timeoutId);
  pendingDeletion = {
    task,
    index,
    timeoutId: setTimeout(() => finalizeDeletion(), 5000), // 5s to undo
  };
  showSnackbar(`Task eliminato`, true);
}

function finalizeDeletion() {
  pendingDeletion = null;
  hideSnackbar();
}

function undoDeletion() {
  if (!pendingDeletion) return;
  const tasks = getTasks();
  // re-insert at original index or at end if out of range
  const idx = Math.min(pendingDeletion.index, tasks.length);
  tasks.splice(idx, 0, pendingDeletion.task);
  saveTasks(tasks);
  renderTasks();
  clearTimeout(pendingDeletion.timeoutId);
  pendingDeletion = null;
  hideSnackbar();
}

/* --- Toggle completed --- */
function toggleTaskCompleted(index) {
  const tasks = getTasks();
  if (!tasks[index]) return;
  tasks[index].completed = !tasks[index].completed;
  saveTasks(tasks);
  renderTasks();
}

/* --- Modal helpers --- */
function showConfirm(message, onOk) {
  const modal = document.getElementById("confirm-modal");
  const msg = document.getElementById("confirm-message");
  const ok = document.getElementById("confirm-ok");
  const cancel = document.getElementById("confirm-cancel");

  msg.textContent = message;
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");

  function cleanup() {
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    ok.removeEventListener("click", onOkClick);
    cancel.removeEventListener("click", onCancelClick);
    document.removeEventListener("keydown", onKey);
  }
  function onOkClick() {
    cleanup();
    onOk();
  }
  function onCancelClick() {
    cleanup();
  }
  function onKey(e) {
    if (e.key === "Escape") {
      cleanup();
    }
  }

  ok.addEventListener("click", onOkClick);
  cancel.addEventListener("click", onCancelClick);
  document.addEventListener("keydown", onKey);
}

/* --- Snackbar (undo) helpers --- */
function showSnackbar(text, showUndo = false) {
  const snack = document.getElementById("snackbar");
  const txt = document.getElementById("snack-text");
  const undoBtn = document.getElementById("snack-undo");
  txt.textContent = text;
  undoBtn.style.display = showUndo ? "inline-block" : "none";
  snack.classList.remove("hidden");
  // auto-hide only if no pendingDeletion
  if (!pendingDeletion) setTimeout(() => hideSnackbar(), 3000);
}

function hideSnackbar() {
  const snack = document.getElementById("snackbar");
  snack.classList.add("hidden");
}

/* --- Init --- */
function init() {
  const form = document.getElementById("task-form");
  const input = document.getElementById("new-task");
  const undoBtn = document.getElementById("snack-undo");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (addTask(input.value)) input.value = "";
    input.focus();
  });

  undoBtn.addEventListener("click", undoDeletion);

  renderTasks();
}

document.addEventListener("DOMContentLoaded", init);
