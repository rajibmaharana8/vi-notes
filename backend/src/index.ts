import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://rajib_db_user:ZneOeQ7Y5NBQGlf8@cluster0.bdzvaqm.mongodb.net/?appName=Cluster0";
const JWT_SECRET = process.env.JWT_SECRET || "secret";

// Middleware
app.use(cors());
app.use(express.json());

// Database Schemas
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const reportSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  score: { type: Number, required: true },
  wordCount: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);
const Report = mongoose.model('Report', reportSchema);

// DB Connection
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB error:', err));

// Auth validation middleware
const auth = (req: any, res: any, next: any) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    req.userId = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// --- AUTH ROUTES ---
app.post('/api/auth/register', async (req: express.Request, res: express.Response) => {
  const { email, password, name } = req.body;
  
  try {
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({ email, password: hashedPassword, name });
    await user.save();

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1h' });
    res.status(201).json({ token, user: { email, name } });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/auth/login', async (req: express.Request, res: express.Response) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isCorrect = await bcrypt.compare(password, user.password);
    if (!isCorrect) return res.status(400).json({ message: 'Invalid password' });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ token, user: { email: user.email, name: user.name } });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// --- REPORT ROUTES ---
app.post('/api/reports', auth, async (req: any, res: any) => {
  const { text, score, wordCount } = req.body;

  try {
    const newReport = new Report({
      userId: req.userId,
      text,
      score,
      wordCount,
    });
    await newReport.save();
    res.status(201).json(newReport);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/reports', auth, async (req: any, res: any) => {
  try {
    const reports = await Report.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.status(200).json(reports);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/', (req, res) => res.send('API is running'));

app.listen(PORT, () => console.log(`Server on port ${PORT}`));
