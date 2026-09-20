
        const folderHandlesByPath = new Map();
        let allDirectoryPaths = [];
        let directoryHandles = []; // Array of folder handles
        let files = [];
        let fileContents = new Map(); // Cache file contents for search
        let activeFile = null;
        let activeFileIndex = null;
        let currentSearchQuery = '';
        let isEditMode = false;
        let currentRawContent = ''; // Raw content of the currently viewed file
        let originalRawContent = ''; // Original content before editing (for dirty detection)
        let wysiwygDirty = false; // Tracks unsaved changes in WYSIWYG editor
        let wysiwygFrontmatterRaw = ''; // Raw frontmatter string preserved during WYSIWYG editing
        
        // Virtual converter folder storage
        let converterFiles = new Map(); // Map of filename -> { content, name, relativePath }
        
        // Load converter files from localStorage on startup
        function loadConverterFiles() {
            try {
                const saved = GereedschapskistMode.storage.getItem('gereedschapskist:converterFiles');
                if (saved) {
                    const files = JSON.parse(saved);
                    converterFiles = new Map(files);
                }
            } catch (err) {
                console.error('Error loading converter files:', err);
            }
        }
        
        // Save converter files to localStorage
        function saveConverterFiles() {
            try {
                const files = Array.from(converterFiles.entries());
                GereedschapskistMode.storage.setItem('gereedschapskist:converterFiles', JSON.stringify(files));
            } catch (err) {
                console.error('Error saving converter files:', err);
            }
        }
        
        // Initialize converter files on page load
        loadConverterFiles();

        // Theme management
        function initTheme() {
            const savedTheme = GereedschapskistMode.storage.getItem('gereedschapskist:theme');
            if (savedTheme) {
                document.documentElement.setAttribute('data-theme', savedTheme);
            } else {
                document.documentElement.setAttribute('data-theme', 'light');
            }
        }

        function toggleTheme() {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            
            if (newTheme === 'dark') {
                document.documentElement.removeAttribute('data-theme');
            } else {
                document.documentElement.setAttribute('data-theme', newTheme);
            }
            
            GereedschapskistMode.storage.setItem('gereedschapskist:theme', newTheme);
        }

        // Initialize theme immediately
        initTheme();

        // Listen for system theme changes
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
                if (GereedschapskistMode.storage.getItem('gereedschapskist:theme') === 'system') {
                    if (e.matches) {
                        document.documentElement.setAttribute('data-theme', 'light');
                    } else {
                        document.documentElement.removeAttribute('data-theme');
                    }
                }
            });
        }

        // IndexedDB for storing directory handle
        const DB_NAME = GereedschapskistMode.key('gereedschapskist:MarkdownWerkbankLocalV2');
        const STORE_NAME = 'handles';

        async function openDB() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(DB_NAME, 1);
                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve(request.result);
                request.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        db.createObjectStore(STORE_NAME);
                    }
                };
            });
        }

        async function saveDirectoryHandles(handles) {
            try {
                const db = await openDB();
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                store.put(handles, 'directories');
                await new Promise((resolve, reject) => {
                    tx.oncomplete = resolve;
                    tx.onerror = () => reject(tx.error);
                });
                db.close();
            } catch (err) {
                console.error('Error saving directory handles:', err);
            }
        }

        async function getSavedDirectoryHandles() {
            try {
                const db = await openDB();
                const tx = db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const request = store.get('directories');
                const handles = await new Promise((resolve, reject) => {
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                });
                db.close();
                return handles || [];
            } catch (err) {
                console.error('Error getting saved directory handles:', err);
                return [];
            }
        }

        async function clearIndexedDB() {
            if (!confirm('Schrijven leegmaken? Gekoppelde mappen worden vergeten en lokale conversies verwijderd. Je bestanden op de computer blijven bestaan.')) {
                return;
            }
            
            try {
                // Delete the IndexedDB database
                const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
                await new Promise((resolve, reject) => {
                    deleteRequest.onsuccess = () => resolve();
                    deleteRequest.onerror = () => reject(deleteRequest.error);
                    deleteRequest.onblocked = () => {
                        console.warn('Database deletion blocked');
                        resolve();
                    };
                });
                
                // Clear directory handles
                directoryHandles = [];
                
                // Clear converter files
                converterFiles.clear();
                GereedschapskistMode.storage.removeItem('gereedschapskist:converterFiles');
                
                // Remove converter files from files array and fileContents
                files = files.filter(f => !f.isVirtual);
                for (const [path, content] of fileContents.entries()) {
                    if (path.startsWith('converter/')) {
                        fileContents.delete(path);
                    }
                }
                
                // Close the currently open document
                activeFile = null;
                activeFileIndex = null;isEditMode=false;wysiwygDirty=false;
                
                // Remove active state from file items
                document.querySelectorAll('.file-item.active, .tree-file.active').forEach(el => {
                    el.classList.remove('active');
                });
                
                // Restore welcome screen
                document.getElementById('content').innerHTML = `
                    <div class="welcome">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                        <span class="eyebrow">JE EIGEN BESTANDEN, BINNEN HANDBEREIK</span><h2>Je Markdown.<br>Je werkplek.</h2><p>Kies links een bestand om het hier te bekijken.</p>
                    </div>
                `;
                
                // Reload the file list
                await loadFiles();
                
                showNotification('Mappen losgekoppeld en lokale conversies verwijderd', 'success');
            } catch (err) {
                console.error('Error clearing IndexedDB:', err);
                showNotification('Leegmaken mislukt', 'error');
            }
        }

        async function verifyPermission(handle, mode = 'read') {
            const options = { mode };
            // Check if permission is already granted
            if ((await handle.queryPermission(options)) === 'granted') {
                return true;
            }
            // Request permission
            if ((await handle.requestPermission(options)) === 'granted') {
                return true;
            }
            return false;
        }

        async function addFolder(selectAddedProject = false) {
            if (GereedschapskistMode.example) { GereedschapskistMode.go('own'); return; }
            try {
                const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
                
                // Check if folder is already added
                const exists = directoryHandles.some(h => h.name === handle.name);
                if (exists) {
                    alert('Er is al een map met deze naam geopend. Koppel die eerst los of kies een bovenliggende map.');
                    return;
                }
                
                directoryHandles.push(handle);
                await saveDirectoryHandles(directoryHandles);
                await loadFiles();
                if (selectAddedProject) await switchProject(handle.name);
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('Error opening folder:', err);
                    showNotification('De map kon niet worden geopend. Probeer opnieuw in Chrome of Edge.', 'error');
                }
            }
        }

        function requestNewFilename(folderPath = '') {
            const today = new Date();
            const projectCode = newFileProjectCode(folderPath);
            const prefix = '';
            return new Promise(resolve => {
                const dialog = document.createElement('dialog');
                dialog.className = 'file-dialog';
                dialog.setAttribute('aria-label', 'Nieuw bestand');
                dialog.innerHTML = `<form><h2>Nieuw bestand</h2><label>Bestandsnaam<input name="filename" required autocomplete="off" style="display:block;width:100%;padding:10px;margin:8px 0"></label><p>Typ een bestandsnaam. De extensie .md voegen we toe.</p><button type="button">Annuleren</button> <button type="submit">Aanmaken</button></form>`;
                const input = dialog.querySelector('input');
                input.value = prefix;
                const finish = value => { dialog.close(); dialog.remove(); resolve(value); };
                dialog.querySelector('button[type="button"]').onclick = () => finish(null);
                dialog.addEventListener('cancel', event => { event.preventDefault(); finish(null); });
                dialog.querySelector('form').onsubmit = event => {
                    event.preventDefault();
                    if (!input.value.trim().replace(/\.md$/i, '').replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/^(?:VCU|HPAI|HP|WB|BOS|FMT)-/i, '').trim()) {
                        input.setCustomValidity('Vul ook een titel in.'); input.reportValidity(); return;
                    }
                    finish(input.value);
                };
                input.oninput = () => input.setCustomValidity('');
                document.body.append(dialog); dialog.showModal();
                input.focus(); input.setSelectionRange(prefix.length, prefix.length);
            });
        }

        async function createNewFile(options = {}) {
            if (directoryHandles.length === 0) {
                showNotification('Open eerst een map', 'error');
                return { ok: false, error: 'No folder is open' };
            }

            let folderHandle = options.folderPath ? folderHandlesByPath.get(options.folderPath) : options.folderName
                ? directoryHandles.find(handle => handle.name === options.folderName)
                : directoryHandles[0];
            const pendingInbox=!folderHandle&&options.folderPath?.endsWith('/Inbox')?folderHandlesByPath.get(options.folderPath.slice(0,-6)):null;
            if(pendingInbox)folderHandle=pendingInbox;
            if (options.folderName && !folderHandle) {
                return { ok: false, error: `Folder is not open: ${options.folderName}` };
            }
            if (!options.folderPath && !options.folderName && directoryHandles.length > 1) {
                const choices = directoryHandles.map((handle, index) => `${index + 1}. ${handle.name}`).join('\n');
                const answer = prompt(`Kies een mapnummer:\n\n${choices}`, '1');
                if (answer === null) return { ok: false, error: 'Cancelled' };
                const folderIndex = Number.parseInt(answer, 10) - 1;
                if (!Number.isInteger(folderIndex) || !directoryHandles[folderIndex]) {
                    showNotification('Dit mapnummer bestaat niet', 'error');
                    return { ok: false, error: 'Folder number does not exist' };
                }
                folderHandle = directoryHandles[folderIndex];
            }

            if (!folderHandle) return { ok:false, error:'Open eerst de doelmap.' };
            // Ask for write access while the New File click still counts as user activation.
            // Waiting until after the filename prompt makes Chromium reject the request.
            let writePermission = await folderHandle.queryPermission({ mode: 'readwrite' });
            if (writePermission !== 'granted') {
                try {
                    writePermission = await folderHandle.requestPermission({ mode: 'readwrite' });
                } catch (err) {
                    console.warn('Could not request write permission:', err);
                }
            }
            if (writePermission !== 'granted') {
                showNotification('Open de map opnieuw en geef toestemming om bestanden op te slaan', 'error');
                return { ok: false, error: 'Re-open the folder and allow write access' };
            }

            const requestedName = options.filename || await requestNewFilename(options.folderPath || folderHandle.name);
            if (requestedName === null) return { ok: false, error: 'Cancelled' };

            let filename = requestedName.trim();
            if (!filename) {
                showNotification('Vul een bestandsnaam in', 'error');
                return { ok: false, error: 'File name is empty' };
            }
            if (filename.includes('/') || filename.includes('\\') || filename.includes('\0')) {
                showNotification('Gebruik een bestandsnaam zonder schuine strepen', 'error');
                return { ok: false, error: 'File name contains an invalid character' };
            }
            const documentTitle = filename.replace(/\.md$/i, '').replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/^(?:VCU|HPAI|HP|WB|BOS|FMT)-/i, '').replace(/[-_]+/g, ' ').trim();
            if (!options.filename) {
                filename = filename.replace(/\.md$/i, '').normalize('NFKC').toLowerCase()
                    .replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
                filename = filename.replace(/^(\d{4}-\d{2}-\d{2}-)?(vcu|hpai|hp|wb|bos|fmt)-/, (_, date, code) => (date || '') + code.toUpperCase() + '-');
                if (!/[\p{L}\p{N}]/u.test(filename)) {
                    showNotification('Vul een titel met letters of cijfers in', 'error');
                    return { ok: false, error: 'File name is empty' };
                }
            }
            if (!filename.toLowerCase().endsWith('.md')) filename += '.md';

            if(pendingInbox){try{folderHandle=await pendingInbox.getDirectoryHandle('Inbox',{create:true});folderHandlesByPath.set(options.folderPath,folderHandle);}catch(error){showNotification('Inbox kon niet worden aangemaakt.','error');return {ok:false,error:error.message};}}
            const existingNames = [];
            for await (const entry of folderHandle.values()) existingNames.push(entry.name.toLowerCase());
            if (existingNames.includes(filename.toLowerCase())) {
                showNotification('Er bestaat al een bestand met deze naam', 'error');
                return { ok: false, error: 'File already exists' };
            }

            try {
                const fileHandle = await folderHandle.getFileHandle(filename, { create: true });
                const title = documentTitle;
                const initialContent = `# ${title}\n\n`;
                const writable = await fileHandle.createWritable();
                await writable.write(initialContent);
                await writable.close();

                await loadFiles();
                const relativePath = `${options.folderPath || folderHandle.name}/${filename}`;
                const newIndex = files.findIndex(file => file.relativePath === relativePath);
                if (newIndex !== -1) {
                    await selectFile(newIndex);
                    if (!isEditMode) await toggleEditMode();
                    const editor = document.getElementById('wysiwygEditor');
                    if (editor) editor.focus();
                }
                showNotification(`Aangemaakt: ${filename}`, 'success');
                return { ok: true, filename, folderName: folderHandle.name };
            } catch (err) {
                console.error('Error creating file:', err);
                showNotification(`Aanmaken mislukt: ${err.message}`, 'error');
                return { ok: false, error: err.message };
            }
        }

        async function removeFolder(index) {
            const handle=directoryHandles[index];if(!handle)return;
            const removesActive=activeFile?.folderName===handle.name;
            if(removesActive && wysiwygDirty && !confirm('Je hebt niet-opgeslagen wijzigingen. Weggooien en map uit de lijst verwijderen?')) return;
            const remaining=directoryHandles.filter((_,i)=>i!==index);
            await saveDirectoryHandles(remaining);
            directoryHandles=remaining;
            if(selectedProject===handle.name || selectedProject.startsWith(handle.name+'/')){selectedProject='all';GereedschapskistMode.storage.setItem('gereedschapskist:mw-project','all');}
            if(removesActive){activeFile=null;isEditMode=false;wysiwygDirty=false;currentRawContent=originalRawContent='';document.getElementById('content').classList.remove('editing');document.getElementById('content').innerHTML='<div class="welcome"><h2>Kies je document.</h2></div>';}
            await loadFiles();
            activeFileIndex=activeFile?files.findIndex(f=>f.relativePath===activeFile.relativePath):null;renderFileList();
            showNotification(handle.name+' is uit de lijst verwijderd. De map en bestanden blijven op je computer staan.','success');
        }

        async function restoreSavedFolders() {
            if (document.readyState === 'loading') await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
            await GereedschapskistMode.ready;
            if (GereedschapskistMode.redirecting) return;
            const savedHandles = await getSavedDirectoryHandles();
            if (savedHandles.length > 0) {
                const validHandles = [];
                for (const handle of savedHandles) {
                    try {
                        const hasPermission = await verifyPermission(handle);
                        if (hasPermission) {
                            validHandles.push(handle);
                        }
                    } catch (err) {
                        console.error('Error verifying permission for folder:', err);
                    }
                }
                
                if (validHandles.length > 0) {
                    directoryHandles = validHandles;
                    await saveDirectoryHandles(directoryHandles);
                    await loadFiles();
                } else if (converterFiles.size > 0) {
                    // No valid folders but we have converter files, load them
                    await loadFiles();
                }
            } else if (converterFiles.size > 0) {
                // No saved folders but we have converter files, load them
                await loadFiles();
            }
        }

        async function refreshFolders() {
            if(wysiwygDirty && !confirm('Je hebt niet-opgeslagen wijzigingen. Weggooien en vernieuwen?')) return;
            if (directoryHandles.length === 0) return;
            
            const refreshBtn = document.getElementById('refreshBtn');
            refreshBtn.classList.add('spinning');
            refreshBtn.disabled = true;
            
            try {
                // Verify permissions for all folders
                const validHandles = [];
                for (const handle of directoryHandles) {
                    try {
                        const hasPermission = await verifyPermission(handle);
                        if (hasPermission) {
                            validHandles.push(handle);
                        }
                    } catch (err) {
                        console.error('Error verifying permission:', err);
                    }
                }
                
                directoryHandles = validHandles;
                await saveDirectoryHandles(directoryHandles);
                
                if (directoryHandles.length > 0) {
                    const reopenPath=activeFile?.relativePath;
                    activeFile=null;isEditMode=false;wysiwygDirty=false;
                    await loadFiles();
                    const reopened=files.findIndex(f=>f.relativePath===reopenPath);if(reopened>=0)await selectFile(reopened);
                } else {
                    renderFolderList();
                    const fileList = document.getElementById('fileList');
                    
                    // Check if there are converter files
                    if (converterFiles.size > 0) {
                        await loadFiles(); // This will handle converter files
                    } else {
                        fileList.innerHTML = `
                            <div class="empty-state">
                                Koppel je mappen opnieuw.<br>Kies ‘Open map’ en geef toegang.
                            </div>
                        `;
                    }
                }
            } catch (err) {
                console.error('Error refreshing folders:', err);
            } finally {
                refreshBtn.classList.remove('spinning');
                refreshBtn.disabled = directoryHandles.length === 0;
            }
        }

        function renderFolderList() {
            const target = document.getElementById('newItemTarget');
            const previous = target.value;
            target.replaceChildren(...directoryHandles.map(handle => new Option(handle.name, handle.name)));
            if (directoryHandles.some(handle => handle.name === previous)) target.value = previous;
            document.getElementById('newItemTargetLabel').hidden = directoryHandles.length < 2;
            document.getElementById('newFolderBtn').disabled = directoryHandles.length === 0;
            document.getElementById('workspaceTitle').textContent = directoryHandles.length === 1 ? directoryHandles[0].name.toUpperCase() : 'MARKDOWN';
            const folderListEl = document.getElementById('folderList');
            const newFileBtn = document.getElementById('newFileBtn');
            if (newFileBtn) newFileBtn.disabled = directoryHandles.length === 0;
            
            if (directoryHandles.length === 0) {
                folderListEl.innerHTML = '';
                folderListEl.style.display = 'none';
                return;
            }
            
            folderListEl.style.display = 'block';
            folderListEl.innerHTML = directoryHandles.map((handle, index) => `
                <div class="folder-tag">
                    <span class="folder-tag-name">${escapeHtml(handle.name)}</span>
                    <button class="folder-tag-remove" onclick="removeFolder(${index})" title="Map loskoppelen">×</button>
                </div>
            `).join('');
        }

        async function loadFiles() {
            allDirectoryPaths = [];
            folderHandlesByPath.clear();
            files = [];
            fileContents.clear();
            expandedFolders.clear();
            activeFileIndex = null;
            const fileList = document.getElementById('fileList');
            const loader = document.getElementById('loader');
            const loaderCount = document.getElementById('loaderCount');
            const refreshBtn = document.getElementById('refreshBtn');
            
            // Render folder list
            renderFolderList();
            
            // Enable refresh button if we have folders
            refreshBtn.disabled = directoryHandles.length === 0;

            // Add virtual converter files even if no folders selected
            for (const [filename, fileData] of converterFiles.entries()) {
                const virtualFile = {
                    relativePath: `converter/${filename}`,
                    folderName: 'converter',
                    name: filename,
                    isVirtual: true,
                    getFile: async () => {
                        return new File([fileData.content], filename, { type: 'text/markdown' });
                    }
                };
                files.push(virtualFile);
            }

            if (directoryHandles.length === 0 && converterFiles.size === 0) {
                fileList.innerHTML = '<div class="empty-state">Nog geen map geopend.<br>Kies ‘Mappen’ → ‘Open map’ om je bestanden te bekijken.</div>';
                return;
            }
            
            if (directoryHandles.length === 0 && converterFiles.size > 0) {
                // Only converter files, no need for loader
                loader.classList.remove('visible');
                fileList.style.display = 'block';
                files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
                renderFileList();
                await loadAllFileContents();
                return;
            }

            // Show loader and hide file list
            loader.classList.add('visible');
            fileList.style.display = 'none';
            loaderCount.textContent = '';

            // Recursively scan directory for markdown files
            async function scanDirectory(dirHandle, baseName, path = '', ignoreRules = []) {
                allDirectoryPaths.push(path ? `${baseName}/${path}` : baseName);
                folderHandlesByPath.set(path ? `${baseName}/${path}` : baseName, dirHandle);
                for await (const entry of dirHandle.values()) {
                    if (entry.name.startsWith('.') || entry.name==='node_modules' || entry.name==='Herstelkopieen') continue;
                    const entryPath = path ? `${path}/${entry.name}` : entry.name;
                    if (pathIsIgnored(entryPath, entry.kind === 'directory', ignoreRules)) continue;
                    if (entry.kind === 'file' && /\.(md|markdown|txt)$/i.test(entry.name)) {
                        // Store both the handle and the relative path (prefixed with folder name)
                        const fullPath = path ? `${baseName}/${path}/${entry.name}` : `${baseName}/${entry.name}`;
                        entry.relativePath = fullPath;
                        entry.folderName = baseName;
                        files.push(entry);
                        // Update loader count
                        loaderCount.textContent = `${projectFiles().length} bestanden gevonden…`;
                    } else if (entry.kind === 'directory') {
                        // Recursively scan subdirectories
                        const subPath = path ? `${path}/${entry.name}` : entry.name;
                        await scanDirectory(entry, baseName, subPath, ignoreRules);
                    }
                }
            }

            // Scan all folders
            for (const handle of directoryHandles) {
                expandedFolders.add(handle.name);
                await scanDirectory(handle, handle.name, '', await loadIgnoreRules(handle));
            }
            
            // Hide loader and show file list
            loader.classList.remove('visible');
            fileList.style.display = 'block';

            // Sort alphabetically by relative path
            files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

            if (files.length === 0) {
                // Check if we have converter files that should be shown
                if (converterFiles.size > 0) {
                    // Converter files should have been added earlier, but if not, add them now
                    for (const [filename, fileData] of converterFiles.entries()) {
                        const virtualFile = {
                            relativePath: `converter/${filename}`,
                            folderName: 'converter',
                            name: filename,
                            isVirtual: true,
                            getFile: async () => {
                                return new File([fileData.content], filename, { type: 'text/markdown' });
                            }
                        };
                        files.push(virtualFile);
                    }
                    files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
                    renderFileList();
                    await loadAllFileContents();
                    return;
                } else {
                    renderFileList();
                    return;
                }
            }

            // Render file list
            renderFileList();

            // Pre-load file contents for search
            await loadAllFileContents();
        }

        async function loadAllFileContents() {
            for (const file of files) {
                try {
                    let text;
                    if (file.isVirtual) {
                        // Virtual file - get content directly
                        const fileData = converterFiles.get(file.name);
                        text = fileData ? fileData.content : '';
                    } else {
                        const fileData = await file.getFile();
                        text = await fileData.text();
                    }
                    fileContents.set(file.relativePath, text);
                } catch (err) {
                    console.error(`Error loading ${file.relativePath}:`, err);
                }
            }
            try { for (const path of JSON.parse(GereedschapskistMode.storage.getItem('gereedschapskist:mw-folders-'+selectedProject)||'[]')) expandedFolders.add(path); } catch {}
            renderFileList();
            if(!activeFile) await restoreLastOpenFile();
        }

        function initialDocumentPath(paths, saved, roots) {
            if (saved && paths.includes(saved)) return saved;
            for (const root of roots) {
                const match = paths.find(path => path.slice(0, path.lastIndexOf('/')) === root && /^(?:00\s*-\s*)?begin hier\.md$/i.test(path.split('/').pop()));
                if (match) return match;
            }
            return null;
        }

        function restoreLastOpenFile() {
            if (activeFile) return;
            try {
                const savedPath = GereedschapskistMode.storage.getItem('gereedschapskist:mw-document-'+selectedProject);
                const lastPath = initialDocumentPath(files.filter(f=>projectIncludes(f.relativePath)).map(f=>f.relativePath), savedPath, selectedProject==='all'?directoryHandles.map(h=>h.name):[selectedProject]);
                if (!lastPath) return;
                const idx = files.findIndex(f => f.relativePath === lastPath && projectIncludes(f.relativePath));
                if (idx !== -1) {
                    // Expand parent folders so the file is visible in the tree
                    const parts = projectTreePath(lastPath).split('/');
                    let folderPath = '';
                    for (let i = 0; i < parts.length - 1; i++) {
                        folderPath = folderPath ? folderPath + '/' + parts[i] : parts[i];
                        expandedFolders.add(folderPath);
                    }
                    renderFileList();
                    selectFile(idx);
                }
            } catch (e) {}
        }

        // Track expanded folders
        let expandedFolders = new Set();

        function buildFileTree(filesList) {
            const tree = { folders: Object.create(null), files: [] };
            
            for (let i = 0; i < filesList.length; i++) {
                const file = filesList[i];
                const parts = projectTreePath(file.relativePath).split('/');
                
                if (parts.length === 1) {
                    // Root level file
                    tree.files.push({ file, index: files.indexOf(file) });
                } else {
                    // Nested file
                    let current = tree;
                    for (let j = 0; j < parts.length - 1; j++) {
                        const folderName = parts[j];
                        if (!current.folders[folderName]) {
                            current.folders[folderName] = { folders: Object.create(null), files: [] };
                        }
                        current = current.folders[folderName];
                    }
                    current.files.push({ file, index: files.indexOf(file) });
                }
            }
            
            for (const originalPath of allDirectoryPaths.filter(projectIncludes)) {
                const path = projectTreePath(originalPath);
                let current = tree;
                for (const part of path.split('/')) {
                    if (!current.folders[part]) current.folders[part] = { folders: Object.create(null), files: [] };
                    current = current.folders[part];
                }
            }
            return tree;
        }

        function renderTree(tree, path = '') {
            let html = '';
            
            // Sort and render folders first
            const folderNames = Object.keys(tree.folders).sort((a,b)=> a.localeCompare(b,'nl'));
            for (const folderName of folderNames) {
                const folderPath = path ? `${path}/${folderName}` : folderName;
                const isExpanded = expandedFolders.has(folderPath);
                const folder = tree.folders[folderName];
                const rootIndex=directoryHandles.findIndex(h=>h.name===folderPath);
                
                html += `
                    <div class="tree-folder">
                        <div class="tree-folder-row"><div class="tree-folder-header ${isExpanded ? 'expanded' : ''}" role="button" tabindex="0" aria-expanded="${isExpanded}" data-folder-path="${escapeHtml(folderPath)}" onclick="toggleFolder(this.dataset.folderPath)">
                            <svg class="chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                            <svg class="folder-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                            </svg>
                            <span>${escapeHtml(folderPath === "converter" ? "Losse documenten" : folderName)}</span>
                        </div>
                        ${rootIndex>=0 ? `<button class="tree-folder-remove" onclick="removeFolder(${rootIndex})" title="Uit lijst verwijderen; bestanden blijven staan" aria-label="${escapeHtml(folderName)} uit lijst verwijderen">×</button>` : ''}</div>
                        <div class="tree-folder-contents ${isExpanded ? 'expanded' : ''}" data-path="${escapeHtml(folderPath)}">
                            ${renderTree(folder, folderPath)}
                        </div>
                    </div>
                `;
            }
            
            // Then render files
            for (const { file, index } of tree.files) {
                const activeClass = index === activeFileIndex ? 'active' : '';
                const fileName = file.name;
                
                html += `
                    <div role="button" tabindex="0" class="tree-file ${activeClass}" data-index="${index}" onclick="selectFile(${index})">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                        <span class="file-name">${escapeHtml(fileName)}</span>
                    </div>
                `;
            }
            
            return html;
        }

        function toggleFolder(path) {
            if (expandedFolders.has(path)) {
                expandedFolders.delete(path);
            } else {
                expandedFolders.add(path);
            }
            
            const isExpanded = expandedFolders.has(path);
            const header = Array.from(document.querySelectorAll('.tree-folder-header[data-folder-path]'))
                .find(element => element.dataset.folderPath === path);
            if (header) {
                header.classList.toggle('expanded', isExpanded);
                header.setAttribute('aria-expanded', String(isExpanded));
                header.closest('.tree-folder-row')?.nextElementSibling?.classList.toggle('expanded', isExpanded);
            }
        }

        function renderFileList(searchResults = null) {
            updateProjectControls();
            if(selectedProject !== 'all') expandedFolders.add(selectedProject);
            const fileList = document.getElementById('fileList');
            
            if (searchResults !== null) {
                // Flat list for search results
                if (searchResults.length === 0) {
                    fileList.innerHTML = '<div class="empty-state">Geen resultaten gevonden.</div>';
                    return;
                }

                fileList.innerHTML = searchResults.map(result => {
                    const index = files.findIndex(f => f.relativePath === result.file.relativePath);
                    const activeClass = index === activeFileIndex ? 'active' : '';
                    
                    if (result.matchPreview) {
                        return `
                            <div class="file-item has-match ${activeClass}" data-index="${index}" onclick="selectFile(${index})">
                                <div class="file-name-row">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                        <polyline points="14 2 14 8 20 8"></polyline>
                                    </svg>
                                    ${highlightText(result.file.relativePath, currentSearchQuery)}
                                </div>
                                <span class="match-preview">${result.matchPreview}</span>
                            </div>
                        `;
                    }
                    
                    return `
                        <div class="file-item ${activeClass}" data-index="${index}" onclick="selectFile(${index})">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                            </svg>
                            ${highlightText(result.file.relativePath, currentSearchQuery)}
                        </div>
                    `;
                }).join('');
            } else {
                // Tree view for normal browsing
                const tree = buildFileTree(projectFiles());
                fileList.innerHTML = `<div class="folder-tree">${renderTree(tree)}</div>`;
                if(!projectFiles().length && !allDirectoryPaths.some(projectIncludes)) fileList.innerHTML='<div class="empty-state">Open een eigen werkmap.</div>';
            }
        }

        function highlightText(text, query) {
            if (!query) return escapeHtml(text);
            const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
            return escapeHtml(text).replace(regex, '<mark>$1</mark>');
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        }

        function escapeRegex(string) {
            return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }

        function parseFrontmatter(content) {
            const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n?/;
            const match = content.match(frontmatterRegex);
            
            if (!match) {
                return { frontmatter: null, content: content };
            }

            const frontmatterText = match[1];
            const bodyContent = content.slice(match[0].length);
            const frontmatter = {};

            // Parse YAML-like frontmatter
            const lines = frontmatterText.split('\n');
            let currentKey = null;
            let currentValue = [];

            for (const line of lines) {
                // Check if it's a new key
                const keyMatch = line.match(/^([a-zA-Z_-]+)\s*:\s*(.*)$/);
                
                if (keyMatch) {
                    // Save previous key if exists
                    if (currentKey) {
                        frontmatter[currentKey] = currentValue.length === 1 ? currentValue[0] : currentValue;
                    }
                    
                    currentKey = keyMatch[1];
                    const value = keyMatch[2].trim();
                    
                    // Check for inline array [item1, item2]
                    if (value.startsWith('[') && value.endsWith(']')) {
                        currentValue = value.slice(1, -1).split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
                    } else if (value) {
                        currentValue = [value.replace(/^["']|["']$/g, '')];
                    } else {
                        currentValue = [];
                    }
                } else if (line.match(/^\s+-\s+(.+)$/)) {
                    // Array item
                    const itemMatch = line.match(/^\s+-\s+(.+)$/);
                    currentValue.push(itemMatch[1].trim().replace(/^["']|["']$/g, ''));
                } else if (line.trim() && currentKey) {
                    // Continuation of previous value
                    currentValue.push(line.trim());
                }
            }
            
            // Save last key
            if (currentKey) {
                frontmatter[currentKey] = currentValue.length === 1 ? currentValue[0] : currentValue;
            }

            return { frontmatter, content: bodyContent };
        }



        async function selectFile(index) {
            const file = files[index];
            if (!file) return;

            // If in edit mode with unsaved changes, confirm before switching
            if (isEditMode) {
                if (wysiwygDirty) {
                    if (!confirm('Je hebt wijzigingen die niet zijn opgeslagen. Wil je die weggooien?')) {
                        return;
                    }
                }
                wysiwygDirty = false;
                isEditMode = false;
                document.getElementById('content').classList.remove('editing');
            }

            activeFileIndex = index;

            // Update active state for both flat list and tree view
            document.querySelectorAll('.file-item, .tree-file').forEach((el) => {
                const elIndex = parseInt(el.dataset.index);
                el.classList.toggle('active', elIndex === index);
            });

            activeFile = file;

            // Remember the open file for session restore
            try {
                GereedschapskistMode.storage.setItem('gereedschapskist:lastOpenFile', file.relativePath);
                GereedschapskistMode.storage.setItem('gereedschapskist:mw-document-'+selectedProject, file.relativePath);
            } catch (e) {}

            try {
                let rawContent;
                if (file.isVirtual) {
                    const fileData = converterFiles.get(file.name);
                    rawContent = fileData ? fileData.content : '';
                } else {
                    rawContent = await (await file.getFile()).text();
                    fileContents.set(file.relativePath, rawContent);
                }
                
                // Store raw content for editing
                currentRawContent = rawContent;
                originalRawContent = rawContent;
                
                Werkstatus.document(file.relativePath,rawContent);
                renderFileView(rawContent);
            } catch (err) {
                console.error('Lezen mislukt:', err);
                document.getElementById('content').innerHTML = `
                    <div class="welcome">
                        <p>Lezen mislukt: ${err.message}</p>
                    </div>
                `;
            }

            // Close sidebar on mobile
            if (window.innerWidth <= 768) {
                toggleSidebar();
            }
        }

        // --- Wiki-link / Bi-directional link support ---

        function resolveWikiLink(linkText) { return resolveInternalDocument(linkText, files); }

        function processWikiLinks(html) {
            const root = document.createElement('div');
            root.innerHTML = html;
            renderInternalLinks(root);
            return root.innerHTML;
        }

        function getBacklinks(currentFile) {
            if (!currentFile) return [];
            const backlinks = [];
            const currentName = currentFile.name.replace(/\.[^.]+$/, '').toLowerCase();
            const currentRel = currentFile.relativePath.replace(/\.[^.]+$/, '').toLowerCase();

            for (const [path, content] of fileContents) {
                if (path === currentFile.relativePath) continue;
                // Find all [[...]] references in this file's raw content
                const wikiRe = /\[\[([^\]|]+?)(?:\|[^\]]+?)?\]\]/g;
                let m;
                while ((m = wikiRe.exec(content)) !== null) {
                    const target = m[1].trim().toLowerCase();
                    if (resolveWikiLink(m[1]) === currentFile) {
                        // Find context around the match
                        const start = Math.max(0, m.index - 40);
                        const end = Math.min(content.length, m.index + m[0].length + 40);
                        let preview = content.slice(start, end).replace(/\n/g, ' ').trim();
                        if (start > 0) preview = '...' + preview;
                        if (end < content.length) preview = preview + '...';

                        const file = files.find(f => f.relativePath === path);
                        if (file) {
                            backlinks.push({ file, path, preview });
                        }
                        break; // one entry per file
                    }
                }
            }
            return backlinks;
        }

        function renderBacklinks(backlinks) {
            if (backlinks.length === 0) {
                return `
                    <div class="backlinks-section">
                        <div class="backlinks-header">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M9 17H7A5 5 0 0 1 7 7h2"></path>
                                <path d="M15 7h2a5 5 0 0 1 0 10h-2"></path>
                                <line x1="8" y1="12" x2="16" y2="12"></line>
                            </svg>
                            Verwijzingen hierheen
                            <span class="backlinks-count">0</span>
                        </div>
                        <div class="backlinks-empty">Nog geen andere bestanden verwijzen naar deze pagina.</div>
                    </div>
                `;
            }

            const items = backlinks.map(bl => {
                const idx = files.indexOf(bl.file);
                return `
                    <div class="backlink-item" onclick="selectFile(${idx})">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                        <div class="backlink-info">
                            <span class="backlink-name">${escapeHtml(bl.file.name.replace(/\.[^.]+$/, ''))}</span>
                            <span class="backlink-preview">${escapeHtml(bl.preview)}</span>
                        </div>
                    </div>
                `;
            }).join('');

            return `
                <div class="backlinks-section">
                    <div class="backlinks-header">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 17H7A5 5 0 0 1 7 7h2"></path>
                            <path d="M15 7h2a5 5 0 0 1 0 10h-2"></path>
                            <line x1="8" y1="12" x2="16" y2="12"></line>
                        </svg>
                        Verwijzingen hierheen
                        <span class="backlinks-count">${backlinks.length}</span>
                    </div>
                    <div class="backlinks-list">
                        ${items}
                    </div>
                </div>
            `;
        }

        function openDeleteFileDialog() {
            const file = activeFile;
            if (!file || file.isVirtual) return;
            const sourcePath = file.relativePath.slice(0, file.relativePath.lastIndexOf('/'));
            const dialog = document.createElement('dialog');
            dialog.className = 'file-dialog';
            dialog.innerHTML = `<form><h2>Bestand verwijderen?</h2><p class="delete-name" style="overflow-wrap:anywhere"></p>
                <p>Eventuele niet-opgeslagen wijzigingen gaan ook verloren.</p><p>Dit verwijdert het bestand definitief uit je lokale map.<br>Het gaat niet naar de prullenmand.</p>
                <p role="alert"></p><button type="button" autofocus>Annuleren</button> <button type="submit">Definitief verwijderen</button></form>`;
            dialog.querySelector('.delete-name').textContent = file.relativePath;
            let busy = false;
            dialog.oncancel = event => { if (busy) event.preventDefault(); };
            dialog.querySelector('[type="button"]').onclick = () => { if (!busy) dialog.close(); };
            dialog.onclose = () => dialog.remove();
            dialog.querySelector('form').onsubmit = async event => {
                event.preventDefault();
                if (busy) return;
                busy = true;
                const submit = dialog.querySelector('[type="submit"]');
                submit.disabled = true;
                const result = await deleteMarkdownFile(file, folderHandlesByPath.get(sourcePath));
                if (!result.ok) {
                    dialog.querySelector('[role="alert"]').textContent = result.error;
                    busy = false; submit.disabled = false;
                    return;
                }
                dialog.close();
                activeFile = null; activeFileIndex = null;
                currentRawContent = ''; originalRawContent = '';
                isEditMode = false; wysiwygDirty = false;
                fileContents.delete(file.relativePath);
                files = files.filter(entry => entry !== file);
                try { GereedschapskistMode.storage.removeItem('gereedschapskist:lastOpenFile'); } catch (_) {}
                const content = document.getElementById('content');
                content.classList.remove('editing');
                content.innerHTML = '<div class="empty-state"><p>Bestand verwijderd. Kies een ander bestand uit de lijst.</p></div>';
                renderFileList();
                try {
                    await loadFiles();
                    showNotification(`Verwijderd: ${file.name}`, 'success');
                } catch (_) { showNotification('Bestand verwijderd. Vernieuw de folder om het overzicht bij te werken.', 'error'); }
            };
            document.body.append(dialog); dialog.showModal();
        }

        async function deleteMarkdownFile(file, source) {
            if (!file || file.isVirtual || !/\.md$/i.test(file.name) || !source) return { ok: false, error: 'Selecteer een lokaal Markdown-bestand.' };
            try {
                const permission = await source.requestPermission({ mode: 'readwrite' });
                if (permission !== 'granted') return { ok: false, error: 'Geef schrijftoegang tot deze map om het bestand te verwijderen.' };
                const current = await source.getFileHandle(file.name);
                if (!await current.isSameEntry(file)) return { ok: false, error: 'Het bestand is intussen vervangen. Vernieuw de folder en probeer opnieuw.' };
                await source.removeEntry(file.name);
                return { ok: true };
            } catch (error) {
                return { ok: false, error: `Verwijderen is niet gelukt. ${error.message}` };
            }
        }

        function openMoveFileDialog() {
            const file = activeFile;
            if (!file || file.isVirtual) return;
            if (wysiwygDirty) { showNotification('Sla je wijzigingen eerst op.', 'error'); return; }
            const sourcePath = file.relativePath.slice(0, file.relativePath.lastIndexOf('/'));
            const root = moveProjectRoot(file.relativePath);
            const dialog = document.createElement('dialog');
            dialog.className = 'file-dialog';
            dialog.innerHTML = `<form><h2>Bestand verplaatsen</h2><p class="move-name"></p>
                <p class="move-scope"></p>
                <label><input class="move-outside" type="checkbox"> Ook buiten dit project</label>
                <label class="move-search-label" style="display:none;margin:12px 0">Map zoeken<br><input class="move-search" type="search" placeholder="Zoek een map" style="width:100%;padding:10px;font:inherit"></label>
                <label>Naar map<br><select required style="width:100%;padding:10px"></select></label>
                <p role="alert"></p><button type="button">Annuleren</button> <button type="submit">Verplaatsen</button></form>`;
            dialog.querySelector('.move-name').textContent = file.relativePath;
            const select = dialog.querySelector('select');
            const outside = dialog.querySelector('.move-outside');
            const search = dialog.querySelector('.move-search');
            const submit = dialog.querySelector('[type="submit"]');
            const updateDestinations = () => {
                const previous = select.value;
                dialog.querySelector('.move-search-label').style.display = 'block';
                const paths = moveDestinationPaths([...folderHandlesByPath.keys()], sourcePath, root, outside.checked, search.value);
                select.replaceChildren(...paths.map(path => new Option(path, path)));
                if (paths.includes(previous)) select.value = previous;
                submit.disabled = !paths.length;
                dialog.querySelector('.move-scope').textContent = outside.checked ? 'Alle geopende mappen' : `Binnen ${root.split('/').pop()}`;
                dialog.querySelector('[role="alert"]').textContent = paths.length ? '' : search.value ? 'Geen map gevonden.' : 'Geen andere werkmap beschikbaar. Kies All om alle mappen te tonen.';
            };
            outside.onchange = updateDestinations;
            search.oninput = updateDestinations;
            updateDestinations();
            let busy = false;
            dialog.oncancel = event => { if (busy) event.preventDefault(); };
            dialog.querySelector('[type="button"]').onclick = () => { if (!busy) dialog.close(); };
            dialog.onclose = () => dialog.remove();
            dialog.querySelector('form').onsubmit = async event => {
                event.preventDefault();
                if (busy) return;
                busy = true; submit.disabled = true;
                const targetPath = select.value;
                if (!moveDestinationPaths([...folderHandlesByPath.keys()], sourcePath, root, outside.checked, search.value).includes(targetPath)) {
                    busy = false; updateDestinations(); return;
                }
                const result = await moveMarkdownFile(file, folderHandlesByPath.get(sourcePath), folderHandlesByPath.get(targetPath));
                if (result.ok) {
                    dialog.close();
                    try {
                        await loadFiles();
                        const newPath = `${targetPath}/${file.name}`;
                        const parts = targetPath.split('/');
                        for (let i = 1; i <= parts.length; i++) expandedFolders.add(parts.slice(0, i).join('/'));
                        renderFileList();
                        const index = files.findIndex(entry => entry.relativePath === newPath);
                        if (index !== -1) await selectFile(index);
                        showNotification(`Verplaatst naar ${targetPath}`, 'success');
                    } catch (error) { showNotification('Bestand is verplaatst. Vernieuw de folder om het overzicht bij te werken.', 'error'); }
                } else {
                    dialog.querySelector('[role="alert"]').textContent = result.error;
                    busy = false; submit.disabled = false;
                }
            };
            document.body.append(dialog); dialog.showModal();
        }

        async function sameFileBytes(first, second) {
            if (first.size !== second.size) return false;
            const a = new Uint8Array(await first.arrayBuffer());
            const b = new Uint8Array(await second.arrayBuffer());
            return a.every((value, index) => value === b[index]);
        }

        async function moveMarkdownFile(file, source, target) {
            if (!file || file.isVirtual || !/\.md$/i.test(file.name) || !source || !target) return { ok: false, error: 'Selecteer een Markdown-bestand en een doelmap.' };
            let copied = false;
            let destinationCreated = false;
            try {
                // Start both permission requests while the submit click is still active.
                const permissions = await Promise.all([source.requestPermission({ mode: 'readwrite' }), target.requestPermission({ mode: 'readwrite' })]);
                if (permissions.some(value => value !== 'granted')) return { ok: false, error: 'Geef schrijftoegang tot beide mappen om te verplaatsen.' };
                if (await source.isSameEntry(target)) return { ok: false, error: 'Het bestand staat al in deze map.' };
                for await (const entry of target.values()) {
                    if (entry.name.toLowerCase() === file.name.toLowerCase()) return { ok: false, error: 'Er bestaat al een bestand of map met deze naam op de bestemming.' };
                }
                const original = await file.getFile();
                const destination = await target.getFileHandle(file.name, { create: true });
                destinationCreated = true;
                const writer = await destination.createWritable();
                try { await writer.write(original); await writer.close(); }
                catch (error) { try { await writer.abort(); } catch (_) {} throw error; }
                if (!await sameFileBytes(original, await destination.getFile())) throw new Error('De kopie kon niet worden gecontroleerd.');
                copied = true;
                const current = await source.getFileHandle(file.name);
                if (!await current.isSameEntry(file) || !await sameFileBytes(original, await current.getFile())) throw new Error('Het bronbestand is intussen gewijzigd.');
                await source.removeEntry(file.name);
                return { ok: true };
            } catch (error) {
                return { ok: false, error: copied
                    ? `De kopie staat in de doelmap, maar het origineel is behouden. ${error.message}`
                    : `Niet verplaatst; het origineel is behouden.${destinationCreated ? ' Controleer de mogelijk onvolledige kopie in de doelmap.' : ''} ${error.message}` };
            }
        }

        async function renameMarkdownFile(file, parent, requestedName) {
            let name = requestedName.trim();
            if (!name || name === '.' || name === '..' || /[\\/\x00-\x1f]/.test(name)) return { ok: false, error: 'Vul een bestandsnaam in zonder schuine strepen.' };
            if (!/\.md$/i.test(name)) name += '.md';
            if (!file || file.isVirtual || !parent) return { ok: false, error: 'Open eerst een lokaal Markdown-bestand.' };
            if (name === file.name) return { ok: true, name };
            let created = false;
            try {
                if (await parent.requestPermission({ mode: 'readwrite' }) !== 'granted') return { ok: false, error: 'Geef schrijftoegang om de naam te wijzigen.' };
                for await (const entry of parent.values()) {
                    if (entry.name.toLowerCase() === name.toLowerCase()) return { ok: false, error: 'Deze naam bestaat al. Kies een andere naam.' };
                }
                const original = await file.getFile();
                const destination = await parent.getFileHandle(name, { create: true });
                created = true;
                const writer = await destination.createWritable();
                try { await writer.write(original); await writer.close(); }
                catch (error) { try { await writer.abort(); } catch (_) {} throw error; }
                if (!await sameFileBytes(original, await destination.getFile())) throw new Error('De nieuwe versie kon niet worden gecontroleerd.');
                const current = await parent.getFileHandle(file.name);
                if (!await current.isSameEntry(file) || !await sameFileBytes(original, await current.getFile())) throw new Error('Het oorspronkelijke bestand is intussen gewijzigd.');
                await parent.removeEntry(file.name);
                return { ok: true, name };
            } catch (error) {
                return { ok: false, error: `Naam niet gewijzigd; het origineel is behouden.${created ? ' Er kan ook een kopie met de nieuwe naam staan.' : ''} ${error.message}` };
            }
        }

        function openRenameFileDialog() {
            const file = activeFile;
            if (!file || file.isVirtual) return;
            const wasEditing = isEditMode;
            const parentPath = file.relativePath.slice(0, file.relativePath.lastIndexOf('/'));
            const dialog = document.createElement('dialog');
            dialog.className = 'file-dialog';
            dialog.innerHTML = `<form><h2>Hernoemen</h2>
                <label>Bestandsnaam<br><input name="filename" required autocomplete="off" style="width:100%;padding:10px;font:inherit"></label>
                <p>${wysiwygDirty ? 'Je tekstwijzigingen worden eerst opgeslagen. ' : ''}Het bestand blijft in dezelfde map. Links naar de oude naam worden niet aangepast.</p>
                <p role="alert"></p><button type="button">Annuleren</button> <button type="submit">Hernoemen</button></form>`;
            const input = dialog.querySelector('input');
            input.value = file.name;
            const submit = dialog.querySelector('[type="submit"]');
            let busy = false;
            dialog.oncancel = event => { if (busy) event.preventDefault(); };
            dialog.querySelector('[type="button"]').onclick = () => { if (!busy) dialog.close(); };
            dialog.onclose = () => dialog.remove();
            dialog.querySelector('form').onsubmit = async event => {
                event.preventDefault();
                if (busy) return;
                busy = true; submit.disabled = true;
                try {
                    if (wysiwygDirty && !(await saveFile())) throw new Error('Sla je tekst op voordat je de naam wijzigt.');
                    const result = await renameMarkdownFile(file, folderHandlesByPath.get(parentPath), input.value);
                    if (!result.ok) throw new Error(result.error);
                    dialog.close();
                    if (result.name === file.name) return;
                    const expanded = [...expandedFolders];
                    await loadFiles();
                    expanded.forEach(path => expandedFolders.add(path));
                    renderFileList();
                    const index = files.findIndex(entry => entry.relativePath === `${parentPath}/${result.name}`);
                    if (index === -1) throw new Error('Naam gewijzigd. Vernieuw de map om het bestand te openen.');
                    await selectFile(index);
                    if (wasEditing) await toggleEditMode();
                    showNotification('Bestandsnaam gewijzigd', 'success');
                } catch (error) {
                    if (dialog.open) dialog.querySelector('[role="alert"]').textContent = error.message;
                    else showNotification(error.message, 'error');
                } finally { busy = false; submit.disabled = false; }
            };
            document.body.append(dialog); dialog.showModal();
            input.focus(); input.setSelectionRange(0, file.name.replace(/\.md$/i, '').length);
        }

        function fileActions() {
            const secondary = activeFile && !activeFile.isVirtual ? '<button class="edit-btn" onclick="openRenameFileDialog()">Hernoemen</button><button class="edit-btn" onclick="openMoveFileDialog()">Verplaatsen</button><button class="edit-btn" onclick="openRecoveryDialog()">Vorige versie herstellen</button><button class="edit-btn delete-file-btn" onclick="openDeleteFileDialog()">Verwijderen</button>' : '<button class="edit-btn" onclick="downloadActiveDocument()">Download kopie</button><p>Sla dit document op in je werkmap om het te hernoemen of te verplaatsen.</p>';
            return `<div class="file-actions" role="group" aria-label="Bestandsacties">
                <button class="edit-btn" onclick="toggleEditMode()">Bewerken</button>
                ${secondary ? `<div class="file-secondary">${secondary}</div><details class="file-more"><summary class="edit-btn">Meer</summary><div class="file-more-panel" onclick="this.closest('details').open=false">${secondary}</div></details>` : ''}
            </div>`;
        }

        async function saveAndCloseEditor() {
            if (await saveFile()) await toggleEditMode();
        }

        function renderFileView(rawContent) {
            const { content } = parseFrontmatter(rawContent);
            
            let html = DOMPurify.sanitize(marked.parse(content));
            
            // Process wiki-links [[...]] into clickable links
            html = processWikiLinks(html);
            
            // Highlight search terms in content if searching
            if (currentSearchQuery) {
                const regex = new RegExp(`(${escapeRegex(currentSearchQuery)})`, 'gi');
                html = html.replace(regex, '<span class="highlight">$1</span>');
            }
            
            const backlinks = getBacklinks(activeFile);
            const backlinksHtml = renderBacklinks(backlinks);
            
            document.getElementById('content').innerHTML = `
                <div class="content-header"><span class="file-path-heading" title="${escapeHtml(activeFile?.relativePath || "")}"><span class="document-name">${escapeHtml(activeFile?.name || activeFile?.relativePath?.split("/").pop() || "")}</span><span class="document-folder">${activeFile?.isVirtual?"Los document · browserkopie": "Map: "+escapeHtml(activeFile?.relativePath?.split("/").slice(0, -1).join(" / ") || "Geen map")}</span></span>${documentFocusButton()}
                    ${fileActions(false)}<span class="document-save-status">${activeFile?.isVirtual?"Gebruik Bewaar bestand om dit document op te slaan":"Opgeslagen in "+escapeHtml(activeFile.relativePath)}</span>
                </div>
                <div class="markdown-content">
                    ${html}
                    ${backlinksHtml}
                </div>
            `;
            renderYouTubePlayers(document.querySelector("#content .markdown-content"));
        }

        async function toggleEditMode() {
            if (!activeFile) return;
            
            if (isEditMode) {
                if (wysiwygDirty && !(await saveFile())) return;
                isEditMode = false;
                document.getElementById('content').classList.remove('editing');
                renderFileView(currentRawContent);
            } else {
                isEditMode = true;
                document.getElementById('content').classList.add('editing');
                renderEditorView();
            }
        }

        function highlightMarkdown(text) {
            // Escape HTML first
            let html = escapeHtml(text);
            
            // Track if we're in a code block to avoid highlighting inside it
            const lines = html.split('\n');
            let inCodeBlock = false;
            let inFrontmatter = false;
            let frontmatterStart = false;
            
            const highlightedLines = lines.map((line, index) => {
                // Check for frontmatter at start of document
                if (index === 0 && line === '---') {
                    inFrontmatter = true;
                    frontmatterStart = true;
                    return '<span class="md-frontmatter-delimiter">' + line + '</span>';
                }
                
                // Check for end of frontmatter
                if (inFrontmatter && line === '---') {
                    inFrontmatter = false;
                    return '<span class="md-frontmatter-delimiter">' + line + '</span>';
                }
                
                // Frontmatter content
                if (inFrontmatter) {
                    return '<span class="md-frontmatter">' + line + '</span>';
                }
                
                // Check for code block delimiters
                if (line.match(/^```/)) {
                    inCodeBlock = !inCodeBlock;
                    return '<span class="md-code-block">' + line + '</span>';
                }
                
                // Inside code block - no highlighting
                if (inCodeBlock) {
                    return '<span class="md-code-block">' + line + '</span>';
                }
                
                // Headers
                if (line.match(/^#{1,6}\s/)) {
                    return '<span class="md-header">' + line + '</span>';
                }
                
                // Citaats
                if (line.match(/^&gt;\s/)) {
                    return '<span class="md-blockquote">' + line + '</span>';
                }
                
                // Horizontale lijns
                if (line.match(/^(---|\*\*\*|___)\s*$/)) {
                    return '<span class="md-hr">' + line + '</span>';
                }
                
                // Task lists
                if (line.match(/^(\s*[-*+]\s+)\[x\]/i)) {
                    line = line.replace(/^(\s*[-*+]\s+)(\[x\])/i, '<span class="md-list">$1</span><span class="md-task-checked">$2</span>');
                    return highlightInline(line);
                }
                if (line.match(/^(\s*[-*+]\s+)\[\s\]/)) {
                    line = line.replace(/^(\s*[-*+]\s+)(\[\s\])/, '<span class="md-list">$1</span><span class="md-task">$2</span>');
                    return highlightInline(line);
                }
                
                // Unordered lists
                if (line.match(/^\s*[-*+]\s/)) {
                    line = line.replace(/^(\s*[-*+]\s)/, '<span class="md-list">$1</span>');
                    return highlightInline(line);
                }
                
                // Ordered lists
                if (line.match(/^\s*\d+\.\s/)) {
                    line = line.replace(/^(\s*\d+\.\s)/, '<span class="md-list">$1</span>');
                    return highlightInline(line);
                }
                
                // Regular line - apply inline highlighting
                return highlightInline(line);
            });
            
            return highlightedLines.join('\n');
        }
        
        function highlightInline(line) {
            // Images (must come before links)
            line = line.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<span class="md-image">![$1]($2)</span>');
            
            // Wiki-links [[target]] and [[target|display]]
            line = line.replace(/(\[\[[^\]]+?\]\])/g, '<span class="md-wikilink">$1</span>');
            
            // Links
            line = line.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<span class="md-link">[$1]</span>(<span class="md-link-url">$2</span>)');
            
            // Code (must come before bold/italic to avoid conflicts)
            line = line.replace(/`([^`]+)`/g, '<span class="md-code">`$1`</span>');
            
            // Vet (** or __)
            line = line.replace(/(\*\*|__)(?=\S)([^\*_]+?)(?<=\S)\1/g, '<span class="md-bold">$1$2$1</span>');
            
            // Cursief (* or _) - be careful not to match inside words
            line = line.replace(/(\*|_)(?=\S)([^\*_]+?)(?<=\S)\1/g, '<span class="md-italic">$1$2$1</span>');
            
            // Doorhalen
            line = line.replace(/~~([^~]+)~~/g, '<span class="md-strikethrough">~~$1~~</span>');
            
            return line;
        }

        function createTurndownService() {
            const td = new TurndownService({
                headingStyle: 'atx',
                hr: '---',
                bulletListMarker: '-',
                codeBlockStyle: 'fenced',
                fence: '```',
                emDelimiter: '*',
                strongDelimiter: '**',
                linkStyle: 'inlined'
            });
            
            // Use GFM plugin for tables, strikethrough, etc.
            if (window.turndownPluginGfm) {
                td.use(turndownPluginGfm.gfm);
            }
            
            td.addRule('portableStrikethrough', {
                filter: ['del', 's', 'strike'],
                replacement: content => '~~' + content + '~~'
            });
            td.addRule('editableTasks', {
                filter: node => node.nodeName === 'INPUT' && node.type === 'checkbox' && node.closest('li'),
                replacement: (content, node) => (node.checked ? '[x]' : '[ ]') + ' '
            });
            td.addRule('documentLinks', {
                filter: node => node.nodeName === 'SPAN' && node.hasAttribute('data-internal-target'),
                replacement: (content, node) => '[[' + node.getAttribute('data-internal-target') + '|' + node.textContent + ']]'
            });
            // Preserve wiki-links that appear as literal [[...]] text
            td.addRule('preserveWikiLinks', {
                filter: function(node) {
                    return node.nodeType === 3 && /\[\[.+?\]\]/.test(node.textContent);
                },
                replacement: function(content) {
                    return content;
                }
            });

            return td;
        }

        function toggleMarkdownSource() {
            const source = document.getElementById('markdownSource');
            const editor = document.getElementById('wysiwygEditor');
            const toolbar = editor.parentElement.querySelector('.wysiwyg-toolbar');
            const button = document.getElementById('markdownSourceToggle');
            if (source.hidden) {
                source.value = getWysiwygMarkdown();
                source.hidden = false;
                editor.style.display = 'none';
                toolbar.style.display = 'none';
                button.textContent = 'Visueel';
                button.title = 'Tekst met opmaak bewerken';
                button.setAttribute('aria-pressed', 'true');
                source.focus();
            } else {
                const match = source.value.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
                wysiwygFrontmatterRaw = match ? match[0] : '';
                editor.innerHTML = DOMPurify.sanitize(marked.parse(source.value.slice(wysiwygFrontmatterRaw.length)));
                renderInternalLinks(editor, true);
                prepareTaskLists(editor);
                source.dataset.visualSnapshot = editor.innerHTML;
                source.hidden = true;
                editor.style.display = '';
                toolbar.style.display = '';
                button.textContent = 'Markdown';
                button.title = 'De Markdown-brontekst bewerken';
                button.setAttribute('aria-pressed', 'false');
                editor.focus();
            }
        }

        function getWysiwygMarkdown() {
            const source = document.getElementById('markdownSource');
            if (source && !source.hidden) return source.value;
            const editor = document.getElementById('wysiwygEditor');
            if (!editor) return currentRawContent;
            if (source && source.dataset.visualSnapshot === editor.innerHTML) return source.value;
            
            const td = createTurndownService();
            syncTaskCheckboxes(editor);
            let bodyMarkdown = td.turndown(editor.innerHTML);
            
            // Reconstruct full content with frontmatter
            if (wysiwygFrontmatterRaw) {
                return wysiwygFrontmatterRaw + bodyMarkdown + '\n';
            }
            return bodyMarkdown + '\n';
        }

        function formatWysiwyg(command, value = null) {
            const editor = document.getElementById('wysiwygEditor');
            if (!editor) return;
            editor.focus();
            document.execCommand(command, false, value);
            wysiwygDirty = true;
            updateWysiwygModifiedState();
        }

        function updateWysiwygModifiedState() {
            const saveButton = document.getElementById('editorSaveButton');
            if (saveButton) {
                saveButton.disabled = !wysiwygDirty;
                saveButton.title = wysiwygDirty ? 'Wijzigingen opslaan' : 'Geen wijzigingen om op te slaan';
            }
            const modifiedEl = document.getElementById('editorModified');
            if (!modifiedEl) return;
            if (wysiwygDirty) {
                modifiedEl.textContent = 'Niet opgeslagen';
                modifiedEl.className = 'modified';
            } else {
                modifiedEl.textContent = activeFile?.isVirtual ? 'Los document in deze browser' : 'Opgeslagen in '+activeFile.relativePath;
                modifiedEl.className = '';
            }
        }

        function wysiwygFormatBlock(tag) {
            const editor = document.getElementById('wysiwygEditor');
            if (!editor) return;
            editor.focus();
            
            // Check if currently in the same block type - toggle off to paragraph
            const sel = window.getSelection();
            if (sel.rangeCount > 0) {
                const node = sel.anchorNode;
                const parentBlock = node.nodeType === 3 ? node.parentElement : node;
                const currentBlock = parentBlock.closest(tag);
                if (currentBlock && editor.contains(currentBlock)) {
                    document.execCommand('formatBlock', false, '<p>');
                    wysiwygDirty = true;
                    updateWysiwygModifiedState();
                    return;
                }
            }
            
            document.execCommand('formatBlock', false, `<${tag}>`);
            wysiwygDirty = true;
            updateWysiwygModifiedState();
        }

        function wysiwygInsertLink() {
            const editor = document.getElementById('wysiwygEditor');
            if (!editor) return;
            
            const sel = window.getSelection();
            const selectedText = sel.toString();
            const url = prompt('Vul een link in:', 'https://');
            if (url && !/^(https?:|mailto:)/i.test(url.trim())) { showNotification('Gebruik een http-, https- of mailto-link.', 'error'); return; }
            if (url) {
                editor.focus();
                if (selectedText) {
                    document.execCommand('createLink', false, url);
                } else {
                    const linkHtml = `<a href="${url}">${url}</a>`;
                    document.execCommand('insertHTML', false, linkHtml);
                }
                wysiwygDirty = true;
                updateWysiwygModifiedState();
            }
        }

        function wysiwygInsertInternalLink() { openInternalLinkDialog(); }

        function wysiwygToggleCode() {
            const editor = document.getElementById('wysiwygEditor');
            if (!editor) return;
            editor.focus();
            
            const sel = window.getSelection();
            if (sel.rangeCount > 0) {
                const range = sel.getRangeAt(0);
                const selectedText = sel.toString();
                
                // Check if already in code tag
                const codeParent = sel.anchorNode.parentElement.closest('code');
                if (codeParent && !codeParent.closest('pre')) {
                    // Unwrap code
                    const text = document.createTextNode(codeParent.textContent);
                    codeParent.parentNode.replaceChild(text, codeParent);
                } else if (selectedText) {
                    const code = document.createElement('code');
                    range.surroundContents(code);
                }
                wysiwygDirty = true;
                updateWysiwygModifiedState();
            }
        }

        function renderEditorView() {
            const shortcutKey = navigator.platform.includes('Mac') ? '⌘' : 'Ctrl';
            
            // Parse frontmatter - preserve raw frontmatter, only edit body
            const fmRegex = /^---\s*\n([\s\S]*?)\n---\s*\n?/;
            const fmMatch = currentRawContent.match(fmRegex);
            wysiwygFrontmatterRaw = fmMatch ? fmMatch[0] : '';
            const bodyMarkdown = fmMatch ? currentRawContent.slice(fmMatch[0].length) : currentRawContent;
            
            // Convert body markdown to HTML for WYSIWYG editing (no wiki-link processing)
            const editorBody = document.createElement('div');
            editorBody.innerHTML = DOMPurify.sanitize(marked.parse(bodyMarkdown));
            renderInternalLinks(editorBody, true);
            const bodyHtml = editorBody.innerHTML;
            wysiwygDirty = false;
            
            document.getElementById('content').innerHTML = `
                <div class="content-header"><span class="file-path-heading" title="${escapeHtml(activeFile?.relativePath || "")}"><span class="document-name">${escapeHtml(activeFile?.name || activeFile?.relativePath?.split("/").pop() || "")}</span><span class="document-folder">${activeFile?.isVirtual?"Los document · browserkopie": "Map: "+escapeHtml(activeFile?.relativePath?.split("/").slice(0, -1).join(" / ") || "Geen map")}</span></span>${documentFocusButton()}
                    <span id="editorModified" class="document-save-status" role="status"></span><div class="file-actions editor-actions" role="group" aria-label="Bewerken">
                    <button id="markdownSourceToggle" class="edit-btn" title="De Markdown-brontekst bewerken" onclick="toggleMarkdownSource()" aria-pressed="false">Markdown</button>
                    <button class="cancel-btn" onclick="cancelEdit()" title="Bewerken annuleren (Esc)">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                        Annuleren
                    </button>
                    <button id="editorSaveButton" class="save-btn" disabled onclick="saveAndCloseEditor()" title="Geen wijzigingen om op te slaan">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                            <polyline points="17 21 17 13 7 13 7 21"></polyline>
                            <polyline points="7 3 7 8 15 8"></polyline>
                        </svg>
                        ${activeFile?.isVirtual?'Bewaar bestand':'Opslaan in map'}
                    </button>
                    ${activeFile && !activeFile.isVirtual ? `<details class="file-more"><summary class="edit-btn">Meer</summary><div class="file-more-panel" onclick="this.closest('details').open=false"><button class="edit-btn" onclick="openRenameFileDialog()">Hernoemen</button><button class="edit-btn" onclick="openMoveFileDialog()">Verplaatsen</button><button class="edit-btn" onclick="openRecoveryDialog()">Vorige versie herstellen</button><button class="edit-btn delete-file-btn" onclick="openDeleteFileDialog()">Verwijderen</button></div></details>` : `<details class="file-more"><summary class="edit-btn">Meer</summary><div class="file-more-panel"><button class="edit-btn" onclick="downloadActiveDocument()">Download kopie</button><p>Sla dit document op in je werkmap om het te hernoemen of te verplaatsen.</p></div></details>`}
                    </div>
                </div>
                <div class="editor-container visible">
                    <div class="editor-wrapper wysiwyg-mode">
                        <div class="wysiwyg-toolbar">
                            <button onclick="formatWysiwyg('bold')" title="Vet (${shortcutKey}+B)"><strong>B</strong></button>
                            <button onclick="formatWysiwyg('italic')" title="Cursief (${shortcutKey}+I)"><em>I</em></button>
                            <button onclick="formatWysiwyg('strikeThrough')" title="Doorhalen"><s>S</s></button>
                            <div class="separator"></div>
                            <button onclick="wysiwygFormatBlock('h1')" title="Kop 1">H1</button>
                            <button onclick="wysiwygFormatBlock('h2')" title="Kop 2">H2</button>
                            <button onclick="wysiwygFormatBlock('h3')" title="Kop 3">H3</button>
                            <div class="separator"></div>
                            <button onclick="formatWysiwyg('insertUnorderedList')" title="Opsomming">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/></svg>
                            </button>
                            <button class="task-list-button" onmousedown="event.preventDefault()" onclick="insertTaskList()" title="Afvinkbare takenlijst" aria-label="Takenlijst"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m3 6 2 2 4-4"/><rect x="3" y="14" width="5" height="5" rx="1"/><path d="M12 6h9M12 16.5h9"/></svg></button>
                            <button onclick="formatWysiwyg('insertOrderedList')" title="Genummerde lijst">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><text x="4" y="7" font-size="7" fill="currentColor" stroke="none" font-family="monospace">1</text><text x="4" y="13" font-size="7" fill="currentColor" stroke="none" font-family="monospace">2</text><text x="4" y="19" font-size="7" fill="currentColor" stroke="none" font-family="monospace">3</text></svg>
                            </button>
                            <div class="separator"></div>
                            <button onclick="wysiwygFormatBlock('blockquote')" title="Citaat">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>
                            </button>
                            <button onclick="wysiwygToggleCode()" title="Code">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                            </button>
                            <div class="separator"></div>
                            <button onmousedown="event.preventDefault()" onclick="wysiwygInsertInternalLink()" title="Link naar document" aria-label="Link naar document" style="width:auto;min-width:36px;font-weight:600">[[…]]</button>
                            <button onmousedown="event.preventDefault()" onclick="openMediaDialog('image')" title="Afbeelding toevoegen" aria-label="Afbeelding toevoegen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1.5"/><path d="m21 15-5-5L5 21"/></svg></button>
                            <button onmousedown="event.preventDefault()" onclick="openMediaDialog('youtube')" title="YouTube-video toevoegen" aria-label="YouTube-video toevoegen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="3"/><path d="m10 8 6 4-6 4z"/></svg></button>
                            <button onclick="wysiwygInsertLink()" title="Link invoegen">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                            </button>
                            <button onclick="formatWysiwyg('insertHorizontalRule')" title="Horizontale lijn">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="2" y1="12" x2="22" y2="12" stroke-width="3"/></svg>
                            </button>
                        </div>
                        <textarea id="markdownSource" hidden aria-label="Kale Markdown" spellcheck="false" style="box-sizing:border-box;width:100%;min-height:60vh;padding:24px;font:16px/1.6 monospace;resize:vertical;background:var(--bg-primary);color:var(--text-primary);border:1px solid #888"></textarea>
                        <div class="wysiwyg-editor markdown-content" contenteditable="true" id="wysiwygEditor" spellcheck="true">${bodyHtml}</div>
                    </div>
                    <div class="editor-status">
                        <span class="editor-shortcut-hint">${shortcutKey}+B vet · ${shortcutKey}+I cursief · ${shortcutKey}+S opslaan · Esc annuleren</span>
                    </div>
                </div>
            `;
            
            const editor = document.getElementById('wysiwygEditor');
            editor.focus();
            
            const source = document.getElementById('markdownSource');
            source.value = currentRawContent;
            source.dataset.visualSnapshot = editor.innerHTML;
            source.addEventListener('input', () => {
                wysiwygDirty = true;
                updateWysiwygModifiedState();
            });
            prepareTaskLists(editor);
            editor.addEventListener('change', event => {
                if (event.target.matches('input[type=checkbox]')) {
                    syncTaskCheckboxes(editor);
                    wysiwygDirty = true; updateWysiwygModifiedState();
                }
            });
            // Track modifications
            editor.addEventListener('input', () => {
                prepareTaskLists(editor);
                wysiwygDirty = true;
                updateWysiwygModifiedState();
            });
            
            // Handle paste - clean up pasted HTML
            editor.addEventListener('paste', (e) => {
                const clipboardData = e.clipboardData || window.clipboardData;
                const html = clipboardData.getData('text/html');
                const text = clipboardData.getData('text/plain');
                
                // If there's HTML, let the browser handle it naturally
                // If only plain text, insert it preserving line breaks
                if (html) {
                    e.preventDefault();
                    document.execCommand('insertHTML', false, DOMPurify.sanitize(html));
                } else if (text) {
                    e.preventDefault();
                    const sanitized = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
                    document.execCommand('insertHTML', false, sanitized);
                }
                
                wysiwygDirty = true;
                updateWysiwygModifiedState();
            });
        }

        function cancelEdit() {
            if (!activeFile) return;
            
            if (wysiwygDirty) {
                if (!confirm('Je hebt wijzigingen die niet zijn opgeslagen. Wil je die weggooien?')) {
                    return;
                }
            }
            
            // Revert to original content
            currentRawContent = originalRawContent;
            wysiwygDirty = false;
            isEditMode = false;
            document.getElementById('content').classList.remove('editing');
            renderFileView(currentRawContent);
        }

        async function saveFile() {
            if(activeFile?.isVirtual && window.Werkmap?.active){try{await BewaarAlles.save();wysiwygDirty=false;return true}catch(e){showNotification(e.message,'error');return false;}}
            if (!activeFile) return;
            
            const editor = document.getElementById('wysiwygEditor');
            if (!editor && activeFile.isVirtual) return;
            
            // A connected document always writes back to its own file.
            const newContent = editor ? getWysiwygMarkdown() : currentRawContent;
            
            try {
                if (activeFile.isVirtual) {
                    // Save virtual (converter) file
                    const fileData = converterFiles.get(activeFile.name);
                    if (fileData) {
                        fileData.content = newContent;
                        converterFiles.set(activeFile.name, fileData);
                        saveConverterFiles();
                        downloadLooseMarkdown(activeFile.name,newContent);
                    }
                } else {
                    // Save real file via File System Access API
                    // Need write permission on the directory
                    const folderHandle = directoryHandles.find(h => h.name === activeFile.folderName);
                    if (folderHandle) {
                        const hasWritePermission = await verifyPermission(folderHandle, 'readwrite');
                        if (!hasWritePermission) {
                            showNotification('Geen toestemming om op te slaan', 'error');
                            return;
                        }
                    }
                    
                    if (await (await activeFile.getFile()).text() !== originalRawContent) throw Error('Dit bestand is buiten Schrijven gewijzigd. Je bewerking blijft in de editor; heropen het bestand voordat je verdergaat.');
                    // Get a writable stream from the file handle
                    await replaceWithRecovery(activeFile, folderHandlesByPath.get(activeFile.relativePath.split('/').slice(0,-1).join('/')), originalRawContent, newContent);
                }
                
                // Update cached content
                fileContents.set(activeFile.relativePath, newContent);
                currentRawContent = newContent;
                originalRawContent = newContent;
                wysiwygDirty = false;
                
                updateWysiwygModifiedState();
                const savedMessage = activeFile.isVirtual ? 'Download gestart; controleer je bestand.' : 'Opgeslagen in '+activeFile.relativePath;
                const modifiedEl = document.getElementById('editorModified');
                if (modifiedEl) modifiedEl.textContent = savedMessage;
                if(!activeFile.isVirtual){
                    Werkstatus.opened(activeFile.relativePath);Werkstatus.written();
                    const status=document.getElementById('wm-message');if(status)status.textContent=savedMessage;
                }
                showNotification(savedMessage, 'success');
                return true;
            } catch (err) {
                console.error('Opslaan mislukt:', err);
                showNotification(`Opslaan mislukt: ${err.message}`, 'error');
            }
        }

        function toggleSidebar() {
            document.querySelector('.sidebar').classList.toggle('open');
            document.querySelector('.overlay').classList.toggle('visible');
        }

        // Search Palette functionality
        let paletteResults = [];
        let paletteSelectedIndex = 0;
        let paletteSearchTimeout = null;

        function openSearchPalette() {
            const overlay = document.getElementById('searchPaletteOverlay');
            const input = document.getElementById('searchPaletteInput');
            
            overlay.classList.add('visible');
            input.value = '';
            input.focus();
            
            paletteResults = projectFiles().slice(0, 20).map(f => ({ file: f, matchPreview: null }));
            paletteSelectedIndex = 0;
            
            // Show all files initially if we have files loaded
            if (files.length > 0) {
                renderPaletteResults(projectFiles().slice(0, 20).map(f => ({ file: f, matchPreview: null })));
                document.getElementById('searchPaletteStats').textContent = `${projectFiles().length} bestanden`;
            } else {
                document.getElementById('searchPaletteResults').innerHTML = `
                    <div class="search-palette-empty">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                        </svg>
                        <p>Open eerst een map om te zoeken</p>
                    </div>
                `;
                document.getElementById('searchPaletteStats').textContent = '';
            }
        }

        function closeSearchPalette(event) {
            if (event && event.target !== event.currentTarget) return;
            document.getElementById('searchPaletteOverlay').classList.remove('visible');
            paletteResults = [];
            paletteSelectedIndex = 0;
        }

        function searchPalette(query) {
            if (!query) {
                // Show recent/all files
                if (files.length > 0) {
                    paletteResults = projectFiles().slice(0, 20).map(f => ({ file: f, matchPreview: null }));
                    renderPaletteResults(paletteResults);
                    document.getElementById('searchPaletteStats').textContent = `${projectFiles().length} bestanden`;
                }
                return;
            }

            const queryLower = query.toLowerCase();
            const results = [];
            let totalMatches = 0;

            for (const file of projectFiles()) {
                const nameMatch = file.relativePath.toLowerCase().includes(queryLower);
                const content = fileContents.get(file.relativePath) || '';
                const contentLower = content.toLowerCase();
                const contentMatch = contentLower.includes(queryLower);

                if (nameMatch || contentMatch) {
                    let matchPreview = null;
                    let matchCount = 0;

                    if (contentMatch) {
                        let pos = 0;
                        while ((pos = contentLower.indexOf(queryLower, pos)) !== -1) {
                            matchCount++;
                            pos += queryLower.length;
                        }
                        totalMatches += matchCount;

                        const matchIndex = contentLower.indexOf(queryLower);
                        const start = Math.max(0, matchIndex - 40);
                        const end = Math.min(content.length, matchIndex + query.length + 40);
                        let preview = content.substring(start, end);
                        
                        if (start > 0) preview = '...' + preview;
                        if (end < content.length) preview = preview + '...';
                        
                        matchPreview = highlightText(preview.replace(/\n/g, ' '), query);
                    }

                    results.push({
                        file,
                        nameMatch,
                        contentMatch,
                        matchCount,
                        matchPreview
                    });
                }
            }

            // Sort: name matches first, then by match count
            results.sort((a, b) => {
                if (a.nameMatch && !b.nameMatch) return -1;
                if (!a.nameMatch && b.nameMatch) return 1;
                return b.matchCount - a.matchCount;
            });

            paletteResults = results.slice(0, 50);
            paletteSelectedIndex = 0;
            
            renderPaletteResults(paletteResults, query);
            
            if (results.length > 0) {
                const fileText = results.length === 1 ? 'bestand' : 'bestanden';
                document.getElementById('searchPaletteStats').textContent = 
                    `${results.length} ${fileText}${totalMatches > 0 ? ` · ${totalMatches} treffers` : ''}`;
            } else {
                document.getElementById('searchPaletteStats').textContent = 'Geen resultaten';
            }
        }

        function renderPaletteResults(results, query = '') {
            const container = document.getElementById('searchPaletteResults');
            
            if (results.length === 0) {
                container.innerHTML = `
                    <div class="search-palette-empty">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <circle cx="11" cy="11" r="8"></circle>
                            <path d="m21 21-4.35-4.35"></path>
                        </svg>
                        <p>Geen bestanden gevonden</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = results.map((result, index) => {
                const selectedClass = index === paletteSelectedIndex ? 'selected' : '';
                const displayPath = query ? highlightText(result.file.relativePath, query) : escapeHtml(result.file.relativePath);
                
                return `
                    <div class="search-palette-item ${selectedClass}" 
                         data-index="${index}"
                         onclick="selectPaletteItem(${index})"
                         onmouseenter="paletteSelectedIndex = ${index}; updatePaletteSelection()">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                        <div class="search-palette-item-content">
                            <div class="search-palette-item-path">${displayPath}</div>
                            ${result.matchPreview ? `<div class="search-palette-item-preview">${result.matchPreview}</div>` : ''}
                        </div>
                    </div>
                `;
            }).join('');
        }

        function updatePaletteSelection() {
            const items = document.querySelectorAll('.search-palette-item');
            items.forEach((item, index) => {
                item.classList.toggle('selected', index === paletteSelectedIndex);
            });
            
            // Scroll selected item into view
            const selected = document.querySelector('.search-palette-item.selected');
            if (selected) {
                selected.scrollIntoView({ block: 'nearest' });
            }
        }

        function selectPaletteItem(index) {
            if (paletteResults[index]) {
                const fileIndex = files.findIndex(f => f.relativePath === paletteResults[index].file.relativePath);
                if (fileIndex !== -1) {
                    closeSearchPalette();
                    selectFile(fileIndex);
                }
            }
        }

        // Search palette input handler
        document.getElementById('searchPaletteInput').addEventListener('input', (e) => {
            clearTimeout(paletteSearchTimeout);
            paletteSearchTimeout = setTimeout(() => {
                searchPalette(e.target.value);
            }, 100);
        });

        // Search palette keyboard navigation
        document.getElementById('searchPaletteInput').addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (paletteSelectedIndex < paletteResults.length - 1) {
                    paletteSelectedIndex++;
                    updatePaletteSelection();
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (paletteSelectedIndex > 0) {
                    paletteSelectedIndex--;
                    updatePaletteSelection();
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                selectPaletteItem(paletteSelectedIndex);
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            const paletteVisible = document.getElementById('searchPaletteOverlay').classList.contains('visible');
            
            // Cmd/Ctrl + K to open search palette
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                if (paletteVisible) {
                    closeSearchPalette();
                } else {
                    openSearchPalette();
                }
            }
            // Cmd/Ctrl + E to toggle edit mode
            if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
                e.preventDefault();
                if (activeFile && !paletteVisible) {
                    toggleEditMode();
                }
            }
            // Cmd/Ctrl + S to save in edit mode
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                if (isEditMode) {
                    e.preventDefault();
                    saveFile();
                }
            }
            // Escape to close palette or cancel edit
            if (e.key === 'Escape') {
                if (paletteVisible) {
                    closeSearchPalette();
                } else if (isEditMode && !document.querySelector('dialog[open]')) {
                    cancelEdit();
                }
            }
        });

        // Check for File System Access API support
        if (!('showDirectoryPicker' in window)) {
            document.querySelector('.folder-btn').innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                Open in Chrome of Edge
            `;
            document.querySelector('.folder-btn').disabled = true;
            document.getElementById('addProject').disabled = true;
            document.querySelector('.folder-btn').style.cursor = 'not-allowed';
            document.getElementById('newFileBtn').disabled = true;
            document.getElementById('fileList').innerHTML = `
                <div class="empty-state">
                    Deze browser kan geen lokale mappen openen.<br><br>
                    Open Schrijven in Chrome of Edge op je computer.
                </div>
            `;
            if (converterFiles.size) restoreSavedFolders();
        } else {
            // Try to restore previously opened folder
            // restoreSavedFolders will handle loading files including converter files
            restoreSavedFolders();
        }



        // Wiki-link click handler (delegated)
        document.getElementById('content').addEventListener('click', function(e) {
            const wikilink = e.target.closest('.wikilink[data-wiki-target]');
            if (wikilink) {
                e.preventDefault();
                const idx = parseInt(wikilink.dataset.wikiTarget, 10);
                if (!isNaN(idx) && idx >= 0 && idx < files.length) {
                    selectFile(idx);
                }
            }
        });

        document.getElementById('content').addEventListener('keydown', event => {
            if (event.key === 'Enter' && event.target.matches('.wikilink[data-wiki-target]')) { event.preventDefault(); event.target.click(); }
        });

        // Sidebar resize functionality
        (function() {
            const resizeHandle = document.getElementById('sidebarResize');
            const app = document.getElementById('app');
            const sidebar = document.getElementById('sidebar');
            
            let isResizing = false;
            let startX = 0;
            let startWidth = 0;

            resizeHandle.addEventListener('mousedown', (e) => {
                isResizing = true;
                startX = e.clientX;
                startWidth = sidebar.offsetWidth;
                
                resizeHandle.classList.add('dragging');
                document.body.classList.add('resizing');
                
                e.preventDefault();
            });

            document.addEventListener('mousemove', (e) => {
                if (!isResizing) return;
                
                const delta = e.clientX - startX;
                let newWidth = startWidth + delta;
                
                // Clamp to min/max
                newWidth = Math.max(200, Math.min(500, newWidth));
                
                app.style.setProperty('--sidebar-width', `${newWidth}px`);
            });

            document.addEventListener('mouseup', () => {
                if (isResizing) {
                    isResizing = false;
                    resizeHandle.classList.remove('dragging');
                    document.body.classList.remove('resizing');
                    
                    // Save to localStorage
                    const width = sidebar.offsetWidth;
                    GereedschapskistMode.storage.setItem('gereedschapskist:sidebarWidth', width);
                }
            });

            // Restore saved width
            const savedWidth = GereedschapskistMode.storage.getItem('gereedschapskist:sidebarWidth');
            if (savedWidth) {
                app.style.setProperty('--sidebar-width', `${savedWidth}px`);
            }
        })();

        function htmlToMarkdown(html) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            return convertNode(doc.body).trim();
        }

        function convertNode(node) {
            let result = '';
            
            for (const child of node.childNodes) {
                if (child.nodeType === Node.TEXT_NODE) {
                    result += child.textContent;
                } else if (child.nodeType === Node.ELEMENT_NODE) {
                    const tagName = child.tagName.toLowerCase();
                    
                    switch (tagName) {
                        case 'h1':
                            result += '\n# ' + getTextContent(child) + '\n\n';
                            break;
                        case 'h2':
                            result += '\n## ' + getTextContent(child) + '\n\n';
                            break;
                        case 'h3':
                            result += '\n### ' + getTextContent(child) + '\n\n';
                            break;
                        case 'h4':
                            result += '\n#### ' + getTextContent(child) + '\n\n';
                            break;
                        case 'h5':
                            result += '\n##### ' + getTextContent(child) + '\n\n';
                            break;
                        case 'h6':
                            result += '\n###### ' + getTextContent(child) + '\n\n';
                            break;
                        case 'p':
                            const pContent = convertNode(child).trim();
                            if (pContent) {
                                result += pContent + '\n\n';
                            }
                            break;
                        case 'strong':
                        case 'b':
                            result += '**' + convertNode(child) + '**';
                            break;
                        case 'em':
                        case 'i':
                            result += '*' + convertNode(child) + '*';
                            break;
                        case 'u':
                            result += '<u>' + convertNode(child) + '</u>';
                            break;
                        case 'strike':
                        case 's':
                        case 'del':
                            result += '~~' + convertNode(child) + '~~';
                            break;
                        case 'a':
                            const href = child.getAttribute('href') || '';
                            const linkText = convertNode(child);
                            result += '[' + linkText + '](' + href + ')';
                            break;
                        case 'ul':
                            result += '\n' + convertList(child, false) + '\n';
                            break;
                        case 'ol':
                            result += '\n' + convertList(child, true) + '\n';
                            break;
                        case 'li':
                            result += convertNode(child);
                            break;
                        case 'br':
                            result += '  \n';
                            break;
                        case 'hr':
                            result += '\n---\n\n';
                            break;
                        case 'table':
                            result += '\n' + convertTable(child) + '\n';
                            break;
                        case 'blockquote':
                            const quoteContent = convertNode(child).trim().split('\n');
                            result += '\n' + quoteContent.map(line => '> ' + line).join('\n') + '\n\n';
                            break;
                        case 'code':
                            result += '`' + getTextContent(child) + '`';
                            break;
                        case 'pre':
                            result += '\n```\n' + getTextContent(child) + '\n```\n\n';
                            break;
                        case 'img':
                            const alt = child.getAttribute('alt') || '';
                            const src = child.getAttribute('src') || '';
                            result += '![' + alt + '](' + src + ')';
                            break;
                        case 'sup':
                            result += '<sup>' + convertNode(child) + '</sup>';
                            break;
                        case 'sub':
                            result += '<sub>' + convertNode(child) + '</sub>';
                            break;
                        default:
                            result += convertNode(child);
                    }
                }
            }
            
            return result;
        }

        function getTextContent(node) {
            return convertNode(node).trim();
        }

        function convertList(listNode, ordered, depth = 0) {
            let result = '';
            const indent = '  '.repeat(depth);
            let counter = 1;
            
            for (const child of listNode.children) {
                if (child.tagName.toLowerCase() === 'li') {
                    const prefix = ordered ? `${counter}. ` : '- ';
                    let liContent = '';
                    
                    for (const liChild of child.childNodes) {
                        if (liChild.nodeType === Node.TEXT_NODE) {
                            liContent += liChild.textContent.trim();
                        } else if (liChild.nodeType === Node.ELEMENT_NODE) {
                            const tag = liChild.tagName.toLowerCase();
                            if (tag === 'ul') {
                                liContent += '\n' + convertList(liChild, false, depth + 1);
                            } else if (tag === 'ol') {
                                liContent += '\n' + convertList(liChild, true, depth + 1);
                            } else {
                                liContent += convertNode(liChild);
                            }
                        }
                    }
                    
                    result += indent + prefix + liContent.trim() + '\n';
                    counter++;
                }
            }
            
            return result;
        }

        function convertTable(tableNode) {
            let result = '';
            const rows = tableNode.querySelectorAll('tr');
            
            if (rows.length === 0) return '';
            
            rows.forEach((row, rowIndex) => {
                const cells = row.querySelectorAll('th, td');
                const cellContents = Array.from(cells).map(cell => 
                    convertNode(cell).trim().replace(/\|/g, '\\|').replace(/\n/g, ' ')
                );
                
                result += '| ' + cellContents.join(' | ') + ' |\n';
                
                if (rowIndex === 0) {
                    result += '| ' + cellContents.map(() => '---').join(' | ') + ' |\n';
                }
            });
            
            return result;
        }

        function showNotification(message, type = 'success') {
            // Create notification element if it doesn't exist
            let notification = document.getElementById('converterNotification');
            if (!notification) {
                notification = document.createElement('div');
                notification.id = 'converterNotification';
                notification.style.cssText = `
                    position: fixed;
                    bottom: 24px;
                    left: 50%;
                    transform: translate(-50%, 100%);
                    padding: 12px 20px;
                    border-radius: 8px;
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 13px;
                    font-weight: 500;
                    z-index: 10000;
                    transition: transform 0.3s ease;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                `;
                document.body.appendChild(notification);
            }
            
            const colors = {
                success: { bg: '#28A745', color: 'white' },
                error: { bg: '#DC3545', color: 'white' },
                info: { bg: '#1E90FF', color: 'white' }
            };
            
            const style = colors[type] || colors.success;
            notification.style.background = style.bg;
            notification.style.color = style.color;
            notification.textContent = message;
            notification.style.transform = 'translate(-50%, 0)';
            
            setTimeout(() => {
                notification.style.transform = 'translate(-50%, 100%)';
            }, 3000);
        }
    