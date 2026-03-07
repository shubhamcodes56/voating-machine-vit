# 🎓 CampusVote: Electronic Voting Machine Server (VIT)

An secure, lightweight, Express.js-based local polling and voting system designed for student elections, class representatives (CRs), and club board elections. This system ensures security by requiring both a **Roll No** and a **Voter ID**, and includes an Admin Dashboard for managing the election safely.

## ✨ Features

- **Double Verification:** Requires both a Candidate's Roll No and a unique Voter ID to cast a vote.
- **Duplicate Prevention:** Strict checks to ensure a single Voter ID or Roll No cannot vote more than once.
- **Pre-Approved Voters List:** Admins can optionally provide a rigid list of valid Voter IDs (`config/voterIds.js`).
- **Admin Dashboard:** A password-protected panel to view real-time statistics, delete invalid votes, or correct entries.
- **Local JSON Storage:** Votes are securely stored in a local `votes.json` file—perfect for temporary or closed-network polling without the overhead of a full database.
- **Clean UI:** Responsive, easy-to-use HTML/CSS front-end for voters to cast their ballots quickly.

## 🚀 Quick Start

### 1. Install Dependencies
Make sure you have [Node.js](https://nodejs.org/) installed, then run:
```bash
npm install
```

### 2. Configuration (Optional but Recommended)
For extra security, you can create a `config` folder with the following files:

**`config/config.js`** (For Admin Dashboard Password)
```javascript
module.exports = {
  ADMIN_PASSWORD: 'your-secure-password'
};
```

**`config/voterIds.js`** (To restrict voting to specific IDs)
```javascript
module.exports = {
  VALID_VOTER_IDS: ['VID001', 'VID002', 'VID003']
};
```
*(Note: If these aren't set, the server will fall back to environment variables or open voting to make testing easier.)*

### 3. Run the Server
```bash
npm start
```
The server will start at **http://localhost:3000** by default.

## 📊 Endpoints

- `GET /` - Voting interface
- `GET /admin.html` - Admin Dashboard
- `POST /api/verify-voter-id` - Verifies if a Voter ID is valid and hasn't voted yet.
- `POST /api/vote` - Submits a vote.
- `GET /api/stats` - Public/Private vote statistics.
- `GET /api/all-votes` - (Admin only) View all vote records.
- `DELETE /api/vote/:id` - (Admin only) Delete a specific vote.
- `PUT /api/vote/:id` - (Admin only) Edit a specific vote.

## 🛠️ Built With

- **Backend:** Node.js, Express.js
- **Frontend:** Vanilla HTML, CSS, JavaScript
- **Data Storage:** Local JSON file (`votes.json`)

## 🎯 Target Audience

Designed specifically for educational institutions (like VIT), small to medium student organizations, and faculty members needing a fast, anonymous, and verifiable polling system for internal use.
