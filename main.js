const todoForm = document.querySelector(".todo-form");
const taskNameInput = document.querySelector("#todo-input");
const tasksList = document.querySelector(".task-list");
const tasksLoading = document.querySelector("#tasks-loading");
const tasksError = document.querySelector("#tasks-error");

const BASE_API = "http://localhost:3000/tasks";
let tasks = [];
let editingId = null;

const modal = document.querySelector("#confirmation-modal");
const modalTitle = document.querySelector("#modal-title");
const modalBody = document.querySelector("#modal-body");
const modalCancelBtn = document.querySelector("#modal-cancel-btn");
const modalConfirmBtn = document.querySelector("#modal-confirm-btn");
let pendingDeleteId = null;

// ========== HIỂN THỊ LOADING/ERROR ==========
function showLoading() {
  tasksLoading.classList.add("show");
  tasksError.classList.remove("show");
  tasksList.classList.remove("show");
}
function showError(message) {
  tasksError.classList.add("show");
  tasksLoading.classList.remove("show");
  tasksList.classList.remove("show");
  const errorText = tasksError.querySelector(".error-text");
  if (errorText) {
    errorText.textContent =
      typeof message === "string"
        ? message
        : message.message || "Lỗi không xác định";
  }
}
function showTasks() {
  tasksList.classList.add("show");
  tasksError.classList.remove("show");
  tasksLoading.classList.remove("show");
}

function hideError() {
  tasksError.classList.remove("show");
}

// ========== FETCH TASKS ==========
async function fetchTasks() {
  showLoading();
  try {
    const response = await fetch(BASE_API);
    if (!response.ok) {
      throw new Error(`Lỗi HTTP: ${response.status}`);
    }
    const rawTasks = await response.json();
    tasks = rawTasks.map((task) => ({
      ...task,
      completed: task.completed === true || task.completed === "true",
    }));
    renderTasks();
    showTasks();
  } catch (error) {
    // Lỗi mạng hoặc lỗi JSON
    if (error.message.includes("fetch")) {
      showError("Không thể kết nối đến JSON server");
    } else {
      showError(error.message);
    }
  }
}

// ========== CREATE TASK ==========
async function createTask(task) {
  try {
    const response = await fetch(BASE_API, {
      method: "POST",
      headers: {
        "Content-type": "application/json",
      },
      body: JSON.stringify(task),
    });
    if (!response.ok) {
      throw new Error(`Lỗi HTTP: ${response.status}`);
    }
    const newTask = await response.json();
    tasks.push(newTask);
    appendTask(newTask);
    taskNameInput.value = "";
    hideError();
  } catch (error) {
    showError("Không thể thêm công việc mới!");
  }
}

// ========== UPDATE TASK ==========
async function updateTask(id, update) {
  try {
    const response = await fetch(`${BASE_API}/${id}`, {
      method: "PATCH",
      headers: {
        "Content-type": "application/json",
      },
      body: JSON.stringify(update),
    });
    if (!response.ok) {
      throw new Error(`Lỗi HTTP: ${response.status}`);
    }
    const updated = await response.json();
    tasks = tasks.map((t) => (String(t.id) === id ? updated : t));
    // Update trực tiếp DOM
    const taskItem = document.querySelector(`[data-id= "${id}"]`);
    if (taskItem) {
      taskItem.classList.toggle("completed", updated.completed);
      taskItem.querySelector(".task-title").textContent = updated.title;
      taskItem.querySelector(".toggle").textContent = updated.completed
        ? "Hoàn thành"
        : "Chưa hoàn thành";
    }

    hideError();
  } catch (error) {
    showError("Không thể cập nhật công việc!");
  }
}

