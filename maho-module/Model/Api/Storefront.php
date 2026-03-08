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

class Mageaustralia_Storefront_Model_Api_Storefront
{
    private ?HttpClientInterface $client = null;
    private string $storeCode = '';

    public function init(string $baseUrl, string $syncSecret, string $storeCode = ''): void
    {
        $this->storeCode = $storeCode;
        $this->client = HttpClient::create([
            'base_uri' => rtrim($baseUrl, '/') . '/',
            'timeout'  => 120,
            'headers'  => [
                'Authorization' => 'Bearer ' . $syncSecret,
            ],
        ]);
    }

    public function getPulse(): array
    {
        return $this->request('GET', 'pulse');
    }

    public function syncFull(): array
    {
        return $this->request('POST', $this->withStoreParam('sync'));
    }

    public function syncPartial(string $type): array
    {
        return $this->request('POST', $this->withStoreParam('sync/' . urlencode($type)));
    }

    public function syncProductsByIds(array $ids): array
    {
        return $this->request('POST', $this->withStoreParam('sync/products-by-id'), ['ids' => $ids]);
    }

    public function syncCategoriesByIds(array $ids): array
    {
        return $this->request('POST', $this->withStoreParam('sync/categories-by-id'), ['ids' => $ids]);
    }

    public function cachePurge(array $urls): array
    {
        return $this->request('POST', 'cache/purge', ['urls' => $urls]);
    }

    public function cacheDelete(array $keys): array
    {
        return $this->request('POST', 'cache/delete', ['keys' => $keys]);
    }

    public function cacheKeys(string $prefix = ''): array
    {
        $path = 'cache/keys';
        if ($prefix !== '') {
            $path .= '?prefix=' . urlencode($prefix);
        }
        return $this->request('GET', $path);
    }

    /**
     * Appends ?store=CODE to the path if a store code is configured
     */
    private function withStoreParam(string $path): string
    {
        if ($this->storeCode !== '') {
            $separator = str_contains($path, '?') ? '&' : '?';
            $path .= $separator . 'store=' . urlencode($this->storeCode);
        }
        return $path;
    }

    /**
     * @throws Mage_Core_Exception
     */
    protected function request(string $method, string $path, ?array $body = null): array
    {
        if ($this->client === null) {
            throw Mage::exception('Mage_Core', 'Storefront API client not initialized. Call init() first.');
        }

        $options = [];
        if ($body !== null) {
            $options['json'] = $body;
        }

        $response = $this->client->request($method, $path, $options);
        $statusCode = $response->getStatusCode();
        $result = $response->toArray(false);

        if ($statusCode >= 400) {
            $errorMsg = $result['error'] ?? $result['message'] ?? 'Unknown error';
            throw Mage::exception('Mage_Core', "Storefront API: {$errorMsg} (HTTP {$statusCode})");
        }

        return $result;
    }
}
