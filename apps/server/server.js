import dns from 'node:dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Models
import User from './models/User.js';
import Board from './models/Board.js';
import Task from './models/Task.js';
import Comment from './models/Comment.js';
import ActivityLog from './models/ActivityLog.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_DIR || 'uploads';
const uploadPath = path.join(__dirname, uploadDir);
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// Multer storage for avatars
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Database Connection
const mongoURI = process.env.MONGO_URI;
mongoose.connect(mongoURI)
  .then(() => console.log('Connected to MongoDB Atlas successfully!'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Helpers
function generateToken(userId, email, role) {
  return jwt.sign({ id: userId, email, role }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Forbidden' });
    req.user = user;
    next();
  });
};

function parseFilter(filterStr) {
  if (!filterStr) return {};
  const query = {};

  if (filterStr.includes('||')) {
    const parts = filterStr.split('||');
    query.$or = parts.map(p => parseFilter(p.trim()));
    return query;
  }

  const eqMatch = filterStr.match(/^(\w+)\s*=\s*"([^"]+)"$/);
  if (eqMatch) {
    query[eqMatch[1]] = eqMatch[2];
    return query;
  }

  const containsMatch = filterStr.match(/^(\w+)\s*~\s*"([^"]+)"$/);
  if (containsMatch) {
    query[containsMatch[1]] = containsMatch[2];
    return query;
  }

  return query;
}

function parseSort(sortStr) {
  if (!sortStr) return { created: -1 };
  const sort = {};
  const isDesc = sortStr.startsWith('-');
  const field = isDesc ? sortStr.substring(1) : sortStr;
  
  // map PocketBase 'created' and 'createdAt' sorting to DB timestamp
  const dbField = (field === 'created' || field === 'createdAt') ? 'created' : field;
  sort[dbField] = isDesc ? -1 : 1;
  return sort;
}

function formatRecord(record, expandStr, collectionName) {
  if (!record) return null;
  const json = record.toJSON();
  json.expand = {};

  if (expandStr) {
    const fields = expandStr.split(',').map(f => f.trim());
    fields.forEach(field => {
      if (field === 'members' && record.members) {
        json.expand.members = record.members.map(m => m.toJSON ? m.toJSON() : m);
      }
      if (field === 'assignee' && record.assignee) {
        json.expand.assignee = record.assignee.toJSON ? record.assignee.toJSON() : record.assignee;
      }
      if (field === 'owner' && record.owner) {
        json.expand.owner = record.owner.toJSON ? record.owner.toJSON() : record.owner;
      }
      if (field === 'user' && record.user) {
        json.expand.user = record.user.toJSON ? record.user.toJSON() : record.user;
      }
      if (field === 'userId' && record.user) {
        json.expand.userId = record.user.toJSON ? record.user.toJSON() : record.user;
      }
      if (field === 'boardId' && record.board) {
        json.expand.boardId = record.board.toJSON ? record.board.toJSON() : record.board;
      }
    });
  }
  return json;
}

// REST Endpoints matching PocketBase collection endpoints