// ========== DELETE TASK với MODAL ==========
function showConfirmModal(title, body, confirmText = "Xóa") {
  modalTitle.textContent = title;
  modalBody.textContent = body;
  modalConfirmBtn.textContent = confirmText;
  modal.classList.add("show");
}
function hideConfirmModal() {
  modal.classList.remove("show");
  pendingDeleteId = null;
}
modalCancelBtn.addEventListener("click", hideConfirmModal);
modalConfirmBtn.addEventListener("click", async () => {
  if (!pendingDeleteId) return;
  try {
    const response = await fetch(`${BASE_API}/${pendingDeleteId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error(`Lỗi HTTP: ${response.status}`);
    }
    tasks = tasks.filter((t) => String(t.id) !== String(pendingDeleteId));
    // Xóa trực tiếp DOM
    const taskItem = document.querySelector(`[data-id="${pendingDeleteId}"]`);
    if (taskItem) taskItem.remove();
    hideConfirmModal();
  } catch (error) {
    showError("Không thể xóa công việc!");
  }
});

//========== RENDER TASK ==========
function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function appendTask(task) {
  const li = document.createElement("li");
  li.className = `task-item ${task.completed ? "completed" : ""}`;
  li.dataset.id = task.id;
  li.innerHTML = `
    <span class="task-title" contenteditable="false">
    ${escapeHTML(task.title)}</span>
    <div class="task-action">
    <button type="button" class="task-btn edit">Sửa</button>
    <button type="button" class="task-btn toggle">
    ${task.completed ? "Hoàn thành" : "Chưa hoàn thành"}
    </button>
    <button type="button" class="task-btn delete">Xóa</button>
    </div>
  `;
  tasksList.appendChild(li);
}

function renderTasks() {
  tasksList.innerHTML = "";
  if (!tasks.length) {
    tasksList.innerHTML = `<li class="task-item">
          <span class="task-title">Danh sách trống</span>`;
    return;
  }
  tasks.forEach((task) => appendTask(task));
}

// ========== FORM SUBMIT ==========
todoForm.onsubmit = (e) => {
  e.preventDefault();
  const title = taskNameInput.value.trim();
  if (!title) {
    alert("Tên công việc không được để trống!");
    return;
  }

  const normalizedTitle = title.toLowerCase();
  const existTask = tasks.find(
    (task) => task.title.toLowerCase() === normalizedTitle
  );
  if (existTask) {
    alert(`Tên công việc "${existTask.title}" đã tồn tại!`);
    return;
  }
  createTask({ title, completed: false });
  taskNameInput.value = "";
};

// ========== EVENT CLICK TASKS LIST ==========
tasksList.addEventListener("click", (e) => {
  const taskItem = e.target.closest(".task-item");
  if (!taskItem) return;

  const taskId = taskItem.dataset.id;
  const task = tasks.find((t) => t.id === taskId);
  // Toggle
  if (e.target.classList.contains("toggle")) {
    updateTask(taskId, { completed: !task.completed });
  }
  // Delete
  if (e.target.classList.contains("delete")) {
    pendingDeleteId = taskId;
    showConfirmModal(
      "Xác nhận xóa",
      `Bạn có chắc chắn muốn xóa công việc "${task.title}"?`
    );
  }
  // Edit
  if (e.target.classList.contains("edit")) {
    const taskTitle = taskItem.querySelector(".task-title");
    const editButton = e.target;

    if (editingId === taskId) {
      // TRẠNG THÁI: LƯU (SAVE)
      const newText = taskTitle.textContent.trim();
      if (!newText) {
        alert("Tên công việc không được để trống!");
        return;
      }
      updateTask(taskId, { title: newText });

      // TẮT chỉnh sửa cho .task-title
      taskTitle.setAttribute("contentEditable", "false");
      editButton.textContent = "Sửa";
      editingId = null;
    } else {
      // TRẠNG THÁI: SỬA (EDIT)
      // Đảm bảo không có task nào khác đang được chỉnh sửa
      if (editingId !== null) {
        alert("Vui lòng hoàn tất chỉnh sửa công việc hiện tại!");
        return;
      }
      // BẬT chỉnh sửa cho .task-title
      taskTitle.setAttribute("contentEditable", "true");
      taskTitle.focus();
      editButton.textContent = "Lưu"; // Đổi nút thành Lưu

      // Logic đặt trỏ về cuối text
      const range = document.createRange();
      range.selectNodeContents(taskTitle);
      range.collapse(false);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);

      editingId = taskId;
    }
  }
});

fetchTasks();
