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
    const params = new URLSearchParams(window.location.search);
    const autoToken = params.get('autotoken');

    if (autoToken) {
        // Auto-login from QR code — decode the token and validate FIRST, overriding session
        try {
            const decoded = atob(autoToken);
            const resp = await fetch('/api/verify-token?password=' + encodeURIComponent(decoded) + '&type=monitor');
            const data = await resp.json();
            if (data.valid) {
                sessionStorage.setItem('monitorPassword', decoded);
                monitorPassword = decoded;
                const cleanUrl = window.location.pathname;
                window.history.replaceState({}, document.title, cleanUrl);
            } else {
                // Token invalid — show password prompt instead of redirecting
                showMonitorLoginOverlay();
                return;
            }
        } catch (e) {
            console.warn('QR validation failed:', e);
            showMonitorLoginOverlay();
            return;
        }
    } else {
        monitorPassword = sessionStorage.getItem('monitorPassword');
        if (!monitorPassword) {
            // Direct access or no valid token — just show password prompt
            showMonitorLoginOverlay();
            return;
        }
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

// ============ INLINE LOGIN OVERLAY (triggered by QR scan) ============
function showMonitorLoginOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'monitorQRLoginOverlay';
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
    <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(245,158,11,0.3); padding: 40px 36px; border-radius: 28px; max-width: 420px; width: 100%; text-align: center; box-shadow: 0 30px 80px rgba(0,0,0,0.6);">
      <div style="font-size: 3.5rem; margin-bottom: 16px;">📊</div>
      <h2 style="font-size: 1.6rem; font-weight: 800; color: #fff; margin-bottom: 8px;">Monitoring Access</h2>
      <p style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 28px;">Enter your monitoring password to continue.</p>
      <input id="qrMonitorPasswordInput" type="password" placeholder="Monitor password"
        style="width: 100%; padding: 14px 18px; border-radius: 12px; border: 1px solid rgba(245,158,11,0.4); background: rgba(255,255,255,0.06); color: #fff; font-size: 1rem; font-family: 'Outfit', sans-serif; margin-bottom: 16px; outline: none; box-sizing: border-box;"
        onkeydown="if(event.key==='Enter') submitMonitorQRLogin()">
      <div id="qrMonitorMsg" style="color: #f43f5e; font-size: 0.85rem; margin-bottom: 12px; min-height: 20px;"></div>
      <button onclick="submitMonitorQRLogin()"
        style="width: 100%; padding: 14px; border-radius: 12px; background: linear-gradient(135deg,#f59e0b,#d97706); color: #000; font-weight: 800; font-size: 1rem; border: none; cursor: pointer; font-family: 'Outfit', sans-serif;">
        Enter Monitoring Panel ▶
      </button>
    </div>
    <style>@keyframes fadeIn { from {opacity:0;} to {opacity:1;} }</style>
  `;
  document.body.appendChild(overlay);
  setTimeout(() => {
    const inp = document.getElementById('qrMonitorPasswordInput');
    if (inp) inp.focus();
  }, 300);
}

async function submitMonitorQRLogin() {
  const input = document.getElementById('qrMonitorPasswordInput');
  const msg   = document.getElementById('qrMonitorMsg');
  const pwd   = input ? input.value.trim() : '';

  if (!pwd) { if (msg) msg.textContent = 'Please enter the password.'; return; }

  try {
    const resp = await fetch('/api/votes', {
      headers: { 'x-monitor-password': pwd }
    });
    if (resp.ok || resp.status === 200) {
      sessionStorage.setItem('monitorPassword', pwd);
      window.location.reload();
    } else {
      if (msg) msg.textContent = '❌ Incorrect password. Try again.';
      if (input) { input.value = ''; input.focus(); }
    }
  } catch (e) {
    if (msg) msg.textContent = '❌ Network error. Please try again.';
  }
}

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
                sessionStorage.removeItem('monitorPassword');
                monitorPassword = '';
                setTimeout(() => {
                    showMonitorLoginOverlay();
                    const pInput = document.getElementById('qrMonitorPasswordInput');
                    if (pInput) pInput.focus();
                }, 1500);
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

// ============ AUTH KIOSK QR ============
function generateKioskQR() {
    const modal = document.getElementById('authModal');
    const container = document.getElementById('authQrContainer');
    
    // Create the exact URL for the auth-kiosk page using the current monitor password
    const baseUrl = window.location.origin;
    const authUrl = `${baseUrl}/auth-kiosk.html?token=${encodeURIComponent(monitorPassword)}`;
    
    // Generate QR using the free API
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(authUrl)}&margin=10`;
    
    container.innerHTML = `<img src="${qrUrl}" alt="Kiosk Auth QR" style="border-radius: 12px; border: 4px solid #fff;">`;
    modal.style.display = 'block';
}

function closeAuthModal() {
    document.getElementById('authModal').style.display = 'none';
}

// Close modal if clicked outside
window.addEventListener('click', (e) => {
    const modal = document.getElementById('authModal');
    if (e.target === modal) {
        closeAuthModal();
    }
});

// ============ LOGOUT ============
function logout() {
    sessionStorage.removeItem('monitorPassword');
    window.location.href = '/scan';
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
