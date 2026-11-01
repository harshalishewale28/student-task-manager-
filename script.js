
"use strict";

// ----------------------------------------
// 1. GET HTML ELEMENTS
// ---------------------------------------------

const taskList = document.getElementById("taskList");
const emptyState = document.getElementById("emptyState");
const emptyTitle = document.getElementById("emptyTitle");
const emptyMessage = document.getElementById("emptyMessage");

const taskDialog = document.getElementById("taskDialog");
const taskForm = document.getElementById("taskForm");
const taskTitleInput = document.getElementById("taskTitle");
const taskDueDateInput = document.getElementById("taskDueDate");
const dialogTitle = document.getElementById("dialogTitle");
const saveTaskButton = document.getElementById("saveTaskButton");
const formError = document.getElementById("formError");

const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const toast = document.getElementById("toast");

// ----------------------------------------
// 2. APPLICATION DATA
// ----------------------------------------

const STORAGE_KEY = "studentTaskManager.tasks";

let tasks = loadTasks();
let currentFilter = "all";
let editingTaskId = null;
let toastTimer = null;

// ----------------------------------------
// 3. LOAD AND SAVE TASKS
// ----------------------------------------

function loadTasks() {
    try {
        const savedData = localStorage.getItem(STORAGE_KEY);

        if (!savedData) {
            return [];
        }

        const parsedData = JSON.parse(savedData);

        if (!Array.isArray(parsedData)) {
            return [];
        }

        // Ignore invalid entries instead of crashing the app.
        return parsedData.filter(task =>
            task &&
            typeof task.id === "string" &&
            typeof task.title === "string" &&
            typeof task.completed === "boolean" &&
            (task.dueDate === "" ||
                (typeof task.dueDate === "string" &&
                 /^\d{4}-\d{2}-\d{2}$/.test(task.dueDate))) &&
            Number.isFinite(task.createdAt)
        );
    } catch (error) {
        console.error("Could not load saved tasks:", error);
        return [];
    }
}

function saveTasks() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        return true;
    } catch (error) {
        console.error("Could not save tasks:", error);
        showToast("Could not save data. Check browser storage.");
        return false;
    }
}

// ----------------------------------------
// 4. HELPER FUNCTIONS
// ----------------------------------------

function createId() {
    if (typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }

    return Date.now().toString(36) +
        Math.random().toString(36).slice(2);
}

function getTodayString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
    if (!dateString) {
        return "No due date";
    }

    const parts = dateString.split("-").map(Number);
    const date = new Date(parts[0], parts[1] - 1, parts[2]);

    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2600);
}

// ----------------------------------------
// 5. UPDATE DASHBOARD STATISTICS
// ----------------------------------------

function updateStatistics() {
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const pending = total - completed;
    const progress = total === 0
        ? 0
        : Math.round((completed / total) * 100);

    document.getElementById("totalStat").textContent = total;
    document.getElementById("pendingStat").textContent = pending;
    document.getElementById("completedStat").textContent = completed;
    document.getElementById("progressStat").textContent = `${progress}%`;
    document.getElementById("progressFill").style.width = `${progress}%`;

    document.getElementById("allCount").textContent = total;
    document.getElementById("pendingCount").textContent = pending;
    document.getElementById("completedCount").textContent = completed;

    const today = new Date();

    document.getElementById("todayText").textContent =
        `Today is ${today.toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long"
        })}. Let's make it productive!`;
}

// ----------------------------------------
// 6. FILTER AND SORT TASKS
// ----------------------------------------

function getVisibleTasks() {
    const searchTerm = searchInput.value.trim().toLowerCase();

    let visibleTasks = tasks.filter(task => {
        const matchesFilter =
            currentFilter === "all" ||
            (currentFilter === "pending" && !task.completed) ||
            (currentFilter === "completed" && task.completed);

        const matchesSearch =
            task.title.toLowerCase().includes(searchTerm);

        return matchesFilter && matchesSearch;
    });

    switch (sortSelect.value) {
        case "oldest":
            visibleTasks.sort((a, b) => a.createdAt - b.createdAt);
            break;

        case "due":
            visibleTasks.sort((a, b) => {
                // Tasks with no due date appear last.
                if (!a.dueDate && !b.dueDate) {
                    return a.createdAt - b.createdAt;
                }

                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;

                return a.dueDate.localeCompare(b.dueDate) ||
                    a.createdAt - b.createdAt;
            });
            break;

        case "az":
            visibleTasks.sort((a, b) =>
                a.title.localeCompare(b.title)
            );
            break;

        default:
            visibleTasks.sort((a, b) => b.createdAt - a.createdAt);
    }

    return visibleTasks;
}

// ----------------------------------------
// 7. CREATE A TASK ELEMENT SAFELY
// ----------------------------------------

