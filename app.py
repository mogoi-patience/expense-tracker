from flask import Flask, render_template, request, jsonify
import sqlite3
import os
from datetime import datetime

app = Flask(__name__)
DB_PATH = os.path.join(os.path.dirname(__file__), "expenses.db")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                amount REAL NOT NULL,
                category TEXT NOT NULL,
                date TEXT NOT NULL,
                note TEXT
            )
        """)
        conn.commit()


@app.route("/")
def index():
    return render_template("index.html")


# ── API endpoints ──────────────────────────────────────────────────────────────

@app.route("/api/expenses", methods=["GET"])
def get_expenses():
    category = request.args.get("category", "")
    month    = request.args.get("month", "")          # YYYY-MM
    sort     = request.args.get("sort", "date_desc")

    query  = "SELECT * FROM expenses WHERE 1=1"
    params = []

    if category:
        query += " AND category = ?"
        params.append(category)
    if month:
        query += " AND date LIKE ?"
        params.append(f"{month}%")

    order_map = {
        "date_desc":   "date DESC",
        "date_asc":    "date ASC",
        "amount_desc": "amount DESC",
        "amount_asc":  "amount ASC",
    }
    query += f" ORDER BY {order_map.get(sort, 'date DESC')}"

    with get_db() as conn:
        rows = conn.execute(query, params).fetchall()

    return jsonify([dict(r) for r in rows])


@app.route("/api/expenses", methods=["POST"])
def add_expense():
    data = request.get_json()
    title    = data.get("title", "").strip()
    amount   = data.get("amount")
    category = data.get("category", "").strip()
    date     = data.get("date", "").strip()
    note     = data.get("note", "").strip()

    if not title or not amount or not category or not date:
        return jsonify({"error": "title, amount, category and date are required"}), 400

    try:
        amount = float(amount)
        if amount <= 0:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({"error": "amount must be a positive number"}), 400

    with get_db() as conn:
        cur = conn.execute(
            "INSERT INTO expenses (title, amount, category, date, note) VALUES (?,?,?,?,?)",
            (title, amount, category, date, note),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM expenses WHERE id=?", (cur.lastrowid,)).fetchone()

    return jsonify(dict(row)), 201


@app.route("/api/expenses/<int:expense_id>", methods=["PUT"])
def update_expense(expense_id):
    data = request.get_json()
    title    = data.get("title", "").strip()
    amount   = data.get("amount")
    category = data.get("category", "").strip()
    date     = data.get("date", "").strip()
    note     = data.get("note", "").strip()

    if not title or not amount or not category or not date:
        return jsonify({"error": "title, amount, category and date are required"}), 400

    try:
        amount = float(amount)
        if amount <= 0:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({"error": "amount must be a positive number"}), 400

    with get_db() as conn:
        conn.execute(
            "UPDATE expenses SET title=?, amount=?, category=?, date=?, note=? WHERE id=?",
            (title, amount, category, date, note, expense_id),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM expenses WHERE id=?", (expense_id,)).fetchone()

    if not row:
        return jsonify({"error": "not found"}), 404

    return jsonify(dict(row))


@app.route("/api/expenses/<int:expense_id>", methods=["DELETE"])
def delete_expense(expense_id):
    with get_db() as conn:
        conn.execute("DELETE FROM expenses WHERE id=?", (expense_id,))
        conn.commit()
    return jsonify({"deleted": expense_id})


@app.route("/api/summary", methods=["GET"])
def summary():
    month = request.args.get("month", datetime.today().strftime("%Y-%m"))
    with get_db() as conn:
        total = conn.execute(
            "SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE date LIKE ?",
            (f"{month}%",),
        ).fetchone()["total"]

        by_cat = conn.execute(
            "SELECT category, COALESCE(SUM(amount),0) as total FROM expenses WHERE date LIKE ? GROUP BY category ORDER BY total DESC",
            (f"{month}%",),
        ).fetchall()

    return jsonify({
        "month": month,
        "total": total,
        "by_category": [dict(r) for r in by_cat],
    })


if __name__ == "__main__":
    init_db()
    app.run(debug=True)
