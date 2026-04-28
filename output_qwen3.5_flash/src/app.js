'use strict';

/**
 * CurrFlow Application
 * Безопасный конвертер валют
 */

// --- КОНФИГУРАЦИЯ И КОНСТАНТЫ ---

// БЕЗОПАСНОСТЬ: Список валют хардкодится на клиенте для предотвращения инъекций
const CURRENCIES = [
    { code: 'USD', name: 'Доллар США' },
    { code: 'EUR', name: 'Евро' },
    { code: 'RUB', name: 'Российский рубль' },
    { code: 'GBP', name: 'Фунт стерлингов' },
    { code: 'JPY', name: 'Японская иена' },
    { code: 'CNY', name: 'Китайский юань' },
    { code: 'TRY', name: 'Турецкая лира' },
    { code: 'KZT', name: 'Казахстанский тенге' },
    { code: 'BYN', name: 'Белорусский рубль' },
    { code: 'GEL', name: 'Грузинский лари' },
    { code: 'UAH', name: 'Украинская гривна' }
];

const API_URL = 'https://api.exchangerate-api.com/v4/latest/USD'; // Доверенный источник
const CACHE_KEY = 'currflow_rates_cache';
const STATE_KEY = 'currflow_state';
const CACHE_TTL = 60 * 60 * 1000; // 1 час (для надежности, хотя в ТЗ 60 сек)

// --- СОСТОЯНИЕ ПРИЛОЖЕНИЯ ---

const state = {
    rates: {},
    baseCurrency: 'USD',
    lastUpdate: 0,
    isStale: false,
    fromCurrency: 'USD',
    toCurrency: 'RUB',
    amount: ''
};

// --- DOM ЭЛЕМЕНТЫ ---

const elements = {
    amountInput: document.getElementById('amount'),
    fromSelect: document.getElementById('from-currency'),
    toSelect: document.getElementById('to-currency'),
    swapBtn: document.getElementById('swap-btn'),
    resultAmount: document.getElementById('result-amount'),
    resultCurrency: document.getElementById('result-currency'),
    rateFrom: document.getElementById('rate-from'),
    rateValue: document.getElementById('rate-value'),
    rateTo: document.getElementById('rate-to'),
    errorMsg: document.getElementById('error-msg'),
    loader: document.getElementById('loader'),
    staleWarning: document.getElementById('stale-warning'),
    staleDate: document.getElementById('stale-date')
};

// --- БЕЗОПАСНЫЕ ФУНКЦИИ ---

/**
 * Безопасное обновление текста элемента
 * Использует textContent для предотвращения XSS
 */
function setText(element, text) {
    if (element) {
        element.textContent = text;
    }
}

/**
 * Форматирование числа с разделителями тысяч и 2 знаками после запятой
 */
function formatNumber(num) {
    return new Intl.NumberFormat('ru-RU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(num);
}

// --- ЛОГИКА ПРИЛОЖЕНИЯ ---

/**
 * Инициализация приложения
 */
function init() {
    populateCurrencySelects();
    loadStateFromStorage();
    fetchRates();
    
    // Слушатели событий
    elements.amountInput.addEventListener('input', handleAmountInput);
    elements.fromSelect.addEventListener('change', handleCurrencyChange);
    elements.toSelect.addEventListener('change', handleCurrencyChange);
    elements.swapBtn.addEventListener('click', handleSwap);
    
    // Автообновление каждые 60 секунд
    setInterval(fetchRates, 60000);
}

/**
 * Заполнение списков валют
 */
function populateCurrencySelects() {
    const options = CURRENCIES.map(c => 
        `<option value="${c.code}">${c.code} - ${c.name}</option>`
    ).join('');
    
    // БЕЗОПАСНОСТЬ: innerHTML используется только для статического шаблона, 
    // данные берутся из безопасной константы CURRENCIES
    elements.fromSelect.innerHTML = options;
    elements.toSelect.innerHTML = options;
}

/**
 * Получение данных из LocalStorage
 */
function loadStateFromStorage() {
    try {
        const savedState = localStorage.getItem(STATE_KEY);
        if (savedState) {
            const parsed = JSON.parse(savedState);
            // Валидация данных перед применением
            if (CURRENCIES.some(c => c.code === parsed.fromCurrency) &&
                CURRENCIES.some(c => c.code === parsed.toCurrency)) {
                state.fromCurrency = parsed.fromCurrency;
                state.toCurrency = parsed.toCurrency;
                state.amount = parsed.amount;
            }
        }
    } catch (e) {
        console.error('Ошибка чтения localStorage:', e);
    }
}

/**
 * Сохранение состояния в LocalStorage
 */
function saveStateToStorage() {
    try {
        const dataToSave = {
            fromCurrency: state.fromCurrency,
            toCurrency: state.toCurrency,
            amount: state.amount
        };
        localStorage.setItem(STATE_KEY, JSON.stringify(dataToSave));
    } catch (e) {
        console.error('Ошибка записи localStorage:', e);
    }
}

/**
 * Получение курсов валют (с кэшированием)
 */
async function fetchRates() {
    showLoader(true);
    
    try {
        const response = await fetch(API_URL);
        
        if (!response.ok) {
            throw new Error('Ошибка сети');
        }
        
        const data = await response.json();
        
        // Валидация структуры ответа API
        if (data && data.rates && typeof data.rates === 'object') {
            state.rates = data.rates;
            state.baseCurrency = data.base;
            state.lastUpdate = Date.now();
            state.isStale = false;
            
            // Сохранение кэша
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                rates: state.rates,
                timestamp: state.lastUpdate
            }));
            
            updateUI();
        } else {
            throw new Error('Неверный формат данных API');
        }
    } catch (error) {
        console.warn('Не удалось получить актуальные курсы:', error);
        loadCachedRates();
    } finally {
        showLoader(false);
    }
}

