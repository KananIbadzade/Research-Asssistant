// Formal Research Assistant - Simplified UI & Core Features

let currentBucket = 'default';
let lastQuotedText = ''; // Store the last quoted text for paraphrasing
let lastActionWasCitation = false; // Track if last action was citation

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    updateSelectionVisibility(false);  // Initially hide buttons
});

function initializeApp() {
    chrome.storage.local.get(['buckets', 'lastActiveBucket'], (result) => {
        let buckets = result.buckets;
        if (!buckets || Object.keys(buckets).length === 0) {
            buckets = {
                'default': { name: 'General Notes', createdAt: new Date().toISOString() }
            };
            chrome.storage.local.set({ buckets });
        }
        
        currentBucket = result.lastActiveBucket || 'default';
        if (!buckets[currentBucket]) {
            currentBucket = 'default';
        }

        loadBuckets(buckets);
        loadNotesFromBucket(currentBucket);
        updateActiveBucketUI();
    });
}

function setupEventListeners() {
    const summarizeBtn = document.getElementById('summarizeBtn');
    if (summarizeBtn) summarizeBtn.addEventListener('click', summarizeText);

    const paraphraseBtn = document.getElementById('paraphraseBtn');
    if (paraphraseBtn) paraphraseBtn.addEventListener('click', paraphraseQuote);

    const addBucketBtn = document.getElementById('addBucketBtn');
    if (addBucketBtn) addBucketBtn.addEventListener('click', () => showBucketModal(true));

    const quoteCiteBtn = document.getElementById('quoteCiteBtn');
    if (quoteCiteBtn) quoteCiteBtn.addEventListener('click', quoteAndCite);

    // Universal highlight buttons (work for both web pages and notes)
    const highlightYellowBtn = document.getElementById('highlightYellowBtn');
    if (highlightYellowBtn) highlightYellowBtn.addEventListener('click', () => universalHighlight('yellow'));

    const highlightGreenBtn = document.getElementById('highlightGreenBtn');
    if (highlightGreenBtn) highlightGreenBtn.addEventListener('click', () => universalHighlight('green'));

    const highlightBlueBtn = document.getElementById('highlightBlueBtn');
    if (highlightBlueBtn) highlightBlueBtn.addEventListener('click', () => universalHighlight('blue'));

    const highlightPinkBtn = document.getElementById('highlightPinkBtn');
    if (highlightPinkBtn) highlightPinkBtn.addEventListener('click', () => universalHighlight('pink'));

    const highlightOrangeBtn = document.getElementById('highlightOrangeBtn');
    if (highlightOrangeBtn) highlightOrangeBtn.addEventListener('click', () => universalHighlight('orange'));

    const eraseBtn = document.getElementById('eraseBtn');
    if (eraseBtn) eraseBtn.addEventListener('click', () => universalHighlight('remove'));

    // Modal event listeners
    const closeBucketModal = document.getElementById('closeBucketModal');
    if (closeBucketModal) closeBucketModal.addEventListener('click', () => showBucketModal(false));

    const createBucketBtn = document.getElementById('createBucketBtn');
    if (createBucketBtn) createBucketBtn.addEventListener('click', createBucket);

    const bucketNameInput = document.getElementById('bucketNameInput');
    if (bucketNameInput) bucketNameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') createBucket(); });

    // Auto-save and word count for notes
    const notesEditor = document.getElementById('notes');
    if (notesEditor) {
        notesEditor.addEventListener('input', () => {
            debounce(saveNotes, 500)();
            updateWordCount();
        });
        notesEditor.addEventListener('keydown', handleWordLimit);
        notesEditor.addEventListener('paste', handlePaste);
    }
}

