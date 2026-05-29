/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Thin page-render routes — auth (login/register/forgot/reset), account,
 * contact, checkout and order-success. Extracted from index.tsx (Phase 3.4)
 * via registerAccountPageRoutes. These all share the same preamble (resolve
 * store context + config, build dev data), so it's factored into base() here.
 * The index.tsx-local helpers are injected as deps; page components and
 * dev-auth helpers are imported directly.
 */

import { jsx, Fragment } from 'hono/jsx';
import type { Hono } from 'hono';
import type { ContentStore } from '../content-store';
import type { Env, StoreConfig, Category, Country, StorefrontStore } from '../types';
import { createDevTimer, type DevSession, type DevData } from '../dev-auth';
import { LoginPage } from '../templates/Login';
import { RegisterPage } from '../templates/Register';
import { ForgotPasswordPage } from '../templates/ForgotPassword';
import { ResetPasswordPage } from '../templates/ResetPassword';
import { AccountPage } from '../templates/Account';
import { ContactPage } from '../templates/Contact';
import { CheckoutPage } from '../templates/Checkout';
import { OrderSuccessPage } from '../templates/OrderSuccess';

export interface AccountPageDeps {
  createStore: (env: Env, timer: ReturnType<typeof createDevTimer> | null) => ContentStore;
  getStoreContext: (c: any) => Promise<{ stores: StorefrontStore[]; currentStoreCode: string | undefined }>;
  getStoreData: (
    store: ContentStore,
    storeCode?: string,
    origin?: string,
  ) => Promise<{ config: StoreConfig; categories: Category[] }>;
  buildDevData: (
    c: any,
    timer: ReturnType<typeof createDevTimer>,
    storeCode: string | undefined,
    pageConfig: string | null,
    themeName: string,
  ) => DevData | null;
}

export function registerAccountPageRoutes(app: Hono<any>, deps: AccountPageDeps): void {
  const { createStore, getStoreContext, getStoreData, buildDevData } = deps;

  /** Shared preamble: store context + config + dev data for the thin renders. */
  async function base(c: any) {
    const devSession = c.get('devSession') as DevSession | undefined;
    const timer = devSession ? createDevTimer() : null;
    const store = createStore(c.env, timer);
    const { stores, currentStoreCode } = await getStoreContext(c);
    const { config, categories } = await getStoreData(store, currentStoreCode, new URL(c.req.url).origin);
    const devData = timer ? buildDevData(c, timer, currentStoreCode, devSession?.pageconfig ?? null, '') : null;
    return { store, stores, currentStoreCode, config, categories, devData };
  }

  // Auth pages
  app.get('/login', async (c) => {
    const { stores, currentStoreCode, config, categories, devData } = await base(c);
    return c.html(<LoginPage config={config} categories={categories} stores={stores} currentStoreCode={currentStoreCode} devData={devData} />);
  });

  app.get('/register', async (c) => {
    const { stores, currentStoreCode, config, categories, devData } = await base(c);
    return c.html(<RegisterPage config={config} categories={categories} stores={stores} currentStoreCode={currentStoreCode} devData={devData} />);
  });

  app.get('/forgot-password', async (c) => {
    const { stores, currentStoreCode, config, categories, devData } = await base(c);
    return c.html(<ForgotPasswordPage config={config} categories={categories} stores={stores} currentStoreCode={currentStoreCode} devData={devData} />);
  });

  app.get('/reset-password', async (c) => {
    const { stores, currentStoreCode, config, categories, devData } = await base(c);
    return c.html(<ResetPasswordPage config={config} categories={categories} stores={stores} currentStoreCode={currentStoreCode} devData={devData} />);
  });

  // Account
  app.get('/account', async (c) => {
    const { store, stores, currentStoreCode, config, categories, devData } = await base(c);
    const countries = await store.get<Country[]>('countries') ?? [];
    return c.html(<AccountPage config={config} categories={categories} countries={countries} stores={stores} currentStoreCode={currentStoreCode} devData={devData} />);
  });

  // Contact Us
  app.get('/contacts', async (c) => {
    const { stores, currentStoreCode, config, categories, devData } = await base(c);
    return c.html(<ContactPage config={config} categories={categories} stores={stores} currentStoreCode={currentStoreCode} devData={devData} />);
  });

  // Checkout
  app.get('/checkout', async (c) => {
    const { store, stores, currentStoreCode, config, categories, devData } = await base(c);
    const countries = await store.get<Country[]>('countries') ?? [];
    const detectedCountry = (c.req.raw.cf as any)?.country as string || '';
    const prefix = currentStoreCode ? `${currentStoreCode}:` : '';
    const googleMapsKey = await store.get<string>(`${prefix}google:mapsKey`) || c.env.GOOGLE_MAPS_KEY;
    return c.html(<CheckoutPage config={config} categories={categories} countries={countries} stores={stores} currentStoreCode={currentStoreCode} devData={devData} googleMapsKey={googleMapsKey} detectedCountry={detectedCountry} />);
  });

  // Order success
  app.get('/order/success', async (c) => {
    const { stores, currentStoreCode, config, categories, devData } = await base(c);
    return c.html(<OrderSuccessPage config={config} categories={categories} stores={stores} currentStoreCode={currentStoreCode} devData={devData} />);
  });
}
