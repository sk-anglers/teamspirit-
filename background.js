// TeamSpirit Quick Punch - Background Service Worker

const TEAMSPIRIT_URL = 'https://teamspirit-74532.lightning.force.com/lightning/page/home';

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('TeamSpirit Quick Punch extension installed');

  // Set default location
  chrome.storage.local.get('savedLocation', (result) => {
    if (!result.savedLocation) {
      chrome.storage.local.set({ savedLocation: 'remote' });
    }
  });
});

// Handle messages from popup or content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openTeamSpirit') {
    chrome.tabs.create({ url: TEAMSPIRIT_URL });
    sendResponse({ success: true });
  }
  return true;
});
