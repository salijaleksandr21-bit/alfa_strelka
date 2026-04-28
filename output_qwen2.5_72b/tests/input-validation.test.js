/*
 * Тесты для проверки безопасности ввода и валидации данных.
 * Проверяет, что пользовательские данные не вызывают XSS и корректно обрабатываются.
 */

// Моки для окружения браузера
global.document = {
    getElementById: jest.fn(),
    addEventListener: jest.fn(),
    dispatchEvent: jest.fn()
};

global.window = {
    localStorage: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn()
    }
};

global.fetch = jest.fn();

// Импортируем приложение (после моков)
const app = require('../src/app.js');

describe('Безопасность ввода и валидация', () => {
    beforeEach(() => {
        // Сброс моков перед каждым тестом
        jest.clearAllMocks();
        // Инициализация состояния приложения
        app.state = {
            rates: { USD: 1, EUR: 0.85 },
            fromCurrency: 'USD',
            toCurrency: 'EUR',
            amount: '',
            lastUpdated: null,
            isOnline: true
        };
        // Мокирование DOM элементов
        const mockElements = {
            fromSelect: { value: 'USD', addEventListener: jest.fn() },
            toSelect: { value: 'EUR', addEventListener: jest.fn() },
            amountInput: { value: '', addEventListener: jest.fn() },
            resultAmount: { textContent: '' },
            resultCurrency: { textContent: '' },
            rateInfo: { textContent: '' },
            spinner: { classList: { add: jest.fn(), remove: jest.fn() } },
            errorMessage: { textContent: '', classList: { add: jest.fn(), remove: jest.fn() } },
            swapBtn: { addEventListener: jest.fn() }
        };
        document.getElementById.mockImplementation((id) => mockElements[id] || {});
    });

    test('должна отфильтровать вредоносные символы из ввода суммы', () => {
        // Создаем мок события ввода
        const mockEvent = {
            target: { value: '<script>alert(1)</script>' }
        };

        // Вызываем функцию обработки ввода
        app.handleAmountInput(mockEvent);

        // Проверяем, что значение очищено от скриптов
        expect(app.state.amount).toBe('');
        expect(mockEvent.target.value).toBe('');
    });

    test('должна разрешить только цифры и одну точку', () => {
        const mockEvent = {
            target: { value: '123.45abc' }
        };

        app.handleAmountInput(mockEvent);

        // Ожидаем, что буквы удалены, но цифры и точка остались
        expect(app.state.amount).toBe('123.45');
    });

    test('не должна допускать отрицательные числа', () => {
        const mockEvent = {
            target: { value: '-100' }
        };

        app.handleAmountInput(mockEvent);

        // Минус должен быть удален
        expect(app.state.amount).toBe('100');
    });
});