// Reusable helper to fetch selected text from the active tab (used by Summarize + Quote)
async function fetchSelectedText() {
    try {
        console.log('fetchSelectedText: Getting active tab...');
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        console.log('Active tab:', tab);
        
        if (!tab || !tab.id) {
            console.log('No active tab found');
            return '';
        }
        
        console.log('Sending message to content script...');
        // Send message to content script to get selected text
        const response = await chrome.tabs.sendMessage(tab.id, { type: 'getSelectedText' });
        console.log('Content script response:', response);
        
        if (chrome.runtime.lastError) {
            console.error('Chrome runtime error:', chrome.runtime.lastError);
            return '';
        }
        
        if (!response || !response.ok) {
            console.error('Content script error:', response?.error || 'Unknown error');
            return '';
        }
        
        return response.selectedText || '';
    } catch (error) {
        console.error('Error fetching selected text:', error);
        return '';
    }
}

// Update visibility of the action buttons depending on whether the user has selected text
function updateSelectionVisibility(hasSelection = false) {
    const displayStyle = hasSelection ? 'inline-flex' : 'none';
    
    const quoteCiteBtn = document.getElementById('quoteCiteBtn');
    const summarizeBtn = document.getElementById('summarizeBtn');
    const paraphraseBtn = document.getElementById('paraphraseBtn');

    console.log('Updating button visibility:', hasSelection, displayStyle);
    console.log('Buttons found:', { quoteCiteBtn, summarizeBtn, paraphraseBtn });

    if (quoteCiteBtn) quoteCiteBtn.style.display = displayStyle;
    if (summarizeBtn) summarizeBtn.style.display = displayStyle;
    if (paraphraseBtn) paraphraseBtn.style.display = displayStyle;
}


// Listen for selection changes from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Received message:', message);
    if (message.type === 'selectionChanged') {
        console.log('Selection changed:', message.hasSelection);
        updateSelectionVisibility(message.hasSelection);
    }
    return true; // Keep message channel open for async responses
});

// Get page metadata using robust strategy: message -> executeScript -> tab fallback
async function getPageMetadata() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.id) return null;

        // 1) Try content script messaging with timeout
        const response = await new Promise((resolve) => {
            let resolved = false;
            const timer = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    resolve(null);
                }
            }, 1500);

            try {
                chrome.tabs.sendMessage(tab.id, { type: 'getPageMetadata' }, (res) => {
                    if (resolved) return;
                    clearTimeout(timer);
                    resolved = true;
                    if (chrome.runtime.lastError) {
                        resolve(null);
                    } else {
                        resolve(res);
                    }
                });
            } catch (_) {
                clearTimeout(timer);
                resolve(null);
            }
        });

        if (response && response.metadata) {
            return response.metadata;
        }

        // 2) Fallback: execute in page context
        try {
            const [res] = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    function metaContent(list) {
                        for (const sel of list) {
                            const el = document.querySelector(sel);
                            if (el && el.content) return el.content;
                        }
                        return null;
                    }
                    const meta = {};
                    meta.title = metaContent(['meta[property="og:title"]', 'meta[name="citation_title" i]']) || document.title || null;
                    const authors = [];
                    document.querySelectorAll('meta[name="citation_author"]').forEach(m => { if (m.content) authors.push(m.content); });
                    if (authors.length === 0) {
                        const authorMeta = document.querySelector('meta[name="author"]');
                        if (authorMeta && authorMeta.content) authors.push(authorMeta.content);
                    }
                    const ldNodes = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
                    for (const s of ldNodes) {
                        try {
                            const obj = JSON.parse(s.textContent);
                            if (!obj) continue;
                            const collectAuthor = (a) => {
                                if (!a) return;
                                if (typeof a === 'string') authors.push(a);
                                else if (Array.isArray(a)) a.forEach(x => collectAuthor(x));
                                else if (a.name) authors.push(a.name);
                            };
                            if (obj.author) collectAuthor(obj.author);
                            if (obj['@graph']) obj['@graph'].forEach(n => { if (n.author) collectAuthor(n.author); });
                        } catch (_) { /* ignore */ }
                    }
                    meta.authors = authors;
                    meta.date = metaContent(['meta[name="citation_date"]', 'meta[property="article:published_time"]', 'meta[name="pubdate"]']) || null;
                    meta.publisher = metaContent(['meta[name="citation_publisher"]', 'meta[property="og:site_name"]']) || window.location.hostname;
                    meta.doi = metaContent(['meta[name="citation_doi"]', 'meta[name="doi"]']) || null;
                    meta.url = document.location.href;
                    meta.access_date = new Date().toISOString().slice(0, 10);
                    return meta;
                }
            });
            if (res && res.result) return res.result;
        } catch (execErr) {
            console.error('executeScript metadata failed', execErr);
        }

        // 3) Fallback to tab info
        return {
            title: tab?.title || 'Unknown',
            url: tab?.url || '',
            publisher: new URL(tab?.url || 'http://example.com').hostname,
            access_date: new Date().toISOString().slice(0, 10),
            authors: [],
            date: null,
            doi: null
        };
    } catch (error) {
        console.error('Error getting page metadata:', error);
        return null;
    }
}

