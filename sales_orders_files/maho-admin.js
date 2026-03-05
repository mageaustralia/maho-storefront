/**
 * Maho Admin - Stimulus controllers for modern sidebar UI
 */
import { Application, Controller } from 'https://cdn.jsdelivr.net/npm/@hotwired/stimulus@3.2.2/dist/stimulus.js';

const app = Application.start();

/**
 * AdminSidebar controller
 * Handles sidebar collapse/expand and localStorage persistence
 */
class AdminSidebarController extends Controller {
    connect() {
        if (localStorage.getItem('maho-sidebar-collapsed') === '1') {
            this.element.classList.add('sidebar-collapsed');
        }
    }

    toggleCollapse() {
        const shell = this.element;
        const collapsed = shell.classList.toggle('sidebar-collapsed');
        localStorage.setItem('maho-sidebar-collapsed', collapsed ? '1' : '0');
    }
}

/**
 * AdminNav controller
 * Handles click-to-expand sub-menus at all levels + persists open state in localStorage
 */
class AdminNavController extends Controller {
    connect() {
        // 1. Auto-expand the active branch (all levels)
        let active = this.element.querySelector('li.active');
        while (active) {
            const parentLi = active.closest('li.parent');
            if (parentLi) {
                parentLi.classList.add('open');
                active = parentLi.parentElement.closest('li');
            } else {
                break;
            }
        }

        // 2. Restore any additionally saved open items from localStorage
        const saved = JSON.parse(localStorage.getItem('maho-nav-open') || '[]');
        saved.forEach(key => {
            // Match by link id or href
            const link = this.element.querySelector(`a[id="${key}"], a[href="${key}"]`);
            if (link) link.closest('li.parent')?.classList.add('open');
        });

        // 3. Wire up click handlers for ALL parent items at any level
        this.element.querySelectorAll('li.parent > a').forEach(link => {
            link.addEventListener('click', e => {
                const li = link.closest('li.parent');
                const href = link.getAttribute('href');
                const isHash = !href || href === '#';
                const isLevel0 = li.classList.contains('level0');

                const shell = document.querySelector('.admin-shell');
                const isCollapsed = shell && shell.classList.contains('sidebar-collapsed');

                // Collapsed + level0: expand sidebar and open this menu
                if (isCollapsed && isLevel0) {
                    e.preventDefault();
                    shell.classList.remove('sidebar-collapsed');
                    localStorage.setItem('maho-sidebar-collapsed', '0');
                    li.parentElement.querySelectorAll(':scope > li.level0.open').forEach(el => {
                        if (el !== li) el.classList.remove('open');
                    });
                    li.classList.add('open');
                    this.saveOpenState();
                    return;
                }

                if (isHash) {
                    e.preventDefault();
                    li.classList.toggle('open');
                    this.saveOpenState();
                } else {
                    if (!li.classList.contains('open')) {
                        e.preventDefault();
                        if (isLevel0) {
                            li.parentElement.querySelectorAll(':scope > li.level0.open').forEach(el => {
                                if (el !== li) el.classList.remove('open');
                            });
                        }
                        li.classList.add('open');
                        this.saveOpenState();
                    }
                    // Already open: navigate normally
                }
            });
        });
    }

    saveOpenState() {
        const keys = [];
        this.element.querySelectorAll('li.parent.open > a').forEach(a => {
            // Prefer the nav id, fall back to href
            const key = a.id || a.getAttribute('href');
            if (key && key !== '#') keys.push(key);
        });
        localStorage.setItem('maho-nav-open', JSON.stringify(keys));
    }
}

app.register('admin-sidebar', AdminSidebarController);
app.register('admin-nav', AdminNavController);

/**
 * Resizable left panel
 * Injects a drag handle between .admin-page-left and .admin-page-content
 * Persists width to localStorage as 'maho-left-col-width'
 */
