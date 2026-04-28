/*
 * Тесты для проверки взаимодействия с API и кэшированием.
 * Проверяет, что внешние вызовы моканы и данные сохраняются безопасно.
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

describe('API и кэширование', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Инициализация состояния
        app.state = {
            rates: {},
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

    test('должна использовать кэш при ошибке API', async () => {
        // Мокируем fetch для возврата ошибки
        fetch.mockRejectedValue(new Error('Network Error'));
        
        // Мокируем localStorage для возврата кэша
        const cachedData = JSON.stringify({
            rates: { USD: 1, EUR: 0.85 },
            timestamp: Date.now() - 1000 // Свежий кэш
        });
        window.localStorage.getItem.mockReturnValue(cachedData);

        // Вызываем функцию получения данных
        await app.fetchRatesFromApi(false);

        // Проверяем, что данные взяты из кэша
        expect(app.state.rates).toEqual({ USD: 1, EUR: 0.85 });
        expect(app.state.isOnline).toBe(false);
    });

    test('должна сохранять данные в кэш при успешном запросе', async () => {
        // Мокируем fetch для возврата успешного ответа
        const mockResponse = {
            ok: true,
            json: jest.fn().mockResolvedValue({ rates: { USD: 1, EUR: 0.85 } })
        };
        fetch.mockResolvedValue(mockResponse);

        // Вызываем функцию получения данных
        await app.fetchRatesFromApi(false);

        // Проверяем, что данные сохранены в localStorage
        expect(window.localStorage.setItem).toHaveBeenCalled();
        expect(app.state.rates).toEqual({ USD: 1, EUR: 0.85 });
    });

    test('не должна сохранять чувствительные данные в localStorage', () => {
        // Проверяем, что в localStorage не сохраняются токены или пароли
        // В данном коде сохраняются только настройки валют и суммы
        const settings = {
            fromCurrency: 'USD',
            toCurrency: 'EUR',
            amount: '100'
        };
        
        app.saveSettings();

        // Проверяем, что в localStorage нет чувствительных данных
        const savedData = JSON.parse(window.localStorage.setItem.mock.calls[0][1]);
        expect(savedData).not.toHaveProperty('token');
        expect(savedData).not.toHaveProperty('password');
    });
});