// ============ DOM ELEMENTS ============
const editModal = document.getElementById('editModal');
const editMessage = document.getElementById('editMessage');
const searchBox = document.getElementById('searchBox');
const votesContainer = document.getElementById('votesContainer');
const totalVotesCount = document.getElementById('totalVotesCount');
const candidateStatsGrid = document.getElementById('candidateStatsGrid');

// ============ GLOBAL VARIABLES ============
let adminPassword = '';
let currentEditVoteId = '';
let allVotes = [];

// ============ CHECK ADMIN ACCESS ============
window.addEventListener('DOMContentLoaded', async () => {
  adminPassword = sessionStorage.getItem('adminPassword');

  if (!adminPassword) {
    const params = new URLSearchParams(window.location.search);
    const autoToken = params.get('autotoken');

    if (autoToken) {
      // Auto-login from QR code — decode the token and validate
      try {
        const decoded = atob(autoToken);
        const resp = await fetch('/api/verify-token?password=' + encodeURIComponent(decoded) + '&type=admin');
        const data = await resp.json();
        if (data.valid) {
          sessionStorage.setItem('adminPassword', decoded);
          adminPassword = decoded;
          // Remove the token from URL (clean URL) then continue loading
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        } else {
          // Token invalid — show password prompt instead of redirecting
          showAdminLoginOverlay();
          return;
        }
      } catch (e) {
        console.warn('QR validation failed:', e);
        showAdminLoginOverlay();
        return;
      }
    } else {
      // Direct access or no valid token — just show password prompt
      showAdminLoginOverlay();
      return;
    }
  }

  // Load all votes and check voting mode on startup
  await Promise.all([loadAllVotes(), checkVotingMode()]);

  // Search functionality
  searchBox.addEventListener('input', filterVotes);
  
  // Rapid Auto-Refresh (Every 5 seconds for live feedback)
  setInterval(loadAllVotes, 5000);

  // Check voting mode every 10 seconds
  setInterval(checkVotingMode, 10000);
});

// ============ INLINE LOGIN OVERLAY (triggered by QR scan) ============
function showAdminLoginOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'adminQRLoginOverlay';
  overlay.style.cssText = `
    position: fixed; inset: 0;
    background: rgba(4,9,26,0.96);
    backdrop-filter: blur(20px);
    z-index: 10001;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Outfit', sans-serif; padding: 20px;
    animation: fadeIn 0.4s ease;
  `;
  overlay.innerHTML = `
    <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(37,99,235,0.3); padding: 40px 36px; border-radius: 28px; max-width: 420px; width: 100%; text-align: center; box-shadow: 0 30px 80px rgba(0,0,0,0.6);">
      <div style="font-size: 3.5rem; margin-bottom: 16px;">🛡️</div>
      <h2 style="font-size: 1.6rem; font-weight: 800; color: #fff; margin-bottom: 8px;">Admin Access</h2>
      <p style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 28px;">Enter your admin password to continue.</p>
      <input id="qrAdminPasswordInput" type="password" placeholder="Admin password"
        style="width: 100%; padding: 14px 18px; border-radius: 12px; border: 1px solid rgba(37,99,235,0.4); background: rgba(255,255,255,0.06); color: #fff; font-size: 1rem; font-family: 'Outfit', sans-serif; margin-bottom: 16px; outline: none; box-sizing: border-box;"
        onkeydown="if(event.key==='Enter') submitAdminQRLogin()">
      <div id="qrAdminMsg" style="color: #f43f5e; font-size: 0.85rem; margin-bottom: 12px; min-height: 20px;"></div>
      <button onclick="submitAdminQRLogin()"
        style="width: 100%; padding: 14px; border-radius: 12px; background: linear-gradient(135deg,#2563eb,#1d4ed8); color: #fff; font-weight: 800; font-size: 1rem; border: none; cursor: pointer; font-family: 'Outfit', sans-serif; transition: opacity 0.2s;">
        Enter Admin Panel ▶
      </button>
    </div>
    <style>@keyframes fadeIn { from {opacity:0;} to {opacity:1;} }</style>
  `;
  document.body.appendChild(overlay);
  setTimeout(() => {
    const inp = document.getElementById('qrAdminPasswordInput');
    if (inp) inp.focus();
  }, 300);
}

