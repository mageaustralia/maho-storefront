/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Controller } from '../stimulus.js';

export default class DevToolbarController extends Controller {
  static values = {};

  connect() {
    this.devData = window.__DEV_DATA;
    if (!this.devData) return;

    this.collapsed = localStorage.getItem('dev-toolbar-collapsed') === 'true';
    this.activePanel = null;
    this.render();
  }

  render() {
    const d = this.devData;
    if (!d) return;

    const edgeBadge = this.cacheBadge(d.edgeCache);
    const kvHits = d.kvReads.filter(r => r.hit).length;
    const kvTotal = d.kvReads.length;
    const totalKvMs = d.kvReads.reduce((s, r) => s + r.ms, 0);
    const totalApiMs = d.apiCalls.reduce((s, r) => s + r.ms, 0);

    this.element.innerHTML = `
      <div class="dt-bar ${this.collapsed ? 'dt-collapsed' : ''}">
        <div class="dt-toggle" data-action="click->dev-toolbar#toggle">
          ${this.collapsed ? '&#9650; Dev' : '&#9660; Dev Toolbar'}
        </div>
        ${this.collapsed ? '' : `
          <div class="dt-items">
            <span class="dt-item" data-action="click->dev-toolbar#showPanel" data-panel="store">
              &#128218; ${d.storeCode || 'default'} &middot; ${d.pageConfig || 'default'}
            </span>
            <span class="dt-item">
              ${edgeBadge} &middot; KV ${kvHits}/${kvTotal}
            </span>
            <span class="dt-item" data-action="click->dev-toolbar#showPanel" data-panel="perf">
              &#9201; ${d.renderMs}ms &middot; API ${totalApiMs}ms &middot; KV ${totalKvMs}ms
            </span>
            <span class="dt-item dt-preview ${d.preview ? 'dt-active' : ''}" data-action="click->dev-toolbar#togglePreview">
              ${d.preview ? '&#128065; PREVIEW ON' : '&#128065; Preview'}
            </span>
            <span class="dt-item" data-action="click->dev-toolbar#showPanel" data-panel="api">&#128196; API</span>
            <span class="dt-item" data-action="click->dev-toolbar#showPanel" data-panel="kv">&#128451; KV</span>
            <span class="dt-item" data-action="click->dev-toolbar#showPanel" data-panel="actions">&#9881; Actions</span>
            <a href="/dev/logout" class="dt-item dt-logout">Logout</a>
          </div>
        `}
      </div>
      ${this.activePanel ? this.renderPanel(this.activePanel) : ''}
    `;
  }

  cacheBadge(status) {
    const colors = { HIT: '#36d399', MISS: '#fbbd23', BYPASS: '#f87272', 'PREVIEW-BYPASS': '#a991f7' };
    return `<span style="color:${colors[status] || '#999'}">&#9679; ${status}</span>`;
  }

