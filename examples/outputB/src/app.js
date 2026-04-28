"use strict";

// ====== Константы и утилиты ======
const STORAGE_KEY = 'myTasker_tasks';
const STATUSES = {
  todo: 'К выполнению',
  inprogress: 'В работе',
  done: 'Выполнено'
};
const STATUS_COLORS = {
  todo: 'status-todo',
  inprogress: 'status-inprogress',
  done: 'status-done'
};

// Санитизация строки от опасных HTML-символов
function sanitize(str) {
  if (typeof str !== 'string') return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;'
  };
  return str.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Генерация уникального ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// ====== Состояние ======
let tasks = [];
let filterValue = 'all';
let deleteCandidateId = null;

// ====== DOM-ссылки ======
const board = document.getElementById('board');
const columnTodo = document.getElementById('columnTodo');
const columnInProgress = document.getElementById('columnInProgress');
const columnDone = document.getElementById('columnDone');
const statsEl = document.getElementById('stats');
const filterSelect = document.getElementById('filterSelect');
const addTaskBtn = document.getElementById('addTaskBtn');

// Модальное окно создания
const createModalOverlay = document.getElementById('createModalOverlay');
const createForm = document.getElementById('createForm');
const taskTitleInput = document.getElementById('taskTitle');
const taskDescriptionInput = document.getElementById('taskDescription');
const createCancelBtn = document.getElementById('createCancelBtn');

// Модальное окно подтверждения удаления
const confirmModalOverlay = document.getElementById('confirmModalOverlay');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const confirmCancelBtn = document.getElementById('confirmCancelBtn');

// ====== Работа с localStorage ======
function loadTasks() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        // Дополнительная проверка структуры
        tasks = parsed.filter(t =>
          t && typeof t.id === 'string' &&
          typeof t.title === 'string' &&
          (typeof t.description === 'string' || t.description === null) &&
          ['todo','inprogress','done'].includes(t.status)
        );
        return;
      }
    }
  } catch (e) {
    console.warn('Ошибка загрузки задач из localStorage', e);
  }
  tasks = [];
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (e) {
    alert('Не удалось сохранить данные. Проверьте настройки браузера.');
  }
}

// ====== Рендер доски ======
function renderBoard() {
  // Очищаем колонки
  columnTodo.innerHTML = '';
  columnInProgress.innerHTML = '';
  columnDone.innerHTML = '';

  // Фильтрация
  const filteredTasks = filterValue === 'all'
    ? tasks
    : tasks.filter(t => t.status === filterValue);

  // Рендер каждой задачи
  filteredTasks.forEach(task => {
    const card = createCardElement(task);
    const container = getColumnContainer(task.status);
    if (container) {
      container.appendChild(card);
      // Добавляем класс анимации
      card.classList.add('card-enter');
      // Удаляем класс после анимации
      card.addEventListener('animationend', function handler() {
        card.classList.remove('card-enter');
        card.removeEventListener('animationend', handler);
      });
    }
  });

  updateCounter();
}

function getColumnContainer(status) {
  switch (status) {
    case 'todo': return columnTodo;
    case 'inprogress': return columnInProgress;
    case 'done': return columnDone;
    default: return null;
  }
}