// Build a CSL/CSL-JSON object and format APA using citation-js (Cite global)
function formatAPA(meta) {
    try {
        // Build CSL entry
        const csl = {
            id: '1',
            type: meta.doi ? 'article-journal' : 'webpage',
            title: meta.title || '',
            author: [],
            issued: undefined,
            'container-title': undefined,
            publisher: meta.publisher || undefined,
            URL: meta.url || undefined,
            DOI: meta.doi || undefined,
            accessed: undefined
        };
        if (meta.authors && meta.authors.length > 0) {
            csl.author = meta.authors.map(name => {
                if (typeof name !== 'string') return { literal: String(name) };
                const parts = name.trim().split(/\s+/);
                if (parts.length === 1) return { literal: parts[0] };
                const family = parts.pop();
                const given = parts.join(' ');
                return { given, family };
            });
        }
        if (meta.date) {
            const d = new Date(meta.date);
            if (!isNaN(d)) csl.issued = { 'date-parts': [[d.getFullYear(), d.getMonth() + 1, d.getDate()]] };
            else {
                const y = (meta.date.match(/(\d{4})/) || [])[1];
                if (y) csl.issued = { 'date-parts': [[parseInt(y, 10)]] };
            }
        }
        if (meta.access_date) {
            const parts = meta.access_date.split('-').map(p => parseInt(p, 10));
            if (parts.length === 3) csl.accessed = { 'date-parts': [[parts[0], parts[1], parts[2]]] };
        }
        const citeObj = new Cite([csl]);
        const bibliography = citeObj.format('bibliography', { format: 'text', template: 'apa', lang: 'en-US' }).trim();
        let inText = '';
        if (meta.authors && meta.authors.length > 0) {
            const first = meta.authors[0];
            const parts = first.trim().split(/\s+/);
            const last = parts.length > 0 ? parts[parts.length - 1] : first;
            const year = (csl.issued && csl.issued['date-parts'] && csl.issued['date-parts'][0] && csl.issued['date-parts'][0][0]) || 'n.d.';
            inText = `(${last}, ${year})`;
        } else if (meta.publisher) {
            inText = `(${meta.publisher}, n.d.)`;
        } else {
            inText = `(n.d.)`;
        }
        return { bibliography, inText };
    } catch (err) {
        const year = meta.date ? (new Date(meta.date).getFullYear() || 'n.d.') : 'n.d.';
        const authorLabel = (meta.authors && meta.authors[0]) ? meta.authors[0].split(/\s+/).slice(-1)[0] : (meta.publisher || 'Site');
        const bibliography = `${authorLabel}. (${year}). ${meta.title || ''}. ${meta.url || ''}`;
        const inText = `(${authorLabel}, ${year})`;
        return { bibliography, inText };
    }
}

