'use strict';

/**
 * CurrFlow Application
 * Конвертер валют с поддержкой кэширования и безопасным вводом.
 */

// --- КОНФИГУРАЦИЯ ---
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

const API_URL = 'https://api.exchangerate-api.com/v4/latest/USD'; // Безопасный публичный API
const CACHE_KEY = 'currflow_rates_cache';
const SETTINGS_KEY = 'currflow_settings';
const CACHE_EXPIRY = 60 * 60 * 1000; // 1 час (для надежности, хотя обновление каждые 60 сек)

// --- СОСТОЯНИЕ ПРИЛОЖЕНИЯ ---
let state = {
    rates: {},
    fromCurrency: 'USD',
    toCurrency: 'EUR',
    amount: '',
    lastUpdated: null,
    isOnline: true
};

// --- DOM ЭЛЕМЕНТЫ ---
const elements = {
    fromSelect: document.getElementById('from-currency'),
    toSelect: document.getElementById('to-currency'),
    amountInput: document.getElementById('amount'),
    resultAmount: document.getElementById('result-amount'),
    resultCurrency: document.getElementById('result-currency'),
    rateInfo: document.getElementById('rate-info'),
    spinner: document.getElementById('loading-spinner'),
    errorMessage: document.getElementById('error-message'),
    swapBtn: document.getElementById('swap-btn')
};

// --- ИНИЦИАЛИЗАЦИЯ ---
function init() {
    populateCurrencySelects();
    loadSettings();
    fetchRates(); // Первая загрузка
    
    // Автоматическое обновление каждые 60 секунд
    setInterval(fetchRates, 60000);
}

// --- ЛОГИКА API И КАШИРОВАНИЯ ---

/**
 * Получает курсы валют. Сначала проверяет кэш, затем делает запрос.
 */
async function fetchRates() {
    showLoading(true);
    hideError();

    const now = Date.now();
    const cachedData = getCachedRates();

    // Если кэш свежий, используем его, но все равно пробуем обновить в фоне
    if (cachedData && (now - cachedData.timestamp < CACHE_EXPIRY)) {
        state.rates = cachedData.rates;
        state.lastUpdated = new Date(cachedData.timestamp);
        updateUI();
        showLoading(false);
        // Небольшая задержка перед фоновым обновлением, чтобы не спамить API
        setTimeout(() => fetchRatesFromApi(true), 2000);
        return;
    }

    // Если кэша нет или он устарел, делаем запрос
    await fetchRatesFromApi(false);
}

/**
 * Выполняет реальный запрос к API
 * @param {boolean} isBackground - Фоновый запрос (не обновляем UI при ошибке, если есть кэш)
 */
async function fetchRatesFromApi(isBackground) {
    try {
        const response = await fetch(API_URL, { method: 'GET' });
        
        if (!response.ok) {
            throw new Error('Ошибка сети');
        }

        const data = await response.json();
        
        // Валидация ответа API
        if (!data.rates || typeof data.rates !== 'object') {
            throw new Error('Неверный формат данных');
        }

        // Сохраняем в кэш
        saveRatesToCache(data.rates, Date.now());
        state.rates = data.rates;
        state.lastUpdated = new Date();
        state.isOnline = true;

        if (!isBackground) {
            updateUI();
        }
    } catch (error) {
        console.warn('Ошибка при получении курсов:', error);
        
        const cachedData = getCachedRates();
        
        if (cachedData && (Date.now() - cachedData.timestamp < CACHE_EXPIRY)) {
            // Используем кэш, если он есть
            state.rates = cachedData.rates;
            state.lastUpdated = new Date(cachedData.timestamp);
            state.isOnline = false;
            
            if (!isBackground) {
                showError('Данные устарели. Актуальные данные временно недоступны.');
                updateUI();
            }
        } else {
            // Кэша нет или он слишком старый
            state.isOnline = false;
            if (!isBackground) {
                showError('Не удалось загрузить курсы валют. Проверьте подключение к интернету.');
                state.rates = {}; // Очистка для предотвращения некорректных расчетов
                updateUI();
            }
        }
    } finally {
        if (!isBackground) {
            showLoading(false);
        }
    }
}

// --- ЛОГИКА ХРАНЕНИЯ ---

function getCachedRates() {
    try {
        const data = localStorage.getItem(CACHE_KEY);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error('Ошибка чтения кэша:', e);
        return null;
    }
}

