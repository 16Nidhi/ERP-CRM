# Mini ERP + CRM

A lightweight ERP + CRM system for managing customers, product inventory, and delivery challans, built with role-based access control for four user types (Admin, Sales, Warehouse, Accounts).

## Features

- **Authentication** — JWT-based login with role-based authorization (ADMIN, SALES, WAREHOUSE, ACCOUNTS)
- **Customer / CRM Management** — create, search, and update customer records (RETAIL / WHOLESALE / DISTRIBUTOR types, LEAD / ACTIVE / INACTIVE status), with a full follow-up note timeline per customer
- **Product & Inventory Management** — product catalog with unique SKUs, live stock tracking, low-stock alerts, and a full stock movement history (IN / OUT)
- **Challan (Delivery Note) Management** — create draft challans, confirm or cancel them, with:
  - Auto-generated challan numbers (CH-0001, CH-0002, ...)
  - **Snapshotting** — product name, SKU, and unit price are captured at the moment a challan item is created, so historical challans remain accurate even if the underlying product is later renamed or repriced
  - Atomic stock deduction on confirmation, with transaction rollback protection against negative stock
- **Role-based UI/API access** — write access to inventory is restricted to ADMIN and WAREHOUSE; SALES and ACCOUNTS have read-only access

## Tech Stack

**Backend**
- Node.js + Express.js
- TypeScript
- MySQL + Prisma ORM
- JWT for authentication
- bcrypt for password hashing
- Zod for request validation

**Frontend**
- React + Vite + TypeScript
- Tailwind CSS
- React Router v6
- Axios

## Architecture

**Backend (layered):**
```
Routes → Controllers → Services → Prisma → MySQL
```

**Database models:** User, Customer, CustomerFollowUp, Product, StockMovement, Challan, ChallanItem

**Key enums:**
- `Role`: ADMIN, SALES, WAREHOUSE, ACCOUNTS
- `CustomerType`: RETAIL, WHOLESALE, DISTRIBUTOR
- `CustomerStatus`: LEAD, ACTIVE, INACTIVE
- `StockMovementType`: IN, OUT
- `ChallanStatus`: DRAFT, CONFIRMED, CANCELLED

## Database Setup

1. Create a MySQL database:
   ```sql
   CREATE DATABASE mini_erp;
   ```
2. Set your `DATABASE_URL` in `backend/.env` (see Environment Variables below).
3. Run migrations:
   ```bash
   cd backend
   npx prisma migrate deploy
   ```
4. Seed test users:
   ```bash
   npx prisma db seed
   ```

## Environment Variables

**backend/.env**
```
DATABASE_URL="mysql://<user>:<password>@localhost:3306/mini_erp"
JWT_SECRET="your-secret-key"
PORT=4000
BCRYPT_SALT_ROUNDS=10
```

**frontend/.env**
```
VITE_API_BASE_URL=http://localhost:4000/api
```

## Run Commands

**Backend**
```bash
cd backend
npm install
npm run build     # TypeScript build check
npm run dev        # starts server on http://localhost:4000
```

**Frontend**
```bash
cd frontend
npm install
npm run dev         # starts app on http://localhost:5173
```

## API Overview

**Auth**
- `POST /api/auth/login`

**Customers**
- `GET /api/customers` (paginated, searchable)
- `POST /api/customers`
- `GET /api/customers/:id`
- `PUT /api/customers/:id`
- Follow-ups managed via customer detail endpoints

**Products / Inventory**
- `GET /api/products` (paginated, searchable)
- `POST /api/products`
- `GET /api/products/:id`
- `PUT /api/products/:id`
- `POST /api/products/:id/stock-movements`
- `GET /api/products/:id/stock-movements`

**Challans**
- `POST /api/challans`
- `GET /api/challans` (paginated, filterable by status)
- `GET /api/challans/:id`
- `POST /api/challans/:id/confirm`
- `POST /api/challans/:id/cancel`

## Test Credentials

| Role      | Email                     | Password       |
|-----------|---------------------------|----------------|
| Admin     | admin@mini-erp.local      | Admin@123      |
| Sales     | sales@mini-erp.local      | Sales@123      |
| Warehouse | warehouse@mini-erp.local  | Warehouse@123  |
| Accounts  | accounts@mini-erp.local   | Accounts@123   |

## Known Limitations

- Customer deletion is not implemented (no `DELETE /api/customers/:id` endpoint); customers can only be created, viewed, and updated.
- Postman collection is provided separately for manual API testing.
- No automated test suite (unit/integration tests) is included due to project time constraints.
- Deployment is not included in this submission; the project is intended to be run locally following the setup steps above. A screen recording of the working application is provided as a demonstration in place of a live deployment.