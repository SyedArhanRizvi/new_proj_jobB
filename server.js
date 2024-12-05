import express from 'express';
import cron from 'node-cron';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

dotenv.config();

const app = express();
app.use(bodyParser.json());
app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);

// MongoDB connection
mongoose
  .connect(process.env.DB_URI)
  .then(() => console.log('MongoDB Connected Successfully'))
  .catch((err) => console.log('Error is ', err));

// Schemas and Models
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const taskSchema = new mongoose.Schema({
  taskName: { type: String, required: true },
  nextExecution: { type: Date, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
});

const logSchema = new mongoose.Schema({
  taskName: String,
  executionTime: Date,
  status: String,
  message: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

const User = mongoose.model('User', userSchema);
const Task = mongoose.model('Task', taskSchema);
const Log = mongoose.model('Log', logSchema);

// Nodemailer Transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Auth Middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Access Denied' });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    console.error('JWT verification failed:', err.message);
    res.status(400).json({ success: false, message: 'Invalid Token' });
  }
};

// Signup Route
app.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword,
    });

    await user.save();
    res.status(201).json({ success: true, message: 'Signup successful!' });
  } catch (err) {
    console.error('Signup error:', err.message);
    res.status(500).json({ success: false, message: 'Signup failed' });
  }
});

// Login Route
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  console.log(email, password);
  
  try {
    

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ success: false, message: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.status(200).json({ success: true, token, message: 'Login successful!' });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

// Add Task Route
app.post('/add-task', authMiddleware, async (req, res) => {
  try {
    const { taskName, executionDate } = req.body;

    const parsedDate = new Date(executionDate);
    if (isNaN(parsedDate.getTime())) {
      console.error('Invalid execution date:', executionDate);
      return res.status(400).json({ success: false, message: 'Invalid execution date format' });
    }

    const task = new Task({
      taskName,
      nextExecution: parsedDate,
      userId: req.user.id,
    });
    await task.save();

    cron.schedule(
      `${parsedDate.getSeconds()} ${parsedDate.getMinutes()} ${parsedDate.getHours()} ${parsedDate.getDate()} ${
        parsedDate.getMonth() + 1
      } *`,
      async () => {
        try {
          const user = await User.findById(task.userId);
          if (!user) throw new Error('User not found');

          await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: `Reminder for Task: ${taskName}`,
            text: `This is a reminder for your task: "${taskName}".`,
          });

          const log = new Log({
            taskName,
            executionTime: new Date(),
            status: 'Success',
            message: 'Email sent successfully',
            userId: task.userId,
          });
          await log.save();
        } catch (error) {
          console.error('Task execution error:', error.message);

          const log = new Log({
            taskName,
            executionTime: new Date(),
            status: 'Failure',
            message: error.message,
            userId: task.userId,
          });
          await log.save();
        }
      },
      { timezone: 'Asia/Kolkata' }
    );

    res.json({ success: true, message: `Task "${taskName}" scheduled successfully.` });
  } catch (error) {
    console.error('Add task error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to add task' });
  }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
