"use strict";

// Функция для конвертации валюты
function convertCurrency(amount, fromCurrency, toCurrency, rates) {
    const fromRate = rates[fromCurrency];
    const toRate = rates[toCurrency];
    const result = (amount * toRate) / fromRate;
    return result.toFixed(2);
}

// Функция для загрузки курсов валют
function loadRates() {
    return fetch("https://api.exchangerate-api.com/v4/latest/USD")
       .then(response => response.json())
       .then(data => data.rates)
       .catch(error => {
            console.error(error);
            return null;
        });
}

// Функция для обработки ошибок API
function handleError(error) {
    console.error(error);
    document.getElementById("error-message").textContent = "Ошибка API";
}

// Функция для отображения результата конвертации
function displayResult(result, fromCurrency, toCurrency, rates) {
    const resultElement = document.getElementById("result");
    resultElement.textContent = `${result} ${toCurrency}`;
    const rateElement = document.createElement("span");
    rateElement.textContent = ` (1 ${fromCurrency} = ${rates[toCurrency] / rates[fromCurrency]} ${toCurrency})`;
    resultElement.appendChild(rateElement);
}

// Функция для обработки события конвертации
function handleConvert(event) {
    event.preventDefault();
    const amount = parseFloat(document.getElementById("amount").value);
    const fromCurrency = document.getElementById("from-currency").value;
    const toCurrency = document.getElementById("to-currency").value;
    if (isNaN(amount) || amount <= 0) {
        document.getElementById("error-message").textContent = "Введите корректную сумму";
        return;
    }
    loadRates().then(rates => {
        if (rates) {
            const result = convertCurrency(amount, fromCurrency, toCurrency, rates);
            displayResult(result, fromCurrency, toCurrency, rates);
        } else {
            handleError("Курсы валют не доступны");
        }
    });
}

// Функция для обработки события смены направления
function handleSwap(event) {
    event.preventDefault();
    const fromCurrency = document.getElementById("from-currency").value;
    const toCurrency = document.getElementById("to-currency").value;
    document.getElementById("from-currency").value = toCurrency;
    document.getElementById("to-currency").value = fromCurrency;
    handleConvert(event);
}

// Добавление обработчиков событий
document.getElementById("convert-btn").addEventListener("click", handleConvert);
document.getElementById("swap-btn").addEventListener("click", handleSwap);
