/**
 * MEDIA TERMINATOR
 * Forcefully releases any accidental media locks (camera/mic) 
 * when landing on non-scanner pages.
 */
(function() {
    function killMedia() {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            // We can't query active streams directly, but we can try to 
            // trigger a dummy stream and immediately kill it, or wait for
            // any tracks to appear.
            // However, the best we can do is ensure that if this context
            // somehow inherited a stream, it's stopped.
            navigator.mediaDevices.enumerateDevices().then(devices => {
                console.log("[Terminator] Checking for active media...");
            }).catch(e => {});
        }
    }

    // Attempt to stop all tracks in the window context
    window.addEventListener('load', () => {
        // Some browsers keep tracks in window.localStream or similar
        const possibleStreams = [window.stream, window.localStream, window.currentStream];
        possibleStreams.forEach(s => {
            if (s && s.getTracks) {
                console.log("[Terminator] Killing inherited stream");
                s.getTracks().forEach(t => t.stop());
            }
        });
    });

    // Aggressive interval to ensure nothing starts in background
    let checkCount = 0;
    const interval = setInterval(() => {
        checkCount++;
        if (checkCount > 10) clearInterval(interval);
        
        // Final fallback: try to reach into common video elements
        document.querySelectorAll('video').forEach(v => {
            if (v.srcObject) {
                console.log("[Terminator] Killing video srcObject");
                v.srcObject.getTracks().forEach(t => t.stop());
                v.srcObject = null;
            }
        });
    }, 500);
})();
