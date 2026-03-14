// ============ QR CODE GENERATOR ============
// Simple, clean QR generation. Encodes ONLY the raw voter ID.
// Short IDs like "VID001" = QR Version 1 (21x21) = MAXIMUM module size = EASIEST to scan.

let qrInstance = null;

function generateQR() {
  const name    = document.getElementById('studentName').value.trim();
  const phone   = document.getElementById('studentPhone').value.trim();
  const voterId = document.getElementById('studentVoterId').value.trim().toUpperCase();

  if (!name)    { showFormError('Please enter your full name.'); return; }
  if (!phone || !/^\d{10}$/.test(phone)) { showFormError('Please enter a valid 10-digit phone number.'); return; }
  if (!voterId) { showFormError('Please enter your Voter ID.'); return; }

  document.getElementById('formError').style.display = 'none';

  const container = document.getElementById('qrCanvas');
  container.innerHTML = '';
  qrInstance = null;

  try {
    // ULTRA-SIMPLE: encode ONLY the numeric part, e.g. "001" from "VID001"
    // 3 digits = QR Version 1 (21x21 grid) = MAXIMUM square size = EASIEST to scan from distance
    // ECC Level L = least error-correction overhead = biggest data squares
    const numericPart = voterId.replace(/[^0-9]/g, '').padStart(3, '0') || voterId;

    qrInstance = new QRCode(container, {
      text:         numericPart, // e.g. "001" — ultra short!
      width:        500,
      height:       500,
      colorDark:    '#000000',   // pure black
      colorLight:   '#ffffff',   // pure white
      correctLevel: QRCode.CorrectLevel.L
    });
  } catch (err) {
    showFormError('Failed to generate QR: ' + err.message);
    return;
  }

  document.getElementById('displayName').textContent    = name;
  document.getElementById('displayPhone').textContent   = phone;
  document.getElementById('displayVoterId').textContent = voterId;

  const rc = document.getElementById('qrResultCard');
  rc.style.display = 'flex';
  rc.scrollIntoView({ behavior: 'smooth', block: 'center' });
  rc.style.animation = 'none';
  requestAnimationFrame(() => { rc.style.animation = 'qrCardAppear 0.5s cubic-bezier(0.22,1,0.36,1) both'; });
}

// ============ DOWNLOAD QR ============
function downloadQR() {
  const container = document.getElementById('qrCanvas');
  const imgEl     = container.querySelector('img') || container.querySelector('canvas');
  if (!imgEl) { alert('Generate QR first.'); return; }

  const name    = document.getElementById('displayName').textContent.replace(/\s+/g, '_');
  const voterId = document.getElementById('displayVoterId').textContent;

  // Draw onto a new canvas with a white border + label
  const src = imgEl.tagName === 'IMG' ? imgEl.src : imgEl.toDataURL();
  const img = new Image();
  img.onload = () => {
    const pad = 24, lb = 50;
    const out = document.createElement('canvas');
    out.width  = img.width  + pad * 2;
    out.height = img.height + pad * 2 + lb;
    const c = out.getContext('2d');
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, out.width, out.height);
    c.drawImage(img, pad, pad, img.width, img.height);
    c.fillStyle = '#000000';
    c.font = 'bold 16px Arial, sans-serif';
    c.textAlign = 'center';
    c.fillText('Voter ID: ' + voterId, out.width / 2, out.height - 28);
    c.fillStyle = '#666';
    c.font = '11px Arial, sans-serif';
    c.fillText('Official Voting Machine', out.width / 2, out.height - 10);
    const a = document.createElement('a');
    a.download = 'QR_' + voterId + '_' + name + '.png';
    a.href = out.toDataURL('image/png');
    a.click();
  };
  img.src = src;
}

// ============ RESET ============
function resetForm() {
  ['studentName', 'studentPhone', 'studentVoterId'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('formError').style.display    = 'none';
  document.getElementById('qrResultCard').style.display = 'none';
  document.getElementById('qrCanvas').innerHTML = '';
  qrInstance = null;
  document.getElementById('studentName').focus();
}

function showFormError(msg) {
  const e = document.getElementById('formError');
  e.textContent = '✗ ' + msg;
  e.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', () => {
  ['studentName', 'studentPhone', 'studentVoterId'].forEach(id => {
    document.getElementById(id).addEventListener('keypress', e => {
      if (e.key === 'Enter') generateQR();
    });
  });
});