async function submitAdminQRLogin() {
  const input = document.getElementById('qrAdminPasswordInput');
  const msg   = document.getElementById('qrAdminMsg');
  const pwd   = input ? input.value.trim() : '';

  if (!pwd) { if (msg) msg.textContent = 'Please enter the password.'; return; }

  // Verify by calling the API with this password
  try {
    const resp = await fetch('/api/votes', {
      headers: { 'x-admin-password': pwd }
    });
    if (resp.ok || resp.status === 200) {
      // Valid — store and reload to enter the dashboard
      sessionStorage.setItem('adminPassword', pwd);
      window.location.reload();
    } else {
      if (msg) msg.textContent = '❌ Incorrect password. Try again.';
      if (input) { input.value = ''; input.focus(); }
    }
  } catch (e) {
    if (msg) msg.textContent = '❌ Network error. Please try again.';
  }
}

// ============ VOTING SESSION CONTROL ============

async function checkVotingMode() {
  try {
    const resp = await fetch('/api/voting-mode');
    if (!resp.ok) return;
    const { votingStarted } = await resp.json();
    updateVotingModeUI(votingStarted);
  } catch (e) {
    console.warn('Could not fetch voting mode');
  }
}

function updateVotingModeUI(isStarted) {
  const badge = document.getElementById('votingModeBadge');
  const desc  = document.getElementById('votingModeDesc');
  const startBtn = document.getElementById('startVotingBtn');
  const stopBtn  = document.getElementById('stopVotingBtn');
  const card  = document.getElementById('votingControlCard');

  if (isStarted) {
    if (badge) { badge.textContent = '● LIVE'; badge.className = 'vc-badge vc-badge-live'; }
    if (desc)  desc.textContent = 'Voting is open. Students can cast their votes now.';
    if (startBtn) startBtn.disabled = true;
    if (stopBtn)  stopBtn.disabled  = false;
    if (card)  card.classList.add('vc-card-live');
    if (card)  card.classList.remove('vc-card-stopped');
  } else {
    if (badge) { badge.textContent = '○ NOT STARTED'; badge.className = 'vc-badge vc-badge-stopped'; }
    if (desc)  desc.textContent = 'Pre-voting mode. Students can see candidates and generate QR.';
    if (startBtn) startBtn.disabled = false;
    if (stopBtn)  stopBtn.disabled  = true;
    if (card)  card.classList.add('vc-card-stopped');
    if (card)  card.classList.remove('vc-card-live');
  }
}

async function setVotingMode(started) {
  const startBtn = document.getElementById('startVotingBtn');
  const stopBtn  = document.getElementById('stopVotingBtn');
  const vcMsg    = document.getElementById('vcMsg');

  if (startBtn) startBtn.disabled = true;
  if (stopBtn)  stopBtn.disabled  = true;
  if (vcMsg)  { vcMsg.textContent = '⏳ Updating…'; vcMsg.className = 'vc-msg vc-msg-pending'; }

  try {
    const resp = await fetch('/api/set-voting-mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: adminPassword, started })
    });
    const data = await resp.json();

    if (resp.ok && data.success) {
      updateVotingModeUI(data.votingStarted);
      const msg = data.votingStarted
        ? '✅ Voting session started! The full site is now visible to students.'
        : '⏹ Voting session stopped. Site is back to pre-voting mode.';
      if (vcMsg) { vcMsg.textContent = msg; vcMsg.className = 'vc-msg vc-msg-success'; }
    } else {
      if (vcMsg) { vcMsg.textContent = '❌ ' + (data.message || 'Update failed.'); vcMsg.className = 'vc-msg vc-msg-error'; }
      // Re-enable buttons on failure
      await checkVotingMode();
    }
  } catch (err) {
    if (vcMsg) { vcMsg.textContent = '❌ Network error. Please try again.'; vcMsg.className = 'vc-msg vc-msg-error'; }
    await checkVotingMode();
  }

  // Clear message after 4 seconds
  setTimeout(() => { if (vcMsg) { vcMsg.textContent = ''; vcMsg.className = 'vc-msg'; } }, 4000);
}