function initResizablePanel() {
    const cols = document.querySelector('.admin-page-cols');
    if (!cols) return;

    const leftPanel = cols.querySelector('.admin-page-left');
    const rightPanel = cols.querySelector('.admin-page-content');
    if (!leftPanel || !rightPanel) return;

    // Restore saved width
    const saved = localStorage.getItem('maho-left-col-width');
    if (saved) leftPanel.style.setProperty('width', saved + 'px', 'important');

    // Only inject handle once
    if (cols.querySelector('.admin-left-resize-handle')) return;

    const handle = document.createElement('div');
    handle.className = 'admin-left-resize-handle';
    handle.title = 'Drag to resize panel';
    cols.insertBefore(handle, rightPanel);

    let startX, startWidth;

    handle.addEventListener('mousedown', (e) => {
        startX = e.clientX;
        startWidth = leftPanel.offsetWidth;
        handle.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        const onMouseMove = (e) => {
            const newW = Math.max(160, Math.min(520, startWidth + e.clientX - startX));
            leftPanel.style.setProperty('width', newW + 'px', 'important');
        };

        const onMouseUp = () => {
            handle.classList.remove('dragging');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            localStorage.setItem('maho-left-col-width', leftPanel.offsetWidth);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        e.preventDefault();
    });
}

document.addEventListener('DOMContentLoaded', initResizablePanel);
document.addEventListener('turbo:load', initResizablePanel);

/**
 * Command Palette — Pages (Cmd+K) + Records (Cmd+J)
 * Pages: indexes full nav tree
 * Records: uses existing admin globalSearch AJAX endpoint
 */
let cmdMenuItems = [];

function buildCmdIndex() {
    cmdMenuItems = [];
    const walk = (ul, crumbs) => {
        ul.querySelectorAll(':scope > li').forEach(li => {
            const a = li.querySelector(':scope > a');
            if (!a) return;
            const label = (a.querySelector('span')?.textContent || a.textContent).trim();
            const href = a.getAttribute('href');
            const newCrumbs = [...crumbs, label];
            if (href && href !== '#' && !href.startsWith('javascript')) {
                cmdMenuItems.push({ label, breadcrumb: crumbs.join(' › '), href });
            }
            const childUl = li.querySelector(':scope > ul');
            if (childUl) walk(childUl, newCrumbs);
        });
    };
    const nav = document.getElementById('nav');
    if (nav) walk(nav, []);
}

function initCommandPalette() {
    if (document.getElementById('maho-cmd-palette')) {
        buildCmdIndex();
        return;
    }

    const el = document.createElement('div');
    el.id = 'maho-cmd-palette';
    el.innerHTML = `
        <div class="cmd-backdrop"></div>
        <div class="cmd-modal" role="dialog" aria-label="Command palette">
            <div class="cmd-tabs">
                <button class="cmd-tab active" data-tab="pages">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                    Pages <kbd>⌘K</kbd>
                </button>
                <button class="cmd-tab" data-tab="records">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                    Records <kbd>⌘J</kbd>
                </button>
            </div>
            <div class="cmd-search-row">
                <svg class="cmd-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input class="cmd-input" type="text" placeholder="Search pages and settings…" autocomplete="off" spellcheck="false" />
                <kbd class="cmd-esc-hint">esc</kbd>
            </div>
            <div class="cmd-results"></div>
            <div class="cmd-footer">
                <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
                <span><kbd>↵</kbd> go</span>
                <span><kbd>⌘K</kbd> pages · <kbd>⌘J</kbd> records</span>
            </div>
        </div>`;
    document.body.appendChild(el);

    const backdrop  = el.querySelector('.cmd-backdrop');
    const input     = el.querySelector('.cmd-input');
    const results   = el.querySelector('.cmd-results');
    const tabs      = el.querySelectorAll('.cmd-tab');
    let activeTab   = 'pages';
    let selectedIndex = 0;
    let recordsDebounce = null;

    // --- Tab switching ---
    tabs.forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    function switchTab(name) {
        activeTab = name;
        tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === name));
        input.placeholder = name === 'pages' ? 'Search pages and settings…' : 'Search orders, products, customers…';
        input.value = '';
        input.focus();
        if (name === 'pages') renderPageResults('');
        else renderRecordResults('');
    }

    // --- Helpers ---
    function esc(str) {
        return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }
    function highlight(text, q) {
        if (!q) return esc(text);
        const escaped = q.split('').map(ch => '.+?^${}()|[]\\'.includes(ch) ? '\\' + ch : ch).join('');
        return esc(text).replace(new RegExp(`(${esc(escaped)})`, 'gi'), '<mark>$1</mark>');
    }
    function setSelected(i) {
        selectedIndex = i;
        const items = results.querySelectorAll('.cmd-item');
        items.forEach((el, j) => el.classList.toggle('selected', j === i));
        items[i]?.scrollIntoView({ block: 'nearest' });
    }
    function navigate(href) { close(); location.href = href; }

    function bindItems() {
        results.querySelectorAll('.cmd-item').forEach((item, i) => {
            item.addEventListener('click', () => navigate(item.dataset.href));
            item.addEventListener('mouseenter', () => setSelected(i));
        });
        selectedIndex = 0;
        setSelected(0);
    }

    // --- Pages tab ---
    function renderPageResults(q) {
        const query = q.toLowerCase().trim();
        let filtered = query
            ? cmdMenuItems.map(item => {
                const lbl  = item.label.toLowerCase();
                const full = (item.breadcrumb + ' ' + item.label).toLowerCase();
                let score = 0;
                if (lbl.startsWith(query))   score = 3;
                else if (lbl.includes(query)) score = 2;
                else if (full.includes(query)) score = 1;
                return { ...item, score };
              }).filter(i => i.score > 0).sort((a,b) => b.score - a.score).slice(0, 14)
            : cmdMenuItems.slice(0, 14);

        results.innerHTML = filtered.length
            ? filtered.map(item => {
                const bc  = item.breadcrumb ? `<span class="cmd-bc">${esc(item.breadcrumb)} ›</span>` : '';
                const lbl = `<span class="cmd-lbl">${highlight(item.label, query)}</span>`;
                return `<div class="cmd-item" data-href="${esc(item.href)}">${bc}${lbl}</div>`;
              }).join('')
            : `<div class="cmd-empty">No pages matching <strong>${esc(q)}</strong></div>`;
        bindItems();
    }

    // --- Records tab ---
    function renderRecordResults(q) {
        if (!q.trim()) {
            results.innerHTML = '<div class="cmd-empty">Type to search orders, products, customers…</div>';
            return;
        }
        results.innerHTML = '<div class="cmd-loading">Searching…</div>';

        clearTimeout(recordsDebounce);
        recordsDebounce = setTimeout(() => {
            const formKey = window.FORM_KEY || document.querySelector('input[name="form_key"]')?.value || '';
            fetch(window.location.pathname.replace(/\/index\.php.*/, '') + '/index.php/admin/index/globalSearch?isAjax=true', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ query: q, form_key: formKey })
            })
            .then(r => r.text())
            .then(html => {
                // Parse the returned HTML (list of <li url="...">Label</li> groups)
                const tmp = document.createElement('div');
                tmp.innerHTML = html;
                const items = [];
                // Handle grouped results: <dl><dt>Group</dt><dd><ul><li url="">Label</li></ul></dd></dl>
                tmp.querySelectorAll('li[url], li[data-url]').forEach(li => {
                    const href = li.getAttribute('url') || li.getAttribute('data-url');
                    const label = li.textContent.trim();
                    // Group heading from closest dt or strong
                    const group = li.closest('dl')?.querySelector('dt')?.textContent?.trim() || '';
                    if (href && label) items.push({ href, label, group });
                });

                if (!items.length) {
                    results.innerHTML = `<div class="cmd-empty">No records found for <strong>${esc(q)}</strong></div>`;
                    return;
                }

                // Group by category
                const groups = {};
                items.forEach(item => {
                    if (!groups[item.group]) groups[item.group] = [];
                    groups[item.group].push(item);
                });

                results.innerHTML = Object.entries(groups).map(([group, groupItems]) => {
                    const header = group ? `<div class="cmd-group-label">${esc(group)}</div>` : '';
                    const rows = groupItems.map(item =>
                        `<div class="cmd-item" data-href="${esc(item.href)}">
                            <span class="cmd-lbl">${highlight(item.label, q)}</span>
                        </div>`
                    ).join('');
                    return header + rows;
                }).join('');

                bindItems();
            })
            .catch(() => {
                results.innerHTML = '<div class="cmd-empty">Search failed — check your connection.</div>';
            });
        }, 250);
    }

    // --- Input handler ---
    input.addEventListener('input', () => {
        if (activeTab === 'pages') renderPageResults(input.value);
        else renderRecordResults(input.value);
    });

    input.addEventListener('keydown', e => {
        const items = results.querySelectorAll('.cmd-item');
        if      (e.key === 'ArrowDown')  { e.preventDefault(); setSelected(Math.min(selectedIndex + 1, items.length - 1)); }
        else if (e.key === 'ArrowUp')    { e.preventDefault(); setSelected(Math.max(selectedIndex - 1, 0)); }
        else if (e.key === 'Enter')      { e.preventDefault(); const s = items[selectedIndex]; if (s) navigate(s.dataset.href); }
        else if (e.key === 'Escape')     { close(); }
        else if (e.key === 'Tab')        { e.preventDefault(); switchTab(activeTab === 'pages' ? 'records' : 'pages'); }
    });

    backdrop.addEventListener('click', close);

    // --- Open/close ---
    function open(tab) {
        if (!cmdMenuItems.length) buildCmdIndex();
        el.classList.add('open');
        switchTab(tab);
    }
    function close() {
        el.classList.remove('open');
    }

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && el.classList.contains('open')) { close(); return; }
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); el.classList.contains('open') && activeTab === 'pages' ? close() : open('pages'); }
        if ((e.metaKey || e.ctrlKey) && e.key === 'j') { e.preventDefault(); el.classList.contains('open') && activeTab === 'records' ? close() : open('records'); }
    });

    buildCmdIndex();
}
document.addEventListener("DOMContentLoaded", initCommandPalette);
document.addEventListener("turbo:load", initCommandPalette);

