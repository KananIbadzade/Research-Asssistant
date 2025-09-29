// Content script to detect text selection and communicate with sidepanel
(function() {
    let lastSelection = '';
    let selectionTimeout = null;

    // Function to get current selection
    function getCurrentSelection() {
        const selection = window.getSelection();
        const selectedText = selection ? selection.toString().trim() : '';
        console.log('getCurrentSelection:', { selection, selectedText });
        return selectedText;
    }

    // Function to notify sidepanel about selection change
    function notifySelectionChange(hasSelection) {
        try {
            chrome.runtime.sendMessage({
                type: 'selectionChanged',
                hasSelection: hasSelection,
                selectedText: hasSelection ? getCurrentSelection() : ''
            });
        } catch (error) {
            // Extension might not be loaded yet, ignore
        }
    }

    // Debounced selection change handler
    function handleSelectionChange() {
        const currentSelection = getCurrentSelection();
        const hasSelection = currentSelection.length > 0;
        
        // Only notify if selection state changed
        if (currentSelection !== lastSelection) {
            lastSelection = currentSelection;
            notifySelectionChange(hasSelection);
        }
    }

    // Listen for selection changes
    document.addEventListener('selectionchange', () => {
        // Debounce to avoid too many messages
        if (selectionTimeout) {
            clearTimeout(selectionTimeout);
        }
        selectionTimeout = setTimeout(handleSelectionChange, 100);
    });

    // Also listen for mouseup and keyup events for better coverage
    document.addEventListener('mouseup', handleSelectionChange);
    document.addEventListener('keyup', handleSelectionChange);

    // Initial check
    handleSelectionChange();

    // Listen for messages from sidepanel
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('Content script received message:', request);
        
        try {
            if (request.type === 'getSelectedText') {
                const selectedText = getCurrentSelection();
                console.log('Content script selected text:', selectedText);
                sendResponse({ ok: true, selectedText: selectedText });
            } else if (request.type === 'highlightWebPage') {
                console.log('Content script: highlightWebPage called with action:', request.action);
                console.log('Preserve selection flag:', request.preserveSelection);
                
                // Check if we have a current selection
                const currentSelection = window.getSelection();
                console.log('Current selection range count:', currentSelection.rangeCount);
                console.log('Current selected text:', currentSelection.toString());
                
                if (currentSelection.rangeCount > 0 && currentSelection.toString().trim()) {
                    toggleHighlight(request.action);
                    sendResponse({ ok: true, success: true, message: 'Highlight applied successfully' });
                } else {
                    console.log('No valid selection found for highlighting');
                    sendResponse({ ok: true, success: false, error: 'No text selected' });
                }
            } else if (request.type === 'getPageMetadata') {
                const metadata = extractPageMetadata();
                sendResponse({ ok: true, metadata: metadata });
            } else {
                sendResponse({ ok: false, error: 'Unknown request type' });
            }
        } catch (error) {
            console.error('Content script error:', error);
            sendResponse({ ok: false, error: error.message });
        }
        
        return true; // Keep message channel open for async responses
    });

    // Function to extract page metadata
    function extractPageMetadata() {
        function metaContent(selectorList) {
            for (const sel of selectorList) {
                const el = document.querySelector(sel);
                if (el && el.content) return el.content;
            }
            return null;
        }

        const meta = {};
        // Title: <title>, og:title, citation_title
        meta.title = metaContent(['meta[property="og:title"]', 'meta[name="citation_title" i]'])
            || document.title || null;

        // Authors: citation_author* or JSON-LD author
        const authors = [];
        document.querySelectorAll('meta[name="citation_author"]').forEach(m => {
            if (m.content) authors.push(m.content);
        });
        if (authors.length === 0) {
            // try <meta name="author">
            const authorMeta = document.querySelector('meta[name="author"]');
            if (authorMeta && authorMeta.content) authors.push(authorMeta.content);
        }
        // try JSON-LD
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
                // some pages nest in @graph
                if (obj['@graph']) {
                    obj['@graph'].forEach(n => {
                        if (n.author) collectAuthor(n.author);
                    });
                }
            } catch (e) { /* ignore parse errors */ }
        }
        meta.authors = authors;

        // Publication date: citation_date or article:published_time
        meta.date = metaContent(['meta[name="citation_date"]', 'meta[property="article:published_time"]', 'meta[name="pubdate"]']) || null;

        // Publisher / site name
        meta.publisher = metaContent(['meta[name="citation_publisher"]', 'meta[property="og:site_name"]']) || window.location.hostname;

        // DOI if present
        meta.doi = metaContent(['meta[name="citation_doi"]', 'meta[name="doi"]']) || null;

        // URL & access date
        meta.url = document.location.href;
        meta.access_date = new Date().toISOString().slice(0, 10);

        return meta;
    }

    // Function to toggle highlight on selected text
    function toggleHighlight(action = 'yellow') {
        console.log('toggleHighlight called with action:', action);
        const selection = window.getSelection();
        console.log('Selection object:', selection);
        console.log('Range count:', selection.rangeCount);

        if (!selection.rangeCount) {
            console.log('No selection range found');
            return;
        }

        const range = selection.getRangeAt(0);
        const selectedText = selection.toString();
        console.log('Selected text:', selectedText);
        console.log('Range start:', range.startContainer);
        console.log('Range end:', range.endContainer);

        if (!selectedText) {
            console.log('No selected text found');
            return;
        }

        if (action === 'remove') {
            // ERASE: Remove ALL highlights from the selected text
            console.log('Erasing highlights from:', selectedText);

            // Extract the selected content
            const contents = range.extractContents();

            // Create a temporary container to process the content
            const tempDiv = document.createElement('div');
            tempDiv.appendChild(contents);

            // Remove all highlight spans from the content
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

            console.log('Highlights erased successfully');

        } else {
            // HIGHLIGHT: Add highlight to the selected text
            console.log('Adding highlight to:', selectedText);

            // First, remove any existing highlights from the selection
            const contents = range.extractContents();
            const tempDiv = document.createElement('div');
            tempDiv.appendChild(contents);

            // Remove existing highlights
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
            
            console.log('Highlight added successfully');
        }
    }
})();