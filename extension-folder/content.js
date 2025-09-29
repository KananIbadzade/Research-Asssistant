// Content script to detect text selection and communicate with sidepanel
(function() {
    let lastSelection = '';
    let selectionTimeout = null;
    let savedRange = null; // Store the last selection range

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
        
        // Save the current range if there's a selection
        if (hasSelection) {
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                savedRange = selection.getRangeAt(0).cloneRange();
                console.log('Saved selection range:', savedRange.toString());
            }
        }
        
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
        selectionTimeout = setTimeout(handleSelectionChange, 50);
    });

    // Also listen for mouseup and keyup events for better coverage
    document.addEventListener('mouseup', () => {
        // Immediate check for mouseup to catch quick selections
        setTimeout(handleSelectionChange, 10);
    });
    document.addEventListener('keyup', () => {
        // Immediate check for keyup to catch keyboard selections
        setTimeout(handleSelectionChange, 10);
    });

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
                console.log('Selected text from sidepanel:', request.selectedText);
                
                // Check if we have a current selection
                const currentSelection = window.getSelection();
                console.log('Current selection range count:', currentSelection.rangeCount);
                console.log('Current selected text:', currentSelection.toString());
                
                // Try to use saved range first, then current selection, then find text
                if (savedRange && savedRange.toString().trim()) {
                    console.log('Using saved range for highlighting:', savedRange.toString());
                    highlightRange(savedRange, request.action);
                    sendResponse({ ok: true, success: true, message: 'Highlight applied successfully' });
                } else if (currentSelection.rangeCount > 0 && currentSelection.toString().trim()) {
                    console.log('Using current selection for highlighting');
                    toggleHighlight(request.action);
                    sendResponse({ ok: true, success: true, message: 'Highlight applied successfully' });
                } else if (request.selectedText && request.selectedText.trim()) {
                    console.log('Using selectedText from sidepanel for highlighting');
                    highlightTextInPage(request.selectedText, request.action);
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

    // Function to highlight a specific range
    function highlightRange(range, action = 'yellow') {
        console.log('highlightRange called with:', range.toString(), action);
        
        try {
            if (action === 'remove') {
                removeHighlights(range);
            } else {
                addHighlight(range, action);
            }
            console.log('Range highlighted successfully');
        } catch (error) {
            console.error('Error highlighting range:', error);
        }
    }

    // Function to highlight specific text in the page
    function highlightTextInPage(textToHighlight, action = 'yellow') {
        console.log('highlightTextInPage called with:', textToHighlight, action);
        
        try {
            // Find the text in the page
            const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );
            
            let textNode;
            while (textNode = walker.nextNode()) {
                const text = textNode.textContent;
                if (text.includes(textToHighlight)) {
                    console.log('Found text to highlight:', text);
                    
                    // Create a range for the found text
                    const range = document.createRange();
                    const startIndex = text.indexOf(textToHighlight);
                    const endIndex = startIndex + textToHighlight.length;
                    
                    range.setStart(textNode, startIndex);
                    range.setEnd(textNode, endIndex);
                    
                    // Apply highlighting
                    if (action === 'remove') {
                        removeHighlights(range);
                    } else {
                        addHighlight(range, action);
                    }
                    
                    console.log('Text highlighted successfully');
                    return;
                }
            }
            
            console.log('Text not found in page');
        } catch (error) {
            console.error('Error highlighting text in page:', error);
        }
    }

    // Improved highlighting function
    function toggleHighlight(action = 'yellow') {
        console.log('toggleHighlight called with action:', action);
        const selection = window.getSelection();
        
        if (!selection.rangeCount) {
            console.log('No selection range found');
            return;
        }

        const range = selection.getRangeAt(0);
        const selectedText = range.toString();

        if (!selectedText || !selectedText.trim()) {
            console.log('No selected text found');
            return;
        }

        try {
            if (action === 'remove') {
                // ERASE: Remove highlights without breaking DOM structure
                removeHighlights(range);
            } else {
                // HIGHLIGHT: Add highlight without breaking DOM structure
                addHighlight(range, action);
            }
        } catch (error) {
            console.error('Highlighting error:', error);
        }
    }

    // Remove highlights without extracting content
    function removeHighlights(range) {
        console.log('Removing highlights from range');
        
        // Find all highlight spans within the range
        const walker = document.createTreeWalker(
            range.commonAncestorContainer,
            NodeFilter.SHOW_ELEMENT,
            {
                acceptNode: function(node) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const style = node.style || window.getComputedStyle(node);
                        if (style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent') {
                            return NodeFilter.FILTER_ACCEPT;
                        }
                        if (node.classList && node.classList.contains('research-assistant-highlight')) {
                            return NodeFilter.FILTER_ACCEPT;
                        }
                    }
                    return NodeFilter.FILTER_SKIP;
                }
            }
        );

        const spansToRemove = [];
        let node;
        while (node = walker.nextNode()) {
            if (range.intersectsNode(node)) {
                spansToRemove.push(node);
            }
        }

        // Remove highlight spans and replace with text nodes
        spansToRemove.forEach(span => {
            const textNode = document.createTextNode(span.textContent);
            span.parentNode.replaceChild(textNode, span);
        });

        console.log('Highlights removed successfully');
    }

    // Add highlight without extracting content
    function addHighlight(range, color) {
        console.log('Adding highlight:', color);
        
        // First remove any existing highlights
        removeHighlights(range);
        
        // Create highlight span
        const colorMap = {
            'yellow': '#ffeb3b',
            'green': '#4caf50',
            'blue': '#2196f3',
            'pink': '#e91e63',
            'orange': '#ff9800'
        };
        
        const highlightColor = colorMap[color] || '#ffeb3b';
        const highlightSpan = document.createElement('span');
        highlightSpan.style.backgroundColor = highlightColor;
        highlightSpan.style.color = 'black';
        highlightSpan.className = 'research-assistant-highlight';
        
        try {
            // Try to surround the selection with highlight span
            range.surroundContents(highlightSpan);
            console.log('Highlight added successfully');
        } catch (surroundError) {
            // If surroundContents fails, use extractContents as fallback
            console.log('surroundContents failed, using fallback method');
            
            const contents = range.extractContents();
            highlightSpan.appendChild(contents);
            range.insertNode(highlightSpan);
            console.log('Highlight added using fallback method');
        }
    }
})();