/**
 * Track actual topbar height → --admin-topbar-h CSS variable
 * Used for sticky content-header offset
 */
function initTopbarHeightTracker() {
    const notices = document.querySelector('.admin-notices');
    const update = () => {
        const h = notices ? notices.offsetHeight : 0;
        document.documentElement.style.setProperty('--admin-notices-h', h + 'px');
    };
    update();
    if ('ResizeObserver' in window) {
        if (notices) new ResizeObserver(update).observe(notices);
    } else {
        window.addEventListener('resize', update);
    }
}

document.addEventListener('DOMContentLoaded', initTopbarHeightTracker);
document.addEventListener('turbo:load', initTopbarHeightTracker);

/**
 * Inject Cmd+K search badge into .content-header (right of buttons)
 */
function initContentHeaderBadge() {
    document.querySelectorAll('.content-header').forEach(header => {
        if (header.querySelector('.cmd-launch-btn')) return; // already injected
        const btn = document.createElement('button');
        btn.className = 'cmd-launch-btn';
        btn.type = 'button';
        btn.title = 'Search (⌘K / ⌘J)';
        btn.innerHTML = `<kbd>⌘K</kbd>`;
        btn.addEventListener('click', () => {
            const palette = document.getElementById('maho-cmd-palette');
            if (palette) palette.classList.contains('open')
                ? palette.classList.remove('open')
                : document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
        });
        header.appendChild(btn);
    });
}

document.addEventListener('DOMContentLoaded', initContentHeaderBadge);
document.addEventListener('turbo:load', initContentHeaderBadge);
