chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'fetchMonday') {
        fetch("https://api.monday.com/v2", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': message.apiKey,
                'API-Version': message.apiVersion
            },
            body: JSON.stringify({ query: message.query })
        })
        .then(res => res.json())
        .then(data => sendResponse({ success: true, data }))
        .catch(err => sendResponse({ success: false, error: err.message }));
        
        return true; // Keeps the channel open for the async response
    }
});