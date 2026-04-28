const { calculate } = require('../src/app.js');

// Мокаем DOM элементы, так как тесты запускаются в среде Jest (JSDOM)
const mockElements = {
    amountInput: { value: '100' },
    fromSelect: { value: 'USD' },
    toSelect: { value: 'EUR' },
    resultValue: { textContent: '' },
    rateInfo: { textContent: '' },
    errorMsg: { classList: { remove: jest.fn(), add: jest.fn() } }
};

// Переопределяем глобальный объект elements для функции calculate
global.elements = mockElements;

describe('Валидация ввода и расчеты (ФТ-07, ФТ-08, ФТ-09)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        global.state = { rates: { 'USD': 1, 'EUR': 0.92, 'RUB': 90 } };
    });

    test('Должен корректно рассчитывать конвертацию при валидных данных', () => {
        mockElements.amountInput.value = '100';
        mockElements.fromSelect.value = 'USD';
        mockElements.toSelect.value = 'EUR';

        calculate();

        // 100 * (0.92 / 1) = 92.00
        expect(mockElements.resultValue.textContent).toBe('92,00');
        expect(mockElements.errorMsg.classList.add).toHaveBeenCalledWith('hidden');
    });

    test('Должен блокировать расчет и показывать ошибку при отрицательном числе', () => {
        mockElements.amountInput.value = '-100';
        
        calculate();

        expect(mockElements.resultValue.textContent).toBe('--');
        expect(mockElements.errorMsg.classList.remove).toHaveBeenCalledWith('hidden');
    });

    test('Должен обрабатывать некорректный нечисловой ввод (защита от инъекций)', () => {
        // Имитируем попытку ввода спецсимволов, которые могли бы пройти через JS
        mockElements.amountInput.value = '100<script>alert(1)</script>';
        
        calculate();

        expect(mockElements.resultValue.textContent).toBe('--');
        expect(mockElements.errorMsg.classList.remove).toHaveBeenCalledWith('hidden');
    });
});