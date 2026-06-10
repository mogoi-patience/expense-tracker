# Spendwise — Expense Tracker

A lightweight personal expense tracker built with Python, Flask, and SQLite.

## Features

- Add, edit, and delete expenses
- Category tagging (Food, Transport, Housing, Health, etc.)
- Monthly dashboard with total, average per day, and top category
- Visual category breakdown (bar chart)
- Filter expenses by category and sort by date or amount
- Month picker to navigate historical data
- Fully responsive UI

## Tech Stack

| Layer     | Technology           |
|-----------|----------------------|
| Backend   | Python 3 + Flask     |
| Database  | SQLite (built-in)    |
| Frontend  | Vanilla JS + CSS     |

## Setup

### 1. Install Python 3.8+
https://www.python.org/downloads/

### 2. Create a virtual environment (recommended)
```bash
python -m venv venv

# macOS / Linux
source venv/bin/activate

# Windows
venv\Scripts\activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Run the app
```bash
python app.py
```

### 5. Open in browser
```
http://127.0.0.1:5000
```

The SQLite database (`expenses.db`) is created automatically on first run.

## Project Structure

```
expense-tracker/
├── app.py               # Flask app + REST API
├── requirements.txt     # Python dependencies
├── expenses.db          # SQLite database (auto-created)
├── templates/
│   └── index.html       # Single-page frontend
└── static/
    ├── css/style.css    # All styles
    └── js/app.js        # All frontend logic
```

## API Endpoints

| Method | Endpoint                   | Description            |
|--------|----------------------------|------------------------|
| GET    | `/api/expenses`            | List expenses (filterable) |
| POST   | `/api/expenses`            | Create an expense      |
| PUT    | `/api/expenses/<id>`       | Update an expense      |
| DELETE | `/api/expenses/<id>`       | Delete an expense      |
| GET    | `/api/summary`             | Monthly totals by category |

### Query parameters for `GET /api/expenses`
- `month` — filter by month, e.g. `2025-06`
- `category` — filter by category name
- `sort` — `date_desc` | `date_asc` | `amount_desc` | `amount_asc`