// 1. Auth Login (Users)
app.post('/api/collections/users/auth-with-password', async (req, res) => {
  const { identity, password } = req.body;
  try {
    const user = await User.findOne({ email: identity });
    if (!user) return res.status(400).json({ message: 'Invalid email or password' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ message: 'Invalid email or password' });

    const token = generateToken(user._id, user.email, user.role);
    res.json({
      token,
      record: user.toJSON()
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 2. Auth Register (Users Creation)
app.post('/api/collections/users', async (req, res) => {
  const { name, email, password, passwordConfirm, role } = req.body;
  try {
    if (password !== passwordConfirm) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // First user is automatically admin, others can select role or default to member
    const totalUsers = await User.countDocuments();
    const userRole = totalUsers === 0 ? 'admin' : (role || 'member');

    const newUser = new User({
      name: name || '',
      email,
      password: hashedPassword,
      role: userRole
    });

    const savedUser = await newUser.save();
    res.status(201).json(savedUser.toJSON());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 3. Serve Avatar Upload Files
app.get('/api/files/users/:id/:filename', (req, res) => {
  const filePath = path.join(uploadPath, req.params.filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('File not found');
  }
});

// 4. Update User Settings/Profile
app.patch('/api/collections/users/:id', authenticateToken, upload.single('avatar'), async (req, res) => {
  const { id } = req.params;
  try {
    const updateData = { ...req.body };
    if (req.file) {
      updateData.avatar = req.file.filename;
    }
    
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true });
    if (!updatedUser) return res.status(404).json({ message: 'User not found' });

    res.json(updatedUser.toJSON());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 5. Get Users List
app.get('/api/collections/users', authenticateToken, async (req, res) => {
  try {
    const users = await User.find().sort({ name: 1 });
    res.json(users.map(u => u.toJSON()));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 6. Delete User (Admin Only)
app.delete('/api/collections/users/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 7. Boards Endpoints
app.get('/api/collections/boards', authenticateToken, async (req, res) => {
  const filter = parseFilter(req.query.filter);
  const sort = parseSort(req.query.sort);
  const expand = req.query.expand;

  try {
    let mongooseQuery = Board.find(filter).sort(sort);
    if (expand) {
      if (expand.includes('members')) mongooseQuery = mongooseQuery.populate('members');
      if (expand.includes('owner')) mongooseQuery = mongooseQuery.populate('owner');
    }
    const boards = await mongooseQuery;
    res.json(boards.map(b => formatRecord(b, expand, 'boards')));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/collections/boards/:id', authenticateToken, async (req, res) => {
  const expand = req.query.expand;
  try {
    let mongooseQuery = Board.findById(req.params.id);
    if (expand) {
      if (expand.includes('members')) mongooseQuery = mongooseQuery.populate('members');
      if (expand.includes('owner')) mongooseQuery = mongooseQuery.populate('owner');
    }
    const board = await mongooseQuery;
    if (!board) return res.status(404).json({ message: 'Board not found' });
    res.json(formatRecord(board, expand, 'boards'));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/collections/boards', authenticateToken, async (req, res) => {
  const { name, description, owner, members } = req.body;
  try {
    const newBoard = new Board({ name, description, owner, members });
    const saved = await newBoard.save();

    // Log Activity
    const newLog = new ActivityLog({
      board: saved._id,
      user: req.user.id,
      action: 'created'
    });
    await newLog.save();

    res.status(201).json(saved.toJSON());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.patch('/api/collections/boards/:id', authenticateToken, async (req, res) => {
  try {
    const updated = await Board.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated.toJSON());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/collections/boards/:id', authenticateToken, async (req, res) => {
  try {
    await Board.findByIdAndDelete(req.params.id);
    res.json({ message: 'Board deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 8. Tasks Endpoints
app.get('/api/collections/tasks', authenticateToken, async (req, res) => {
  const filter = parseFilter(req.query.filter);
  const sort = parseSort(req.query.sort);
  const expand = req.query.expand;

  try {
    let mongooseQuery = Task.find(filter).sort(sort);
    if (expand) {
      if (expand.includes('assignee')) mongooseQuery = mongooseQuery.populate('assignee');
      if (expand.includes('board')) mongooseQuery = mongooseQuery.populate('board');
    }
    const tasks = await mongooseQuery;
    res.json(tasks.map(t => formatRecord(t, expand, 'tasks')));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/collections/tasks', authenticateToken, async (req, res) => {
  try {
    const newTask = new Task(req.body);
    const saved = await newTask.save();
    
    // Fetch populated task to broadcast
    const populated = await Task.findById(saved._id).populate('assignee');
    const record = formatRecord(populated, 'assignee', 'tasks');

    // Broadcast Real-time event
    io.emit('tasks:change', { action: 'create', record });

    // Log Activity
    const newLog = new ActivityLog({
      board: req.body.board,
      user: req.user.id,
      action: 'created'
    });
    await newLog.save();

    res.status(201).json(saved.toJSON());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.patch('/api/collections/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const oldTask = await Task.findById(req.params.id);
    const updated = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('assignee');
    if (!updated) return res.status(404).json({ message: 'Task not found' });
    const record = formatRecord(updated, 'assignee', 'tasks');

    // Broadcast Real-time event
    io.emit('tasks:change', { action: 'update', record });

    // Log Activity
    let action = 'edited';
    if (oldTask && oldTask.status !== updated.status) {
      action = 'moved';
    } else if (oldTask && !oldTask.assignee && updated.assignee) {
      action = 'assigned';
    }

    const newLog = new ActivityLog({
      board: updated.board,
      user: req.user.id,
      action
    });
    await newLog.save();

    res.json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/collections/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    await Task.findByIdAndDelete(req.params.id);
    
    // Broadcast Real-time event
    io.emit('tasks:change', { action: 'delete', record: { id: req.params.id } });

    if (task) {
      const newLog = new ActivityLog({
        board: task.board,
        user: req.user.id,
        action: 'deleted'
      });
      await newLog.save();
    }

    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 9. Comments Endpoints
app.get('/api/collections/comments', authenticateToken, async (req, res) => {
  const filter = parseFilter(req.query.filter);
  const sort = parseSort(req.query.sort);
  const expand = req.query.expand;

  try {
    let mongooseQuery = Comment.find(filter).sort(sort);
    if (expand && expand.includes('user')) {
      mongooseQuery = mongooseQuery.populate('user');
    }
    const comments = await mongooseQuery;
    res.json(comments.map(c => formatRecord(c, expand, 'comments')));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/collections/comments', authenticateToken, async (req, res) => {
  try {
    const newComment = new Comment(req.body);
    const saved = await newComment.save();

    const populated = await Comment.findById(saved._id).populate('user');
    const record = formatRecord(populated, 'user', 'comments');

    // Broadcast comment updates in real-time
    io.emit('comments:change', { action: 'create', record });

    res.status(201).json(saved.toJSON());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/collections/comments/:id', authenticateToken, async (req, res) => {
  try {
    await Comment.findByIdAndDelete(req.params.id);

    // Broadcast delete event
    io.emit('comments:change', { action: 'delete', record: { id: req.params.id } });

    res.json({ message: 'Comment deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 10. Activity Logs Endpoints (maps both activityLogs and activity_logs)
const handleActivityLogsGet = async (req, res) => {
  const sort = parseSort(req.query.sort);
  const expand = req.query.expand;

  try {
    let mongooseQuery = ActivityLog.find().sort(sort);
    if (expand) {
      if (expand.includes('user') || expand.includes('userId')) mongooseQuery = mongooseQuery.populate('user');
      if (expand.includes('board') || expand.includes('boardId')) mongooseQuery = mongooseQuery.populate('board');
    }
    const logs = await mongooseQuery;
    res.json(logs.map(l => formatRecord(l, expand, 'activityLogs')));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

app.get('/api/collections/activityLogs', authenticateToken, handleActivityLogsGet);
app.get('/api/collections/activity_logs', authenticateToken, handleActivityLogsGet);

// Socket Connection handling
io.on('connection', (socket) => {
  console.log('Client connected for real-time updates:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start Server
const PORT = process.env.PORT || 8090;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Express and Socket.io server running at http://0.0.0.0:${PORT}`);
});
