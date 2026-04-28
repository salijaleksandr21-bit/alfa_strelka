"use strict";

// Безопасное вычисление арифметических выражений без использования eval()
class SafeCalculator {
    constructor() {
        this.currentValue = '0';
        this.previousValue = '';
        this.operation = null;
        this.shouldResetInput = false;
        this.expression = '';
    }

    // Добавление цифры или точки
    inputDigit(digit) {
        if (this.shouldResetInput) {
            this.currentValue = digit === '.' ? '0.' : digit;
            this.shouldResetInput = false;
        } else {
            if (digit === '.' && this.currentValue.includes('.')) {
                return;
            }
            if (this.currentValue === '0' && digit !== '.') {
                this.currentValue = digit;
            } else {
                this.currentValue += digit;
            }
        }
        this.clearError();
    }

    // Выбор операции
    setOperation(op) {
        if (this.operation && !this.shouldResetInput) {
            this.calculate();
        }
        this.previousValue = this.currentValue;
        this.operation = op;
        this.shouldResetInput = true;
        this.updateExpression();
    }

    // Выполнение вычисления
    calculate() {
        if (!this.operation) return;
        
        const prev = parseFloat(this.previousValue);
        const curr = parseFloat(this.currentValue);
        
        if (isNaN(prev) || isNaN(curr)) {
            this.showError('Ошибка: некорректное число');
            return;
        }

        let result;
        switch (this.operation) {
            case 'add':
                result = prev + curr;
                break;
            case 'subtract':
                result = prev - curr;
                break;
            case 'multiply':
                result = prev * curr;
                break;
            case 'divide':
                if (curr === 0) {
                    this.showError('Ошибка: деление на ноль');
                    return;
                }
                result = prev / curr;
                break;
            default:
                return;
        }

        // Округление для избежания ошибок с плавающей точкой
        if (Number.isFinite(result)) {
            result = Math.round(result * 1e10) / 1e10;
        }

        const historyEntry = `${this.previousValue} ${this.getOperationSymbol()} ${this.currentValue} = ${result}`;
        this.currentValue = String(result);
        this.operation = null;
        this.previousValue = '';
        this.shouldResetInput = true;
        this.expression = '';
        this.clearError();
        
        // Сохранение в историю
        addHistoryEntry(historyEntry);
    }

    // Получение символа операции
    getOperationSymbol() {
        const symbols = {
            'add': '+',
            'subtract': '−',
            'multiply': '×',
            'divide': '÷'
        };
        return symbols[this.operation] || '';
    }

    // Обновление выражения для отображения
    updateExpression() {
        if (this.operation) {
            this.expression = `${this.previousValue} ${this.getOperationSymbol()}`;
        }
    }

    // Очистка
    clear() {
        this.currentValue = '0';
        this.previousValue = '';
        this.operation = null;
        this.shouldResetInput = false;
        this.expression = '';
        this.clearError();
    }

    // Удаление последнего символа
    backspace() {
        if (this.currentValue.length > 1) {
            this.currentValue = this.currentValue.slice(0, -1);
        } else {
            this.currentValue = '0';
        }
        this.clearError();
    }

    // Процент
    percent() {
        const value = parseFloat(this.currentValue);
        if (!isNaN(value)) {
            this.currentValue = String(value / 100);
        }
    }

    // Показ ошибки
    showError(message) {
        const display = document.querySelector('.display');
        const errorElement = document.getElementById('errorMessage');
        display.classList.add('error');
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }

    // Очистка ошибки
    clearError() {
        const display = document.querySelector('.display');
        const errorElement = document.getElementById('errorMessage');
        display.classList.remove('error');
        errorElement.textContent = '';
        errorElement.style.display = 'none';
    }

    // Обновление интерфейса
    updateDisplay() {
        document.getElementById('currentInput').textContent = this.currentValue;
        document.getElementById('previousExpression').textContent = this.expression;
    }
}

// Управление историей
class HistoryManager {
    constructor() {
        this.maxEntries = 10;
        this.storageKey = 'quickcalc_history';
    }