function createTaskElement(task) {
    const item = document.createElement("article");
    item.className = "task-item";

    if (task.completed) {
        item.classList.add("is-completed");
    }

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-check";
    checkbox.checked = task.completed;
    checkbox.dataset.action = "toggle";
    checkbox.dataset.id = task.id;
    checkbox.setAttribute(
        "aria-label",
        `Mark ${task.title} ${task.completed ? "pending" : "completed"}`
    );

    const details = document.createElement("div");
    details.className = "task-details";

    const title = document.createElement("h3");
    title.className = "task-title";
    title.textContent = task.title;

    const description = document.createElement("div");
    description.className = "task-description";

    const date = document.createElement("span");
    date.textContent = `Due: ${formatDate(task.dueDate)}`;

    const status = document.createElement("span");
    status.className = "task-status";

    if (task.completed) {
        status.classList.add("status-completed");
        status.textContent = "Completed";
    } else if (task.dueDate && task.dueDate < getTodayString()) {
        status.classList.add("status-overdue");
        status.textContent = "Overdue";
    } else {
        status.classList.add("status-pending");
        status.textContent = "Pending";
    }

    description.append(date, status);
    details.append(title, description);

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "icon-button";
    editButton.dataset.action = "edit";
    editButton.dataset.id = task.id;
    editButton.textContent = "✎";
    editButton.title = "Edit task";
    editButton.setAttribute("aria-label", `Edit ${task.title}`);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "icon-button delete";
    deleteButton.dataset.action = "delete";
    deleteButton.dataset.id = task.id;
    deleteButton.textContent = "⌫";
    deleteButton.title = "Delete task";
    deleteButton.setAttribute("aria-label", `Delete ${task.title}`);

    actions.append(editButton, deleteButton);
    item.append(checkbox, details, actions);

    return item;
}

// ----------------------------------------
// 8. DISPLAY TASKS ON THE PAGE
// ----------------------------------------

function renderTasks() {
    updateStatistics();

    const visibleTasks = getVisibleTasks();

    taskList.replaceChildren();

    const count = visibleTasks.length;

    document.getElementById("visibleCount").textContent =
        `${count} ${count === 1 ? "task" : "tasks"}`;

    const titles = {
        all: "All Tasks",
        pending: "Pending Tasks",
        completed: "Completed Tasks"
    };

    const subtitles = {
        all: "Keep track of everything you need to do.",
        pending: "Your next steps are waiting for you.",
        completed: "Look at what you have accomplished."
    };

    document.getElementById("listTitle").textContent =
        titles[currentFilter];

    document.getElementById("listSubtitle").textContent =
        subtitles[currentFilter];

    document.querySelectorAll("[data-filter]").forEach(button => {
        const active = button.dataset.filter === currentFilter;

        button.classList.toggle(
            button.classList.contains("nav-item")
                ? "active"
                : "active",
            active
        );

        button.setAttribute("aria-pressed", String(active));
    });

    if (count === 0) {
        emptyState.hidden = false;

        if (searchInput.value.trim()) {
            emptyTitle.textContent = "No matching tasks";
            emptyMessage.textContent =
                "Try another search word or clear your search.";
        } else if (currentFilter === "pending" && tasks.length > 0) {
            emptyTitle.textContent = "All caught up!";
            emptyMessage.textContent =
                "You have no pending tasks. Great work!";
        } else if (currentFilter === "completed" && tasks.length > 0) {
            emptyTitle.textContent = "Nothing completed yet";
            emptyMessage.textContent =
                "Complete a task and it will appear here.";
        } else {
            emptyTitle.textContent = "Your space is ready!";
            emptyMessage.textContent =
                "Add your first task and make today productive.";
        }

        document.getElementById("emptyAddButton").hidden =
            currentFilter !== "all" || Boolean(searchInput.value.trim());
    } else {
        emptyState.hidden = true;
    }

    visibleTasks.forEach(task => {
        taskList.appendChild(createTaskElement(task));
    });
}

// ----------------------------------------
// 9. OPEN THE ADD TASK FORM
// ----------------------------------------

function openAddDialog() {
    editingTaskId = null;
    taskForm.reset();

    dialogTitle.textContent = "Create a Task";
    saveTaskButton.textContent = "Save Task";
    formError.textContent = "";

    if (typeof taskDialog.showModal === "function") {
        taskDialog.showModal();
        taskTitleInput.focus();
    } else {
        showToast("Please use a modern browser to open the task form.");
    }
}

// ----------------------------------------
// 10. OPEN THE EDIT TASK FORM
// ----------------------------------------

function openEditDialog(taskId) {
    const task = tasks.find(item => item.id === taskId);

    if (!task) {
        showToast("Task not found.");
        return;
    }

    editingTaskId = taskId;

    taskTitleInput.value = task.title;
    taskDueDateInput.value = task.dueDate || "";

    dialogTitle.textContent = "Edit Task";
    saveTaskButton.textContent = "Update Task";
    formError.textContent = "";

    taskDialog.showModal();
    taskTitleInput.focus();
}

