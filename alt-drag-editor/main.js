// Get the main editor element
const editor = document.getElementById("editor-content");

// Store alternate versions for each paragraph
const alternateVersions = new Map();

// Wrap any direct text in paragraphs
editor.addEventListener("input", () => {
	const selection = window.getSelection();
	const range = selection.getRangeAt(0);
	const savedCursor = {
		node: range.startContainer,
		offset: range.startOffset,
	};

	const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
	let node;
	while ((node = walker.nextNode())) {
		if (node.parentElement === editor) {
			const p = document.createElement("p");
			node.replaceWith(p);
			p.appendChild(node);

			// If this was the node with cursor, update the range
			if (node === savedCursor.node) {
				const newRange = document.createRange();
				newRange.setStart(node, savedCursor.offset);
				newRange.collapse(true);
				selection.removeAllRanges();
				selection.addRange(newRange);
			}
		}
	}
});

// Automatically assign unique IDs to new paragraphs
new MutationObserver((mutations) => {
	for (const mutation of mutations) {
		for (const node of mutation.addedNodes) {
			if (node.tagName === "P" && node !== editor) {
				node.dataset.pId = crypto.randomUUID();
			}
		}
	}
}).observe(editor, { childList: true, subtree: true });

// Handle version toggle and Enter key
editor.addEventListener("keydown", (event) => {
	const selection = window.getSelection();
	const node = selection.anchorNode || selection.focusNode;
	const paragraph =
		node?.nodeType === Node.TEXT_NODE
			? node.parentElement?.closest("p")
			: node?.closest("p");

	if (!paragraph) return;

	if (event.ctrlKey && event.key === "." && paragraph.dataset.pId) {
		const range = selection.getRangeAt(0);
		const currentVersion = {
			html: paragraph.innerHTML,
			cursor: {
				start: range.startOffset,
				end: range.endOffset,
			},
		};

		// TODO: rework this whole section:
		// 1. store the versions in a Map
		// 2. use the Map to switch between versions
		// 3. use the Map to restore cursor position

		if (paragraph.dataset.version === "alternate") {
			// Switch back to main version
			const mainVersion = alternateVersions.get(paragraph.dataset.pId);
			alternateVersions.set(paragraph.dataset.pId, currentVersion);
			paragraph.innerHTML = mainVersion.html;
			paragraph.dataset.version = "main";

			// Restore cursor position
			const newRange = document.createRange();
			const walker = document.createTreeWalker(
				paragraph,
				NodeFilter.SHOW_TEXT
			);
			const firstTextNode = walker.nextNode();
			if (firstTextNode) {
				newRange.setStart(firstTextNode, mainVersion.cursor.start);
				newRange.setEnd(firstTextNode, mainVersion.cursor.end);
				selection.removeAllRanges();
				selection.addRange(newRange);
			}
		} else {
			// Switch to alternate version
			const alternateVersion =
				alternateVersions.get(paragraph.dataset.pId) || currentVersion;
			alternateVersions.set(paragraph.dataset.pId, currentVersion);
			paragraph.innerHTML = alternateVersion.html;
			paragraph.dataset.version = "alternate";

			// Restore cursor position
			const newRange = document.createRange();
			const walker = document.createTreeWalker(
				paragraph,
				NodeFilter.SHOW_TEXT
			);
			const firstTextNode = walker.nextNode();
			if (firstTextNode) {
				newRange.setStart(firstTextNode, alternateVersion.cursor.start);
				newRange.setEnd(firstTextNode, alternateVersion.cursor.end);
				selection.removeAllRanges();
				selection.addRange(newRange);
			}
		}
	}

	if (event.key === "Enter") {
		event.preventDefault();

		// Create new paragraph (always in main version)
		const newParagraph = document.createElement("p");
		paragraph.after(newParagraph);

		// Move cursor to new paragraph
		const range = document.createRange();
		range.setStart(newParagraph, 0);
		range.collapse(true);
		selection.removeAllRanges();
		selection.addRange(range);
		return;
	}
});
