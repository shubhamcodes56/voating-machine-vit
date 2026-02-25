const express = require('express');
const path = require('path');
const fs = require('fs');
// Load admin password and voter IDs safely so server can start
// even if `config/config.js` is missing (e.g., when it's gitignored).
let ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
let VALID_VOTER_IDS = [];

try {
  const cfg = require('./config/config');
  if (cfg && cfg.ADMIN_PASSWORD) ADMIN_PASSWORD = cfg.ADMIN_PASSWORD;
} catch (err) {
  // no config file — continue using env or empty password
}

try {
  const v = require('./config/voterIds');
  if (v && Array.isArray(v.VALID_VOTER_IDS)) VALID_VOTER_IDS = v.VALID_VOTER_IDS;
} catch (err) {
  // no voterIds file — VALID_VOTER_IDS stays empty
}

const app = express();
const PORT = 3000;

// ============ MIDDLEWARE ============
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============ DATA & CONFIG ============
const VOTES_FILE = path.join(__dirname, 'votes.json');

// Helper functions for votes
function readVotes() {
  if (!fs.existsSync(VOTES_FILE)) {
    fs.writeFileSync(VOTES_FILE, JSON.stringify([]));
  }
  return JSON.parse(fs.readFileSync(VOTES_FILE, 'utf8'));
}

function saveVotes(votes) {
  fs.writeFileSync(VOTES_FILE, JSON.stringify(votes, null, 2));
}

// ============ ROUTES ============

// Home - Send voting page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Admin - Send admin dashboard
app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// API: Verify Voter ID
app.post('/api/verify-voter-id', (req, res) => {
  try {
    const { voterId } = req.body;

    if (!voterId) {
      return res.status(400).json({ message: 'Voter ID is required' });
    }

    // If a list of valid voter IDs exists, enforce it. If not, allow any
    // voterId so contributors can run the server without creating config.
    if (Array.isArray(VALID_VOTER_IDS) && VALID_VOTER_IDS.length > 0) {
      if (!VALID_VOTER_IDS.includes(voterId)) {
        return res.status(401).json({ message: 'Invalid Voter ID' });
      }
    }

    // Check if this voter ID has already voted
    const votes = readVotes();
    const alreadyVoted = votes.some(v => v.voterId === voterId);

    if (alreadyVoted) {
      return res.status(409).json({ message: 'You have already voted with this Voter ID' });
    }

    res.json({ 
      success: true,
      message: 'Voter ID verified successfully!',
      voterId: voterId
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// API: Submit a vote
app.post('/api/vote', (req, res) => {
  try {
    const { option, name, voterId } = req.body;

    if (!option) {
      return res.status(400).json({ message: 'Candidate is required' });
    }

    if (!name) {
      return res.status(400).json({ message: 'Roll No is required' });
    }

    if (!voterId) {
      return res.status(400).json({ message: 'Voter ID is required' });
    }

    const votes = readVotes();

    // Check if this roll no has already voted (prevent duplicate roll no voting)
    const rollNoDuplicate = votes.some(v => v.name === name);
    if (rollNoDuplicate) {
      return res.status(409).json({ message: 'A vote from this Roll No has already been recorded' });
    }

    // Check if this voter ID has already voted
    const alreadyVoted = votes.some(v => v.voterId === voterId);
    if (alreadyVoted) {
      return res.status(409).json({ message: 'A vote from this Voter ID has already been recorded' });
    }
    
    // Add new vote
    const vote = {
      id: Date.now().toString(),
      option,
      name, // Roll No
      voterId,
      timestamp: new Date().toISOString(),
      votedAt: new Date().toLocaleString()
    };


    votes.push(vote);
    saveVotes(votes);

    res.json({ 
      message: 'Vote recorded successfully!',
      totalVotes: votes.length,
      vote: vote
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// API: Get vote statistics
app.get('/api/stats', (req, res) => {
  try {
    const votes = readVotes();
    
    // Count votes by option
    const stats = {};
    votes.forEach(vote => {
      stats[vote.option] = (stats[vote.option] || 0) + 1;
    });

    res.json({
      totalVotes: votes.length,
      stats: stats,
      options: Object.keys(stats).length
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// API: Admin status (clients can check whether admin features are configured)
app.get('/api/admin-status', (req, res) => {
  try {
    res.json({ configured: Boolean(ADMIN_PASSWORD && ADMIN_PASSWORD.length > 0) });
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// API: Get all votes (PASSWORD PROTECTED - ADMIN ONLY)
app.get('/api/all-votes', (req, res) => {
  try {
    // If admin password is not configured, return 503 so clients know admin isn't available
    if (!ADMIN_PASSWORD) {
      return res.status(503).json({ message: 'Admin not configured on this server' });
    }

    const password = req.query.password;

    if (!password || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ message: 'Unauthorized! Invalid password' });
    }

    const votes = readVotes();
    
    res.json({
      totalVotes: votes.length,
      votes: votes
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// API: Delete a vote (PASSWORD PROTECTED - ADMIN ONLY)
app.delete('/api/vote/:id', (req, res) => {
  try {
    if (!ADMIN_PASSWORD) {
      return res.status(503).json({ message: 'Admin not configured on this server' });
    }

    const password = req.query.password;

    if (!password || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ message: 'Unauthorized! Invalid password' });
    }

    const votes = readVotes();
    const voteIndex = votes.findIndex(v => v.id === req.params.id);

    if (voteIndex === -1) {
      return res.status(404).json({ message: 'Vote not found' });
    }

    const deletedVote = votes.splice(voteIndex, 1)[0];
    saveVotes(votes);

    res.json({ 
      message: 'Vote deleted successfully!',
      deletedVote: deletedVote,
      totalVotes: votes.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// API: Edit a vote (PASSWORD PROTECTED - ADMIN ONLY)
app.put('/api/vote/:id', (req, res) => {
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

    const votes = readVotes();
    const vote = votes.find(v => v.id === req.params.id);

    if (!vote) {
      return res.status(404).json({ message: 'Vote not found' });
    }

    // Prevent assigning a voterId that already exists on a different vote
    const conflict = votes.find(v => v.voterId === voterId && v.id !== req.params.id);
    if (conflict) {
      return res.status(409).json({ message: 'Another vote with this Voter ID already exists' });
    }

    // Update vote
    vote.option = option;
    vote.name = name;
    vote.voterId = voterId;
    vote.updatedAt = new Date().toISOString();
    saveVotes(votes);

    res.json({ 
      message: 'Vote updated successfully!',
      vote: vote
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// ============ STATIC FILES ============
app.use(express.static(path.join(__dirname, 'public')));

// ============ 404 HANDLER ============
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found!' });
});

// ============ SERVER START ============
app.listen(PORT, () => {
  console.log(`\n🚀 Voting Machine Server running at http://localhost:${PORT}\n`);
  console.log(`📊 Visit http://localhost:${PORT} to vote\n`);
});
