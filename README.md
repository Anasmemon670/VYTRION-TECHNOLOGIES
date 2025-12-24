# 🚀 Victor E-Commerce Platform

A full-stack **E-Commerce Web Application** built with **Next.js**, **Prisma**, and **PostgreSQL**, featuring secure authentication, admin dashboard, real database integration, and scalable backend architecture.

---

## ✨ Features

### 🔐 Authentication & Authorization
- JWT-based authentication
- Access & refresh token flow
- Forgot & reset password APIs
- Role-based access:
  - **Admin**
  - **User**

---

### 🛒 Products Management
- Admin can:
  - Create, update, delete products
  - Mark products as featured
- Users can:
  - View all products
  - View featured products
- Products stored in **real database (no mock data)**

---

### 📦 Orders
- Create orders with multiple items
- Order status lifecycle:
  - Pending
  - Processed
  - Shipped
  - Delivered
  - Cancelled
- Admin order management
- User order history

---

### 📝 Blog System
- Admin CRUD for blogs
- Draft / publish control
- Public blogs visible to users
- Secure unpublished access (admin only)

---

### 🛠 Services & Projects
- Admin can manage:
  - Services
  - Projects
- Public listing pages
- Data stored in database

---

### 💬 Messages & Contact
- Contact form (real DB storage)
- Admin inbox for contact messages
- User message system
- Read / archive / delete functionality

---

### 📊 Admin Dashboard
- Real-time statistics
- Order status breakdown
- User & content management
- Secure admin-only routes

---

## 🧱 Tech Stack

### Frontend
- **Next.js**
- **TypeScript**
- **Tailwind CSS**
- **Axios**

### Backend
- **Next.js API Routes**
- **Prisma ORM**
- **PostgreSQL**
- **JWT Authentication**

---

## 🗄 Database
- PostgreSQL
- Prisma schema fully aligned with APIs
- No unused or mock models
- Clean relations and validations

---

## ⚙️ Environment Variables

Create a `.env` file in backend:

```env
DATABASE_URL=your_database_url
JWT_SECRET=your_jwt_secret
NEXT_PUBLIC_API_URL=http://localhost:5000/api
