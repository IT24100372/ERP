# ERP Module API Endpoints

Base URL: /api

## Financial Management
- GET/POST /finance/chart-of-accounts
- GET/POST /finance/journal-entries
- GET/POST /finance/accounts-payable
- GET/POST /finance/accounts-receivable
- GET/POST /finance/bank-accounts
- GET/POST /finance/bank-transactions
- GET/POST /finance/budgets
- GET/POST /finance/tax-filings

## Sales & CRM
- GET/POST /sales/customers
- GET/POST /sales/leads
- GET/POST /sales/opportunities
- GET/POST /sales/orders
- GET/POST /sales/pos-transactions

## Procurement & Supply Chain
- GET/POST /procurement/suppliers
- GET/POST /procurement/purchase-orders
- GET/POST /procurement/goods-receipts

## Inventory & Warehouse
- Existing Inventory APIs:
  - GET/POST /inventory
  - PUT/DELETE /inventory/:id
  - PATCH /inventory/:id/quantity
  - POST /inventory/:id/purchase
  - GET /inventory/usage?period=daily|weekly
- New Warehouse APIs:
  - GET/POST /warehouse/warehouses
  - GET/POST /warehouse/locations
  - GET/POST /warehouse/stock-movements

## Reporting & Analytics
- GET/POST /reporting/financial-runs
- GET/POST /reporting/kpis
- GET/POST /reporting/custom-reports

## System & Administration
- GET/POST /admin/users
- GET/POST /admin/roles
- GET/POST /admin/user-role-assignments
- GET/POST /admin/approval-workflows
- GET/POST /admin/audit-logs
- GET/POST /admin/branches
- GET/POST /admin/currencies

## Existing Core APIs
- GET /health
- GET /db/ping
- Menu: GET/POST /menu, PUT/DELETE /menu/:id
- Orders: GET/POST /orders, PUT/DELETE /orders/:id, PATCH /orders/:id/status
- Billing: GET /invoices, POST /invoices/generate, PATCH /invoices/:id/status, GET /invoices/transactions