// Main action for Quote + Cite (APA)
async function quoteAndCite() {
    console.log('quoteAndCite function called');
    try {
        console.log('Fetching selected text...');
        const selectedText = await fetchSelectedText();
        console.log('Selected text result:', selectedText);
        
        if (!selectedText) {
            console.log('No selected text found');
            alert('Please highlight text to quote.');
            return;
        }

        console.log('Showing animation...');
        showSummarizingAnimation(true);

        console.log('Getting page metadata...');
        const meta = await getPageMetadata();
        console.log('Page metadata:', meta);
        
        if (!meta) {
            console.log('No metadata found');
            showResult('Could not extract page metadata.', 'error');
            showSummarizingAnimation(false);
            return;
        }

        const { bibliography, inText } = formatAPA(meta);

        // Store the quoted text for potential paraphrasing
        lastQuotedText = selectedText;
        lastActionWasCitation = true;

        // Present: quoted text, in-text citation, full bibliography
        const content = `
            <blockquote style="margin:0 0 12px 0; padding:12px; background:#fafafa; border-left:4px solid #e0e6ed;">${escapeHtml(selectedText)}</blockquote>
            <div style="margin-bottom:8px;"><strong>In-text citation:</strong> ${escapeHtml(inText)}</div>
            <div><strong>APA (bibliography):</strong><div style="margin-top:6px;">${escapeHtml(bibliography)}</div></div>
        `;
        showResult(content);

    } catch (err) {
        showResult(`Error: ${err.message}`, 'error');
    } finally {
        showSummarizingAnimation(false);
    }
}

// small helper to escape HTML when injecting into sidepanel
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function summarizeText() {
    const resultsDiv = document.getElementById('results');
    showSummarizingAnimation(true);
    
    // Reset citation flag since this is a standalone action
    lastActionWasCitation = false;

    fetchSelectedText().then(async (selectedText) => {
        if (!selectedText) {
            showResult('Please select text on the page to summarize.', 'error');
            showSummarizingAnimation(false);
            return;
        }

        try {
            chrome.runtime.sendMessage({ type: 'SUMMARIZE', text: selectedText }, (resp) => {
                if (chrome.runtime.lastError) {
                    showResult(`Error: ${chrome.runtime.lastError.message}`, 'error');
                    showSummarizingAnimation(false);
                    return;
                }
                if (!resp) {
                    showResult('Error: No response from background', 'error');
                    showSummarizingAnimation(false);
                    return;
                }
                if (!resp.ok) {
                    showResult(`Error: ${resp.data?.error || resp.error || 'Failed'}`, 'error');
                    showSummarizingAnimation(false);
                    return;
                }
                showResult(resp.data.result, 'success');
                lastActionWasCitation = false;
                showSummarizingAnimation(false);
            });

        } catch (error) {
            showResult(`Error: ${error.message}`, 'error');
            showSummarizingAnimation(false);
        }
    });
}

async function paraphraseQuote() {
    const resultsDiv = document.getElementById('results');
    showSummarizingAnimation(true);

    try {
        // Use quoted text if available, otherwise use selected text
        let textToParaphrase = lastQuotedText;
        
        if (!textToParaphrase) {
            textToParaphrase = await fetchSelectedText();
            if (!textToParaphrase) {
                showResult('Please select text on the page to paraphrase, or cite a quote first.', 'error');
                return;
            }
        }

        const response = await fetch(`${CONFIG.getApiUrl()}/api/research/process`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: textToParaphrase, operation: 'paraphrase' })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const paraphrasedText = await response.text();
        
        // Show citation only if the last action was citation
        if (lastActionWasCitation && lastQuotedText) {
            // Get metadata for citation
            const meta = await getPageMetadata();
            if (meta) {
                const { bibliography, inText } = formatAPA(meta);
                const content = `
                    <blockquote style="margin:0 0 12px 0; padding:12px; background:#fafafa; border-left:4px solid #e0e6ed;">${escapeHtml(paraphrasedText)}</blockquote>
                    <div style="margin-bottom:8px;"><strong>In-text citation:</strong> ${escapeHtml(inText)}</div>
                    <div><strong>APA (bibliography):</strong><div style="margin-top:6px;">${escapeHtml(bibliography)}</div></div>
                `;
                showResult(content);
            } else {
                showResult(paraphrasedText);
            }
        } else {
            // Just show paraphrased text without citation
            showResult(paraphrasedText);
        }
        
        // Reset the citation flag after paraphrasing
        lastActionWasCitation = false;

    } catch (error) {
        showResult(`Error: ${error.message}`, 'error');
    } finally {
        showSummarizingAnimation(false);
    }
}

