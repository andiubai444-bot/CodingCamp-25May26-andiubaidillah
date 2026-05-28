const DEFAULT_CATEGORIES = ['Food', 'Transport', 'Housing', 'Entertainment', 'Health', 'Other'];

let expenses = [];
let budgets = {};
let categories = [];
let isLocalStorageAvailable = true;
let editingExpenseId = null;
let currentBarChartGranularity = 'daily';

const StorageManager = {
  init() {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      isLocalStorageAvailable = true;
      this.hideStorageWarning();
    } catch (e) {
      isLocalStorageAvailable = false;
      this.showStorageWarning();
    }
  },

  showStorageWarning() {
    const banner = document.getElementById('storage-warning');
    if (banner) banner.hidden = false;
  },

  hideStorageWarning() {
    const banner = document.getElementById('storage-warning');
    if (banner) banner.hidden = true;
  },

  loadData() {
    if (!isLocalStorageAvailable) {
      categories = [...DEFAULT_CATEGORIES];
      expenses = [];
      budgets = {};
      return;
    }

    try {
      const storedCategories = localStorage.getItem('categories');
      if (storedCategories) {
        categories = JSON.parse(storedCategories);
      } else {
        categories = [...DEFAULT_CATEGORIES];
        this.saveCategories();
      }

      const storedExpenses = localStorage.getItem('expenses');
      expenses = storedExpenses ? JSON.parse(storedExpenses) : [];

      const storedBudgets = localStorage.getItem('budgets');
      budgets = storedBudgets ? JSON.parse(storedBudgets) : {};

    } catch (e) {
      console.error('LocalStorage parse error:', e);
      isLocalStorageAvailable = false;
      this.showStorageWarning();
      categories = [...DEFAULT_CATEGORIES];
      expenses = [];
      budgets = {};
    }
  },

  saveExpenses() {
    if (!isLocalStorageAvailable) return;
    try {
      localStorage.setItem('expenses', JSON.stringify(expenses));
    } catch (e) {
      console.error('Failed to save expenses:', e);
    }
  },

  saveBudgets() {
    if (!isLocalStorageAvailable) return;
    try {
      localStorage.setItem('budgets', JSON.stringify(budgets));
    } catch (e) {
      console.error('Failed to save budgets:', e);
    }
  },

  saveCategories() {
    if (!isLocalStorageAvailable) return;
    try {
      localStorage.setItem('categories', JSON.stringify(categories));
    } catch (e) {
      console.error('Failed to save categories:', e);
    }
  }
};

function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
}

function getCurrentMonth() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1
  };
}

