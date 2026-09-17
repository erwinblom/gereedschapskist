// Keep media portable: images use Markdown, videos remain ordinary YouTube links.
function youtubeId(value) {
    try {
        const url = new URL(value);
        if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
        let id;
        if (url.hostname === 'youtu.be') id = url.pathname.slice(1);
        else if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname)) {
            id = url.pathname === '/watch' ? url.searchParams.get('v') : url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)\/?$/)?.[1];
        }
        return /^[\w-]{11}$/.test(id || '') ? id : null;
    } catch { return null; }
}

function renderYouTubePlayers(root) {
    if (!root) return;
    root.querySelectorAll('p').forEach(paragraph => {
        const link = paragraph.firstElementChild;
        if (paragraph.children.length !== 1 || link?.tagName !== 'A' || paragraph.textContent.trim() !== link.textContent.trim()) return;
        const id = youtubeId(link.href);
        if (!id) return;
        const button = document.createElement('button');
        button.textContent = '▶ YouTube-video afspelen';
        button.style.cssText = 'display:block;width:100%;aspect-ratio:16/9;border:1px solid #888;border-radius:8px;background:#181818;color:white;font:inherit;cursor:pointer;margin-bottom:8px';
        button.onclick = () => {
            const frame = document.createElement('iframe');
            frame.src = 'https://www.youtube-nocookie.com/embed/' + id;
            frame.title = 'YouTube-video';
            frame.allow = 'encrypted-media; picture-in-picture; fullscreen';
            frame.allowFullscreen = true;
            frame.referrerPolicy = 'strict-origin-when-cross-origin';
            frame.style.cssText = 'display:block;width:100%;aspect-ratio:16/9;border:0;margin-bottom:8px';
            button.replaceWith(frame);
        };
        paragraph.prepend(button);
        link.target = '_blank'; link.rel = 'noopener noreferrer';
    });
}

function openMediaDialog(kind) {
    const editor = document.getElementById('wysiwygEditor');
    if (!editor) return;
    const selection = window.getSelection();
    const savedRange = selection.rangeCount && editor.contains(selection.getRangeAt(0).commonAncestorContainer) ? selection.getRangeAt(0).cloneRange() : null;
    const dialog = document.createElement('dialog');
    dialog.style.cssText = 'max-width:480px;width:calc(100% - 40px);padding:24px;border:1px solid #888;border-radius:12px;background:var(--bg-primary,white);color:var(--text-primary,#222)';
    const isImage = kind === 'image';
    dialog.innerHTML = `<form><h2>${isImage ? 'Afbeelding toevoegen' : 'YouTube-video toevoegen'}</h2>
        <label style="display:block">${isImage ? 'Webadres van de afbeelding' : 'YouTube-link'}<input name="url" type="url" placeholder="https://" style="display:block;width:100%;box-sizing:border-box;margin:8px 0 16px;padding:10px"></label>
        ${isImage ? '<label style="display:block">Of kies een bestand (maximaal 2 MB)<input name="file" type="file" accept="image/png,image/jpeg,image/gif,image/webp" style="display:block;margin:8px 0 16px"></label><label>Beschrijving<input name="description" type="text" style="display:block;width:100%;box-sizing:border-box;padding:10px;margin:8px 0"></label><p>Een gekozen bestand wordt in de tekst bewaard en blijft lokaal. Opslaan bewaart de toevoeging.</p>' : '<p>Na opslaan kun je de video afspelen in de leesweergave.</p>'}
        <p role="alert" style="color:#b22"></p><div style="display:flex;gap:12px;justify-content:flex-end"><button type="button" data-cancel>Annuleren</button><button type="submit">Toevoegen</button></div></form>`;
    document.body.append(dialog);
    dialog.querySelector('[data-cancel]').onclick = () => dialog.close();
    dialog.addEventListener('close', () => { dialog.remove(); editor.focus(); });
    dialog.querySelector('form').onsubmit = async event => {
        event.preventDefault();
        const form = event.currentTarget;
        const submit = form.querySelector('[type=submit]');
        submit.disabled = true;
        try {
            let url = form.elements.url.value.trim();
            let html;
            if (isImage) {
                const file = form.elements.file.files[0];
                if (file) {
                    if (!['image/png','image/jpeg','image/gif','image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) throw Error('Kies een PNG, JPG, GIF of WebP van maximaal 2 MB.');
                    url = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(Error('Afbeelding kon niet worden gelezen.')); reader.readAsDataURL(file); });
                } else if (!/^https?:$/.test(new URL(url).protocol)) throw Error('Gebruik een webadres dat begint met https://.');
                const img = document.createElement('img'); img.src = url; img.alt = form.elements.description.value.trim();
                html = '<p>' + img.outerHTML + '</p><p><br></p>';
            } else {
                const id = youtubeId(url);
                if (!id) throw Error('Plak een geldige YouTube-videolink.');
                html = '<p><a href="https://www.youtube.com/watch?v=' + id + '">YouTube-video</a></p><p><br></p>';
            }
            if (!editor.isConnected) throw Error('Het document is niet meer geopend.');
            dialog.close(); editor.focus();
            selection.removeAllRanges();
            if (savedRange) selection.addRange(savedRange);
            else { const range = document.createRange(); range.selectNodeContents(editor); range.collapse(false); selection.addRange(range); }
            document.execCommand('insertHTML', false, html);
            wysiwygDirty = true; updateWysiwygModifiedState();
        } catch (error) { form.querySelector('[role=alert]').textContent = error instanceof TypeError ? 'Vul een geldig webadres in of kies een bestand.' : error.message; }
        finally { submit.disabled = false; }
    };
    dialog.showModal();
}
