// The controller itself is a browser-side Stimulus controller authored in JS
// (typechecked via the browser build, not the Worker config). The Worker only
// imports it to register it in the plugin manifest, where it's typed `any`.
declare const SocialAuthController: new (...args: unknown[]) => unknown;
export default SocialAuthController;
