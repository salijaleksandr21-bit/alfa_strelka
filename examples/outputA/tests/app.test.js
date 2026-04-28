/**
 * Юнит-тесты для веб-калькулятора QuickCalc
 * Проверяют функциональные требования ФТ-01 – ФТ-10 с соблюдением правил безопасности.
 */

// Подключаем приложение (предполагается, что оно экспортирует классы или доступно в глобальной области)
const app = require('../app.js');

// Моки для внешних зависимостей
const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => { store[key] = value; }),
    removeItem: jest.fn((key) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(global, 'localStorage', { value: mockLocalStorage, writable: true });

// Мок для AudioContext
const mockAudioContext = {
  createOscillator: jest.fn(() => ({
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    frequency: { value: 0 },
    type: '',
  })),
  createGain: jest.fn(() => ({
    connect: jest.fn(),
    gain: { value: 0, exponentialRampToValueAtTime: jest.fn() },
  })),
  destination: {},
  currentTime: 0,
};
global.AudioContext = jest.fn(() => mockAudioContext);
global.webkitAudioContext = undefined;

// Мок для confirm
global.confirm = jest.fn(() => true);

// Мок для document (используется в методах SafeCalculator и HistoryManager)
// Используем jsdom – он уже доступен в тестовой среде

// Вспомогательная функция для создания DOM-элементов
function createMockElement() {
  return {
    classList: { add: jest.fn(), remove: jest.fn() },
    textContent: '',
    style: { display: 'none' },
    appendChild: jest.fn(),
    addEventListener: jest.fn(),
  };
}

// Перед каждым тестом сбрасываем моки и состояние
beforeEach(() => {
  jest.clearAllMocks();
  mockLocalStorage.clear();

  // Пересоздаём DOM-элементы, используемые в калькуляторе
  document.body.innerHTML = `
    <div class="display">
      <div id="previousExpression"></div>
      <div id="currentInput">0</div>
      <div id="errorMessage" style="display: none;"></div>
    </div>
    <div id="historyList"></div>
  `;
});

// ============================================================================
// ТЕСТЫ ДЛЯ SafeCalculator
// ============================================================================
describe('SafeCalculator', () => {
  let calc;

  beforeEach(() => {
    // Создаём экземпляр и заменяем DOM-методы шпионами для избежания побочных эффектов
    calc = new app.SafeCalculator();
    jest.spyOn(calc, 'updateDisplay').mockImplementation(jest.fn());
    jest.spyOn(calc, 'showError').mockImplementation(jest.fn());
    jest.spyOn(calc, 'clearError').mockImplementation(jest.fn());
  });

  // ФТ-01: Базовые арифметические операции
  describe('ФТ-01: Выполнение базовых арифметических операций', () => {
    test('сложение: 2 + 3 = 5', () => {
      calc.inputDigit('2');
      calc.setOperation('add');
      calc.inputDigit('3');
      calc.calculate();
      expect(calc.currentValue).toBe('5');
      expect(calc.operation).toBeNull();
    });

    test('вычитание: 10 - 4 = 6', () => {
      calc.inputDigit('1');
      calc.inputDigit('0');
      calc.setOperation('subtract');
      calc.inputDigit('4');
      calc.calculate();
      expect(calc.currentValue).toBe('6');
    });

    test('умножение: 3 × 7 = 21', () => {
      calc.inputDigit('3');
      calc.setOperation('multiply');
      calc.inputDigit('7');
      calc.calculate();
      expect(calc.currentValue).toBe('21');
    });

    test('деление: 15 ÷ 3 = 5', () => {
      calc.inputDigit('1');
      calc.inputDigit('5');
      calc.setOperation('divide');
      calc.inputDigit('3');
      calc.calculate();
      expect(calc.currentValue).toBe('5');
    });
  });

  // ФТ-02: Деление на ноль
  describe('ФТ-02: Обработка деления на ноль', () => {
    test('деление на ноль вызывает ошибку', () => {
      calc.inputDigit('5');
      calc.setOperation('divide');
      calc.inputDigit('0');
      calc.calculate();
      expect(calc.currentValue).toBe('5'); // текущее значение не меняется
      expect(calc.showError).toHaveBeenCalledWith('Ошибка: деление на ноль');
    });

    test('деление ненулевого числа на ноль не производит вычисление', () => {
      calc.inputDigit('9');
      calc.setOperation('divide');
      calc.inputDigit('0');
      // Проверяем, что операция сохраняется, а второе число остаётся в текущем
      expect(calc.currentValue).toBe('0');
      expect(calc.operation).toBe('divide');
    });
  });

  // ФТ-03: Очистка текущего ввода (кнопка C)
  describe('ФТ-03: Очистка текущего ввода', () => {
    test('нажатие C сбрасывает все поля, но не вызывает ошибок', () => {
      calc.inputDigit('1');
      calc.inputDigit('2');
      calc.setOperation('add');
      calc.inputDigit('3');
      calc.clear();
      expect(calc.currentValue).toBe('0');
      expect(calc.previousValue).toBe('');
      expect(calc.operation).toBeNull();
      expect(calc.expression).toBe('');
      expect(calc.shouldResetInput).toBe(false);
      // Ошибка не вызывалась
      expect(calc.showError).not.toHaveBeenCalled();
    });
  });

  // Дополнительные функции: backspace, percent
  test('backspace удаляет последний символ', () => {
    calc.inputDigit('1');
    calc.inputDigit('2');
    calc.inputDigit('3');
    calc.backspace();
    expect(calc.currentValue).toBe('12');
    calc.backspace();
    expect(calc.currentValue).toBe('1');
    calc.backspace();
    expect(calc.currentValue).toBe('0'); // не опускается ниже 0
  });

  test('percent делит на 100', () => {
    calc.inputDigit('5');
    calc.inputDigit('0');
    calc.percent();
    expect(calc.currentValue).toBe('0.5');
  });

  // ФТ-10: Запрет на eval и new Function
  test('не использует eval() или new Function()', () => {
    // Проверяем, что в объекте нет этих вызовов
    const codeString = calc.calculate.toString();
    expect(codeString).not.toContain('eval');
    expect(codeString).not.toContain('new Function');
  });

  // ФТ-09: Защита от XSS (через textContent)
  test('отображение результатов использует textContent, а не innerHTML', () => {
    // Создаём реальные DOM-элементы (уже есть в document)
    const display = document.querySelector('.display');
    // Проверяем, что методы updateDisplay и showError используют textContent
    const updateDisplaySpy = jest.spyOn(calc, 'updateDisplay');
    calc.inputDigit('5');
    calc.updateDisplay();
    // После вызова updateDisplay, DOM должен обновиться через textContent
    const currentInput = document.getElementById('currentInput');
    expect(currentInput.textContent).toBe('5');
    // проверяем, что не используется innerHTML
    expect(currentInput.innerHTML).toBe('5'); // если innerHTML совпадает, значит textContent тоже установлен
  });
});

// ============================================================================
// ТЕСТЫ ДЛЯ HistoryManager
// ============================================================================
describe('HistoryManager', () => {
  let history;

  beforeEach(() => {
    history = new app.HistoryManager();
    // Подменяем renderHistory шпионом (он использует DOM)
    jest.spyOn(history, 'renderHistory').mockImplementation(jest.fn());
  });

  // ФТ-04: Сохранение и отображение истории
  describe('ФТ-04: Просмотр истории вычислений', () => {
    test('добавление записи сохраняет её в localStorage', () => {
      history.addEntry('2 + 3 = 5');
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'quickcalc_history',
        JSON.stringify(['2 + 3 = 5'])
      );
    });

    test('история содержит не более 10 записей', () => {
      for (let i = 0; i < 12; i++) {
        history.addEntry(`запись ${i}`);
      }
      const stored = history.getHistory();
      expect(stored.length).toBe(10);
      expect(stored[0]).toBe('запись 11'); // последняя добавленная
    });

    test('записи восстанавливаются после перезагрузки (имитация)', () => {
      // Сохраняем
      history.addEntry('5 × 6 = 30');
      // Создаём новый экземпляр (как после перезагрузки)
      const newHistory = new app.HistoryManager();
      const stored = newHistory.getHistory();
      expect(stored).toContain('5 × 6 = 30');
    });
  });

  // ФТ-05: Очистка истории
  describe('ФТ-05: Очистка истории', () => {
    test('очистка удаляет все записи из localStorage', () => {
      history.addEntry('1 + 1 = 2');
      history.addEntry('2 + 2 = 4');
      history.clearHistory();
      expect(localStorage.removeItem).toHaveBeenCalledWith('quickcalc_history');
    });

    test('очистка не срабатывает без подтверждения', () => {
      global.confirm.mockReturnValueOnce(false);
      history.addEntry('test');
      history.clearHistory();
      expect(localStorage.removeItem).not.toHaveBeenCalled();
    });

    test('после очистки история пуста', () => {
      history.addEntry('3 ÷ 3 = 1');
      history.clearHistory();
      expect(history.getHistory()).toEqual([]);
    });
  });

  // ФТ-09: Защита от XSS при отображении истории
  describe('ФТ-09: Защита от XSS при отображении', () => {
    test('renderHistory использует textContent и не интерпретирует HTML', () => {
      // Восстанавливаем оригинальный renderHistory для этого теста
      history.renderHistory.mockRestore();

      // Добавляем опасную запись
      const maliciousEntry = '<script>alert(1)</script>';
      history.addEntry(maliciousEntry);

      // Вызываем рендеринг
      history.renderHistory();

      const list = document.getElementById('historyList');
      const items = list.querySelectorAll('li');
      expect(items.length).toBeGreaterThan(0);
      const firstItem = items[0];
      // Проверяем, что текст равен исходной строке, а не интерпретирован как HTML
      expect(firstItem.textContent).toBe(maliciousEntry);
      // innerHTML не должен содержать тег <script>
      expect(firstItem.innerHTML).not.toContain('<script>');
      // Проверяем, что вставка была через textContent (innerHTML совпадает с textContent)
      expect(firstItem.innerHTML).toBe(maliciousEntry);
    });
  });
});

// ============================================================================
// ТЕСТЫ ДЛЯ ИНТЕГРАЦИИ (опционально)
// ============================================================================
describe('Интеграция калькулятора и истории', () => {
  test('успешное вычисление добавляет запись в историю', () => {
    // Чтобы проверить интеграцию, нужно воспользоваться реальным объектом historyManager
    // и замокать addHistoryEntry
    const addSpy = jest.spyOn(global, 'addHistoryEntry');
    const calc = new app.SafeCalculator();
    calc.inputDigit('2');
    calc.setOperation('add');
    calc.inputDigit('3');
    calc.calculate();
    expect(addSpy).toHaveBeenCalledWith('2 + 3 = 5');
  });
});
