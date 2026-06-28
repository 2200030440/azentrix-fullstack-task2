# 🚀 TaskFlow - Multi-User Task Management System

A lightweight, self-hostable task collaboration tool for remote teams. Built as a mini-Trello alternative — real-time boards, drag-and-drop cards, and role-based permissions, without the bloat or cost of larger tools.

---

## 📋 Problem Statement

Remote teams lack a lightweight, self-hostable task collaboration tool. Most existing tools are either too bloated or too expensive for small teams. TaskFlow solves this with a simple, fast, deployable kanban board.

---

## ✨ Features

- 🔐 **Authentication** — Register and log in with JWT-based auth
- 📋 **Boards & Columns** — Boards contain To Do / In Progress / Done columns
- 🖱️ **Drag-and-Drop** — Move task cards between columns
- 📝 **Task Details** — Title, description, assignee, due date, and priority (Low / Medium / High)
- 💬 **Comments** — Discuss tasks directly on the card
- 🌐 **Real-time Sync** — Socket.io WebSocket subscriptions update both users' boards instantly
- 👥 **Role-Based Access** — Admins can manage all cards; Members can only manage cards assigned to them
- 📊 **Dashboard** — Live stats: total tasks, completed tasks, completion rate

---

## 🛠️ Tech Stack

**Frontend**
- React 18 + Vite
- Tailwind CSS + shadcn/ui components
- React Router
- Socket.io Client

**Backend**
- Node.js + Express
- MongoDB Atlas (cloud database)
- Socket.io for real-time WebSocket events
- JWT Authentication
- Mongoose ODM

---

## 👥 Roles & Permissions

| Action | Admin | Member |
|---|---|---|
| Create boards/tasks | ✅ | ✅ |
| Edit/delete own tasks | ✅ | ✅ |
| Edit/delete any task | ✅ | ❌ |
| Manage users/roles | ✅ | ❌ |
| View dashboard | ✅ | ✅ |

---

## 🚀 Getting Started (Local Setup)

### Prerequisites
- Node.js (v18+)

### 1. Clone the repo
```bash
git clone https://github.com/2200030440/azentrix-fullstack-task2.git
cd azentrix-fullstack-task2
```

### 2. Install dependencies
```bash
npm install
cd apps/web && npm install
cd ../server && npm install
```

### 3. Configure environment
Create `apps/server/.env`:
```env
PORT=8090
MONGO_URI=mongodb+srv://2200030440:2200030440@cluster1.q4yijny.mongodb.net/?appName=Cluster1
JWT_SECRET=super_secret_taskflow_key_123_abc_xyz
```

Create `apps/web/.env`:
```env
VITE_PB_URL=http://127.0.0.1:8090
```

### 4. Start both servers
```bash
npm run dev
```
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8090`

---

## 🌐 Live Demo

- **App (Frontend):** [https://azentrix-fullstack-task2-web.vercel.app](https://azentrix-fullstack-task2-web.vercel.app)
- **Backend API:** [https://azentrix-fullstack-task2-server.vercel.app](https://azentrix-fullstack-task2-server.vercel.app)
- **Database:** MongoDB Atlas (Cluster1)

---

## 🗄️ Database Structure (MongoDB Collections)

- **users** — id, email, name, avatar, role (admin/member), password (hashed)
- **boards** — id, name, description, owner, members[]
- **tasks** — id, title, description, board, status, priority, assignee, due_date
- **comments** — id, task, user, content, created
- **activitylogs** — id, board, user, action, created

---

## 📌 Project Status

Built as a fullstack portfolio project demonstrating:
- Multi-user JWT authentication
- Real-time WebSocket sync via Socket.io
- Drag-and-drop kanban boards
- Role-based access control
- MongoDB Atlas cloud database
- Free-tier deployment on Render + Vercel