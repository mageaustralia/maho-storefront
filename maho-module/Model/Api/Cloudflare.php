<?php

declare(strict_types=1);

/**
 * Mageaustralia
 *
 * @package    Mageaustralia_Storefront
 * @copyright  Copyright (c) 2026 Mageaustralia
 * @license    https://opensource.org/licenses/osl-3.0.php  Open Software License (OSL 3.0)
 */

use Symfony\Component\HttpClient\HttpClient;
use Symfony\Contracts\HttpClient\HttpClientInterface;

class Mageaustralia_Storefront_Model_Api_Cloudflare
{
    private const BASE_URL = 'https://api.cloudflare.com/client/v4/';

    private string $accountId = '';
    private string $zoneId = '';
    private ?HttpClientInterface $client = null;

    private bool $isLegacyAuth = false;

    public function init(string $apiToken, string $accountId, string $zoneId, string $apiEmail = ''): void
    {
        $this->accountId = $accountId;
        $this->zoneId = $zoneId;

        // Legacy API key auth uses X-Auth-Key + X-Auth-Email headers
        // Modern API token auth uses Authorization: Bearer
        $this->isLegacyAuth = $apiEmail !== '';
        $headers = $this->isLegacyAuth
            ? ['X-Auth-Key' => $apiToken, 'X-Auth-Email' => $apiEmail]
            : ['Authorization' => 'Bearer ' . $apiToken];

        $this->client = HttpClient::create([
            'base_uri' => self::BASE_URL,
            'timeout'  => 30,
            'headers'  => $headers,
        ]);
    }

    public function verifyToken(): bool
    {
        if ($this->isLegacyAuth) {
            // Legacy keys don't have a token verify endpoint; test with a zones list instead
            $response = $this->request('GET', "zones/{$this->zoneId}");
            return ($response['success'] ?? false) === true;
        }
        $response = $this->request('GET', 'user/tokens/verify');
        return ($response['success'] ?? false) === true;
    }

    public function purgeAll(): array
    {
        return $this->request('POST', "zones/{$this->zoneId}/purge_cache", [
            'purge_everything' => true,
        ]);
    }

    public function purgeUrls(array $urls): array
    {
        return $this->request('POST', "zones/{$this->zoneId}/purge_cache", [
            'files' => $urls,
        ]);
    }

    public function purgeHosts(array $hosts): array
    {
        return $this->request('POST', "zones/{$this->zoneId}/purge_cache", [
            'hosts' => $hosts,
        ]);
    }

    public function kvList(string $namespaceId, string $prefix = ''): array
    {
        $path = "accounts/{$this->accountId}/storage/kv/namespaces/{$namespaceId}/keys";
        if ($prefix !== '') {
            $path .= '?prefix=' . urlencode($prefix);
        }
        $response = $this->request('GET', $path);
        return $response['result'] ?? [];
    }

    public function kvDelete(string $namespaceId, string $key): bool
    {
        $encodedKey = urlencode($key);
        $response = $this->request('DELETE', "accounts/{$this->accountId}/storage/kv/namespaces/{$namespaceId}/values/{$encodedKey}");
        return ($response['success'] ?? false) === true;
    }

    public function kvGet(string $namespaceId, string $key): ?string
    {
        $encodedKey = urlencode($key);
        return $this->requestRawValue('GET', "accounts/{$this->accountId}/storage/kv/namespaces/{$namespaceId}/values/{$encodedKey}");
    }

    public function kvPut(string $namespaceId, string $key, string $value): bool
    {
        $encodedKey = urlencode($key);
        $response = $this->requestRaw('PUT', "accounts/{$this->accountId}/storage/kv/namespaces/{$namespaceId}/values/{$encodedKey}", $value);
        return ($response['success'] ?? false) === true;
    }

    public function createDnsRecord(string $type, string $name, string $content, bool $proxied = true): array
    {
        return $this->request('POST', "zones/{$this->zoneId}/dns_records", [
            'type'    => $type,
            'name'    => $name,
            'content' => $content,
            'proxied' => $proxied,
            'ttl'     => 1,
        ]);
    }

    public function listDnsRecords(array $params = []): array
    {
        $query = $params !== [] ? '?' . http_build_query($params) : '';
        $response = $this->request('GET', "zones/{$this->zoneId}/dns_records{$query}");
        return $response['result'] ?? [];
    }

    public function deleteDnsRecord(string $recordId): bool
    {
        $response = $this->request('DELETE', "zones/{$this->zoneId}/dns_records/{$recordId}");
        return ($response['success'] ?? false) === true;
    }

    public function createWorkerRoute(string $pattern, string $scriptName): array
    {
        return $this->request('POST', "zones/{$this->zoneId}/workers/routes", [
            'pattern' => $pattern,
            'script'  => $scriptName,
        ]);
    }

