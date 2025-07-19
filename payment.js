// PayPal Payment Integration
function initiatePayPalPayment() {
    showToast('Redirecting to PayPal...');
    
    // In a real app, you would use the PayPal SDK
    // For this example, we'll simulate a payment flow
    setTimeout(() => {
        const paymentSuccess = Math.random() > 0.2; // 80% success rate for demo
        
        if (paymentSuccess) {
            activatePremium();
            showToast('Payment successful! Premium activated.');
        } else {
            showToast('Payment failed. Please try again.', 4000);
        }
    }, 2000);
}

// PesaPal Payment Integration
function initiatePesaPalPayment() {
    showToast('Redirecting to PesaPal...');
    
    // In a real app, you would use the PesaPal API
    // For this example, we'll simulate a payment flow
    setTimeout(() => {
        const paymentSuccess = Math.random() > 0.2; // 80% success rate for demo
        
        if (paymentSuccess) {
            activatePremium();
            showToast('Payment successful! Premium activated.');
        } else {
            showToast('Payment failed. Please try again.', 4000);
        }
    }, 2000);
}

function activatePremium() {
    const now = new Date();
    const expiryDate = new Date(now.setMonth(now.getMonth() + 1)); // 1 month from now
    
    AppState.isPremium = true;
    AppState.premiumExpiry = expiryDate.toISOString();
    AppState.adEnabled = false;
    saveAppState();
    
    // Hide ads
    adContainer.style.display = 'none';
    
    // Reload current page to reflect premium status
    loadPage(AppState.currentPage);
}

// Check for payment success on page load (for redirects)
function checkPaymentSuccess() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('payment') && urlParams.get('payment') === 'success') {
        activatePremium();
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// Initialize payment check on page load
checkPaymentSuccess();