function isCurrentMonth(dateString) {
  const date = new Date(dateString);
  const current = getCurrentMonth();
  return date.getFullYear() === current.year && (date.getMonth() + 1) === current.month;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function populateCategorySelectors() {
  const expenseCategorySelect = document.getElementById('expense-category');
  const budgetCategorySelect = document.getElementById('budget-category');
  const filterCategorySelect = document.getElementById('filter-category');

  [expenseCategorySelect, budgetCategorySelect].forEach(select => {
    while (select.options.length > 1) {
      select.remove(1);
    }
  });

  while (filterCategorySelect.options.length > 1) {
    filterCategorySelect.remove(1);
  }

  categories.forEach(cat => {
    const option1 = new Option(cat, cat);
    const option2 = new Option(cat, cat);
    const option3 = new Option(cat, cat);
    expenseCategorySelect.add(option1);
    budgetCategorySelect.add(option2);
    filterCategorySelect.add(option3);
  });
}

function renderCategoryList() {
  const categoryList = document.getElementById('category-list');
  categoryList.innerHTML = '';

  categories.forEach(cat => {
    const li = document.createElement('li');
    li.className = 'category-item';
    
    const span = document.createElement('span');
    span.textContent = cat;
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn--danger btn--small';
    deleteBtn.textContent = '✕';
    deleteBtn.setAttribute('aria-label', `Hapus kategori ${cat}`);
    deleteBtn.onclick = () => deleteCategory(cat);
    
    li.appendChild(span);
    li.appendChild(deleteBtn);
    categoryList.appendChild(li);
  });
}

function addCategory(name) {
  const trimmedName = name.trim();
  const errorSpan = document.getElementById('category-name-error');

  if (trimmedName.length < 1 || trimmedName.length > 50) {
    errorSpan.textContent = 'Nama kategori harus 1-50 karakter';
    errorSpan.hidden = false;
    return false;
  }

  const exists = categories.some(cat => cat.toLowerCase() === trimmedName.toLowerCase());
  if (exists) {
    errorSpan.textContent = 'Kategori sudah ada';
    errorSpan.hidden = false;
    return false;
  }

  categories.push(trimmedName);
  StorageManager.saveCategories();
  populateCategorySelectors();
  renderCategoryList();
  errorSpan.hidden = true;
  return true;
}

function deleteCategory(name) {
  const errorSpan = document.getElementById('category-name-error');
  
  if (DEFAULT_CATEGORIES.includes(name)) {
    errorSpan.textContent = 'Kategori default tidak dapat dihapus';
    errorSpan.hidden = false;
    return;
  }

  if (!confirm(`Hapus kategori "${name}"? Transaksi dengan kategori ini akan tetap ada dengan label "Deleted Category".`)) {
    return;
  }

  categories = categories.filter(cat => cat !== name);

  if (budgets[name]) {
    delete budgets[name];
    StorageManager.saveBudgets();
  }

  StorageManager.saveCategories();
  populateCategorySelectors();
  renderCategoryList();
  updateDashboard();
  renderExpenseList();
  errorSpan.hidden = true;
}

// ===================== BUDGET MANAGEMENT =====================
function saveBudget(category, amount) {
  const categoryError = document.getElementById('budget-category-error');
  const amountError = document.getElementById('budget-amount-error');

  categoryError.hidden = true;
  amountError.hidden = true;

  if (!category) {
    categoryError.textContent = 'Pilih kategori';
    categoryError.hidden = false;
    return false;
  }

  if (!amount || amount <= 0) {
    amountError.textContent = 'Jumlah harus lebih dari 0';
    amountError.hidden = false;
    return false;
  }

  if (amount > 999999999.99) {
    amountError.textContent = 'Jumlah maksimal 999,999,999.99';
    amountError.hidden = false;
    return false;
  }

  budgets[category] = parseFloat(amount);
  StorageManager.saveBudgets();
  updateDashboard();
  return true;
}

function addExpense(expenseData) {
  const { amount, category, date, description } = expenseData;
  
  const amountError = document.getElementById('expense-amount-error');
  const categoryError = document.getElementById('expense-category-error');
  const dateError = document.getElementById('expense-date-error');

  amountError.hidden = true;
  categoryError.hidden = true;
  dateError.hidden = true;

  if (!amount || amount <= 0) {
    amountError.textContent = 'Jumlah harus lebih dari 0';
    amountError.hidden = false;
    return false;
  }

  if (!category) {
    categoryError.textContent = 'Pilih kategori';
    categoryError.hidden = false;
    return false;
  }

  if (!date) {
    dateError.textContent = 'Tanggal harus diisi';
    dateError.hidden = false;
    return false;
  }

  const expense = {
    id: generateId(),
    amount: parseFloat(amount),
    category,
    date,
    description: description || ''
  };

  expenses.push(expense);
  StorageManager.saveExpenses();
  updateDashboard();
  renderExpenseList();
  updateCharts();
  return true;
}

function updateExpense(id, expenseData) {
  const { amount, category, date, description } = expenseData;
  
  const amountError = document.getElementById('expense-amount-error');
  const categoryError = document.getElementById('expense-category-error');
  const dateError = document.getElementById('expense-date-error');

  amountError.hidden = true;
  categoryError.hidden = true;
  dateError.hidden = true;

  if (!amount || amount <= 0) {
    amountError.textContent = 'Jumlah harus lebih dari 0';
    amountError.hidden = false;
    return false;
  }

  if (!category) {
    categoryError.textContent = 'Pilih kategori';
    categoryError.hidden = false;
    return false;
  }

  if (!date) {
    dateError.textContent = 'Tanggal harus diisi';
    dateError.hidden = false;
    return false;
  }

  const index = expenses.findIndex(exp => exp.id === id);
  if (index === -1) return false;

  try {
    expenses[index] = {
      id,
      amount: parseFloat(amount),
      category,
      date,
      description: description || ''
    };

    StorageManager.saveExpenses();
    updateDashboard();
    renderExpenseList();
    updateCharts();
    return true;
  } catch (e) {
    console.error('Failed to update expense:', e);
    return false;
  }
}

function deleteExpense(id) {
  if (!confirm('Hapus transaksi ini?')) {
    return;
  }

  expenses = expenses.filter(exp => exp.id !== id);
  StorageManager.saveExpenses();
  updateDashboard();
  renderExpenseList();
  updateCharts();
}

function editExpense(id) {
  const expense = expenses.find(exp => exp.id === id);
  if (!expense) return;

  editingExpenseId = id;

  document.getElementById('expense-id').value = id;
  document.getElementById('expense-amount').value = expense.amount;
  document.getElementById('expense-category').value = expense.category;
  document.getElementById('expense-date').value = expense.date;
  document.getElementById('expense-description').value = expense.description;

  document.getElementById('btn-save-expense').textContent = 'Update Transaksi';
  document.getElementById('btn-cancel-edit').hidden = false;

  document.getElementById('expense-form').scrollIntoView({ behavior: 'smooth' });
}

function cancelEdit() {
  editingExpenseId = null;
  document.getElementById('expense-form').reset();
  document.getElementById('expense-id').value = '';
  document.getElementById('btn-save-expense').textContent = 'Simpan Transaksi';
  document.getElementById('btn-cancel-edit').hidden = true;
  
  document.getElementById('expense-date').value = getTodayDateString();
}

function updateDashboard() {
  const currentMonthExpenses = expenses.filter(exp => isCurrentMonth(exp.date));

  const totalSpent = currentMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalBudget = Object.values(budgets).reduce((sum, budget) => sum + budget, 0);
  const totalRemaining = totalBudget - totalSpent;

  document.getElementById('total-spent').textContent = formatCurrency(totalSpent);
  document.getElementById('total-budget').textContent = formatCurrency(totalBudget);
  document.getElementById('total-remaining').textContent = formatCurrency(totalRemaining);

  updateCategorySummary(currentMonthExpenses);
}

function updateCategorySummary(currentMonthExpenses) {
  const tbody = document.getElementById('budget-summary-body');
  tbody.innerHTML = '';

  const spendingByCategory = {};
  currentMonthExpenses.forEach(exp => {
    const cat = categories.includes(exp.category) ? exp.category : 'Deleted Category';
    spendingByCategory[cat] = (spendingByCategory[cat] || 0) + exp.amount;
  });

  const allRelevantCategories = new Set([
    ...Object.keys(spendingByCategory),
    ...Object.keys(budgets)
  ]);

  allRelevantCategories.forEach(cat => {
    const spent = spendingByCategory[cat] || 0;
    const budget = budgets[cat] || 0;
    const remaining = budget - spent;
    const isOverBudget = budget > 0 ? spent > budget : spent > 0;

    const row = document.createElement('tr');
    if (isOverBudget) {
      row.classList.add('over-budget');
    }

    row.innerHTML = `
      <td>${cat}</td>
      <td>${formatCurrency(spent)}</td>
      <td>${budget > 0 ? formatCurrency(budget) : '-'}</td>
      <td>${budget > 0 ? formatCurrency(remaining) : '-'}</td>
      <td>${isOverBudget ? '<span class="status-indicator status-indicator--danger">⚠ Over Budget</span>' : '<span class="status-indicator status-indicator--safe">✓ Aman</span>'}</td>
    `;

    tbody.appendChild(row);
  });

  if (allRelevantCategories.size === 0) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="5" style="text-align: center;">Belum ada data</td>';
    tbody.appendChild(row);
  }
}

