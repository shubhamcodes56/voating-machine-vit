const express = require('express');
const path = require('path');
const fs = require('fs');
// Load admin password and voter IDs safely so server can start
// even if `config/config.js` is missing (e.g., when it's gitignored).
let ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'shubham220';
let MONITOR_PASSWORD = process.env.MONITOR_PASSWORD || 'party2026';
try {
  const cfg = require('./config/config');
  if (cfg && cfg.ADMIN_PASSWORD) ADMIN_PASSWORD = cfg.ADMIN_PASSWORD;
  if (cfg && cfg.MONITOR_PASSWORD) MONITOR_PASSWORD = cfg.MONITOR_PASSWORD;
} catch (err) {
  // no config file
}

let VALID_VOTER_IDS = new Set();
try {
  const v = require('./config/voterIds');
  if (v && Array.isArray(v.VALID_VOTER_IDS)) {
    VALID_VOTER_IDS = new Set(v.VALID_VOTER_IDS);
  }
} catch (err) {
  // no voterIds file
}

const app = express();
const PORT = 3000;

// ============ MIDDLEWARE ============
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============ DATA & CONFIG ============
const mongoose = require('mongoose');

// Connect to MongoDB (Defaulting to localhost unless process.env.MONGODB_URI is provided)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/voting_machine';

// Proper connection caching for Vercel serverless: use Mongoose's readyState
// readyState: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
const connectDB = async () => {
  const state = mongoose.connection.readyState;
  if (state === 1 || state === 2) {
    // Already connected or connecting — reuse it
    return;
  }
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    });
    console.log('✅ Connected to MongoDB successfully');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    throw err; // Let middleware handle it
  }
};

// Middleware: ensure DB is connected for all /api routes, return 503 on failure
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api')) {
    try {
      await connectDB();
    } catch (err) {
      return res.status(503).json({
        message: 'Database connection failed. Error: ' + err.message
      });
    }
  }
  next();
});

// ============ STATIC FILES ============
// Vercel automatically serves the public folder, but for local dev:
app.use(express.static(path.join(__dirname, '../public')));

// Home - Send voting page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Define Vote Schema and Model
const voteSchema = new mongoose.Schema({
  option: { type: String, required: true },
  name: { type: String, required: true, unique: true }, // Roll No (Unique constraint prevents double voting)
  voterId: { type: String, required: true, unique: true }, // Unique constraint prevents double voting
  votedAt: { type: String, default: () => new Date().toLocaleString() }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt Date fields 
});

const Vote = mongoose.model('Vote', voteSchema);

// ============ ROUTES ============

// Admin - Send admin dashboard
app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Monitor - Send monitoring dashboard
app.get('/monitor.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'monitor.html'));
});

// QR Generator - Send QR code generator page
app.get('/qr.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'qr.html'));
});

// Kiosk QR Scanner
app.get('/scan', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'scan.html'));
});
app.get('/scan.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'scan.html'));
});

// Normalize voter ID: accept "0001" (from ultra-simple QR) or "VID0001" / "VID5000" (full format)
// Supports up to VID5000 (4-digit numeric part)
function normalizeVoterId(id) {
  if (!id) return id;
  const s = id.toString().trim().toUpperCase();
  // If purely numeric, prepend VID with 4-digit padding
  if (/^\d+$/.test(s)) return 'VID' + s.padStart(4, '0');
  return s;
}