  renderPanel(panel) {
    const d = this.devData;
    let content = '';

    switch (panel) {
      case 'store':
        content = `
          <div><strong>Store:</strong> ${d.storeCode || 'default'}</div>
          <div><strong>Page Config:</strong> ${d.pageConfig || 'store default'}</div>
          <div><strong>Theme:</strong> ${d.themeName}</div>
          <div><strong>Path:</strong> ${d.currentPath}</div>
          <div style="margin-top:8px"><strong>Switch page config:</strong></div>
          <div class="dt-config-list">
            ${d.availablePageConfigs.map(pc => `
              <button class="dt-config-btn ${d.pageConfig === pc ? 'dt-active' : ''}"
                data-action="click->dev-toolbar#switchPageConfig"
                data-config="${pc}">${pc}</button>
            `).join('')}
            <button class="dt-config-btn ${!d.pageConfig ? 'dt-active' : ''}"
              data-action="click->dev-toolbar#switchPageConfig"
              data-config="">Store default</button>
          </div>
        `;
        break;
      case 'perf':
        content = `
          <div><strong>Render:</strong> ${d.renderMs}ms total</div>
          <div><strong>API Calls:</strong></div>
          ${d.apiCalls.map(a => `<div class="dt-mono">${a.status} ${a.url} (${a.ms}ms)</div>`).join('') || '<div class="dt-mono">None</div>'}
          <div style="margin-top:8px"><strong>KV Reads:</strong></div>
          ${d.kvReads.map(k => `<div class="dt-mono">${k.hit ? '&#9989;' : '&#10060;'} ${k.key} (${k.ms}ms)</div>`).join('') || '<div class="dt-mono">None</div>'}
        `;
        break;
      case 'api':
        content = `<div class="dt-mono" style="max-height:300px;overflow:auto;white-space:pre-wrap">${JSON.stringify(d, null, 2)}</div>`;
        break;
      case 'kv':
        content = `
          <div><strong>KV keys accessed:</strong></div>
          ${d.kvReads.map(k => `
            <div class="dt-mono">${k.hit ? 'HIT' : 'MISS'} ${k.key} (${k.ms}ms)</div>
          `).join('') || '<div class="dt-mono">No KV reads</div>'}
        `;
        break;
      case 'actions':
        content = `
          <button class="dt-action-btn" data-action="click->dev-toolbar#purgePage">Purge current page cache</button>
          <button class="dt-action-btn" data-action="click->dev-toolbar#purgeAll">Purge all cache</button>
          <button class="dt-action-btn" data-action="click->dev-toolbar#forceSync">Force re-sync</button>
          <div class="dt-action-status" data-dev-toolbar-target="actionStatus"></div>
        `;
        break;
    }

    return `<div class="dt-panel">${content}</div>`;
  }

  toggle() {
    this.collapsed = !this.collapsed;
    localStorage.setItem('dev-toolbar-collapsed', this.collapsed);
    this.activePanel = null;
    this.render();
  }

  showPanel(event) {
    const panel = event.currentTarget.dataset.panel;
    this.activePanel = this.activePanel === panel ? null : panel;
    this.render();
  }

  async togglePreview() {
    const newState = !this.devData.preview;
    try {
      const resp = await fetch('/dev/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preview: newState }),
      });
      if (resp.ok) {
        window.location.reload();
      }
    } catch (e) {
      console.error('Failed to toggle preview:', e);
    }
  }

  async switchPageConfig(event) {
    const config = event.currentTarget.dataset.config || null;
    try {
      const resp = await fetch('/dev/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageconfig: config }),
      });
      if (resp.ok) {
        window.location.reload();
      }
    } catch (e) {
      console.error('Failed to switch page config:', e);
    }
  }

  async purgePage() {
    const path = window.location.pathname;
    const storeCode = window.MAHO_STORE_CODE;
    const prefix = storeCode ? `${storeCode}:` : '';
    const keys = [];
    if (path === '/') {
      keys.push(`${prefix}homepage`);
    } else {
      keys.push(`${prefix}category:${path.replace(/^\//, '')}`);
      keys.push(`${prefix}product:${path.replace(/^\//, '')}`);
      keys.push(`${prefix}cms:${path.replace(/^\//, '')}`);
    }
    await this.purgeKeys(keys);
  }

  async purgeAll() {
    await this.forceSync();
  }

  async forceSync() {
    this.setActionStatus('Syncing...');
    try {
      const resp = await fetch('/sync', {
        method: 'POST',
      });
      if (resp.ok) {
        this.setActionStatus('Sync complete. Reloading...');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        this.setActionStatus(`Sync failed: ${resp.status}`);
      }
    } catch (e) {
      this.setActionStatus(`Sync error: ${e.message}`);
    }
  }

  async purgeKeys(keys) {
    this.setActionStatus('Purging...');
    try {
      const resp = await fetch('/cache/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keys }),
      });
      if (resp.ok) {
        this.setActionStatus('Purged. Reloading...');
        setTimeout(() => window.location.reload(), 500);
      } else {
        this.setActionStatus(`Purge failed: ${resp.status}`);
      }
    } catch (e) {
      this.setActionStatus(`Error: ${e.message}`);
    }
  }

  setActionStatus(msg) {
    const el = this.element.querySelector('[data-dev-toolbar-target="actionStatus"]');
    if (el) el.textContent = msg;
  }
}