function renderExpenseList() {
  const filterCategory = document.getElementById('filter-category').value;
  const filterMonth = document.getElementById('filter-month').value;
  const filterDateStart = document.getElementById('filter-date-start').value;
  const filterDateEnd = document.getElementById('filter-date-end').value;
  const sortBy = document.getElementById('sort-by').value;
  const dateError = document.getElementById('filter-date-error');

  if (filterDateStart && filterDateEnd && filterDateStart > filterDateEnd) {
    dateError.textContent = 'Tanggal mulai tidak boleh lebih besar dari tanggal akhir';
    dateError.hidden = false;
    return;
  } else {
    dateError.hidden = true;
  }

  let filtered = [...expenses];

  if (filterCategory) {
    filtered = filtered.filter(exp => exp.category === filterCategory);
  }

  if (filterMonth) {
    const [year, month] = filterMonth.split('-').map(Number);
    filtered = filtered.filter(exp => {
      const expDate = new Date(exp.date);
      return expDate.getFullYear() === year && (expDate.getMonth() + 1) === month;
    });
  }

  if (filterDateStart) {
    filtered = filtered.filter(exp => exp.date >= filterDateStart);
  }
  if (filterDateEnd) {
    filtered = filtered.filter(exp => exp.date <= filterDateEnd);
  }

  filtered.sort((a, b) => {
    switch (sortBy) {
      case 'date-desc':
        return new Date(b.date) - new Date(a.date);
      case 'date-asc':
        return new Date(a.date) - new Date(b.date);
      case 'amount-desc':
        return b.amount - a.amount;
      case 'amount-asc':
        return a.amount - b.amount;
      default:
        return 0;
    }
  });

  const expenseList = document.getElementById('expense-list');
  const emptyState = document.getElementById('expense-list-empty');

  expenseList.innerHTML = '';

  if (filtered.length === 0) {
    emptyState.hidden = false;
    expenseList.hidden = true;
  } else {
    emptyState.hidden = true;
    expenseList.hidden = false;

    filtered.forEach(exp => {
      const li = document.createElement('li');
      li.className = 'expense-item';

      const categoryLabel = categories.includes(exp.category) ? exp.category : 'Deleted Category';

      li.innerHTML = `
        <div class="expense-item__info">
          <div class="expense-item__header">
            <span class="expense-item__category">${categoryLabel}</span>
            <span class="expense-item__amount">${formatCurrency(exp.amount)}</span>
          </div>
          <div class="expense-item__details">
            <span class="expense-item__date">${new Date(exp.date).toLocaleDateString('id-ID')}</span>
            ${exp.description ? `<span class="expense-item__description">${exp.description}</span>` : ''}
          </div>
        </div>
        <div class="expense-item__actions">
          <button class="btn btn--small btn--secondary" onclick="editExpense('${exp.id}')" aria-label="Edit transaksi">✏️</button>
          <button class="btn btn--small btn--danger" onclick="deleteExpense('${exp.id}')" aria-label="Hapus transaksi">🗑️</button>
        </div>
      `;

      expenseList.appendChild(li);
    });
  }
}

