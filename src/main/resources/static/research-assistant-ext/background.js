// Import config for API URL
importScripts('config.js');

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Handle API requests from sidepanel
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'SUMMARIZE') {
        (async () => {
            try {
                const r = await fetch(`${CONFIG.getApiUrl()}/api/research/process`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ operation: 'summarize', content: msg.text })
                });
                const data = await r.json().catch(() => ({}));
                sendResponse({ ok: r.ok, data });
            } catch (e) {
                sendResponse({ ok: false, error: String(e) });
            }
        })();
        return true; // keep channel open
    } else if (msg.type === 'PARAPHRASE') {
        (async () => {
            try {
                const r = await fetch(`${CONFIG.getApiUrl()}/api/research/process`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ operation: 'paraphrase', content: msg.text })
                });
                const data = await r.json().catch(() => ({}));
                sendResponse({ ok: r.ok, data });
            } catch (e) {
                sendResponse({ ok: false, error: String(e) });
            }
        })();
        return true; // keep channel open
    }
});