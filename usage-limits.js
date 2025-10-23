// ---- DISABLE ALL LIMITS ----
window.canPerformAction = () => true;
window.showUsageLimitsNotification = () => {};
window.displayUsageLimits = () => {};
window.recordUsage = () => {};
window.getRemainingUsage = () => ({ images: 99999, documents: 99999, chatMinutes: 99999 });
window.startChatTracking = () => {};
window.stopChatTracking = () => {};
