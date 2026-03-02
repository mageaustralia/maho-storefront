/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Application } from './stimulus.js';

// Import all controllers
import CartController from './controllers/cart-controller.js';
import ProductController from './controllers/product-controller.js';
import CategoryFilterController from './controllers/category-filter-controller.js';
import CartDrawerController from './controllers/cart-drawer-controller.js';
import SearchController from './controllers/search-controller.js';
import MobileMenuController from './controllers/mobile-menu-controller.js';
import CheckoutController from './controllers/checkout-controller.js';
import OrderSuccessController from './controllers/order-success-controller.js';
import FreshnessController from './controllers/freshness-controller.js';
import AuthController from './controllers/auth-controller.js';
import AuthStateController from './controllers/auth-state-controller.js';
import AccountController from './controllers/account-controller.js';
import HomeCarouselController from './controllers/home-carousel-controller.js';
import WishlistController from './controllers/wishlist-controller.js';
import NewsletterController from './controllers/newsletter-controller.js';
import NewsletterPopupController from './controllers/newsletter-popup-controller.js';
import NewsletterFlyoutController from './controllers/newsletter-flyout-controller.js';
import ReviewController from './controllers/review-controller.js';
import ContactController from './controllers/contact-controller.js';
import SizeGuideController from './controllers/size-guide-controller.js';
import HoverSwatchController from './controllers/hover-swatch-controller.js';
import DevToolbarController from './controllers/dev-toolbar-controller.js';
import AnnouncementBarController from './controllers/announcement-bar-controller.js';
import { analytics } from './analytics.js';

// Prevent double-init
if (!window.__stimulusApp) {
  const application = Application.start();
  window.__stimulusApp = application;

  // Register all controllers
  application.register('cart', CartController);
  application.register('product', ProductController);
  application.register('category-filter', CategoryFilterController);
  application.register('cart-drawer', CartDrawerController);
  application.register('search', SearchController);
  application.register('mobile-menu', MobileMenuController);
  application.register('checkout', CheckoutController);
  application.register('order-success', OrderSuccessController);
  application.register('freshness', FreshnessController);
  application.register('auth', AuthController);
  application.register('auth-state', AuthStateController);
  application.register('account', AccountController);
  application.register('home-carousel', HomeCarouselController);
  application.register('wishlist', WishlistController);
  application.register('newsletter', NewsletterController);
  application.register('newsletter-popup', NewsletterPopupController);
  application.register('newsletter-flyout', NewsletterFlyoutController);
  application.register('review', ReviewController);
  application.register('contact', ContactController);
  application.register('size-guide', SizeGuideController);
  application.register('hover-swatch', HoverSwatchController);
  application.register('dev-toolbar', DevToolbarController);
  application.register('announcement-bar', AnnouncementBarController);
}

// Initialize dataLayer and track page views on Turbo navigation
window.dataLayer = window.dataLayer || [];
document.addEventListener('turbo:load', () => {
  analytics.pageView();
});
// Make analytics available globally for inline event tracking
window.mahoAnalytics = analytics;

// Open <details> elements targeted by anchor links (e.g. reviews link → accordion)
document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href^="#"]');
  if (!link) return;
  let target;
  try { target = document.querySelector(link.getAttribute('href')); } catch { return; }
  if (target instanceof HTMLDetailsElement && !target.open) {
    target.open = true;
  }
});

// Track actual sticky header height for scroll-padding-top
(() => {
  const update = () => {
    const header = document.querySelector('header.sticky, header[class*="sticky"]');
    if (header) document.documentElement.style.setProperty('--header-actual-height', header.offsetHeight + 'px');
  };
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(update);
    const watch = () => {
      const header = document.querySelector('header.sticky, header[class*="sticky"]');
      if (header) observer.observe(header);
    };
    watch();
    document.addEventListener('turbo:load', watch);
  } else {
    window.addEventListener('load', update);
    window.addEventListener('resize', update);
  }
  document.addEventListener('turbo:load', update);
})();

// Re-export utilities for use in templates if needed
export { api } from './api.js';
export { escapeHtml, formatPrice, updateCartBadge, dispatchCartEvent, ensureCart } from './utils.js';
export { analytics } from './analytics.js';