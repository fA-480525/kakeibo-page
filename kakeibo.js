"use strict";

// HTMLのdefer指定により、入力欄などが用意されてから実行されます。
const STORAGE_KEY = "kakeibo-transactions";
const dateInput = document.getElementById("date");
const itemInput = document.getElementById("item");
const typeSelect = document.getElementById("transaction-type");
const amountInput = document.getElementById("amount");
const addButton = document.getElementById("add-button");
const transactionList = document.getElementById("transaction-list");
const totalAmount = document.getElementById("total-amount");
const formMessage = document.getElementById("form-message");
const transactionForm = document.querySelector("form");

// 画面に表示する記録と、保存を開始できる状態かどうかを管理します。
let transactions = [];
let storageReady = false;

// 起動時：保存済みの記録を読み込み、一覧と合計金額を表示します。
function initializeApp() {
  addButton.addEventListener("click", addTransaction);

  // フォームの送信によるページの再読み込みを防ぎます。
  transactionForm.addEventListener("submit", function (event) {
    event.preventDefault();
  });

  try {
    const savedData = window.localStorage.getItem(STORAGE_KEY);

    if (savedData !== null) {
      const savedTransactions = JSON.parse(savedData);

      if (!Array.isArray(savedTransactions) || !savedTransactions.every(isValidTransaction)) {
        throw new Error("保存データの形式が正しくありません。");
      }

      transactions = savedTransactions;
    }

    storageReady = true;
  } catch (error) {
    // 読み込みに失敗しても、以前の保存データは変更しません。
    addButton.disabled = true;
    showError(
      "保存データを読み込めませんでした。以前の記録を保護するため、追加を停止しています。" +
      "ブラウザーの保存設定や保存データを確認し、ページを再読み込みしてください。"
    );
  }

  renderTransactions();
}

// 実在する日付かどうかを確認します（うるう年なども含みます）。
function isValidDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);

  if (year < 1) {
    return false;
  }

  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);

  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
}

// 保存データも、入力データと同じルールで確認します。
function isValidTransaction(transaction) {
  return transaction !== null &&
    typeof transaction === "object" &&
    isValidDate(transaction.date) &&
    typeof transaction.item === "string" &&
    transaction.item.trim() !== "" &&
    (transaction.type === "expense" || transaction.type === "income") &&
    Number.isSafeInteger(transaction.amount) &&
    transaction.amount > 0;
}

// 追加時：入力内容を確認し、保存に成功してから画面を更新します。
function addTransaction() {
  if (!storageReady) {
    return;
  }

  clearError();

  const date = dateInput.value;
  const item = itemInput.value.trim();
  const type = typeSelect.value;
  const amountText = amountInput.value.trim();
  const amount = Number(amountText);

  if (!isValidDate(date)) {
    showError("日付を正しく入力してください。", dateInput);
    return;
  }

  if (item === "") {
    showError("品目を入力してください。", itemInput);
    return;
  }

  if (type !== "expense" && type !== "income") {
    showError("支出または収入を選んでください。", typeSelect);
    return;
  }

  if (amountText === "" || !Number.isSafeInteger(amount) || amount <= 0) {
    showError("金額は0より大きい整数で入力してください。大きすぎる金額は登録できません。", amountInput);
    return;
  }

  const newTransaction = { date, item, type, amount };
  const updatedTransactions = [...transactions, newTransaction];

  try {
    // 失敗したときに入力内容を失わないよう、先に保存します。
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTransactions));
  } catch (error) {
    showError(
      "保存できませんでした。入力内容は残しています。" +
      "ブラウザーの保存設定や空き容量を確認して、もう一度追加してください。"
    );
    return;
  }

  transactions = updatedTransactions;
  renderTransactions();
  transactionForm.reset();
  dateInput.focus();
}

// 共通処理：配列から一覧を作り直し、「収入－支出」を表示します。
function renderTransactions() {
  transactionList.replaceChildren();

  // BigIntは大きな整数を正確に扱える型です。合計の丸め誤差を防ぎます。
  let total = 0n;

  for (const transaction of transactions) {
    const listItem = document.createElement("li");
    const typeLabel = transaction.type === "income" ? "収入" : "支出";

    // 品目はHTMLとして解釈させず、文字として表示します。
    listItem.textContent = `${transaction.date}・${transaction.item}・${typeLabel}・${formatYen(transaction.amount)}`;
    transactionList.appendChild(listItem);

    const amount = BigInt(transaction.amount);
    total += transaction.type === "income" ? amount : -amount;
  }

  totalAmount.textContent = formatYen(total);
}

function formatYen(amount) {
  return `${amount.toLocaleString("ja-JP")}円`;
}

// エラーをフォーム内に表示し、必要に応じて入力欄へ移動します。
function showError(message, input = null) {
  formMessage.textContent = message;
  formMessage.hidden = false;

  if (input !== null) {
    input.setAttribute("aria-invalid", "true");
    input.focus();
  }
}

function clearError() {
  formMessage.textContent = "";
  formMessage.hidden = true;

  for (const input of [dateInput, itemInput, typeSelect, amountInput]) {
    input.removeAttribute("aria-invalid");
  }
}

initializeApp();
