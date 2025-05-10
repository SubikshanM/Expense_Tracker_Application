let fileHandle;
let expenses = [];
let salaries = {};

document.getElementById('create-csv-btn').addEventListener('click', async () => {
  try {
    fileHandle = await window.showSaveFilePicker({
      suggestedName: 'expenses.csv',
      types: [{ description: 'CSV file', accept: { 'text/csv': ['.csv'] } }]
    });
    expenses = [];
    updateUI();
    await saveDataToCSV();
  } catch {
    alert('File creation cancelled.');
  }
});

document.getElementById('sync-btn').addEventListener('click', async () => {
  try {
    const [handle] = await window.showOpenFilePicker({
      types: [{ description: 'CSV Files', accept: { 'text/csv': ['.csv'] } }],
      excludeAcceptAllOption: true,
      multiple: false
    });
    fileHandle = handle;
    await loadExistingData();
  } catch {
    alert('File selection cancelled.');
  }
});

document.getElementById('expense-form').addEventListener('submit', async e => {
  e.preventDefault();

  if (!fileHandle) {
    alert('Please create or sync a CSV file first.');
    return;
  }

  const date = document.getElementById('date').value;
  const amount = parseFloat(document.getElementById('amount').value);

  if (!date || isNaN(amount)) {
    alert('Enter valid date and amount.');
    return;
  }

  expenses.push({ date, amount });
  expenses.sort((a, b) => new Date(a.date) - new Date(b.date));
  await saveDataToCSV();
  updateUI();
  document.getElementById('expense-form').reset();
});

function getMonthKey(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function updateUI() {
  const container = document.getElementById('expense-tables');
  container.innerHTML = '';

  const grouped = {};
  expenses.forEach(e => {
    const key = getMonthKey(e.date);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  });

  for (const key in grouped) {
    const monthExpenses = grouped[key];
    const monthName = new Date(key + '-01').toLocaleString('default', { month: 'long', year: 'numeric' });

    const section = document.createElement('div');
    const title = document.createElement('h2');
    title.textContent = `Expenses for ${monthName}`;
    section.appendChild(title);

    if (!salaries[key]) {
      const salaryInput = document.createElement('input');
      salaryInput.type = 'number';
      salaryInput.placeholder = 'Enter Monthly Salary';
      salaryInput.className = 'salary-input';
      salaryInput.addEventListener('change', () => {
        salaries[key] = parseFloat(salaryInput.value);
        updateUI();
      });
      section.appendChild(salaryInput);
    } else {
      const salaryLabel = document.createElement('div');
      salaryLabel.innerHTML = `<strong>Monthly Salary:</strong> Rs. ${salaries[key]}`;
      section.appendChild(salaryLabel);
    }

    const table = document.createElement('table');
    table.innerHTML = `
      <thead><tr><th>Date</th><th>Expense</th><th>Monthly Salary</th><th>Remaining</th></tr></thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector('tbody');
    let total = 0;
    for (const e of monthExpenses) {
      total += e.amount;
      const salary = salaries[key] || 0;
      const remaining = salary - total;
      const row = document.createElement('tr');
      row.innerHTML = `<td>${e.date}</td><td>Rs. ${e.amount.toFixed(2)}</td><td>Rs. ${salary}</td><td>Rs. ${remaining.toFixed(2)}</td>`;
      tbody.appendChild(row);
    }

    const totalRow = document.createElement('tr');
    totalRow.innerHTML = `<td><strong>Total</strong></td><td><strong>Rs. ${total.toFixed(2)}</strong></td><td></td><td></td>`;
    tbody.appendChild(totalRow);

    section.appendChild(table);
    container.appendChild(section);
  }
}

async function loadExistingData() {
  const file = await fileHandle.getFile();
  const content = await file.text();
  const rows = content.trim().split('\\n');
  expenses = [];
  for (let i = 1; i < rows.length; i++) {
    const [date, amount] = rows[i].split(',');
    expenses.push({ date, amount: parseFloat(amount) });
  }
  expenses.sort((a, b) => new Date(a.date) - new Date(b.date));
  updateUI();
}

async function saveDataToCSV() {
  const csv = 'Date,Amount\\n' + expenses.map(e => `${e.date},${e.amount}`).join('\\n');
  const writable = await fileHandle.createWritable();
  await writable.write(csv);
  await writable.close();
}

document.getElementById('download-excel').addEventListener('click', () => {
  const ws = XLSX.utils.json_to_sheet(expenses);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
  XLSX.writeFile(wb, 'expenses_report.xlsx');
});

// Set max date to today
document.getElementById('date').max = new Date().toISOString().split('T')[0];
