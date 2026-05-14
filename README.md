# 🌿 Ayurveda Inventory System

A modern, full-stack inventory management system built for Ayurvedic products — featuring real-time stock tracking, a clean UI, and a robust database layer.

**Live Demo → [inventory-system1-delta.vercel.app](https://inventory-system1-delta.vercel.app)**

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (TypeScript) |
| Runtime | Bun |
| ORM | Prisma |
| Styling | CSS / HTML |
| Deployment | Vercel |

---

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh) installed on your machine
- A Prisma-compatible database (PostgreSQL recommended)

---

### 1. Clone the Repository

```bash
git clone https://github.com/oajisnothere713/inventory-system1.git
cd inventory-system1/ayurveda-inventory
```

---

### 2. Create the Environment File

Create a `.env.local` file in the `ayurveda-inventory` root folder:

```bash
touch .env.local
```

---

### 3. Install Dependencies

```bash
bun i
```

---

### 4. Set Up the Database

Run Prisma in a **separate terminal** to get your database URLs:

```bash
npx prisma dev
```

Copy the generated `DATABASE_URL` and `SHADOW_DATABASE_URL` and paste them into your `.env.local`:

```env
DATABASE_URL=your_database_url_here
SHADOW_DATABASE_URL=your_shadow_database_url_here
```

---

### 5. Run the Development Server

In another terminal:

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```
inventory-system1/
└── ayurveda-inventory/    # Main Next.js application
    ├── prisma/            # Prisma schema and migrations
    ├── src/               # Application source
    ├── public/            # Static assets
    └── .env.local         # Environment variables (not committed)
```

---

## 📄 License

This project is open source. Feel free to fork and adapt it for your own needs.