// ----------------------------------------
// 11. ADD OR UPDATE A TASK
// ----------------------------------------

taskForm.addEventListener("submit", event => {
    event.preventDefault();

    const title = taskTitleInput.value.trim();
    const dueDate = taskDueDateInput.value;

    if (!title) {
        formError.textContent = "Please enter a task title.";
        taskTitleInput.focus();
        return;
    }

    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
        formError.textContent = "Please enter a valid due date.";
        return;
    }

    if (dueDate) {
        const dateParts = dueDate.split("-").map(Number);
        const checkDate = new Date(
            dateParts[0], dateParts[1] - 1, dateParts[2]
        );

        if (
            checkDate.getFullYear() !== dateParts[0] ||
            checkDate.getMonth() !== dateParts[1] - 1 ||
            checkDate.getDate() !== dateParts[2]
        ) {
            formError.textContent = "Please enter a valid calendar date.";
            return;
        }
    }

    if (editingTaskId) {
        const index = tasks.findIndex(task => task.id === editingTaskId);

        if (index === -1) {
            showToast("Task not found.");
            taskDialog.close();
            return;
        }

        const updatedTasks = [...tasks];

        updatedTasks[index] = {
            ...updatedTasks[index],
            title,
            dueDate
        };

        const previousTasks = tasks;
        tasks = updatedTasks;

        if (!saveTasks()) {
            tasks = previousTasks;
            renderTasks();
            return;
        }

        taskDialog.close();
        renderTasks();
        showToast("Task updated successfully!");
    } else {
        const newTask = {
            id: createId(),
            title,
            dueDate,
            completed: false,
            createdAt: Date.now()
        };

        const previousTasks = tasks;
        tasks = [...tasks, newTask];

        if (!saveTasks()) {
            tasks = previousTasks;
            renderTasks();
            return;
        }

        taskDialog.close();
        currentFilter = "all";
        searchInput.value = "";
        renderTasks();
        showToast("Task added successfully!");
    }
});

// ----------------------------------------
// 12. HANDLE COMPLETE, EDIT AND DELETE
// ----------------------------------------

taskList.addEventListener("change", event => {
    const control = event.target;

    if (!control.matches('[data-action="toggle"]')) {
        return;
    }

    const taskId = control.dataset.id;
    const previousTasks = tasks;

    tasks = tasks.map(task =>
        task.id === taskId
            ? { ...task, completed: control.checked }
            : task
    );

    if (!saveTasks()) {
        tasks = previousTasks;
        renderTasks();
        return;
    }

    const task = tasks.find(item => item.id === taskId);

    if (task) {
        showToast(
            task.completed
                ? "Great work! Task completed."
                : "Task marked as pending."
        );
    }

    renderTasks();
});

taskList.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");

    if (!button) {
        return;
    }

    const taskId = button.dataset.id;
    const action = button.dataset.action;

    if (action === "edit") {
        openEditDialog(taskId);
        return;
    }

    if (action === "delete") {
        const task = tasks.find(item => item.id === taskId);

        if (!task) {
            showToast("Task not found.");
            return;
        }

        const confirmed = window.confirm(
            `Are you sure you want to delete "${task.title}"?`
        );

        if (!confirmed) {
            return;
        }

        const previousTasks = tasks;
        tasks = tasks.filter(item => item.id !== taskId);

        if (!saveTasks()) {
            tasks = previousTasks;
            renderTasks();
            return;
        }

        renderTasks();
        showToast("Task deleted successfully.");
    }
});

// ----------------------------------------
// 13. CHANGE FILTERS
// ----------------------------------------

document.querySelectorAll("[data-filter]").forEach(button => {
    button.addEventListener("click", () => {
        currentFilter = button.dataset.filter;
        renderTasks();
    });
});

// ----------------------------------------
// 14. SEARCH AND SORT
// ----------------------------------------

searchInput.addEventListener("input", renderTasks);
sortSelect.addEventListener("change", renderTasks);

// ----------------------------------------
// 15. DIALOG BUTTONS
// ----------------------------------------

document.getElementById("topAddButton")
    .addEventListener("click", openAddDialog);

document.getElementById("emptyAddButton")
    .addEventListener("click", openAddDialog);

document.getElementById("closeDialog")
    .addEventListener("click", () => taskDialog.close());

document.getElementById("cancelDialog")
    .addEventListener("click", () => taskDialog.close());

taskDialog.addEventListener("click", event => {
    // Close the dialog if the user clicks the backdrop.
    if (event.target === taskDialog) {
        taskDialog.close();
    }
});

// ----------------------------------------
// 16. INITIALIZE THE APPLICATION
// ----------------------------------------

renderTasks();