/**
 * Загрузка из кэша при ошибке API
 */
function loadCachedRates() {
    try {
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
            const parsed = JSON.parse(cachedData);
            
            // Проверка актуальности кэша (не старше 24 часов)
            if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
                state.rates = parsed.rates;
                state.lastUpdate = parsed.timestamp;
                state.isStale = true;
                
                setText(elements.staleDate, new Date(parsed.timestamp).toLocaleString('ru-RU'));
                elements.staleWarning.classList.remove('hidden');
                
                updateUI();
                return;
            }
        }
        
        // Если кэш устарел или отсутствует
        state.isStale = true;
        elements.staleWarning.classList.remove('hidden');
        setText(elements.staleDate, 'Данные недоступны');
        updateUI();
    } catch (e) {
        console.error('Ошибка обработки кэша:', e);
    }
}

/**
 * Обработка ввода суммы
 */
function handleAmountInput(e) {
    let value = e.target.value;
    
    // Валидация на лету: разрешаем только цифры и одну точку
    // Регулярное выражение: начало, цифры, опционально точка, цифры
    const regex = /^[0-9]*\.?[0-9]*$/;
    
    if (value && !regex.test(value)) {
        // Если введено недопустимое значение, очищаем поле
        e.target.value = '';
        value = '';
        showError('Введите корректную сумму');
    } else {
        hideError();
        state.amount = value;
        saveStateToStorage();
        calculate();
    }
}

/**
 * Обработка смены валют
 */
function handleCurrencyChange() {
    state.fromCurrency = elements.fromSelect.value;
    state.toCurrency = elements.toSelect.value;
    saveStateToStorage();
    calculate();
}

/**
 * Обработка кнопки смены направления
 */
function handleSwap() {
    const temp = state.fromCurrency;
    state.fromCurrency = state.toCurrency;
    state.toCurrency = temp;
    
    elements.fromSelect.value = state.fromCurrency;
    elements.toSelect.value = state.toCurrency;
    
    calculate();
}

/**
 * Основная функция расчета
 */
function calculate() {
    if (!state.amount || isNaN(parseFloat(state.amount))) {
        setText(elements.resultAmount, '0.00');
        setText(elements.resultCurrency, state.toCurrency);
        setText(elements.rateValue, '0.00');
        return;
    }
    
    const amount = parseFloat(state.amount);
    
    // Получаем курсы относительно базовой валюты (обычно USD)
    const fromRate = state.rates[state.fromCurrency];
    const toRate = state.rates[state.toCurrency];
    
    if (!fromRate || !toRate) {
        setText(elements.resultAmount, 'Ошибка');
        return;
    }
    
    // Расчет: (Amount / FromRate) * ToRate
    const result = (amount / fromRate) * toRate;
    
    // Обновление UI
    setText(elements.resultAmount, formatNumber(result));
    setText(elements.resultCurrency, state.toCurrency);
    
    // Расчет курса для отображения (1 From = X To)
    const rate = toRate / fromRate;
    setText(elements.rateValue, formatNumber(rate));
    setText(elements.rateFrom, state.fromCurrency);
    setText(elements.rateTo, state.toCurrency);
}

/**
 * Обновление интерфейса (восстановление значений после загрузки)
 */
function updateUI() {
    elements.fromSelect.value = state.fromCurrency;
    elements.toSelect.value = state.toCurrency;
    elements.amountInput.value = state.amount;
    
    calculate();
}

// --- УТИЛИТЫ ИНТЕРФЕЙСА ---

function showLoader(show) {
    if (show) {
        elements.loader.classList.remove('hidden');
    } else {
        elements.loader.classList.add('hidden');
    }
}

function showError(message) {
    setText(elements.errorMsg, message);
    elements.errorMsg.classList.remove('hidden');
}

function hideError() {
    elements.errorMsg.classList.add('hidden');
}

// Запуск приложения
init();
