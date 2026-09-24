from csv import writer
from pathlib import Path

root = Path(__file__).resolve().parents[1] / "testdata" / "csv"
root.mkdir(parents=True, exist_ok=True)

with (root / "products.csv").open("w", newline="") as file:
    csv = writer(file)
    csv.writerow(["sku", "name", "current_stock"])
    for i in range(1, 101):
        csv.writerow([f"SKU-{i:03}", "Tile X21" if i == 1 else f"Product {i}", 80 if i == 1 else 300])

with (root / "customers.csv").open("w", newline="") as file:
    csv = writer(file)
    csv.writerow(["name", "business_name", "email"])
    for i in range(1, 201):
        name = "ABC Traders" if i == 1 else f"Customer {i}"
        csv.writerow([name, name, f"customer{i}@example.invalid"])

with (root / "suppliers.csv").open("w", newline="") as file:
    csv = writer(file)
    csv.writerow(["name", "email"])
    for i in range(1, 31):
        name = "ABC Ceramics" if i == 1 else "XYZ Metals" if i == 2 else f"Supplier {i}"
        csv.writerow([name, f"supplier{i}@example.invalid"])

with (root / "invoices.csv").open("w", newline="") as file:
    csv = writer(file)
    csv.writerow(["customer_id", "invoice_number", "invoice_date", "due_date", "total"])
    csv.writerow(["REPLACE_WITH_CUSTOMER_UUID", "INV-DEMO", "2026-01-01", "2026-01-31", "120000"])

with (root / "inventory_transactions.csv").open("w", newline="") as file:
    csv = writer(file)
    csv.writerow(["source_id", "product_sku", "transaction_type", "quantity", "timestamp"])
    for i in range(1, 8):
        csv.writerow([f"sale-{i}", "SKU-001", "SALE", 20, f"2026-09-{i + 16:02}T12:00:00Z"])

with (root / "sales.csv").open("w", newline="") as file:
    csv = writer(file)
    csv.writerow(["source_id", "customer_id", "sale_date", "total_amount"])
    csv.writerow(["sale-001", "REPLACE_WITH_CUSTOMER_UUID", "2026-09-24", 2400])

with (root / "payments.csv").open("w", newline="") as file:
    csv = writer(file)
    csv.writerow(["reference_number", "invoice_number", "payment_date", "amount"])
    csv.writerow(["BANK-001", "INV-DEMO", "2026-09-24", 500])

with (root / "purchase_orders.csv").open("w", newline="") as file:
    csv = writer(file)
    csv.writerow(["supplier_id", "po_number", "order_date", "expected_delivery_date", "delivered_at", "status"])
    csv.writerow(["REPLACE_WITH_SUPPLIER_UUID", "PO-DEMO", "2026-09-01", "2026-09-07", "2026-09-10", "DELIVERED"])

print("Generated CSV samples. Replace placeholder customer and supplier UUIDs before import.")
