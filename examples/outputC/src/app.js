"use strict";

(function () {
    // ---------- Конфигурация ----------
    const API_URL = "https://api.exchangerate-api.com/v4/latest/USD";
    const CURRENCIES = ["USD", "EUR", "RUB", "GBP", "JPY", "CNY", "TRY", "KZT", "BYN", "GEL", "UAH"];
    const DEFAULT_SOURCE = "USD";
    const DEFAULT_TARGET = "RUB";
    const DEFAULT_AMOUNT = "1.00";
    const CACHE_KEY = "currencyCache";
    const STATE_KEYS = {
        source: "sourceCurrency",
        target: "targetCurrency",
        amount: "amount"
    };

    // ---------- Состояние ----------
    let rates = null;             // объект курсов { USD:1, EUR:0.9, ... }
    let lastUpdated = null;      // строка даты из API
    let usingCache = false;      // используем кеш из-за ошибки API
    let isFetching = false;      // флаг выполнения запроса

    // ---------- DOM-ссылки ----------
    const sourceSelect = document.getElementById("source-currency");
    const targetSelect = document.getElementById("target-currency");
    const amountInput = document.getElementById("amount");
    const resultAmount = document.getElementById("converted-amount");
    const resultRate = document.getElementById("rate");
    const errorMessage = document.getElementById("error-message");
    const spinner = document.getElementById("spinner");
    const staleBanner = document.getElementById("stale-banner");
    const swapBtn = document.getElementById("swap-btn");

    // ---------- Инициализация списков валют ----------
    function populateSelects() {
        [sourceSelect, targetSelect].forEach(select => {
            select.innerHTML = "";
            CURRENCIES.forEach(code => {
                const option = document.createElement("option");
                option.value = code;
                option.textContent = code;
                select.appendChild(option);
            });
        });
    }

    // ---------- Валидация и восстановление состояния из localStorage ----------
    function restoreState() {
        try {
            const savedSource = localStorage.getItem(STATE_KEYS.source);
            const savedTarget = localStorage.getItem(STATE_KEYS.target);
            const savedAmount = localStorage.getItem(STATE_KEYS.amount);
            if (savedSource && CURRENCIES.includes(savedSource)) {
                sourceSelect.value = savedSource;
            } else {
                sourceSelect.value = DEFAULT_SOURCE;
            }
            if (savedTarget && CURRENCIES.includes(savedTarget)) {
                targetSelect.value = savedTarget;
            } else {
                targetSelect.value = DEFAULT_TARGET;
            }
            // Валидация суммы: только числа с точкой, неотрицательные
            const amountPattern = /^[0-9]*\.?[0-9]+$/;
            if (savedAmount && amountPattern.test(savedAmount)) {
                amountInput.value = savedAmount;
            } else {
                amountInput.value = DEFAULT_AMOUNT;
            }
        } catch (e) {
            // Если localStorage недоступен или данные повреждены — используем значения по умолчанию
            sourceSelect.value = DEFAULT_SOURCE;
            targetSelect.value = DEFAULT_TARGET;
            amountInput.value = DEFAULT_AMOUNT;
        }
    }

    // ---------- Сохранение состояния ----------
    function saveState() {
        try {
            localStorage.setItem(STATE_KEYS.source, sourceSelect.value);
            localStorage.setItem(STATE_KEYS.target, targetSelect.value);
            localStorage.setItem(STATE_KEYS.amount, amountInput.value);
        } catch (e) {
            // Игнорируем ошибки localStorage (например, квота превышена)
        }
    }

    // ---------- Работа с кешем ----------
    function saveCache(ratesData, updatedAt) {
        try {
            const cache = {
                rates: ratesData,
                updated_at: updatedAt
            };
            localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
        } catch (e) {
            // Игнорируем ошибки
        }
    }

    function loadCache() {
        try {
            const raw = localStorage.getItem(CACHE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            // Валидация структуры: должен быть объект с ключами rates и updated_at
            if (parsed && typeof parsed === "object" && parsed.rates && parsed.updated_at) {
                return parsed;
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    // ---------- Запрос к API ----------
    async function fetchRates() {
        if (isFetching) return; // Предотвращаем множественные запросы
        isFetching = true;
        showSpinner(true);
        hideError();
        try {
            const response = await fetch(API_URL);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const data = await response.json();
            // Валидация структуры ответа
            if (!data || !data.rates || !data.date) {
                throw new Error("Неверный формат ответа");
            }
            // Извлекаем только нужные валюты для безопасности (оставляем все, но проверяем)
            const filteredRates = {};
            CURRENCIES.forEach(code => {
                if (data.rates.hasOwnProperty(code)) {
                    filteredRates[code] = data.rates[code];
                }
            });
            // Убедимся, что USD есть (базовая валюта 1)
            filteredRates.USD = 1;

            rates = filteredRates;
            lastUpdated = data.date;
            usingCache = false;
            saveCache(rates, lastUpdated);
            showStaleBanner(false);
            updateUI();
        } catch (err) {
            // Ошибка запроса — пытаемся загрузить из кеша
            const cache = loadCache();
            if (cache) {
                rates = cache.rates;
                lastUpdated = cache.updated_at;
                usingCache = true;
                showStaleBanner(true);
                updateUI();
            } else {
                // Кеша нет — показываем ошибку
                rates = null;
                lastUpdated = null;
                usingCache = false;
                showError("Не удалось загрузить курсы валют. Пожалуйста, попробуйте позже.");
                clearResult();
            }
        } finally {
            isFetching = false;
            showSpinner(false);
        }
    }

    // ---------- Обновление UI (результат, курс, сообщения) ----------
    function updateUI() {
        const sourceCurrency = sourceSelect.value;
        const targetCurrency = targetSelect.value;
        const amountStr = amountInput.value.trim();

        // Валидация суммы
        const numericPattern = /^[0-9]*\.?[0-9]+$/;
        if (!amountStr || !numericPattern.test(amountStr)) {
            showError("Введите корректную сумму");
            clearResult();
            return;
        }

        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount < 0) {
            showError("Введите корректную сумму");
            clearResult();
            return;
        }

        hideError();

        // Если курсы не загружены
        if (!rates || !rates[sourceCurrency] || !rates[targetCurrency]) {
            clearResult();
            return;
        }

        const sourceRate = rates[sourceCurrency];
        const targetRate = rates[targetCurrency];
        const crossRate = targetRate / sourceRate;
        const converted = amount * crossRate;
        const rounded = converted.toFixed(2);

        // Безопасная вставка через textContent
        resultAmount.textContent = `${amountStr} ${sourceCurrency} = ${rounded} ${targetCurrency}`;

        // Отображение курса
        if (usingCache) {
            const dateStr = lastUpdated ? new Date(lastUpdated).toLocaleString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : "неизвестной даты";
            resultRate.textContent = `Курс от ${dateStr}. Актуальные данные временно недоступны`;
        } else {
            resultRate.textContent = `1 ${sourceCurrency} = ${crossRate.toFixed(2)} ${targetCurrency}`;
        }
    }

    function clearResult() {
        resultAmount.textContent = "—";
        resultRate.textContent = "—";
    }

    function showError(msg) {
        errorMessage.textContent = msg;
        errorMessage.classList.add("visible");
        errorMessage.classList.remove("hidden");
    }

    function hideError() {
        errorMessage.classList.remove("visible");
        errorMessage.classList.add("hidden");
    }

    function showSpinner(show) {
        if (show) {
            spinner.classList.remove("hidden");
        } else {
            spinner.classList.add("hidden");
        }
    }

    function showStaleBanner(show) {
        if (show) {
            staleBanner.classList.remove("hidden");
        } else {
            staleBanner.classList.add("hidden");
        }
    }

    // ---------- Основная функция конвертации (вызывается при изменениях) ----------
    function convert() {
        updateUI();
        saveState();
    }

    // ---------- Обработка смены валют местами ----------
    function swapCurrencies() {
        const temp = sourceSelect.value;
        sourceSelect.value = targetSelect.value;
        targetSelect.value = temp;
        convert();
    }

    // ---------- Фильтрация ввода суммы (только цифры и точка) ----------
    function filterAmountInput(e) {
        const input = e.target;
        let value = input.value;
        // Удаляем всё, кроме цифр и точки
        value = value.replace(/[^0-9.]/g, '');
        // Разрешаем только одну точку
        const parts = value.split('.');
        if (parts.length > 2) {
            value = parts[0] + '.' + parts.slice(1).join('');
        }
        // Не даём начинаться с точки, но допускаем пустое поле
        if (value.startsWith('.') && value.length > 1) {
            value = '0' + value;
        }
        input.value = value;
        // После фильтрации вызываем convert
        convert();
    }

    // ---------- Обработчик клавиши Enter ----------
    function handleEnter(e) {
        if (e.key === "Enter") {
            e.preventDefault();
            convert();
        }
    }

    // ---------- Периодическое обновление курсов (60 секунд) ----------
    function startPeriodicUpdate() {
        setInterval(() => {
            fetchRates();
        }, 60000);
    }

    // ---------- Инициализация ----------
    function init() {
        populateSelects();
        restoreState();

        // Пробуем загрузить из кеша сразу, потом обновляем из API
        const cache = loadCache();
        if (cache) {
            rates = cache.rates;
            lastUpdated = cache.updated_at;
            usingCache = false; // сначала считаем, что данные актуальны, пока не ошибёмся
            updateUI();
        }

        // Загрузка с API
        fetchRates().then(() => {
            // После успешного запроса обновляем
            startPeriodicUpdate();
        });

        // События
        sourceSelect.addEventListener("change", convert);
        targetSelect.addEventListener("change", convert);
        amountInput.addEventListener("input", filterAmountInput);
        amountInput.addEventListener("keydown", handleEnter);
        swapBtn.addEventListener("click", swapCurrencies);

        // При старте также сохраняем состояние
        saveState();
    }

    // Запуск
    document.addEventListener("DOMContentLoaded", init);
})();
