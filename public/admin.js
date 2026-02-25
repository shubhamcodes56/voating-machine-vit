// ============ DOM ELEMENTS ============
const editModal = document.getElementById('editModal');
const editMessage = document.getElementById('editMessage');
const searchBox = document.getElementById('searchBox');
const votesContainer = document.getElementById('votesContainer');
const totalVotesCount = document.getElementById('totalVotesCount');

// ============ GLOBAL VARIABLES ============
let adminPassword = '';
let currentEditVoteId = '';
let allVotes = [];

// ============ CHECK ADMIN ACCESS ============
window.addEventListener('DOMContentLoaded', () => {
  // Get password from sessionStorage
  adminPassword = sessionStorage.getItem('adminPassword');
  
  if (!adminPassword) {
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
    // First check whether admin is configured on the server
    const statusResp = await fetch('/api/admin-status');
    const status = await statusResp.json();
    if (!statusResp.ok || !status.configured) {
      showErrorInContainer('Admin panel is not configured on this server');
      setTimeout(() => { window.location.href = '/'; }, 2500);
      return;
    }

    const response = await fetch(`/api/all-votes?password=${encodeURIComponent(adminPassword)}`);
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
    showErrorInContainer('Error loading votes');
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
