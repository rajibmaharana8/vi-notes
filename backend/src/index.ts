import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://rajibmaharana8200_db_user:ZneOeQ7Y5NBQGlf8@cluster0.bdzvaqm.mongodb.net/?appName=Cluster0";
const JWT_SECRET = process.env.JWT_SECRET || "secret";

app.use(cors());
app.use(express.json());

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);

// MongoDB Connection
console.log('Connecting to MongoDB: ', MONGODB_URI.replace(/:([^@]+)@/, ':****@'));
mongoose.connect(MONGODB_URI, { 
  serverSelectionTimeoutMS: 5000,
  bufferCommands: false
})
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB Connection Error:', err));

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  console.log('Registering:', req.body.email);
  try {
    const { email, password, name } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email already registered' });
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({ email, password: hashedPassword, name });
    await user.save();
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' });
    res.status(201).json({ token, user: { email, name } });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed: ' + error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  console.log('Login attempt:', req.body.email);
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) return res.status(400).json({ message: 'Incorrect password' });
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ token, user: { email: user.email, name: user.name } });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed: ' + error.message });
  }
});

app.get('/', (req, res) => {
  console.log('Root endpoint hit');
  res.send('Vi-Notes API is live with MongoDB and Auth');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