// API: Verify Voter ID
app.post('/api/verify-voter-id', async (req, res) => {
  try {
    const raw = req.body.voterId;
    const voterId = normalizeVoterId(raw);

    if (!voterId) {
      return res.status(400).json({ message: 'Voter ID is required' });
    }

    // If a list of valid voter IDs exists, enforce it (O(1) Set lookup)
    if (VALID_VOTER_IDS.size > 0) {
      if (!VALID_VOTER_IDS.has(voterId)) {
        return res.status(401).json({ message: 'Invalid Voter ID: ' + voterId });
      }
    }

    // Check if this voter ID has already voted in MongoDB
    const existingVote = await Vote.findOne({ voterId: voterId });

    if (existingVote) {
      return res.status(409).json({ message: 'You have already voted with this Voter ID' });
    }

    res.json({
      success: true,
      message: 'Voter ID verified successfully!',
      voterId: voterId  // always return normalized format
    });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// API: Submit a vote
app.post('/api/vote', async (req, res) => {
  try {
    const { option, name } = req.body;
    const voterId = normalizeVoterId(req.body.voterId);

    if (!option) {
      return res.status(400).json({ message: 'Candidate is required' });
    }

    if (!name) {
      return res.status(400).json({ message: 'Roll No is required' });
    }

    if (!voterId) {
      return res.status(400).json({ message: 'Voter ID is required' });
    }

    // Attempt to create the vote. If it violates uniqueness, MongoDB throws a 11000 error
    const newVote = await Vote.create({
      option,
      name,
      voterId
    });

    const totalVotes = await Vote.countDocuments();

    res.json({
      message: 'Vote recorded successfully!',
      totalVotes: totalVotes,
      vote: {
        id: newVote._id,
        option: newVote.option,
        name: newVote.name,
        voterId: newVote.voterId,
        timestamp: newVote.createdAt,
        votedAt: newVote.votedAt
      }
    });

  } catch (error) {
    // Handle specific MongoDB Duplicate Key Error
    if (error.code === 11000) {
      if (error.keyValue.name) {
        return res.status(409).json({ message: 'A vote from this Roll No has already been recorded' });
      } else if (error.keyValue.voterId) {
        return res.status(409).json({ message: 'A vote from this Voter ID has already been recorded' });
      }
    }
    console.error('Vote error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// API: Get vote statistics
app.get('/api/stats', async (req, res) => {
  try {
    // Use MongoDB aggregation framework to quickly count votes by option
    const statsData = await Vote.aggregate([
      { $group: { _id: "$option", count: { $sum: 1 } } }
    ]);

    let totalVotes = 0;
    const stats = {};

    statsData.forEach(item => {
      stats[item._id] = item.count;
      totalVotes += item.count;
    });

    res.json({
      totalVotes: totalVotes,
      stats: stats,
      options: statsData.length
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// API: Admin status (clients can check whether admin features are configured)
app.get('/api/admin-status', (req, res) => {
  try {
    res.json({ configured: Boolean(ADMIN_PASSWORD && ADMIN_PASSWORD.length > 0) });
  } catch (error) {
    console.error('Admin status error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// API: Get all votes (PASSWORD PROTECTED - ADMIN ONLY)
app.get('/api/all-votes', async (req, res) => {
  try {
    // If admin password is not configured, return 503 so clients know admin isn't available
    if (!ADMIN_PASSWORD) {
      return res.status(503).json({ message: 'Admin not configured on this server' });
    }

    const password = req.query.password;
    const isMonitor = password === MONITOR_PASSWORD;
    const isAdmin = password === ADMIN_PASSWORD;

    if (!password || (!isAdmin && !isMonitor)) {
      return res.status(401).json({ message: 'Unauthorized! Invalid password' });
    }

    const dbVotes = await Vote.find().sort({ createdAt: -1 });

    const votes = dbVotes.map(v => ({
      id: v._id,
      option: v.option,
      name: v.name,
      voterId: v.voterId,
      timestamp: v.createdAt,
      votedAt: v.votedAt
    }));

    res.json({
      totalVotes: votes.length,
      votes: votes
    });
  } catch (error) {
    console.error('Get all votes error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// API: Delete a vote (PASSWORD PROTECTED - ADMIN ONLY)
app.delete('/api/vote/:id', async (req, res) => {
  try {
    if (!ADMIN_PASSWORD) {
      return res.status(503).json({ message: 'Admin not configured on this server' });
    }

    const password = req.query.password;

    if (!password || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ message: 'Unauthorized! Invalid password' });
    }

    const deletedDbVote = await Vote.findByIdAndDelete(req.params.id);

    if (!deletedDbVote) {
      return res.status(404).json({ message: 'Vote not found' });
    }

    const totalVotes = await Vote.countDocuments();

    res.json({
      message: 'Vote deleted successfully!',
      deletedVote: {
        id: deletedDbVote._id,
        option: deletedDbVote.option,
        name: deletedDbVote.name,
        voterId: deletedDbVote.voterId
      },
      totalVotes: totalVotes
    });
  } catch (error) {
    console.error('Delete vote error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// API: Edit a vote (PASSWORD PROTECTED - ADMIN ONLY)
app.put('/api/vote/:id', async (req, res) => {
  try {
    if (!ADMIN_PASSWORD) {
      return res.status(503).json({ message: 'Admin not configured on this server' });
    }

    const password = req.query.password;

    if (!password || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ message: 'Unauthorized! Invalid password' });
    }

    const { option, name, voterId } = req.body;

    if (!option || !name || !voterId) {
      return res.status(400).json({ message: 'Candidate, voter name and voter ID are required' });
    }

    const updatedDbVote = await Vote.findByIdAndUpdate(
      req.params.id,
      { option, name, voterId, votedAt: new Date().toLocaleString() },
      { new: true, runValidators: true }
    );

    if (!updatedDbVote) {
      return res.status(404).json({ message: 'Vote not found' });
    }

    res.json({
      message: 'Vote updated successfully!',
      vote: {
        id: updatedDbVote._id,
        option: updatedDbVote.option,
        name: updatedDbVote.name,
        voterId: updatedDbVote.voterId,
        timestamp: updatedDbVote.createdAt,
        votedAt: updatedDbVote.votedAt
      }
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Another vote with this Roll No or Voter ID already exists' });
    }
    console.error('Update vote error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// ============ 404 HANDLER ============
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found!' });
});

// ============ SERVER START ============
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`\n🚀 Voting Machine Server running at http://localhost:${PORT}`);
    console.log(`📊 Valid Voter IDs loaded: ${VALID_VOTER_IDS.size}`);
    
    // Production Readiness Checks
    if (ADMIN_PASSWORD === 'shubham220') {
      console.warn('⚠️ WARNING: Using default ADMIN_PASSWORD. Change it for production!');
    }
    if (!process.env.MONGODB_URI) {
      console.log('ℹ️ Tip: Set MONGODB_URI env var for cloud database hosting.\n');
    }
  });
}

// Export the app for Vercel Serverless Functions
module.exports = app;
