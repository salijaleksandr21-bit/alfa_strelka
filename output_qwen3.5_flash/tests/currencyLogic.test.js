/**
 * Тесты логики конвертации валют (ФТ-05, ФТ-06)
 * Проверяет расчеты и работу с состоянием.
 */

// Моки для внешних зависимостей
global.fetch = jest.fn();
global.localStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
};

beforeEach(() => {
    // Инициализация DOM элементов
    document.body.innerHTML = `
        <span id="result-amount"></span>
        <span id="result-currency"></span>
        <span id="rate-from"></span>
        <span id="rate-value"></span>
        <span id="rate-to"></span>
    `;
    // Сброс состояния
    state.rates = { USD: 1, RUB: 75.5, EUR: 82.0 };
    state.fromCurrency = 'USD';
    state.toCurrency = 'RUB';
    state.amount = '10';
});

describe('Логика конвертации', () => {
    test('Должна корректно рассчитывать сумму (USD -> RUB)', () => {
        // Подготовка
        state.amount = '10';
        state.rates = { USD: 1, RUB: 75.5 };

        // Выполнение
        calculate();

        // Проверка (10 USD * 75.5 = 755 RUB)
        expect(document.getElementById('result-amount').textContent).toBe('755.00');
        expect(document.getElementById('result-currency').textContent).toBe('RUB');
    });

    test('Должна обрабатывать отсутствие курса валют', () => {
        // Подготовка
        state.amount = '10';
        state.rates = { USD: 1 }; // Нет курса RUB
        state.fromCurrency = 'USD';
        state.toCurrency = 'RUB';

        // Выполнение
        calculate();

        // Проверка
        expect(document.getElementById('result-amount').textContent).toBe('Ошибка');
    });

    test('Должна сохранять состояние при смене валют (ФТ-06)', () => {
        // Подготовка
        state.fromCurrency = 'USD';
        state.toCurrency = 'RUB';
        const swapBtn = document.createElement('button');
        swapBtn.id = 'swap-btn';
        document.body.appendChild(swapBtn);
        
        // Имитация клика (вызов функции напрямую)
        handleSwap();

        // Проверка
        expect(state.fromCurrency).toBe('RUB');
        expect(state.toCurrency).toBe('USD');
    });
});