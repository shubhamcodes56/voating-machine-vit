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
    // ULTRA-SIMPLE: encode ONLY the numeric part, e.g. "0001" from "VID0001" or "5000" from "VID5000"
    // Up to 4 digits = QR Version 1 (21x21 grid) = MAXIMUM square size = EASIEST to scan from distance
    // ECC Level L = least error-correction overhead = biggest data squares
    const numericPart = voterId.replace(/[^0-9]/g, '').padStart(4, '0') || voterId;

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
  if (!imgEl) { 
    showFormError('Please generate a QR code first.'); 
    return; 
  }

  const name    = document.getElementById('displayName').textContent.trim() || 'Voter';
  const fileNameName = name.replace(/\s+/g, '_');
  const voterId = document.getElementById('displayVoterId').textContent;

  // Draw onto a new canvas with a white border + label
  const img = new Image();
  img.crossOrigin = 'anonymous'; // Good practice for external sources
  
  img.onload = () => {
    try {
      const pad = 24, lb = 60;
      const out = document.createElement('canvas');
      out.width  = img.width  + pad * 2;
      out.height = img.height + pad * 2 + lb;
      const ctx = out.getContext('2d');
      
      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, out.width, out.height);
      
      // Draw QR code
      ctx.drawImage(img, pad, pad, img.width, img.height);
      
      // Text styling
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      
      // Voter ID Label
      ctx.font = 'bold 20px Arial, sans-serif';
      ctx.fillText('Voter ID: ' + voterId, out.width / 2, out.height - 35);
      
      // Footer Label
      ctx.fillStyle = '#666666';
      ctx.font = '14px Arial, sans-serif';
      ctx.fillText('Official Voting Machine - Secure Pass', out.width / 2, out.height - 12);

      // Robust Download Method
      out.toBlob((blob) => {
        if (!blob) {
          alert('Failed to process image blob. Please try again.');
          return;
        }
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `QR_${voterId}_${fileNameName}.png`;
        
        // Critical for mobile: appending to body before click
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 100);
      }, 'image/png');
    } catch (err) {
      console.error('Download error:', err);
      alert('Could not download image. Error: ' + err.message);
    }
  };

  img.onerror = () => {
    alert('Failed to load QR image for download. Please regenerate.');
  };

  // Handle both img (src) and canvas (toDataURL) sources
  img.src = imgEl.tagName === 'IMG' ? imgEl.src : imgEl.toDataURL('image/png');
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