// ============ LOAD ALL VOTES ============
async function loadAllVotes() {
  try {
    // Check server status & connection
    const statusResp = await fetch('/api/admin-status').catch(() => null);
    if (!statusResp) {
      showErrorInContainer('Server unreachable. Please check your internet connection.');
      return;
    }

    const status = await statusResp.json();
    if (!statusResp.ok || !status.configured) {
      showErrorInContainer('Admin panel is not configured on this server');
      setTimeout(() => { window.location.href = '/'; }, 3000);
      return;
    }

    const response = await fetch(`/api/all-votes?password=${encodeURIComponent(adminPassword)}`);
    const data = await response.json();

    if (response.ok) {
      allVotes = data.votes || [];
      totalVotesCount.textContent = data.totalVotes || 0;
      displayVotes(allVotes);
      updateCandidateStats(allVotes);
    } else {
      // Handle unauthorized vs other errors
      if (response.status === 401) {
        showError('Session invalid or expired. Please login again.');
        setTimeout(() => logout(), 1500);
      } else {
        showErrorInContainer('Database error: ' + (data.message || 'Unknown error'));
      }
    }
  } catch (error) {
    console.error('Error:', error);
    showErrorInContainer('Error loading database. Please refresh the page.');
  }
}

// ============ DISPLAY VOTES ============
function displayVotes(votes) {
  if (votes.length === 0) {
    votesContainer.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">No votes yet</p>';
    return;
  }

  let html = '<table>';
  html += '<thead><tr>';
  html += '<th style="width: 30%;">Candidate</th>';
  html += '<th style="width: 20%;">Roll No</th>';
  html += '<th style="width: 20%;">Voter ID</th>';
  html += '<th style="width: 25%;">Time</th>';
  html += '<th style="width: 15%;">Actions</th>';
  html += '</tr></thead>';
  html += '<tbody>';

  votes.forEach((vote) => {
    html += `<tr>
      <td>${escapeHtml(vote.option)}</td>
      <td>${escapeHtml(vote.name)}</td>
      <td>${escapeHtml(vote.voterId || '')}</td>
      <td>${new Date(vote.timestamp).toLocaleString()}</td>
      <td>
        <div class="actions">
          <button class="edit-btn" onclick="openEditVote('${vote.id}', '${escapeAttr(vote.option)}', '${escapeAttr(vote.name)}', '${escapeAttr(vote.voterId || '')}')">Edit</button>
          <button class="delete-btn" onclick="deleteVote('${vote.id}')">Delete</button>
        </div>
      </td>
    </tr>`;
  });

  html += '</tbody></table>';
  votesContainer.innerHTML = html;
}

// ============ UPDATE CANDIDATE STATS ============
function updateCandidateStats(votes) {
  if (!candidateStatsGrid) return;

  const stats = {};
  votes.forEach(vote => {
    const candidate = vote.option;
    stats[candidate] = (stats[candidate] || 0) + 1;
  });

  // Sort candidates by vote count (descending)
  const sortedCandidates = Object.entries(stats).sort((a, b) => b[1] - a[1]);

  let html = '';
  sortedCandidates.forEach(([name, count]) => {
    html += `
      <div class="candidate-stat-card">
        <div class="stat-card-glow"></div>
        <div class="candidate-avatar">
          <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2563EB&color=fff" alt="${name}">
        </div>
        <div class="stat-info">
          <h3>${escapeHtml(name)}</h3>
          <div class="vote-count-badge">
            <span class="count">${count}</span>
            <span class="label">Votes</span>
          </div>
        </div>
      </div>
    `;
  });

  if (html === '') {
    candidateStatsGrid.innerHTML = '<p style="color: var(--text-secondary); grid-column: 1/-1; text-align: center;">No data available</p>';
  } else {
    candidateStatsGrid.innerHTML = html;
  }
}

// ============ FILTER VOTES BY SEARCH ============
function filterVotes() {
  const searchTerm = searchBox.value.toLowerCase();
  const filtered = allVotes.filter(vote =>
    vote.option.toLowerCase().includes(searchTerm) ||
    vote.name.toLowerCase().includes(searchTerm) ||
    (vote.voterId || '').toLowerCase().includes(searchTerm)
  );
  displayVotes(filtered);
}

