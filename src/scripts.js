let currentDirectoryHandle;
let pathStack = [];

document.getElementById('openFolder').addEventListener('click', async () => {
    // Open directory
    currentDirectoryHandle = await window.showDirectoryPicker();
    pathStack = [currentDirectoryHandle];
    await updateBreadcrumb();
    await listFiles(currentDirectoryHandle);
});

async function listFiles(directoryHandle) {
    const directoryListing = document.getElementById('directoryListing');
    directoryListing.innerHTML = ''; // Clear previous listing

    const entries = [];
    for await (const entry of directoryHandle.values()) {
        entries.push(entry);
    }

    // Sort entries alphabetically, directories first
    entries.sort((a, b) => {
        if (a.kind === b.kind) {
            return a.name.localeCompare(b.name);
        }
        return a.kind === 'directory' ? -1 : 1;
    });

    for (const entry of entries) {
        const listItem = document.createElement('li');

        if (entry.kind === 'file' && entry.name.endsWith('.html')) {
            listItem.textContent = entry.name;
            listItem.onclick = () => loadFile(entry);
            directoryListing.appendChild(listItem);
        } else if (entry.kind === 'directory') {
            const isEmpty = await isDirectoryEmpty(entry);
            listItem.textContent = entry.name;
            listItem.className = isEmpty ? 'folder empty-folder' : 'folder';
            listItem.onclick = async () => {
                pathStack.push(entry);
                await updateBreadcrumb();
                await listFiles(entry);
            };
            directoryListing.appendChild(listItem);
        }
    }
}

async function isDirectoryEmpty(directoryHandle) {
    for await (const entry of directoryHandle.values()) {
        if (entry.kind === 'file' && entry.name.endsWith('.html')) {
            return false;
        }
        if (entry.kind === 'directory') {
            const subDirectoryHandle = await directoryHandle.getDirectoryHandle(entry.name);
            if (!await isDirectoryEmpty(subDirectoryHandle)) {
                return false;
            }
        }
    }
    return true;
}

async function loadFile(fileHandle) {
    const file = await fileHandle.getFile();
    const content = await file.text();

    // Show editor
    const editor = document.getElementById('editor');
    editor.style.display = 'block';
    document.getElementById('fileName').textContent = fileHandle.name;
    const pre = document.getElementById('fileContent');
    pre.innerHTML = highlightHTML(content);

    document.getElementById('saveFile').onclick = async () => {
        const textArea = document.getElementById('fileContent');
        const content = textArea.textContent;
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
        alert('File saved successfully!');
    };
}

function highlightHTML(content) {
    // Use HTML entities for brackets for proper display
    const escapedContent = content.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return escapedContent.replace(/(&lt;\/?\s*[\w\s"'=\/\-]*&gt;)/g, '<span class="html-tag">$1</span>');
}

async function updateBreadcrumb() {
    const breadcrumb = document.getElementById('breadcrumb');
    breadcrumb.innerHTML = ''; // Clear previous breadcrumb

    pathStack.forEach((handle, index) => {
        const span = document.createElement('span');
        span.textContent = handle.name;
        span.onclick = async () => {
            pathStack = pathStack.slice(0, index + 1);
            await updateBreadcrumb();
            await listFiles(handle);
        };
        breadcrumb.appendChild(span);
    });
}
