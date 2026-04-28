/**
 * Тесты валидации ввода суммы (ФТ-04)
 * Проверяет, что вводятся только числа и точка, без выполнения кода.
 */

// Моки для внешних зависимостей
global.fetch = jest.fn();
global.localStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
};

// Имитация DOM элементов перед загрузкой приложения
beforeEach(() => {
    document.body.innerHTML = `
        <input type="text" id="amount" placeholder="0.00">
        <span id="error-msg"></span>
    `;
    // Сброс состояния перед каждым тестом
    if (typeof state !== 'undefined') {
        state.amount = '';
    }
});

describe('Валидация ввода суммы', () => {
    test('Должна разрешать ввод корректных чисел (0.00)', () => {
        // Подготовка
        const input = document.getElementById('amount');
        input.value = '100.50';
        const event = { target: input };

        // Выполнение
        handleAmountInput(event);

        // Проверка
        expect(state.amount).toBe('100.50');
        expect(document.getElementById('error-msg').textContent).toBe('');
    });

    test('Должна блокировать ввод недопустимых символов (буквы)', () => {
        // Подготовка
        const input = document.getElementById('amount');
        input.value = 'abc';
        const event = { target: input };

        // Выполнение
        handleAmountInput(event);

        // Проверка
        expect(input.value).toBe(''); // Поле очищается
        expect(state.amount).toBe('');
        expect(document.getElementById('error-msg').textContent).toContain('корректную сумму');
    });

    test('Должна блокировать ввод потенциально опасных строк (XSS как данные)', () => {
        // Подготовка
        const input = document.getElementById('amount');
        // Используем безопасный тестовый вектор, не исполняемый в тесте
        input.value = '<script>alert(1)</script>';
        const event = { target: input };

        // Выполнение
        handleAmountInput(event);

        // Проверка
        expect(input.value).toBe(''); // Поле очищается
        expect(state.amount).toBe('');
        // Убедимся, что ошибка отображается, но код не выполняется
        expect(document.getElementById('error-msg').textContent).toContain('корректную сумму');
    });
});