function createCardElement(task) {
  const card = document.createElement('div');
  card.className = 'card';
  card.draggable = true;
  card.dataset.id = task.id;

  // Заголовок
  const header = document.createElement('div');
  header.className = 'card-header';

  const titleSpan = document.createElement('span');
  titleSpan.className = 'card-title';
  titleSpan.textContent = sanitize(task.title);
  header.appendChild(titleSpan);

  // Действия на карточке
  const actions = document.createElement('div');
  actions.className = 'card-actions';

  // Кнопка смены статуса (циклическая)
  const statusBtn = document.createElement('button');
  statusBtn.className = 'btn-edit-status';
  statusBtn.textContent = 'Статус';
  statusBtn.title = 'Сменить статус';
  statusBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    cycleStatus(task.id);
  });
  actions.appendChild(statusBtn);

  // Кнопка удаления
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn-delete';
  deleteBtn.textContent = 'Удалить';
  deleteBtn.title = 'Удалить задачу';
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    confirmDeleteTask(task.id);
  });
  actions.appendChild(deleteBtn);

  header.appendChild(actions);
  card.appendChild(header);

  // Описание (если есть)
  if (task.description) {
    const desc = document.createElement('div');
    desc.className = 'card-description';
    desc.textContent = sanitize(task.description);
    card.appendChild(desc);
  }

  // Нижняя часть с меткой статуса
  const footer = document.createElement('div');
  footer.className = 'card-footer';

  const badge = document.createElement('span');
  badge.className = 'status-badge ' + STATUS_COLORS[task.status];
  badge.textContent = STATUSES[task.status];
  footer.appendChild(badge);

  card.appendChild(footer);

  // Редактирование по двойному клику
  card.addEventListener('dblclick', () => {
    editTask(task.id);
  });

  // Drag & Drop события
  card.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', task.id);
    card.classList.add('dragging');
  });
  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
  });

  return card;
}

// ====== Действия с задачами ======
function addTask(title, description) {
  const task = {
    id: generateId(),
    title: title.trim(),
    description: description ? description.trim() : '',
    status: 'todo'
  };
  tasks.push(task);
  saveTasks();
  renderBoard();
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  renderBoard();
}

function updateTaskStatus(id, newStatus) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  if (!['todo','inprogress','done'].includes(newStatus)) return;
  task.status = newStatus;
  saveTasks();
  renderBoard();
}

function cycleStatus(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  const order = ['todo', 'inprogress', 'done'];
  const idx = order.indexOf(task.status);
  const next = order[(idx + 1) % order.length];
  updateTaskStatus(id, next);
}

function updateTask(id, title, description) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  task.title = title.trim();
  task.description = description ? description.trim() : '';
  saveTasks();
  renderBoard();
}

// ====== Редактирование (двойной клик) ======
function editTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  // Находим DOM-элемент карточки
  const card = document.querySelector(`.card[data-id="${id}"]`);
  if (!card) return;

  // Удаляем обработчик dblclick, чтобы не войти в рекурсию
  const dblClickHandler = () => editTask(id);
  card.removeEventListener('dblclick', dblClickHandler);

  // Создаём поля редактирования
  const titleSpan = card.querySelector('.card-title');
  const descDiv = card.querySelector('.card-description');

  // Инпут для названия
  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.className = 'card-title-edit';
  titleInput.value = task.title;
  titleInput.maxLength = 500;
  titleSpan.replaceWith(titleInput);
  titleInput.focus();

  // Текстареа для описания (или инпут, если описания нет? лучше textarea)
  let descInput = null;
  if (descDiv) {
    descInput = document.createElement('textarea');
    descInput.className = 'card-description-edit';
    descInput.value = task.description || '';
    descInput.maxLength = 2000;
    descInput.rows = 2;
    descDiv.replaceWith(descInput);
  } else {
    // Создаём поле, если описания не было изначально
    descInput = document.createElement('textarea');
    descInput.className = 'card-description-edit';
    descInput.value = '';
    descInput.maxLength = 2000;
    descInput.rows = 2;
    // Вставляем после заголовка (сейчас titleInput) или в нужное место
    // Лучше вставить после titleInput (но структура может сбиться).
    // Проще: найти футер и вставить перед ним? Будем вставлять после нового input.
    const footer = card.querySelector('.card-footer');
    card.insertBefore(descInput, footer);
  }

  // Функция сохранения
  function saveEdit() {
    const newTitle = titleInput.value.trim();
    const newDescription = descInput ? descInput.value.trim() : '';

    if (!newTitle) {
      alert('Название задачи обязательно');
      // Возвращаем представление без сохранения
      cancelEdit();
      return;
    }

    // Сохраняем
    updateTask(id, newTitle, newDescription);
    // Восстанавливаем отображение (рендер перерисует всё, так что события обновятся)
  }

  function cancelEdit() {
    // Просто перерендериваем доску, чтобы отменить изменения
    renderBoard();
  }

  // Обработчики сохранения
  function handleSave(e) {
    if (e.type === 'keydown' && e.key === 'Escape') {
      cancelEdit();
      return;
    }
    if (e.type === 'keydown' && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveEdit();
      return;
    }
    // blur - сохраняем
    if (e.type === 'blur') {
      // Небольшая задержка, чтобы не конфликтовать с кликом по другой кнопке
      setTimeout(saveEdit, 100);
    }
  }

  titleInput.addEventListener('blur', handleSave);
  titleInput.addEventListener('keydown', handleSave);
  if (descInput) {
    descInput.addEventListener('blur', handleSave);
    descInput.addEventListener('keydown', handleSave);
  }

  // Добавляем обработчик на клик вне? Другой вариант: при клике на другую карточку произойдет blur и сохранится.
  // Оставляем так.
}