// Universal highlight function that works for both web pages and notes
async function universalHighlight(colorOrAction) {
    const selection = window.getSelection();
    const notesEditor = document.getElementById('notes');
    
    console.log('universalHighlight called with:', colorOrAction);
    console.log('Selection range count:', selection.rangeCount);
    
    // Check if selection is within the notes editor
    if (selection.rangeCount > 0 && notesEditor.contains(selection.getRangeAt(0).commonAncestorContainer)) {
        console.log('Selection is in notes editor');
        // Selection is in notes editor - use notes highlighting
        highlightInNotes(colorOrAction);
    } else {
        console.log('Selection is on web page or no selection');
        // Selection is on web page OR no selection - use web page highlighting
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.id) {
                console.log('No active tab found');
                return;
            }
            
            console.log('Sending highlight message to tab:', tab.id, 'color/action:', colorOrAction);
            // Send message to content script to highlight or remove highlight
            const response = await chrome.tabs.sendMessage(tab.id, { 
                type: 'highlightWebPage', 
                action: colorOrAction,
                preserveSelection: true
            });
            console.log('Content script response:', response);
            
            if (chrome.runtime.lastError) {
                console.error('Chrome runtime error:', chrome.runtime.lastError);
                return;
            }
            
            if (!response || !response.ok) {
                console.error('Content script error:', response?.error || 'Unknown error');
                return;
            }
        } catch (error) {
            console.error('Error highlighting web page:', error);
            console.error('Error details:', error.message);
        }
    }
}

// Highlight function for note editor
function highlightInNotes(action) {
    const notesEditor = document.getElementById('notes');
    const selection = window.getSelection();
    
    if (!selection.rangeCount) {
        // No selection, focus the editor
        notesEditor.focus();
        return;
    }
    
    const range = selection.getRangeAt(0);
    const selectedText = selection.toString();
    
    if (!selectedText) {
        notesEditor.focus();
        return;
    }
    
    // Check if selection is within the notes editor
    if (!notesEditor.contains(range.commonAncestorContainer)) {
        notesEditor.focus();
        return;
    }
    
    if (action === 'remove') {
        // ERASE: Remove ALL highlights from the selected text in notes
        console.log('Erasing highlights from notes:', selectedText);
        
        // Extract the selected content
        const contents = range.extractContents();
        
        // Create a temporary container to process the content
        const tempDiv = document.createElement('div');
        tempDiv.appendChild(contents);
        
        // Remove all highlight spans from the content (any color)
        const highlightSpans = tempDiv.querySelectorAll('span[style*="background-color"], span.research-assistant-highlight');
        highlightSpans.forEach(span => {
            // Replace span with its text content
            const textNode = document.createTextNode(span.textContent);
            span.parentNode.replaceChild(textNode, span);
        });
        
        // Insert the cleaned content back
        range.insertNode(tempDiv);
        
        // Remove the temporary div, keeping only its contents
        while (tempDiv.firstChild) {
            tempDiv.parentNode.insertBefore(tempDiv.firstChild, tempDiv);
        }
        tempDiv.parentNode.removeChild(tempDiv);
        
        // Re-select the cleaned text
        const newRange = document.createRange();
        newRange.setStartBefore(range.startContainer);
        newRange.setEndAfter(range.endContainer);
        selection.removeAllRanges();
        selection.addRange(newRange);
        
        console.log('Highlights erased from notes successfully');
        
    } else {
        // HIGHLIGHT: Add highlight to the selected text in notes
        console.log('Adding highlight to notes:', selectedText);
        
        // First, remove any existing highlights from the selection
        const contents = range.extractContents();
        const tempDiv = document.createElement('div');
        tempDiv.appendChild(contents);
        
        // Remove existing highlights (any color)
        const existingHighlights = tempDiv.querySelectorAll('span[style*="background-color"], span.research-assistant-highlight');
        existingHighlights.forEach(span => {
            const textNode = document.createTextNode(span.textContent);
            span.parentNode.replaceChild(textNode, span);
        });
        
        // Create new highlight span with the specified color
        const colorMap = {
            'yellow': '#ffeb3b',
            'green': '#4caf50',
            'blue': '#2196f3',
            'pink': '#e91e63',
            'orange': '#ff9800'
        };
        
        const highlightColor = colorMap[action] || '#ffeb3b';
        const highlightSpan = document.createElement('span');
        highlightSpan.style.backgroundColor = highlightColor;
        highlightSpan.style.color = 'black';
        highlightSpan.className = 'research-assistant-highlight';
        
        // Move all content into the highlight span
        while (tempDiv.firstChild) {
            highlightSpan.appendChild(tempDiv.firstChild);
        }
        
        // Insert the highlighted content
        range.insertNode(highlightSpan);
        
        // Re-select the highlighted text
        const newRange = document.createRange();
        newRange.selectNode(highlightSpan);
        selection.removeAllRanges();
        selection.addRange(newRange);
        
        console.log('Highlight added to notes successfully');
    }
    
    // Auto-save after highlighting
    debounce(saveNotes, 500)();
}