function populateMonthFilter() {
  const filterMonth = document.getElementById('filter-month');

  const months = new Set();
  expenses.forEach(exp => {
    const date = new Date(exp.date);
    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    months.add(yearMonth);
  });

  while (filterMonth.options.length > 1) {
    filterMonth.remove(1);
  }

  const sortedMonths = Array.from(months).sort().reverse();
  sortedMonths.forEach(yearMonth => {
    const [year, month] = yearMonth.split('-');
    const date = new Date(year, month - 1);
    const label = date.toLocaleDateString('id-ID', { year: 'numeric', month: 'long' });
    const option = new Option(label, yearMonth);
    filterMonth.add(option);
  });
}

function updateCharts() {
  const currentMonthExpenses = expenses.filter(exp => isCurrentMonth(exp.date));
  
  const chartsContainer = document.getElementById('charts-container');
  const emptyState = document.getElementById('charts-empty-state');

  if (currentMonthExpenses.length === 0) {
    chartsContainer.hidden = true;
    emptyState.hidden = false;
    return;
  }

  chartsContainer.hidden = false;
  emptyState.hidden = true;

  drawPieChart(currentMonthExpenses);
  drawBarChart(currentMonthExpenses, currentBarChartGranularity);
}

function drawPieChart(currentMonthExpenses) {
  const canvas = document.getElementById('pie-chart');
  const ctx = canvas.getContext('2d');
  const legend = document.getElementById('pie-legend');

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  legend.innerHTML = '';

  const spendingByCategory = {};
  currentMonthExpenses.forEach(exp => {
    const cat = categories.includes(exp.category) ? exp.category : 'Deleted Category';
    spendingByCategory[cat] = (spendingByCategory[cat] || 0) + exp.amount;
  });

  const data = Object.entries(spendingByCategory).filter(([_, amount]) => amount > 0);
  if (data.length === 0) return;

  const total = data.reduce((sum, [_, amount]) => sum + amount, 0);

  const colors = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
    '#FF6384', '#C9CBCF', '#4BC0C0', '#FF9F40', '#FFCE56'
  ];

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = Math.min(centerX, centerY) - 20;

  let currentAngle = -Math.PI / 2;

  data.forEach(([category, amount], index) => {
    const sliceAngle = (amount / total) * 2 * Math.PI;
    const color = colors[index % colors.length];

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    currentAngle += sliceAngle;

    const legendItem = document.createElement('div');
    legendItem.className = 'legend-item';
    legendItem.innerHTML = `
      <span class="legend-color" style="background-color: ${color}"></span>
      <span class="legend-label">${category}: ${formatCurrency(amount)} (${((amount / total) * 100).toFixed(1)}%)</span>
    `;
    legend.appendChild(legendItem);
  });
}