// ====== Подтверждение удаления ======
function confirmDeleteTask(id) {
  deleteCandidateId = id;
  confirmModalOverlay.classList.add('visible');
}

function closeConfirmModal() {
  confirmModalOverlay.classList.remove('visible');
  deleteCandidateId = null;
}

// ====== Модальное окно создания ======
function openCreateModal() {
  createModalOverlay.classList.add('visible');
  taskTitleInput.value = '';
  taskDescriptionInput.value = '';
  taskTitleInput.focus();
}

function closeCreateModal() {
  createModalOverlay.classList.remove('visible');
}

// ====== Счётчик задач ======
function updateCounter() {
  const total = tasks.length;
  const done = tasks.filter(t => t.status === 'done').length;
  statsEl.textContent = `Всего задач: ${total}, Выполнено: ${done}`;
}

// ====== Drag & Drop для колонок ======
function setupDragDrop() {
  const columns = document.querySelectorAll('.column-cards');
  columns.forEach(column => {
    column.addEventListener('dragover', (e) => {
      e.preventDefault();
      column.classList.add('drag-over');
    });
    column.addEventListener('dragleave', () => {
      column.classList.remove('drag-over');
    });
    column.addEventListener('drop', (e) => {
      e.preventDefault();
      column.classList.remove('drag-over');
      const taskId = e.dataTransfer.getData('text/plain');
      if (!taskId) return;
      // Определяем новый статус по родительской колонке
      const parentColumn = column.closest('.column');
      if (!parentColumn) return;
      const newStatus = parentColumn.dataset.status;
      if (!['todo','inprogress','done'].includes(newStatus)) return;
      updateTaskStatus(taskId, newStatus);
    });
  });
}

// ====== Фильтрация ======
filterSelect.addEventListener('change', () => {
  filterValue = filterSelect.value;
  renderBoard();
});

// ====== События ======
addTaskBtn.addEventListener('click', openCreateModal);
createCancelBtn.addEventListener('click', closeCreateModal);
createModalOverlay.addEventListener('click', (e) => {
  if (e.target === createModalOverlay) closeCreateModal();
});

createForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = taskTitleInput.value.trim();
  if (!title) {
    alert('Название задачи обязательно');
    return;
  }
  const description = taskDescriptionInput.value.trim();
  addTask(title, description);
  closeCreateModal();
});

confirmDeleteBtn.addEventListener('click', () => {
  if (deleteCandidateId) {
    deleteTask(deleteCandidateId);
  }
  closeConfirmModal();
});

confirmCancelBtn.addEventListener('click', closeConfirmModal);
confirmModalOverlay.addEventListener('click', (e) => {
  if (e.target === confirmModalOverlay) closeConfirmModal();
});

// ====== Инициализация ======
function init() {
  loadTasks();
  renderBoard();
  setupDragDrop();
}

init();
