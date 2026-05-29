/**
 * Custom Forms Plugin
 *
 * Renders forms built with the MageAustralia_CustomForms PHP module on the
 * headless storefront. The CMS embed is a neutral `<div data-maho-form="CODE">`
 * placeholder (the only form-ish thing that survives the CMS HTML sanitiser);
 * the bootstrap below attaches the `custom-form` Stimulus controller to each
 * placeholder, which then fetches the schema and renders the form client-side.
 *
 * Requires the headless API to be enabled on the backend
 * (System Config > Custom Forms > Headless API). When it isn't, the schema
 * fetch 404s and the controller shows "currently unavailable".
 */

import type { PluginManifest } from '../types';
import CustomFormController from './controller';

const manifest: PluginManifest = {
  name: 'custom-forms',

  controllers: [
    { name: 'custom-form', controller: CustomFormController },
  ],

  // Bootstrap: the CMS placeholder stays renderer-neutral (no data-controller),
  // so the storefront attaches the controller at runtime. Stimulus observes the
  // DOM, so setting data-controller after start still triggers connect().
  headScripts: [
    {
      key: 'custom-forms-bootstrap',
      inline:
        "document.addEventListener('DOMContentLoaded',function(){" +
        "document.querySelectorAll('[data-maho-form]:not([data-controller])')" +
        ".forEach(function(el){el.setAttribute('data-controller','custom-form');});" +
        "});",
    },
  ],
};

export default manifest;