function saveRatesToCache(rates, timestamp) {
    try {
        const data = { rates, timestamp };
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (e) {
        console.error('Ошибка записи кэша:', e);
    }
}

function loadSettings() {
    try {
        const data = localStorage.getItem(SETTINGS_KEY);
        if (data) {
            const settings = JSON.parse(data);
            // Валидация сохраненных данных
            if (CURRENCIES.find(c => c.code === settings.fromCurrency)) {
                state.fromCurrency = settings.fromCurrency;
            }
            if (CURRENCIES.find(c => c.code === settings.toCurrency)) {
                state.toCurrency = settings.toCurrency;
            }
            // Сумму можно сохранить, но лучше очищать при смене валют
            if (typeof settings.amount === 'string') {
                state.amount = settings.amount;
            }
        }
    } catch (e) {
        console.error('Ошибка загрузки настроек:', e);
    }
    
    // Применяем значения к UI
    elements.fromSelect.value = state.fromCurrency;
    elements.toSelect.value = state.toCurrency;
    elements.amountInput.value = state.amount;
}

function saveSettings() {
    try {
        const settings = {
            fromCurrency: state.fromCurrency,
            toCurrency: state.toCurrency,
            amount: state.amount
        };
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
        console.error('Ошибка сохранения настроек:', e);
    }
}

// --- ЛОГИКА ИНТЕРФЕЙСА ---

function populateCurrencySelects() {
    // Очищаем текущие опции, сохраняя первую (для отладки, если нужно)
    elements.fromSelect.innerHTML = '';
    elements.toSelect.innerHTML = '';

    CURRENCIES.forEach(currency => {
        const optionFrom = document.createElement('option');
        optionFrom.value = currency.code;
        optionFrom.textContent = `${currency.code} - ${currency.name}`;
        elements.fromSelect.appendChild(optionFrom);

        const optionTo = document.createElement('option');
        optionTo.value = currency.code;
        optionTo.textContent = `${currency.code} - ${currency.name}`;
        elements.toSelect.appendChild(optionTo);
    });
}

function convertCurrency() {
    const amount = parseFloat(state.amount);
    
    // Валидация ввода
    if (isNaN(amount) || amount < 0) {
        // Ошибка валидации обрабатывается в обработчике ввода, здесь просто сброс
        elements.resultAmount.textContent = '0.00';
        elements.resultCurrency.textContent = state.toCurrency;
        elements.rateInfo.textContent = '';
        return;
    }

    if (!state.rates || !state.rates[state.fromCurrency] || !state.rates[state.toCurrency]) {
        // Курсы не загружены
        elements.resultAmount.textContent = '0.00';
        elements.resultCurrency.textContent = state.toCurrency;
        elements.rateInfo.textContent = 'Курсы недоступны';
        return;
    }

    // Расчет
    // 1 USD -> X USD (база)
    // amount * (rate_to / rate_from)
    const rateFrom = state.rates[state.fromCurrency];
    const rateTo = state.rates[state.toCurrency];
    
    // Приводим к базовой валюте (USD), а затем к целевой
    const amountInBase = amount / rateFrom;
    const result = amountInBase * rateTo;
    
    // Округление до 2 знаков
    const formattedResult = result.toFixed(2);
    
    // Расчет курса обмена (1 единица исходной = X целевой)
    const exchangeRate = (rateTo / rateFrom).toFixed(4);

    // Обновление UI
    elements.resultAmount.textContent = formattedResult;
    elements.resultCurrency.textContent = state.toCurrency;
    elements.rateInfo.textContent = `1 ${state.fromCurrency} = ${exchangeRate} ${state.toCurrency}`;
    
    if (!state.isOnline) {
        elements.rateInfo.textContent += ' (данные устарели)';
    }
}

function updateUI() {
    // Обновляем текст курса
    if (state.amount) {
        convertCurrency();
    }
    
    // Обновляем статус в rateInfo, если есть данные
    if (state.rates && state.fromCurrency && state.toCurrency) {
        const rateFrom = state.rates[state.fromCurrency];
        const rateTo = state.rates[state.toCurrency];
        if (rateFrom && rateTo) {
            const exchangeRate = (rateTo / rateFrom).toFixed(4);
            let rateText = `1 ${state.fromCurrency} = ${exchangeRate} ${state.toCurrency}`;
            if (!state.isOnline) {
                rateText += ' (данные устарели)';
            }
            elements.rateInfo.textContent = rateText;
        }
    }
}

// --- ОБРАБОТЧИКИ СОБЫТИЙ ---

// Смена валют
function handleSwap() {
    const temp = state.fromCurrency;
    state.fromCurrency = state.toCurrency;
    state.toCurrency = temp;
    
    elements.fromSelect.value = state.fromCurrency;
    elements.toSelect.value = state.toCurrency;
    
    saveSettings();
    convertCurrency();
}

// Ввод суммы (валидация на лету)
function handleAmountInput(e) {
    let value = e.target.value;
    
    // Разрешаем только цифры и одну точку
    // Удаляем все, что не цифра и не точка
    value = value.replace(/[^0-9.]/g, '');
    
    // Разрешаем только одну точку
    const parts = value.split('.');
    if (parts.length > 2) {
        value = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Запрещаем отрицательные числа (хотя input type number это делает, но для text нужно вручную)
    // В данном случае regex уже фильтрует, но если пользователь введет минус, он удалится
    
    state.amount = value;
    
    // Обновляем значение в поле (чтобы пользователь видел только валидные символы)
    if (e.target.value !== value) {
        e.target.value = value;
    }
    
    convertCurrency();
    saveSettings();
}

// Показать спиннер
function showLoading(show) {
    if (show) {
        elements.spinner.classList.remove('hidden');
    } else {
        elements.spinner.classList.add('hidden');
    }
}

// Показать ошибку
function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.remove('hidden');
}

// Скрыть ошибку
function hideError() {
    elements.errorMessage.classList.add('hidden');
}

// --- ПРИВЯЗКА СОБЫТИЙ ---

elements.fromSelect.addEventListener('change', (e) => {
    state.fromCurrency = e.target.value;
    saveSettings();
    convertCurrency();
});

elements.toSelect.addEventListener('change', (e) => {
    state.toCurrency = e.target.value;
    saveSettings();
    convertCurrency();
});

elements.amountInput.addEventListener('input', handleAmountInput);

elements.swapBtn.addEventListener('click', handleSwap);

// Поддержка клавиши Enter
elements.amountInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        // Принудительно пересчитываем, если курс не изменился
        convertCurrency();
    }
});

// Запуск приложения
document.addEventListener('DOMContentLoaded', init);