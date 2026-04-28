/*
 * Тесты для проверки логики конвертации валют.
 * Проверяет математические расчеты и округление.
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

// Импортируем приложение
const app = require('../src/app.js');

describe('Логика конвертации валют', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Инициализация состояния
        app.state = {
            rates: { USD: 1, EUR: 0.85, RUB: 75.5 },
            fromCurrency: 'USD',
            toCurrency: 'EUR',
            amount: '100',
            lastUpdated: null,
            isOnline: true
        };
        // Мокирование DOM элементов
        const mockElements = {
            fromSelect: { value: 'USD', addEventListener: jest.fn() },
            toSelect: { value: 'EUR', addEventListener: jest.fn() },
            amountInput: { value: '100', addEventListener: jest.fn() },
            resultAmount: { textContent: '' },
            resultCurrency: { textContent: '' },
            rateInfo: { textContent: '' },
            spinner: { classList: { add: jest.fn(), remove: jest.fn() } },
            errorMessage: { textContent: '', classList: { add: jest.fn(), remove: jest.fn() } },
            swapBtn: { addEventListener: jest.fn() }
        };
        document.getElementById.mockImplementation((id) => mockElements[id] || {});
    });

    test('должна корректно конвертировать USD в EUR', () => {
        app.convertCurrency();

        // Ожидаемый результат: 100 * 0.85 = 85.00
        expect(app.state.resultAmount).toBe('85.00');
        expect(app.state.resultCurrency).toBe('EUR');
    });

    test('должна округлять результат до 2 знаков после запятой', () => {
        app.state.amount = '100.123';
        app.convertCurrency();

        // Результат должен быть округлен
        expect(app.state.resultAmount).toBe('85.10');
    });

    test('должна обрабатывать отсутствие курсов валют', () => {
        app.state.rates = {};
        app.convertCurrency();

        // Результат должен быть нулевым
        expect(app.state.resultAmount).toBe('0.00');
    });
});