function drawBarChart(currentMonthExpenses, granularity) {
  const canvas = document.getElementById('bar-chart');
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const current = getCurrentMonth();
  const daysInMonth = getDaysInMonth(current.year, current.month);

  let data = [];
  let labels = [];

  if (granularity === 'daily') {
    const dailySpending = {};
    for (let day = 1; day <= daysInMonth; day++) {
      dailySpending[day] = 0;
    }

    currentMonthExpenses.forEach(exp => {
      const day = new Date(exp.date).getDate();
      dailySpending[day] += exp.amount;
    });

    data = Object.values(dailySpending);
    labels = Object.keys(dailySpending);
  } else {
    const weeklySpending = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    currentMonthExpenses.forEach(exp => {
      const day = new Date(exp.date).getDate();
      const week = Math.ceil(day / 7);
      weeklySpending[week] = (weeklySpending[week] || 0) + exp.amount;
    });

    data = Object.values(weeklySpending);
    labels = ['Minggu 1', 'Minggu 2', 'Minggu 3', 'Minggu 4', 'Minggu 5'];
  }

  const padding = 40;
  const chartWidth = canvas.width - padding * 2;
  const chartHeight = canvas.height - padding * 2;
  const barWidth = chartWidth / data.length;
  const maxValue = Math.max(...data, 1);

  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, canvas.height - padding);
  ctx.lineTo(canvas.width - padding, canvas.height - padding);
  ctx.stroke();

  data.forEach((value, index) => {
    const barHeight = (value / maxValue) * chartHeight;
    const x = padding + index * barWidth + barWidth * 0.1;
    const y = canvas.height - padding - barHeight;
    const width = barWidth * 0.8;

    ctx.fillStyle = '#36A2EB';
    ctx.fillRect(x, y, width, barHeight);

    ctx.fillStyle = '#333';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    const labelText = granularity === 'daily' ? labels[index] : labels[index];
    ctx.fillText(labelText, x + width / 2, canvas.height - padding + 15);
  });
}

function exportCSV() {
  if (expenses.length === 0) {
    alert('Tidak ada data untuk diekspor');
    return;
  }

  try {
    const headers = ['date', 'category', 'amount', 'description'];
    const rows = expenses.map(exp => [
      exp.date,
      exp.category,
      exp.amount,
      exp.description
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'expenses.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (e) {
    alert('Gagal mengekspor CSV. Silakan coba lagi.');
    console.error('Export CSV error:', e);
  }
}

function exportJSON() {
  try {
    const data = {
      expenses: expenses,
      budgets: budgets
    };

    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'expenses-budgets.json');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (e) {
    alert('Gagal mengekspor JSON. Silakan coba lagi.');
    console.error('Export JSON error:', e);
  }
}

function importJSON(file) {
  const reader = new FileReader();

  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);

      if (!data.expenses || !Array.isArray(data.expenses)) {
        alert('Format file tidak valid: expenses harus berupa array');
        return;
      }

      if (!data.budgets || typeof data.budgets !== 'object') {
        alert('Format file tidak valid: budgets harus berupa object');
        return;
      }

      let importedCount = 0;
      data.expenses.forEach(newExp => {
        const isDuplicate = expenses.some(exp => 
          exp.date === newExp.date &&
          exp.category === newExp.category &&
          exp.amount === newExp.amount &&
          exp.description === newExp.description
        );

        if (!isDuplicate) {
          expenses.push({
            id: generateId(),
            amount: newExp.amount,
            category: newExp.category,
            date: newExp.date,
            description: newExp.description || ''
          });
          importedCount++;
        }
      });

      Object.entries(data.budgets).forEach(([category, limit]) => {
        budgets[category] = limit;
      });

      StorageManager.saveExpenses();
      StorageManager.saveBudgets();
      updateDashboard();
      renderExpenseList();
      updateCharts();
      populateMonthFilter();

      alert(`Berhasil mengimpor ${importedCount} transaksi baru`);
    } catch (e) {
      alert('Gagal membaca file JSON. Pastikan format file benar.');
      console.error('Import JSON error:', e);
    }
  };

  reader.readAsText(file);
}

