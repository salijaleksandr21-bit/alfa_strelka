const { updateRates, handleApiError } = require('../src/app.js');

// Мокаем fetch
global.fetch = jest.fn();

const mockElements = {
    loader: { classList: { add: jest.fn(), remove: jest.fn() } },
    resultDisplay: { classList: { add: jest.fn(), remove: jest.fn() } },
    statusBanner: { classList: { add: jest.fn(), remove: jest.fn() } },
    resultValue: { textContent: '' },
    rateInfo: { textContent: '' },
    cacheDate: { textContent: '' }
};

global.elements = mockElements;

describe('Работа с API и кешированием (ФТ-05, ФТ-06)', () => {
    beforeEach(() => {
        localStorage.clear();n        jest.clearAllMocks();
    });

    test('Должен успешно обновлять курсы при корректном ответе API', async () => {
        const mockResponse = { 
            rates: { 'USD': 1, 'EUR': 0.92, 'RUB': 90 } 
        };
        
        fetch.mockResolvedValue({ 
            ok: true, 
            json: async () => mockResponse 
        });

        await updateRates();

        expect(global.state.rates['EUR']).toBe(0.92);
        expect(mockElements.statusBanner.classList.add).toHaveBeenCalledWith('hidden');
    });

    test('Должен использовать кешированные данные при ошибке API', async () => {
        // Сохраняем данные в кеш
        const cachedRates = { 'USD': 1, 'EUR': 0.90 };
        localStorage.setItem('currflow_rates', JSON.stringify(cachedRates));
        localStorage.setItem('currflow_date', '01.01.2024');

        // Имитируем сбой сети
        fetch.mockRejectedValue(new Error('Network Error'));

        await updateRates();

        expect(global.state.rates['EUR']).toBe(0.90);
        expect(mockElements.statusBanner.classList.remove).toHaveBeenCalledWith('hidden');
    });
});