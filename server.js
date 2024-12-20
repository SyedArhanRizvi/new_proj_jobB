import express from 'express';
import cron from 'node-cron';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import moment from 'moment-timezone'; // Add this to handle timezones
dotenv.config(); // Load environment variables

const app = express();
app.use(bodyParser.json());


app.use(cors({
  origin:'*', 
  credentials: true,
}));

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
const taskSchema =new mongoose.Schema({
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
  console.log("This is user mail ", userEmail);
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
  // console.log(req.headers);
  
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Access Denied' });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified; // Add user data to request object
    next();
  } catch (err) {
    console.error('JWT verification failed:', err.message);
    res.status(400).json({ success: false, message: 'Invalid Token' });
  }
};
// Authenticated route to fetch user details
app.get('/auth/me', authMiddleware, async (req, res) => {
  try {
    // Fetch user details using the `req.user` populated by the `authMiddleware`
    const user = await User.findById(req.user.id).select('-password'); // Exclude password for security
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// User Registration (Signup)
app.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;

  // Check if the user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) return res.status(400).json({ success: false, message: 'Email already exists' });

  // Hash password and save user
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ name, email, password: hashedPassword });
  await user.save();
  res.json({ success: true, message: 'User registered successfully' });
});

// User Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Check if the user exists
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  // Validate password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ success: false, message: 'Invalid credentials' });

  // Generate token
  const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });

  res.json({ success: true, token, user: { id: user._id, name: user.name, email: user.email } });
});

// Add New Task
// Add New Task
app.post('/add-task', authMiddleware, async (req, res) => {
  try {
    const { taskName, executionDate } = req.body;

    // Parse the execution date and ensure it's valid
    const parsedDate = moment.tz(executionDate, 'Asia/Kolkata');
    if (!parsedDate.isValid()) {
      return res.status(400).json({ success: false, message: 'Invalid execution date' });
    }

    // Save the task in the database (UTC time)
    const task = new Task({
      taskName,
      nextExecution: parsedDate.toDate(),
      userId: req.user.id,
    });
    await task.save();

    // Schedule the task
    cron.schedule(
      `${parsedDate.seconds()} ${parsedDate.minutes()} ${parsedDate.hours()} ${parsedDate.date()} ${parsedDate.month() + 1} *`,
      async () => {
        console.log(`Executing task: ${taskName}`);

        try {
          // Fetch the user using the userId from the task
          const user = await User.findById(task.userId);
          if (!user) throw new Error('User not found');

          console.log(`Sending email to: ${user.email}`);
          await sendEmail(taskName, user.email);

          // Save success log
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

          // Save failure log
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
      { timezone: 'Asia/Kolkata' } // Set the desired timezone
    );

    res.json({
      success: true,
      message: `Task "${taskName}" scheduled for ${parsedDate.format('YYYY-MM-DD HH:mm:ss')} IST`,
    });
  } catch (error) {
    console.error('Server error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete Task
app.delete('/delete-task/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  const task = await Task.findOneAndDelete({ _id: id, userId: req.user.id });
  if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

  await Log.deleteMany({ taskName: task.taskName, userId: req.user.id });
  res.json({ success: true, message: `Task "${task.taskName}" and associated logs deleted.` });
});

// Fetch Tasks
app.get('/tasks', authMiddleware, async (req, res) => {
  const tasks = await Task.find({ userId: req.user.id });
  res.json(tasks);
});

// Fetch Logs for Task History
app.get('/task-history', authMiddleware, async (req, res) => {
  const logs = await Log.find({ userId: req.user.id }).sort({ executionTime: -1 });
  res.json(logs);
});

// Update Task
app.put('/update-task/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { taskName, executionDate } = req.body;

  const task = await Task.findOneAndUpdate(
    { _id: id, userId: req.user.id },
    { taskName, nextExecution: new Date(executionDate) },
    { new: true }
  );

  if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

  const log = new Log({
    taskName,
    executionTime: new Date(),
    status: 'Updated',
    message: `Task updated to execute at ${executionDate}`,
    userId: req.user.id,
  });
  await log.save();

  res.json({ success: true, message: `Task "${taskName}" updated successfully` });
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
