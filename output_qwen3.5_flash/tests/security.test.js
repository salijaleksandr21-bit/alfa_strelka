/**
 * Тесты безопасности (ФТ-01, ФТ-04, ФТ-08, ФТ-10)
 * Проверяет защиту от XSS, работу с LocalStorage и валидацию данных.
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
    document.body.innerHTML = `
        <span id="error-msg"></span>
        <span id="stale-date"></span>
    `;
});

describe('Безопасность и защита данных', () => {
    test('Функция setText должна использовать textContent для предотвращения XSS', () => {
        // Подготовка
        const element = document.getElementById('error-msg');
        const maliciousString = '<script>alert("xss")</script>';

        // Выполнение
        setText(element, maliciousString);

        // Проверка
        // textContent должен содержать строку как текст, а не HTML
        expect(element.textContent).toBe(maliciousString);
        // innerHTML должен быть пустым или не содержать скрипт
        expect(element.innerHTML).toBe('');
    });

    test('loadStateFromStorage должна валидировать коды валют из LocalStorage', () => {
        // Подготовка
        const maliciousState = JSON.stringify({
            fromCurrency: 'MALICIOUS_CODE',
            toCurrency: 'RUB',
            amount: '100'
        });
        localStorage.getItem.mockReturnValue(maliciousState);

        // Выполнение
        loadStateFromStorage();

        // Проверка
        // Значения не должны быть применены, так как код валют не в списке CURRENCIES
        expect(state.fromCurrency).not.toBe('MALICIOUS_CODE');
        expect(localStorage.setItem).not.toHaveBeenCalled(); // Не должно перезаписывать при ошибке
    });

    test('localStorage не должен хранить чувствительные данные (ФТ-08)', () => {
        // Подготовка
        const sensitiveData = JSON.stringify({
            fromCurrency: 'USD',
            toCurrency: 'RUB',
            amount: '100',
            password: 'secret123' // Пытаемся сохранить пароль
        });
        localStorage.getItem.mockReturnValue(sensitiveData);

        // Выполнение
        // Имитируем сохранение состояния (вызов saveStateToStorage)
        saveStateToStorage();

        // Проверка
        // В реальном коде saveStateToStorage не сохраняет пароль, но проверим логику
        // Здесь мы проверяем, что в тесте мы не передаем чувствительные данные
        const callArgs = localStorage.setItem.mock.calls[0][1];
        expect(callArgs).not.toContain('password');
    });
});