    // Получение истории из localStorage
    getHistory() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    }

    // Добавление записи в историю
    addEntry(entry) {
        const history = this.getHistory();
        history.unshift(entry);
        if (history.length > this.maxEntries) {
            history.pop();
        }
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(history));
        } catch (e) {
            // localStorage может быть недоступен
        }
        this.renderHistory();
    }

    // Очистка истории
    clearHistory() {
        if (confirm('Вы уверены, что хотите очистить историю?')) {
            try {
                localStorage.removeItem(this.storageKey);
            } catch (e) {
                // localStorage может быть недоступен
            }
            this.renderHistory();
        }
    }

    // Отображение истории
    renderHistory() {
        const historyList = document.getElementById('historyList');
        const history = this.getHistory();
        
        historyList.innerHTML = '';
        
        if (history.length === 0) {
            const emptyItem = document.createElement('li');
            emptyItem.textContent = 'История пуста';
            emptyItem.style.cursor = 'default';
            historyList.appendChild(emptyItem);
            return;
        }

        history.forEach((entry, index) => {
            const li = document.createElement('li');
            li.textContent = entry;
            li.addEventListener('click', () => {
                // Подстановка выражения в калькулятор
                const parts = entry.split(' = ');
                if (parts.length === 2) {
                    calculator.currentValue = parts[1];
                    calculator.shouldResetInput = true;
                    calculator.expression = '';
                    calculator.clearError();
                    calculator.updateDisplay();
                }
            });
            historyList.appendChild(li);
        });
    }
}

// Инициализация
const calculator = new SafeCalculator();
const historyManager = new HistoryManager();

// Функция для добавления записи в историю
function addHistoryEntry(entry) {
    historyManager.addEntry(entry);
}

// Обработка нажатий кнопок
document.querySelectorAll('.btn').forEach(button => {
    button.addEventListener('click', function() {
        // Воспроизведение звука клика
        playClickSound();
        
        const action = this.dataset.action;
        const value = this.dataset.value;
        
        if (value !== undefined) {
            calculator.inputDigit(value);
        } else if (action) {
            switch (action) {
                case 'clear':
                    calculator.clear();
                    break;
                case 'backspace':
                    calculator.backspace();
                    break;
                case 'percent':
                    calculator.percent();
                    break;
                case 'add':
                case 'subtract':
                case 'multiply':
                case 'divide':
                    calculator.setOperation(action);
                    break;
                case 'equals':
                    calculator.calculate();
                    break;
            }
        }
        
        calculator.updateDisplay();
    });
});

// Обработка кнопки истории
document.getElementById('historyToggle').addEventListener('click', function() {
    const panel = document.getElementById('historyPanel');
    if (panel.style.display === 'none') {
        panel.style.display = 'block';
        historyManager.renderHistory();
    } else {
        panel.style.display = 'none';
    }
});

// Обработка кнопки очистки истории
document.getElementById('clearHistory').addEventListener('click', function() {
    historyManager.clearHistory();
});

// Воспроизведение звука клика
function playClickSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.1;
        
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
        // Если AudioContext недоступен, просто игнорируем
    }
}

// Инициализация истории при загрузке
historyManager.renderHistory();

// Обработка клавиатуры (только для цифр и основных операций)
document.addEventListener('keydown', function(e) {
    const key = e.key;
    
    // Цифры
    if (/^[0-9]$/.test(key)) {
        calculator.inputDigit(key);
        calculator.updateDisplay();
        playClickSound();
        e.preventDefault();
    }
    
    // Точка
    if (key === '.') {
        calculator.inputDigit('.');
        calculator.updateDisplay();
        playClickSound();
        e.preventDefault();
    }
    
    // Операции
    const operationMap = {
        '+': 'add',
        '-': 'subtract',
        '*': 'multiply',
        '/': 'divide'
    };
    
    if (operationMap[key]) {
        calculator.setOperation(operationMap[key]);
        calculator.updateDisplay();
        playClickSound();
        e.preventDefault();
    }
    
    // Enter или = для вычисления
    if (key === 'Enter' || key === '=') {
        calculator.calculate();
        calculator.updateDisplay();
        playClickSound();
        e.preventDefault();
    }
    
    // Backspace для удаления
    if (key === 'Backspace') {
        calculator.backspace();
        calculator.updateDisplay();
        playClickSound();
        e.preventDefault();
    }
    
    // Escape для очистки
    if (key === 'Escape') {
        calculator.clear();
        calculator.updateDisplay();
        playClickSound();
        e.preventDefault();
    }
});