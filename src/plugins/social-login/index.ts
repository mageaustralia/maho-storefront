/**
 * Social Login Plugin
 *
 * Adds Google, Apple, and Facebook sign-in buttons to login/register pages.
 * Requires the MageAustralia_SocialLogin PHP module to be installed and
 * at least one provider enabled in admin (Customers > Social Login).
 *
 * When no providers are enabled, this plugin renders nothing.
 */

import type { PluginManifest } from '../types';
import { SocialLoginButtons } from './SocialLoginButtons';
import { SocialLoginCheckout } from './SocialLoginCheckout';
import SocialAuthController from './controller';

const manifest: PluginManifest = {
  name: 'social-login',

  slots: [
    { slot: 'auth.login.after', component: SocialLoginButtons, order: 10 },
    { slot: 'auth.register.after', component: SocialLoginButtons, order: 10 },
    { slot: 'checkout.login.after', component: SocialLoginCheckout, order: 10 },
  ],

  controllers: [
    { name: 'social-auth', controller: SocialAuthController },
  ],

  headScripts: [
    {
      key: 'google-gsi',
      src: 'https://accounts.google.com/gsi/client',
      async: true,
      defer: true,
      when: (config) => !!config.extensions?.socialLoginProviders?.some((p: any) => p.code === 'google'),
    },
    {
      key: 'apple-auth',
      src: 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js',
      async: true,
      defer: true,
      when: (config) => !!config.extensions?.socialLoginProviders?.some((p: any) => p.code === 'apple'),
    },
    {
      key: 'facebook-sdk',
      when: (config) => !!config.extensions?.socialLoginProviders?.find((p: any) => p.code === 'facebook'),
      inline: (config) => {
        const fb = config.extensions?.socialLoginProviders?.find((p: any) => p.code === 'facebook');
        if (!fb) return '';
        return `window.fbAsyncInit=function(){FB.init({appId:'${fb.appId}',cookie:true,xfbml:false,version:'v19.0'})};(function(d,s,id){var js,fjs=d.getElementsByTagName(s)[0];if(d.getElementById(id))return;js=d.createElement(s);js.id=id;js.src="https://connect.facebook.net/en_US/sdk.js";fjs.parentNode.insertBefore(js,fjs)})(document,'script','facebook-jssdk');`;
      },
    },
  ],
};

export default manifest;