// ============ EDIT VOTE ============
function openEditVote(voteId, candidateName, voterName, voterId) {
  currentEditVoteId = voteId;
  document.getElementById('editCandidate').value = candidateName;
  document.getElementById('editVoter').value = voterName;
  document.getElementById('editVoterId').value = voterId || '';
  editModal.style.display = 'flex';
  editMessage.style.display = 'none';
  document.getElementById('editCandidate').focus();
}

function closeEditModal() {
  editModal.style.display = 'none';
  editMessage.style.display = 'none';
  currentEditVoteId = '';
}

async function saveEditVote() {
  const candidate = document.getElementById('editCandidate').value.trim();
  const voter = document.getElementById('editVoter').value.trim();
  const voterId = document.getElementById('editVoterId').value.trim();

  if (!candidate || !voter) {
    showEditError('Please fill in all fields');
    return;
  }

  try {
    const response = await fetch(`/api/vote/${currentEditVoteId}?password=${encodeURIComponent(adminPassword)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        option: candidate,
        name: voter,
        voterId: voterId
      })
    });

    const data = await response.json();

    if (response.ok) {
      showEditSuccess('Vote updated successfully!');
      setTimeout(() => {
        closeEditModal();
        loadAllVotes();
      }, 1500);
    } else {
      showEditError(data.message || 'Error updating vote');
    }
  } catch (error) {
    showEditError('Error: Unable to update vote');
    console.error('Error:', error);
  }
}

function showEditError(message) {
  editMessage.textContent = '✗ ' + message;
  editMessage.className = 'message error';
  editMessage.style.display = 'block';
}

function showEditSuccess(message) {
  editMessage.textContent = '✓ ' + message;
  editMessage.className = 'message success';
  editMessage.style.display = 'block';
}

// ============ DELETE VOTE ============
async function deleteVote(voteId) {
  if (!confirm('Are you sure you want to delete this vote?')) {
    return;
  }

  try {
    const response = await fetch(`/api/vote/${voteId}?password=${encodeURIComponent(adminPassword)}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (response.ok) {
      loadAllVotes();
    } else {
      alert(data.message || 'Error deleting vote');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error: Unable to delete vote');
  }
}

// ============ LOGOUT ============
function logout() {
  sessionStorage.removeItem('adminPassword');
  window.location.href = '/';
}

// ============ HELPER FUNCTIONS ============
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function escapeAttr(text) {
  return text.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function showError(message) {
  const msgDiv = document.createElement('div');
  msgDiv.className = 'message error';
  msgDiv.textContent = '✗ ' + message;
  msgDiv.style.position = 'fixed';
  msgDiv.style.top = '20px';
  msgDiv.style.right = '20px';
  msgDiv.style.zIndex = '999';
  msgDiv.style.maxWidth = '400px';
  document.body.appendChild(msgDiv);

  setTimeout(() => msgDiv.remove(), 4000);
}

function showErrorInContainer(message) {
  votesContainer.innerHTML = `<p style="text-align: center; color: #d32f2f; padding: 40px;">Error: ${message}</p>`;
}

// ============ CLOSE MODAL ON OUTSIDE CLICK ============
window.addEventListener('click', (e) => {
  if (e.target === editModal) {
    closeEditModal();
  }
});

// ============ DELETE ALL VOTES ============
async function confirmDeleteAllVotes() {
  const confirmation = prompt('⚠️ WARNING: This will PERMANENTLY delete all recorded votes. This action cannot be undone.\n\nTo proceed, type "DELETE" below:');
  
  if (confirmation !== 'DELETE') {
    if (confirmation !== null) {
      alert('Delete action aborted. You must type exactly "DELETE" to confirm.');
    }
    return;
  }

  const btn = document.getElementById('deleteAllBtn');
  const originalText = btn.innerHTML;
  btn.innerHTML = '🗑️ Deleting...';
  btn.disabled = true;

  try {
    const response = await fetch('/api/votes/all', {
      method: 'DELETE',
      headers: { 'x-admin-password': adminPassword }
    });

    const data = await response.json();

    if (response.ok) {
      alert('✅ All votes have been successfully deleted.');
      loadAllVotes(); // Refresh UI to show empty state
    } else {
      alert(`❌ Failed to delete votes: ${data.message || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error deleting all votes:', error);
    alert('❌ A network error occurred while trying to delete votes.');
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}
