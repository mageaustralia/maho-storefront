/**
 * Maho Storefront — /.well-known/oauth-authorization-server (RFC 8414)
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * OAuth 2.0 Authorization Server Metadata descriptor. Lets agents (and
 * any OAuth-aware client) discover authentication endpoints without
 * being told out-of-band where to POST credentials.
 *
 * The Maho backend's API Platform exposes:
 *   POST /api/rest/v2/auth/token   — issue a token (password, refresh, client_credentials)
 *   POST /api/rest/v2/auth/refresh — refresh an access token
 *   POST /api/rest/v2/auth/logout  — revoke
 *
 * From the agent's perspective, the storefront proxies /api/auth/* to
 * the backend, so the token_endpoint is the storefront URL.
 */

interface OAuthDiscoveryInput {
  origin: string;
}

export function generateOAuthDiscovery({ origin }: OAuthDiscoveryInput): object {
  return {
    issuer: origin,
    token_endpoint: `${origin}/api/auth/token`,
    revocation_endpoint: `${origin}/api/auth/logout`,
    // Maho's API Platform supports these grants per AuthToken DTO docs
    // (password for customer login, client_credentials for api_user grants,
    // refresh_token for renewal).
    grant_types_supported: [
      'password',
      'refresh_token',
      'client_credentials',
    ],
    // Maho accepts client credentials in either the Authorization header
    // (Basic) or the request body.
    token_endpoint_auth_methods_supported: [
      'client_secret_basic',
      'client_secret_post',
    ],
    // Currently we don't advertise PKCE — the API Platform's token endpoint
    // is direct-grant, not redirect-based, so PKCE doesn't apply yet.
    response_types_supported: ['token'],
    scopes_supported: ['customer', 'admin', 'api_user'],
    // Tokens are JWTs (Bearer).
    token_endpoint_auth_signing_alg_values_supported: ['HS256'],
    // Pointer to where service description / API catalog live so a client
    // exploring auth can hop back out.
    service_documentation: `${origin}/.well-known/api-catalog`,
  };
}