function saveNotes(callback) {
    const notes = document.getElementById('notes').innerHTML;
    chrome.storage.local.get(['buckets'], (result) => {
        const buckets = result.buckets || {};
        if (buckets[currentBucket]) {
            buckets[currentBucket].notes = notes;
            chrome.storage.local.set({ buckets }, () => {
                if (callback) callback();
            });
        } else if (callback) {
            callback();
        }
    });
}

function loadBuckets(buckets) {
    const container = document.getElementById('bucketsList');
    container.innerHTML = '';
    Object.keys(buckets).forEach(bucketId => {
        const bucket = buckets[bucketId];
        const bucketElement = createBucketElement(bucketId, bucket.name);
        container.appendChild(bucketElement);
    });
}

function createBucketElement(id, name) {
    const div = document.createElement('div');
    div.className = 'bucket-item';
    div.dataset.bucketId = id;
    div.textContent = name;
    
    div.addEventListener('click', () => switchBucket(id));

    if (id !== 'default') {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'bucket-delete';
        deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
        deleteBtn.title = 'Delete folder';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteBucket(id);
        });
        div.appendChild(deleteBtn);
    }
    return div;
}

function switchBucket(bucketId) {
    // Save current notes before switching buckets
    saveNotes(() => {
        currentBucket = bucketId;
        chrome.storage.local.set({ lastActiveBucket: bucketId });
        loadNotesFromBucket(bucketId);
        updateActiveBucketUI();
        
        // Ensure notes editor is ready after switching
        setTimeout(() => {
            ensureNotesEditorReady();
        }, 100);
    });
}

function loadNotesFromBucket(bucketId) {
  chrome.storage.local.get(['buckets'], (result) => {
    const notesEditor = document.getElementById('notes');
    const notes = result.buckets?.[bucketId]?.notes || '';

    // Reset editor
    notesEditor.innerHTML = '';

    // Load saved note (if any)
    if (notes && notes.trim()) {
      notesEditor.innerHTML = notes;
    } else {
      notesEditor.innerHTML = '';
    }

    // --- IMPORTANT: strip any counters that were accidentally saved in the note ---
    notesEditor.querySelectorAll('#wordCount, .word-counter').forEach(el => el.remove());
    // ------------------------------------------------------------------------------

    // Ensure editor state
    notesEditor.contentEditable = true;
    notesEditor.setAttribute('contenteditable', 'true');
    notesEditor.removeAttribute('disabled');
    notesEditor.removeAttribute('readonly');

    // Create/update the pinned counter (as overlay in .notes-container)
    updateWordCount();

    // Ready for typing (places caret correctly)
    ensureNotesEditorReady();
  });
}