function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
  }
  updateThemeButton(savedTheme);
}

function toggleTheme() {
  const isDark = document.body.classList.contains('dark-theme');
  
  if (isDark) {
    document.body.classList.remove('dark-theme');
    localStorage.setItem('theme', 'light');
    updateThemeButton('light');
  } else {
    document.body.classList.add('dark-theme');
    localStorage.setItem('theme', 'dark');
    updateThemeButton('dark');
  }
}

function updateThemeButton(theme) {
  const icon = document.getElementById('theme-icon');
  const label = document.getElementById('theme-label');
  
  if (theme === 'dark') {
    icon.textContent = '☀️';
    label.textContent = 'Light Mode';
  } else {
    icon.textContent = '🌙';
    label.textContent = 'Dark Mode';
  }
}

document.addEventListener('DOMContentLoaded', function() {
  StorageManager.init();
  StorageManager.loadData();
  initTheme();

  populateCategorySelectors();
  renderCategoryList();
  updateDashboard();
  renderExpenseList();
  updateCharts();
  populateMonthFilter();

  document.getElementById('expense-date').value = getTodayDateString();

  document.getElementById('btn-theme-toggle').addEventListener('click', toggleTheme);

  document.getElementById('budget-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const category = document.getElementById('budget-category').value;
    const amount = parseFloat(document.getElementById('budget-amount').value);

    if (saveBudget(category, amount)) {
      this.reset();
    }
  });

  document.getElementById('expense-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const expenseId = document.getElementById('expense-id').value;
    const amount = parseFloat(document.getElementById('expense-amount').value);
    const category = document.getElementById('expense-category').value;
    const date = document.getElementById('expense-date').value;
    const description = document.getElementById('expense-description').value;

    const expenseData = { amount, category, date, description };

    let success = false;
    if (expenseId) {
      success = updateExpense(expenseId, expenseData);
    } else {
      success = addExpense(expenseData);
    }

    if (success) {
      cancelEdit();
      populateMonthFilter();
    }
  });

  document.getElementById('btn-cancel-edit').addEventListener('click', cancelEdit);

  document.getElementById('category-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const name = document.getElementById('new-category-name').value;

    if (addCategory(name)) {
      this.reset();
    }
  });

  document.getElementById('bar-toggle-daily').addEventListener('click', function() {
    currentBarChartGranularity = 'daily';
    this.classList.add('btn--toggle-active');
    this.setAttribute('aria-pressed', 'true');
    document.getElementById('bar-toggle-weekly').classList.remove('btn--toggle-active');
    document.getElementById('bar-toggle-weekly').setAttribute('aria-pressed', 'false');
    updateCharts();
  });

  document.getElementById('bar-toggle-weekly').addEventListener('click', function() {
    currentBarChartGranularity = 'weekly';
    this.classList.add('btn--toggle-active');
    this.setAttribute('aria-pressed', 'true');
    document.getElementById('bar-toggle-daily').classList.remove('btn--toggle-active');
    document.getElementById('bar-toggle-daily').setAttribute('aria-pressed', 'false');
    updateCharts();
  });

  document.getElementById('filter-category').addEventListener('change', renderExpenseList);
  document.getElementById('filter-month').addEventListener('change', renderExpenseList);
  document.getElementById('filter-date-start').addEventListener('change', renderExpenseList);
  document.getElementById('filter-date-end').addEventListener('change', renderExpenseList);
  document.getElementById('sort-by').addEventListener('change', renderExpenseList);

  document.getElementById('btn-export-csv').addEventListener('click', exportCSV);
  document.getElementById('btn-export-json').addEventListener('click', exportJSON);

  document.getElementById('btn-import-json').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
      importJSON(file);
      e.target.value = '';
    }
  });
});
