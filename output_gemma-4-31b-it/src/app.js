"use strict";

/**
 * CurrFlow - Currency Converter
 * Безопасная реализация конвертера валют
 */

const CONFIG = {
    API_URL: 'https://open.er-api.com/v6/latest/USD',
    SUPPORTED_CURRENCIES: ['USD', 'EUR', 'RUB', 'GBP', 'JPY', 'CNY', 'TRY', 'KZT', 'BYN', 'GEL', 'UAH'],
    UPDATE_INTERVAL: 60000,
    STORAGE_KEYS: {
        RATES: 'currflow_rates',
        DATE: 'currflow_date',
        STATE: 'currflow_state'
    }
};

const state = {
    rates: {},
    lastUpdate: null,
    from: 'USD',
    to: 'EUR',
    amount: '1',
    isApiError: false
};

// DOM элементы
const elements = {
    amountInput: document.getElementById('amount'),
    fromSelect: document.getElementById('from-currency'),
    toSelect: document.getElementById('to-currency'),
    swapBtn: document.getElementById('swap-btn'),
    resultValue: document.getElementById('converted-amount'),
    rateInfo: document.getElementById('rate-info'),
    cacheDate: document.getElementById('cache-date'),
    statusBanner: document.getElementById('api-status'),
    loader: document.getElementById('loader'),
    resultDisplay: document.getElementById('result-display'),
    errorMsg: document.getElementById('error-message')
};

/**
 * Инициализация приложения
 */
async function init() {
    setupCurrencyLists();
    loadStateFromStorage();
    attachEventListeners();
    await updateRates();
    
    // Автообновление каждые 60 сек
    setInterval(updateRates, CONFIG.UPDATE_INTERVAL);
    
    calculate();
}

function setupCurrencyLists() {
    CONFIG.SUPPORTED_CURRENCIES.forEach(cur => {
        const optFrom = new Option(cur, cur);
        const optTo = new Option(cur, cur);
        elements.fromSelect.add(optFrom);
        elements.toSelect.add(optTo);
    });
}

function loadStateFromStorage() {
    try {
        const savedState = localStorage.getItem(CONFIG.STORAGE_KEYS.STATE);
        if (savedState) {
            const parsed = JSON.parse(savedState);
            // Валидация данных из localStorage
            if (CONFIG.SUPPORTED_CURRENCIES.includes(parsed.from) && 
                CONFIG.SUPPORTED_CURRENCIES.includes(parsed.to)) {
                state.from = parsed.from;
                state.to = parsed.to;
                state.amount = parsed.amount || '1';
            }
        }
        
        elements.fromSelect.value = state.from;
        elements.toSelect.value = state.to;
        elements.amountInput.value = state.amount;
    } catch (e) {
        console.error("Ошибка загрузки состояния:", e);
    }
}

function saveStateToStorage() {
    const data = {
        from: state.from,
        to: state.to,
        amount: state.amount
    };
    localStorage.setItem(CONFIG.STORAGE_KEYS.STATE, JSON.stringify(data));
}

/**
 * Работа с API и данными
 */
async function updateRates() {
    elements.loader.classList.remove('hidden');
    elements.resultDisplay.classList.add('hidden');

    try {
        const response = await fetch(CONFIG.API_URL);
        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();
        
        // Валидация схемы ответа
        if (data && data.rates && typeof data.rates === 'object') {
            state.rates = data.rates;
            state.lastUpdate = new Date().toLocaleString('ru-RU');
            state.isApiError = false;
            
            localStorage.setItem(CONFIG.STORAGE_KEYS.RATES, JSON.stringify(state.rates));
            localStorage.setItem(CONFIG.STORAGE_KEYS.DATE, state.lastUpdate);
            
            elements.statusBanner.classList.add('hidden');
        } else {
            throw new Error('Invalid API response format');
        }
    } catch (error) {
        console.error("API Error:", error);
        handleApiError();
    } finally {
        elements.loader.classList.add('hidden');
        elements.resultDisplay.classList.remove('hidden');
    }
}

function handleApiError() {
    state.isApiError = true;
    const cachedRates = localStorage.getItem(CONFIG.STORAGE_KEYS.RATES);
    const cachedDate = localStorage.getItem(CONFIG.STORAGE_KEYS.DATE);

    if (cachedRates) {
        state.rates = JSON.parse(cachedRates);
        state.lastUpdate = cachedDate || 'Неизвестно';
        elements.statusBanner.classList.remove('hidden');
    } else {
        // Если нет даже кеша
        elements.resultValue.textContent = "Ошибка";
        elements.rateInfo.textContent = "Данные недоступны";
    }
}

/**
 * Логика конвертации
 */
function calculate() {
    const amountStr = elements.amountInput.value;
    const from = elements.fromSelect.value;
    const to = elements.toSelect.value;

    // Валидация суммы (ФТ-08)
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount < 0 || !/^[0-9]*\.?[0-9]*$/.test(amountStr)) {
        elements.errorMsg.classList.remove('hidden');
        elements.resultValue.textContent = "--";
        elements.rateInfo.textContent = "--";
        return;
    }

    elements.errorMsg.classList.add('hidden');
    state.from = from;
    state.to = to;
    state.amount = amountStr;
    saveStateToStorage();

    if (!state.rates[from] || !state.rates[to]) return;

    // Расчет через базовую валюту API (USD)
    // Формула: (Сумма / Курс_Из) * Курс_В
    const rateFrom = state.rates[from];
    const rateTo = state.rates[to];
    const exchangeRate = rateTo / rateFrom;
    const result = amount * exchangeRate;

    // Безопасный вывод через textContent (ФТ-09)
    elements.resultValue.textContent = result.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    elements.rateInfo.textContent = `1 ${from} = ${exchangeRate.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${to}`;
    
    if (state.isApiError) {
        elements.cacheDate.textContent = `Курс от ${state.lastUpdate}. Актуальные данные временно недоступны`;
    } else {
        elements.cacheDate.textContent = `Обновлено: ${state.lastUpdate}`;
    }
}

/**
 * Обработчики событий
 */
function attachEventListeners() {
    // Валидация ввода на лету (ФТ-07)
    elements.amountInput.addEventListener('input', (e) => {
        const val = e.target.value;
        // Разрешаем только цифры и одну точку
        if (!/^[0-9]*\.?[0-9]*$/.test(val)) {
            e.target.value = val.replace(/[^0-9.]/g, '').replace(/(\.\d*)(\.|[a-zA-Z]*).*/, '$1');
        }
        calculate();
    });

    elements.fromSelect.addEventListener('change', calculate);
    elements.toSelect.addEventListener('change', calculate);

    elements.swapBtn.addEventListener('click', () => {
        const temp = elements.fromSelect.value;
        elements.fromSelect.value = elements.toSelect.value;
        elements.toSelect.value = temp;
        calculate();
    });

    // Поддержка Enter (ФТ-10)
    elements.amountInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            calculate();
        }
    });
}

// Запуск
init();