    public function listWorkerRoutes(): array
    {
        $response = $this->request('GET', "zones/{$this->zoneId}/workers/routes");
        return $response['result'] ?? [];
    }

    public function deleteWorkerRoute(string $routeId): bool
    {
        $response = $this->request('DELETE', "zones/{$this->zoneId}/workers/routes/{$routeId}");
        return ($response['success'] ?? false) === true;
    }


    /**
     * Discover Account ID and Zone ID from API credentials alone.
     * Calls GET /zones which returns zone objects containing account.id.
     *
     * @return array{accounts: array, zones: array}
     */
    public static function discover(string $apiToken, string $apiEmail = ''): array
    {
        $isLegacy = $apiEmail !== '';
        $headers = $isLegacy
            ? ['X-Auth-Key' => $apiToken, 'X-Auth-Email' => $apiEmail]
            : ['Authorization' => 'Bearer ' . $apiToken];

        $client = HttpClient::create([
            'base_uri' => self::BASE_URL,
            'timeout'  => 15,
            'headers'  => $headers,
        ]);

        $response = $client->request('GET', 'zones');
        $result = $response->toArray(false);

        if (($result['success'] ?? false) !== true) {
            $errorMsg = $result['errors'][0]['message'] ?? 'Unknown error';
            throw Mage::exception('Mage_Core', "Cloudflare API: {$errorMsg}");
        }

        $accounts = [];
        $zones = [];
        foreach ($result['result'] ?? [] as $zone) {
            $accountId = $zone['account']['id'] ?? '';
            $accountName = $zone['account']['name'] ?? '';
            if ($accountId !== '' && !isset($accounts[$accountId])) {
                $accounts[$accountId] = ['id' => $accountId, 'name' => $accountName];
            }
            $zones[] = [
                'id'      => $zone['id'],
                'name'    => $zone['name'],
                'status'  => $zone['status'] ?? '',
                'account' => $accountId,
            ];
        }

        return [
            'accounts' => array_values($accounts),
            'zones'    => $zones,
        ];
    }

    public function listZones(): array
    {
        $response = $this->request('GET', 'zones');
        return $response['result'] ?? [];
    }

    /**
     * PUT with raw string body — for KV writes (not JSON-wrapped)
     *
     * @throws Mage_Core_Exception
     */
    protected function requestRaw(string $method, string $path, string $body): array
    {
        if ($this->client === null) {
            throw Mage::exception('Mage_Core', 'Cloudflare API client not initialized. Call init() first.');
        }

        $response = $this->client->request($method, $path, [
            'headers' => ['Content-Type' => 'text/plain'],
            'body'    => $body,
        ]);
        $statusCode = $response->getStatusCode();
        $result = $response->toArray(false);

        if ($statusCode >= 400) {
            $errorMsg = 'Cloudflare API error';
            if (!empty($result['errors'][0]['message'])) {
                $errorMsg = $result['errors'][0]['message'];
            }
            throw Mage::exception('Mage_Core', "Cloudflare API: {$errorMsg} (HTTP {$statusCode})");
        }

        return $result;
    }

    /**
     * GET that returns raw string content — for KV reads
     *
     * @throws Mage_Core_Exception
     */
    protected function requestRawValue(string $method, string $path): ?string
    {
        if ($this->client === null) {
            throw Mage::exception('Mage_Core', 'Cloudflare API client not initialized. Call init() first.');
        }

        $response = $this->client->request($method, $path);
        $statusCode = $response->getStatusCode();

        if ($statusCode === 404) {
            return null;
        }

        if ($statusCode >= 400) {
            $result = $response->toArray(false);
            $errorMsg = !empty($result['errors'][0]['message']) ? $result['errors'][0]['message'] : 'Cloudflare API error';
            throw Mage::exception('Mage_Core', "Cloudflare API: {$errorMsg} (HTTP {$statusCode})");
        }

        return $response->getContent();
    }

    /**
     * @throws Mage_Core_Exception
     */
    protected function request(string $method, string $path, ?array $body = null): array
    {
        if ($this->client === null) {
            throw Mage::exception('Mage_Core', 'Cloudflare API client not initialized. Call init() first.');
        }

        $options = [];
        if ($body !== null) {
            $options['json'] = $body;
        }

        $response = $this->client->request($method, $path, $options);
        $statusCode = $response->getStatusCode();
        $result = $response->toArray(false);

        if ($statusCode >= 400) {
            $errorMsg = 'Cloudflare API error';
            if (!empty($result['errors'][0]['message'])) {
                $errorMsg = $result['errors'][0]['message'];
            }
            throw Mage::exception('Mage_Core', "Cloudflare API: {$errorMsg} (HTTP {$statusCode})");
        }

        return $result;
    }
}
