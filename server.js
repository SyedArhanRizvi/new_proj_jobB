import express from 'express';
import cron from 'node-cron';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

dotenv.config(); // Load environment variables

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

// User Schema and Model
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);

// Task Schema and Model
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

const Task = mongoose.model('Task', taskSchema);
const Log = mongoose.model('Log', logSchema);

// Nodemailer transporter setup
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Helper function to send emails
const sendEmail = async (taskName, userEmail) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: userEmail,
      subject: `Scheduled Reminder for Task: ${taskName}`,
      text: `This is a reminder for the task: "${taskName}".`,
    });
    console.log('Email sent for task:', taskName);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email');
  }
};

// Middleware to Protect Routes
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

// Add New Task
app.post('/add-task', authMiddleware, async (req, res) => {
  try {
    const { taskName, executionDate } = req.body;

    // Validate executionDate
    const parsedDate = new Date(executionDate);
    if (isNaN(parsedDate.getTime())) {
      console.error('Invalid execution date format:', executionDate);
      return res.status(400).json({ success: false, message: 'Invalid execution date format' });
    }

    // Save the task in the database
    const task = new Task({
      taskName,
      nextExecution: parsedDate,
      userId: req.user.id,
    });
    await task.save();

    // Schedule the task
    cron.schedule(
      `${parsedDate.getSeconds()} ${parsedDate.getMinutes()} ${parsedDate.getHours()} ${parsedDate.getDate()} ${
        parsedDate.getMonth() + 1
      } *`,
      async () => {
        try {
          const user = await User.findById(task.userId);
          if (!user) throw new Error('User not found');
          await sendEmail(taskName, user.email);

          const log = new Log({
            taskName,
            executionTime: new Date(),
            status: 'Success',
            message: 'Email sent successfully',
            userId: task.userId,
          });
          await log.save();
        } catch (error) {
          console.error('Error executing task:', error.message);
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

    res.json({ success: true, message: `Task "${taskName}" scheduled for ${parsedDate.toLocaleString()}` });
  } catch (error) {
    console.error('Server error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Fetch Tasks
app.get('/tasks', authMiddleware, async (req, res) => {
  const tasks = await Task.find({ userId: req.user.id });
  res.json(tasks);
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
