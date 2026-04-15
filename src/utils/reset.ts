export function resetApp() {
  try {
    localStorage.clear();
    sessionStorage.clear();
    // Optional: clear indexedDB if needed
    // indexedDB.deleteDatabase('firebaseLocalStorageDb'); 
  } catch (e) {
    console.error("Reset storage failed:", e);
  }

  // Delay reload to ensure storage operations complete on mobile browsers
  setTimeout(() => {
    window.location.reload();
  }, 100);
}
