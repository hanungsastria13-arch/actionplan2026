# Werkudara Group - Department Action Plan Tracking System

A production-ready web application for tracking departmental action plans with role-based access control.

## Tech Stack

- **Frontend:** React (Vite), Tailwind CSS, Lucide Icons
- **Backend:** Supabase (Auth, Database, Row Level Security)

## Setup Instructions

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and anon key from Settings > API

### 2. Setup Database

1. Go to SQL Editor in your Supabase dashboard
2. Run the contents of `supabase-schema.sql` to create tables and RLS policies
3. (Optional) Run `supabase-seed.sql` to add sample data

### 3. Create Test Users

In Supabase Dashboard > Authentication > Users, create users with metadata:

**Admin User:**
```json
{
  "full_name": "Admin User",
  "role": "admin",
  "department_code": null
}
```

**Department Head (e.g., Sales Operation):**
```json
{
  "full_name": "SO Department Head",
  "role": "dept_head",
  "department_code": "SO"
}
```

### 4. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 5. Install & Run

```bash
npm install
npm run dev
```

## Features

### Role-Based Access Control

| Feature | Admin | Dept Head |
|---------|-------|-----------|
| View all departments | ✅ | ❌ |
| View own department | ✅ | ✅ |
| Create action plans | ✅ | ❌ |
| Edit all fields | ✅ | ❌ |
| Edit status/outcome/remark | ✅ | ✅ |
| Delete action plans | ✅ | ❌ |
| Company dashboard | ✅ | ❌ |

### Security (RLS Policies)

- **Admins:** Full CRUD access to all action plans
- **Dept Heads:** 
  - Can only SELECT rows matching their department
  - Can only UPDATE status, outcome_link, and remark columns
  - Cannot INSERT or DELETE

### Departments

| Code | Name |
|------|------|
| BAS | Business & Administration Services |
| PD | Product Development |
| CFC | Corporate Finance Controller |
| SS | Strategic Sourcing |
| ACC | Accounting |
| HR | Human Resources |
| BID | Business & Innovation Development |
| TEP | Tour and Event Planning |
| GA | General Affairs |
| ACS | Art & Creative Support |
| SO | Sales Operation |

## Project Structure

```
src/
├── components/
│   ├── LoginPage.jsx
│   ├── LoadingScreen.jsx
│   ├── Sidebar.jsx
│   ├── AdminDashboard.jsx
│   ├── DepartmentView.jsx
│   ├── DashboardCards.jsx
│   ├── DataTable.jsx
│   └── ActionPlanModal.jsx
├── context/
│   └── AuthContext.jsx
├── hooks/
│   └── useActionPlans.js
├── lib/
│   └── supabase.js
├── App.jsx
├── main.jsx
└── index.css
```

## License

Private - Werkudara Group
