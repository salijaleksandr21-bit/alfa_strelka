const { loadStateFromStorage } = require('../src/app.js');

const mockElements = {
    fromSelect: { value: '' },
    toSelect: { value: '' },
    amountInput: { value: '' }
};

global.elements = mockElements;

describe('Безопасность работы с localStorage (ФТ-03)', () => {
    beforeEach(() => {
        localStorage.clear();
        jest.clearAllMocks();
    });

    test('Должен восстанавливать состояние при валидных данных в хранилище', () => {
        const validState = JSON.stringify({ from: 'USD', to: 'RUB', amount: '50' });
        localStorage.setItem('currflow_state', validState);

        loadStateFromStorage();

        expect(mockElements.fromSelect.value).toBe('USD');
        expect(mockElements.toSelect.value).toBe('RUB');
        expect(mockElements.amountInput.value).toBe('50');
    });

    test('НЕ должен применять данные из localStorage, если валюта не входит в белый список (XSS/Injection protection)', () => {
        // Попытка внедрить вредоносный код или неподдерживаемую валюту через localStorage
        const maliciousState = JSON.stringify({
            from: '<img src=x onerror=alert(1)>',
            to: 'EUR',
            amount: '100'
        });
        localStorage.setItem('currflow_state', maliciousState);

        loadStateFromStorage();

        // Значение не должно обновиться на вредоносное, так как оно не в CONFIG.SUPPORTED_CURRENCIES
        expect(mockElements.fromSelect.value).not.toBe('<img src=x onerror=alert(1)>');
    });
});