function ensureNotesEditorReady() {
    const notesEditor = document.getElementById('notes');
    if (!notesEditor) return;

    // Ensure contentEditable is true
    notesEditor.contentEditable = true;
    notesEditor.setAttribute('contenteditable', 'true');

    // Remove any disabled state
    notesEditor.removeAttribute('disabled');
    notesEditor.removeAttribute('readonly');

    // Focus the editor to make it ready for typing
    setTimeout(() => {
        notesEditor.focus();

        // Clear any existing selection first
        const sel = window.getSelection();
        sel.removeAllRanges();

        // Place cursor at the beginning of the editor
        const range = document.createRange();

        if (notesEditor.firstChild && notesEditor.firstChild.nodeType === Node.TEXT_NODE) {
            // If there's text content, place cursor at the start
            range.setStart(notesEditor.firstChild, 0);
        } else if (notesEditor.firstChild) {
            // If there's a non-text node, place cursor before it
            range.setStartBefore(notesEditor.firstChild);
        } else {
            // If editor is completely empty, create a text node and place cursor there
            const textNode = document.createTextNode('');
            notesEditor.appendChild(textNode);
            range.setStart(textNode, 0);
        }

        range.collapse(true);
        sel.addRange(range);
    }, 100);
}

function updateActiveBucketUI() {
    document.querySelectorAll('.bucket-item').forEach(item => {
        item.classList.toggle('active', item.dataset.bucketId === currentBucket);
    });
}

function showBucketModal(show) {
    document.getElementById('bucketModal').style.display = show ? 'flex' : 'none';
    if (show) {
        document.getElementById('bucketNameInput').focus();
        document.getElementById('bucketNameInput').value = '';
    }
}

function createBucket() {
    const name = document.getElementById('bucketNameInput').value.trim();
    if (!name) return;

    chrome.storage.local.get(['buckets'], (result) => {
        const buckets = result.buckets || {};
        const newId = 'bucket_' + Date.now();
        buckets[newId] = { name, createdAt: new Date().toISOString() };
        chrome.storage.local.set({ buckets }, () => {
            loadBuckets(buckets);
            switchBucket(newId);
            showBucketModal(false);
            
            // Ensure notes editor is properly initialized
            ensureNotesEditorReady();
        });
    });
}

function deleteBucket(bucketId) {
    if (!confirm('Are you sure you want to delete this folder and its notes?')) return;

    chrome.storage.local.get(['buckets'], (result) => {
        const buckets = result.buckets || {};
        delete buckets[bucketId];
        chrome.storage.local.set({ buckets }, () => {
            if (currentBucket === bucketId) {
                switchBucket('default');
            }
            loadBuckets(buckets);
        });
    });
}

function showSummarizingAnimation(show) {
    const resultsDiv = document.getElementById('results');
    if (show) {
        resultsDiv.innerHTML = `
            <div class="result-item summarizing-animation">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
            </div>`;
    } else {
        const animation = resultsDiv.querySelector('.summarizing-animation');
        if (animation) animation.parentElement.remove();
    }
}

