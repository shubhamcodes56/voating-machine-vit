// ============ DOM ELEMENTS ============
const searchBox = document.getElementById('searchBox');
const votesContainer = document.getElementById('votesContainer');
const totalVotesCount = document.getElementById('totalVotesCount');
const votingStatusLabel = document.getElementById('votingStatusLabel');
const stopVotingBtn = document.getElementById('stopVotingBtn');
const startVotingBtn = document.getElementById('startVotingBtn');

// ============ GLOBAL VARIABLES ============
let monitorPassword = '';
let allVotes = [];

// ============ CHECK MONITOR ACCESS ============
window.addEventListener('DOMContentLoaded', async () => {
    // Get password from sessionStorage
    monitorPassword = sessionStorage.getItem('monitorPassword');

    if (!monitorPassword) {
        console.warn('No monitoring session found. Redirecting...');
        window.location.href = '/?msg=session_expired';
        return;
    }

    // Load all votes immediately
    await loadAllVotes();

    // Check voting status
    await checkVotingStatus();

    // Search functionality
    searchBox.addEventListener('input', filterVotes);

    // Rapid Auto-Refresh (Every 5 seconds for live feedback)
    setInterval(loadAllVotes, 5000);
});

// ============ CHECK VOTING STATUS ============
async function checkVotingStatus() {
    try {
        const response = await fetch('/api/voting-status');
        const data = await response.json();
        updateVotingUI(data.isVotingActive);
    } catch (err) {
        console.error('Error checking voting status:', err);
    }
}

function updateVotingUI(isActive) {
    if (isActive) {
        votingStatusLabel.textContent = 'Live';
        votingStatusLabel.className = 'status-badge live';
        stopVotingBtn.style.display = 'inline-block';
        startVotingBtn.style.display = 'none';
    } else {
        votingStatusLabel.textContent = 'Stopped';
        votingStatusLabel.className = 'status-badge stopped';
        stopVotingBtn.style.display = 'none';
        startVotingBtn.style.display = 'inline-block';
    }
}

// ============ TOGGLE VOTING ============
async function toggleVoting(active) {
    const action = active ? 'start' : 'stop';
    if (!confirm(`Are you sure you want to ${action} voting?`)) return;

    try {
        const response = await fetch('/api/toggle-voting', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                password: monitorPassword,
                active: active
            })
        });

        const data = await response.json();
        if (response.ok) {
            updateVotingUI(data.isVotingActive);
            const msg = active ? 'Voting has been resumed.' : 'Voting has been stopped.';
            showSuccess(msg);
        } else {
            showError(data.message || 'Failed to toggle voting status.');
        }
    } catch (error) {
        console.error('Error:', error);
        showError('Network error. Please try again.');
    }
}

// ============ LOAD ALL VOTES ============
async function loadAllVotes() {
    try {
        const response = await fetch(`/api/all-votes?password=${encodeURIComponent(monitorPassword)}`).catch(() => null);
        if (!response) {
            showErrorInContainer('Server unreachable. Please check your internet connection.');
            return;
        }

        const data = await response.json();

        if (response.ok) {
            allVotes = data.votes || [];
            totalVotesCount.textContent = data.totalVotes || 0;
            displayVotes(allVotes);
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
        showErrorInContainer('Error loading live data. Please refresh.');
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
    html += '<th style="width: 35%;">Candidate</th>';
    html += '<th style="width: 25%;">Roll No</th>';
    html += '<th style="width: 20%;">Voter ID</th>';
    html += '<th style="width: 20%;">Time</th>';
    html += '</tr></thead>';
    html += '<tbody>';

    votes.forEach((vote) => {
        html += `<tr>
      <td>${escapeHtml(vote.option)}</td>
      <td>${escapeHtml(vote.name)}</td>
      <td>${escapeHtml(vote.voterId || '')}</td>
      <td>${new Date(vote.timestamp).toLocaleString()}</td>
    </tr>`;
    });

    html += '</tbody></table>';
    votesContainer.innerHTML = html;
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

// ============ LOGOUT ============
function logout() {
    sessionStorage.removeItem('monitorPassword');
    window.location.href = '/';
}

// ============ HELPER FUNCTIONS ============
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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

function showSuccess(message) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message success';
    msgDiv.textContent = '✓ ' + message;
    msgDiv.style.position = 'fixed';
    msgDiv.style.top = '20px';
    msgDiv.style.right = '20px';
    msgDiv.style.zIndex = '999';
    msgDiv.style.maxWidth = '400px';
    msgDiv.style.padding = '12px 20px';
    msgDiv.style.borderRadius = '8px';
    msgDiv.style.backgroundColor = '#4caf50';
    msgDiv.style.color = 'white';
    msgDiv.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
    document.body.appendChild(msgDiv);

    setTimeout(() => msgDiv.remove(), 4000);
}
