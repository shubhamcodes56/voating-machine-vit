// ============ DOM ELEMENTS ============
const searchBox = document.getElementById('searchBox');
const votesContainer = document.getElementById('votesContainer');
const totalVotesCount = document.getElementById('totalVotesCount');

// ============ GLOBAL VARIABLES ============
let monitorPassword = '';
let allVotes = [];

// ============ CHECK MONITOR ACCESS ============
window.addEventListener('DOMContentLoaded', () => {
    // Get password from sessionStorage
    monitorPassword = sessionStorage.getItem('monitorPassword');

    if (!monitorPassword) {
        // Redirect to main page if no password
        window.location.href = '/';
        return;
    }

    // Load all votes
    loadAllVotes();

    // Search functionality
    searchBox.addEventListener('input', filterVotes);
});

// ============ LOAD ALL VOTES ============
async function loadAllVotes() {
    try {
        const response = await fetch(`/api/all-votes?password=${encodeURIComponent(monitorPassword)}`);
        const data = await response.json();

        if (response.ok) {
            allVotes = data.votes;
            totalVotesCount.textContent = data.totalVotes;
            displayVotes(allVotes);
        } else {
            // Handle unauthorized vs other errors
            if (response.status === 401) {
                showError('Failed to load votes. Invalid session.');
            } else {
                showError('Failed to load votes. ' + (data.message || 'Server error'));
            }
            setTimeout(() => logout(), 2000);
        }
    } catch (error) {
        console.error('Error:', error);
        showErrorInContainer('Error loading live data');
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