function showResult(content, type = 'info') {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = ''; // Clear previous results/animation

    const resultItem = document.createElement('div');
    resultItem.className = 'result-item';

    if (type === 'error') {
        resultItem.innerHTML = `<div class="result-content error-message">${content}</div>`;
    } else {
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.title = 'Copy to clipboard';
        copyBtn.innerHTML = '<i class="far fa-copy"></i>';
        copyBtn.addEventListener('click', async () => {
            try {
                // Try modern clipboard API first
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(content);
                    console.log('Text copied to clipboard successfully');
                } else {
                    // Fallback method for older browsers or restricted contexts
                    const textArea = document.createElement('textarea');
                    textArea.value = content;
                    textArea.style.position = 'fixed';
                    textArea.style.left = '-999999px';
                    textArea.style.top = '-999999px';
                    document.body.appendChild(textArea);
                    textArea.focus();
                    textArea.select();
                    
                    const successful = document.execCommand('copy');
                    document.body.removeChild(textArea);
                    
                    if (!successful) {
                        throw new Error('Copy command failed');
                    }
                    console.log('Text copied to clipboard using fallback method');
                }
                
                // Show success feedback
                copyBtn.innerHTML = '<i class="fas fa-check"></i>';
                copyBtn.style.color = '#28a745';
                setTimeout(() => {
                    copyBtn.innerHTML = '<i class="far fa-copy"></i>';
                    copyBtn.style.color = '';
                }, 1500);
                
            } catch (error) {
                console.error('Failed to copy text to clipboard:', error);
                
                // Show error feedback
                copyBtn.innerHTML = '<i class="fas fa-times"></i>';
                copyBtn.style.color = '#dc3545';
                setTimeout(() => {
                    copyBtn.innerHTML = '<i class="far fa-copy"></i>';
                    copyBtn.style.color = '';
                }, 1500);
                
                // Show user-friendly error message
                alert('Failed to copy to clipboard. Please try selecting the text manually.');
            }
        });

        const resultContent = document.createElement('div');
        resultContent.className = 'result-content';
        resultContent.innerHTML = content.replace(/\n/g, '<br>');
        
        resultItem.appendChild(copyBtn);
        resultItem.appendChild(resultContent);
    }
    resultsDiv.appendChild(resultItem);
}

function debounce(func, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

const WORD_LIMIT = 350;

function updateWordCount() {
  const editor = document.getElementById('notes');
  const container = editor.parentElement; // .notes-container

  // Reuse one badge
  let wordCountDiv = document.getElementById('wordCount');
  if (!wordCountDiv) {
    wordCountDiv = document.createElement('div');
    wordCountDiv.id = 'wordCount';
    wordCountDiv.className = 'word-counter';
    container.appendChild(wordCountDiv);   // <-- append to container, not editor
  }

  const text = editor.innerText || '';
  let wordCount = 0;
  if (text && text.trim()) {
    wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  }

  wordCountDiv.textContent = `${wordCount}/${WORD_LIMIT} words`;
  wordCountDiv.classList.toggle('limit-reached', wordCount >= WORD_LIMIT);
}

function handleWordLimit(e) {
    const editor = document.getElementById('notes');
    const text = editor.innerText || '';
    // More accurate word counting - split by whitespace and filter out empty strings
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    const wordCount = words.length;

    // Allow backspace, delete, arrow keys, etc.
    if ([8, 37, 38, 39, 40, 46].includes(e.keyCode)) {
        return;
    }

    // Prevent typing if at or over the word limit (350 words)
    if (wordCount >= WORD_LIMIT) {
        e.preventDefault();
        return false;
    }
}

function handlePaste(e) {
    e.preventDefault();
    
    const editor = document.getElementById('notes');
    const currentText = editor.innerText || '';
    const currentWords = currentText.trim().split(/\s+/).filter(word => word.length > 0);
    const currentWordCount = currentWords.length;
    
    // Get pasted text
    const pastedText = (e.clipboardData || window.clipboardData).getData('text');
    const pastedWords = pastedText.trim().split(/\s+/).filter(word => word.length > 0);
    
    // Calculate how many words we can accept (350 word limit)
    const remainingWords = WORD_LIMIT - currentWordCount;
    
    if (remainingWords <= 0) {
        // No space for any new words (already at 350 words)
        return;
    }
    
    // Take only the first N words that fit
    const wordsToAdd = pastedWords.slice(0, remainingWords);
    const textToAdd = wordsToAdd.join(' ');
    
    // Insert the text
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(textToAdd));
        
        // Move cursor to end of inserted text
        range.setStartAfter(range.endContainer);
        range.setEndAfter(range.endContainer);
        selection.removeAllRanges();
        selection.addRange(range);
    }
    
    // Update word count
    updateWordCount();
}
