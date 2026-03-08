<?php

declare(strict_types=1);

/**
 * Mageaustralia
 *
 * @package    Mageaustralia_Storefront
 * @copyright  Copyright (c) 2026 Mageaustralia
 * @license    https://opensource.org/licenses/osl-3.0.php  Open Software License (OSL 3.0)
 */

class Mageaustralia_Storefront_Helper_Data extends Mage_Core_Helper_Abstract
{
    public const XML_PATH_CF_ACCOUNT_ID     = 'mageaustralia_storefront/cloudflare/account_id';
    public const XML_PATH_CF_API_TOKEN      = 'mageaustralia_storefront/cloudflare/api_token';
    public const XML_PATH_CF_API_EMAIL     = 'mageaustralia_storefront/cloudflare/api_email';
    public const XML_PATH_CF_ZONE_ID        = 'mageaustralia_storefront/cloudflare/zone_id';
    public const XML_PATH_STOREFRONT_URL    = 'mageaustralia_storefront/worker/storefront_url';
    public const XML_PATH_WORKER_STORE_CODE = 'mageaustralia_storefront/worker/store_code';
    public const XML_PATH_SYNC_SECRET       = 'mageaustralia_storefront/worker/sync_secret';
    public const XML_PATH_KV_NAMESPACE_ID   = 'mageaustralia_storefront/worker/kv_namespace_id';
    public const XML_PATH_ONBOARD_WORKER_SCRIPT = 'mageaustralia_storefront/onboarding/worker_script_name';
    public const XML_PATH_EVENTS_ENABLED    = 'mageaustralia_storefront/events/enabled';
    public const XML_PATH_DEBOUNCE_SECONDS  = 'mageaustralia_storefront/events/debounce_seconds';
    public const XML_PATH_CRON_ENABLED      = 'mageaustralia_storefront/cron/enabled';
    public const XML_PATH_CRON_SYNC_TYPES   = 'mageaustralia_storefront/cron/sync_types';

    public function getCfAccountId(?int $storeId = null): string
    {
        return (string) Mage::getStoreConfig(self::XML_PATH_CF_ACCOUNT_ID, $storeId);
    }

    public function getCfApiToken(?int $storeId = null): string
    {
        // backend_model=encrypted auto-decrypts via getStoreConfig
        return (string) Mage::getStoreConfig(self::XML_PATH_CF_API_TOKEN, $storeId);
    }

    public function getCfApiEmail(?int $storeId = null): string
    {
        return (string) Mage::getStoreConfig(self::XML_PATH_CF_API_EMAIL, $storeId);
    }

    public function getCfZoneId(?int $storeId = null): string
    {
        return (string) Mage::getStoreConfig(self::XML_PATH_CF_ZONE_ID, $storeId);
    }

    public function getStorefrontUrl(?int $storeId = null): string
    {
        return rtrim((string) Mage::getStoreConfig(self::XML_PATH_STOREFRONT_URL, $storeId), '/');
    }

    /**
     * Worker store code for KV prefixing. Passed as ?store=CODE to sync endpoints.
     * Blank = default/unprefixed store.
     */
    public function getWorkerStoreCode(?int $storeId = null): string
    {
        return (string) Mage::getStoreConfig(self::XML_PATH_WORKER_STORE_CODE, $storeId);
    }

    public function getSyncSecret(?int $storeId = null): string
    {
        // backend_model=encrypted auto-decrypts via getStoreConfig
        return (string) Mage::getStoreConfig(self::XML_PATH_SYNC_SECRET, $storeId);
    }

    public function getKvNamespaceId(?int $storeId = null): string
    {
        return (string) Mage::getStoreConfig(self::XML_PATH_KV_NAMESPACE_ID, $storeId);
    }

    public function isEventBasedSyncEnabled(?int $storeId = null): bool
    {
        return Mage::getStoreConfigFlag(self::XML_PATH_EVENTS_ENABLED, $storeId);
    }

    public function getDebounceSeconds(): int
    {
        return (int) (Mage::getStoreConfig(self::XML_PATH_DEBOUNCE_SECONDS) ?: 5);
    }

    public function isCronEnabled(): bool
    {
        return Mage::getStoreConfigFlag(self::XML_PATH_CRON_ENABLED);
    }

    public function getCronSyncTypes(): array
    {
        $types = (string) Mage::getStoreConfig(self::XML_PATH_CRON_SYNC_TYPES);
        if ($types === '') {
            return [];
        }
        return explode(',', $types);
    }

    public function isConfigured(?int $storeId = null): bool
    {
        return $this->getCfAccountId($storeId) !== ''
            && $this->getCfApiToken($storeId) !== ''
            && $this->getCfZoneId($storeId) !== ''
            && $this->getStorefrontUrl($storeId) !== ''
            && $this->getSyncSecret($storeId) !== '';
    }

    public function getStorefrontClient(?int $storeId = null): Mageaustralia_Storefront_Model_Api_Storefront
    {
        /** @var Mageaustralia_Storefront_Model_Api_Storefront $client */
        $client = Mage::getModel('mageaustralia_storefront/api_storefront');
        $client->init(
            $this->getStorefrontUrl($storeId),
            $this->getSyncSecret($storeId),
            $this->getWorkerStoreCode($storeId),
        );
        return $client;
    }

    public function getCloudflareClient(?int $storeId = null): Mageaustralia_Storefront_Model_Api_Cloudflare
    {
        /** @var Mageaustralia_Storefront_Model_Api_Cloudflare $client */
        $client = Mage::getModel('mageaustralia_storefront/api_cloudflare');
        $client->init(
            $this->getCfApiToken($storeId),
            $this->getCfAccountId($storeId),
            $this->getCfZoneId($storeId),
            $this->getCfApiEmail($storeId),
        );
        return $client;
    }

    public function getStoreRegistry(?int $storeId = null): array
    {
        $client = $this->getCloudflareClient($storeId);
        $namespaceId = $this->getKvNamespaceId($storeId);
        $raw = $client->kvGet($namespaceId, '_stores');
        if ($raw === null) {
            return [];
        }
        $stores = json_decode($raw, true);
        return is_array($stores) ? $stores : [];
    }

    public function saveStoreRegistry(array $stores, ?int $storeId = null): void
    {
        $client = $this->getCloudflareClient($storeId);
        $namespaceId = $this->getKvNamespaceId($storeId);
        $client->kvPut($namespaceId, '_stores', json_encode($stores));
    }

    public function addStoreToRegistry(array $storeEntry, ?int $storeId = null): array
    {
        $stores = $this->getStoreRegistry($storeId);
        foreach ($stores as $existing) {
            if (($existing['code'] ?? '') === ($storeEntry['code'] ?? '')) {
                throw Mage::exception('Mage_Core', "Store code '{$storeEntry['code']}' already exists in registry.");
            }
        }
        $stores[] = $storeEntry;
        $this->saveStoreRegistry($stores, $storeId);
        return $stores;
    }

    public function removeStoreFromRegistry(string $storeCode, ?int $storeId = null): array
    {
        $stores = $this->getStoreRegistry($storeId);
        $stores = array_values(array_filter($stores, fn(array $s) => ($s['code'] ?? '') !== $storeCode));
        $this->saveStoreRegistry($stores, $storeId);
        return $stores;
    }

    public function getWorkerScriptName(): string
    {
        return (string) (Mage::getStoreConfig(self::XML_PATH_ONBOARD_WORKER_SCRIPT) ?: 'maho-storefront-demo');
    }

    public function generateSyncSecret(): string
    {
        return bin2hex(random_bytes(16));
    }

    /**
     * Get the storefront project directory (where package.json and src/ live).
     * Looks for maho-storefront/ relative to Maho root, then one level up.
     */
    public function getStorefrontDir(): string
    {
        $mahoRoot = Mage::getBaseDir();
        $candidates = [
            $mahoRoot . '/maho-storefront',
            dirname($mahoRoot) . '/maho-storefront',
        ];

        // Also check sibling sites (e.g. running from dev but storefront is under maho site)
        foreach (glob(dirname(dirname($mahoRoot)) . '/*/maho-storefront') as $sibling) {
            $candidates[] = $sibling;
        }

        foreach ($candidates as $dir) {
            if (is_file($dir . '/package.json') && is_file($dir . '/src/index.tsx')) {
                return $dir;
            }
        }
        return '';
    }

    /**
     * Deploy worker to Cloudflare using wrangler.
     * Generates a temporary wrangler config and runs build+deploy.
     *
     * @return array{success: bool, output: string}
     */
    public function deployWorker(array $params): array
    {
        $sfDir = $this->getStorefrontDir();
        if ($sfDir === '') {
            return ['success' => false, 'output' => 'Storefront directory not found.'];
        }

        $scriptName = $params['script_name'] ?? $this->getWorkerScriptName();
        $accountId = $params['account_id'] ?? $this->getCfAccountId();
        $kvNamespaceId = $params['kv_namespace_id'] ?? $this->getKvNamespaceId();
        $mahoApiUrl = $params['maho_api_url'] ?? Mage::getBaseUrl(Mage_Core_Model_Store::URL_TYPE_WEB);
        $syncSecret = $params['sync_secret'] ?? $this->getSyncSecret();
        $storeCode = $params['store_code'] ?? '';
        $storeName = $params['store_name'] ?? '';
        $storeUrl = $params['storefront_url'] ?? '';

        // Build DEMO_STORES JSON — start with existing stores from registry, add the new one
        $demoStores = [];
        try {
            $registry = $this->getStoreRegistry();
            foreach ($registry as $s) {
                $demoStores[] = [
                    'code' => $s['code'] ?? '',
                    'name' => $s['name'] ?? '',
                    'url'  => $s['url'] ?? '',
                ];
            }
        } catch (\Throwable) {
        }
        // Add the new store if not already in registry
        $found = false;
        foreach ($demoStores as $s) {
            if ($s['code'] === $storeCode) {
                $found = true;
                break;
            }
        }
        if (!$found && $storeCode !== '' && $storeUrl !== '') {
            $demoStores[] = ['code' => $storeCode, 'name' => $storeName, 'url' => $storeUrl];
        }

        // Generate temporary wrangler config
        $toml = <<<TOML
name = "{$scriptName}"
account_id = "{$accountId}"
main = "src/index.tsx"
compatibility_date = "2025-01-01"
compatibility_flags = ["nodejs_compat"]
jsx_factory = "jsx"
jsx_fragment = "Fragment"

[[rules]]
type = "Text"
globs = ["**/*.css", "**/*.txt"]
fallthrough = false

[[kv_namespaces]]
binding = "CONTENT"
id = "{$kvNamespaceId}"
preview_id = "{$kvNamespaceId}"

[vars]
MAHO_API_URL = "{$mahoApiUrl}"
SYNC_SECRET = "{$syncSecret}"
DEMO_STORES = '{$this->escapeTomlString(json_encode($demoStores))}'
TOML;

        $tmpConfig = $sfDir . '/wrangler.generated.toml';
        file_put_contents($tmpConfig, $toml);

        // Get CF credentials for wrangler env vars
        $apiToken = $this->getCfApiToken();
        $apiEmail = $this->getCfApiEmail();

        // Build env string for wrangler
        $envParts = [];
        if ($apiEmail !== '') {
            // Legacy key auth
            $envParts[] = 'CLOUDFLARE_API_KEY=' . escapeshellarg($apiToken);
            $envParts[] = 'CLOUDFLARE_EMAIL=' . escapeshellarg($apiEmail);
        } else {
            // API token auth
            $envParts[] = 'CLOUDFLARE_API_TOKEN=' . escapeshellarg($apiToken);
        }
        $envStr = implode(' ', $envParts);

        // Ensure node >= 20 is in PATH (wrangler requires it; system may have v18)
        $nodeBin = '';
        // Prefer NVM installations (likely newer)
        foreach (glob('/var/www/*/.nvm/versions/node/*/bin/node') as $n) {
            $nodeBin = dirname($n);
            break;
        }
        // Fall back to system paths if no NVM
        if ($nodeBin === '') {
            foreach (['/usr/local/bin', '/usr/bin'] as $p) {
                if (is_file($p . '/node')) {
                    $nodeBin = $p;
                    break;
                }
            }
        }
        $pathPrefix = $nodeBin !== '' ? 'PATH=' . escapeshellarg($nodeBin) . ':$PATH ' : '';

        // Build JS if missing (esbuild — fast, no TTY issues)
        $jsFile = $sfDir . '/public/controllers.js.txt';
        $cssFile = $sfDir . '/public/styles.css';
        $buildOutput = '';
        if (!is_file($jsFile) || filesize($jsFile) === 0) {
            $buildCmd = sprintf(
                '%scd %s && npx esbuild src/js/app.js --bundle --minify --format=esm --outfile=public/controllers.js.txt "--external:https://cdn.jsdelivr.net/*" 2>&1',
                $pathPrefix,
                escapeshellarg($sfDir),
            );
            $buildOutput .= shell_exec($buildCmd) ?? '';
        }
        if (!is_file($cssFile) || filesize($cssFile) === 0) {
            $buildOutput .= "Warning: CSS not built — run 'npm run build:css' manually on first deploy\n";
        }

        // Deploy to Cloudflare
        $cmd = sprintf(
            '%scd %s && %s npx wrangler deploy --config wrangler.generated.toml 2>&1',
            $pathPrefix,
            escapeshellarg($sfDir),
            $envStr,
        );
        $output = $buildOutput . (shell_exec($cmd) ?? '');

        // Clean up temp config
        @unlink($tmpConfig);

        $success = str_contains($output, 'Uploaded') || str_contains($output, 'Published');
        return ['success' => $success, 'output' => $output];
    }

    private function escapeTomlString(string $value): string
    {
        return str_replace("'", "\'", $value);
    }

    public function logActivity(string $action, string $status, string $details = '', ?int $durationMs = null): void
    {
        /** @var Mageaustralia_Storefront_Model_Log $log */
        $log = Mage::getModel('mageaustralia_storefront/log');
        $log->setData([
            'action'      => $action,
            'status'      => $status,
            'details'     => $details,
            'admin_user'  => $this->getAdminUsername(),
            'duration_ms' => $durationMs,
            'created_at'  => Mage_Core_Model_Locale::now(),
        ]);
        $log->save();
    }

    private function getAdminUsername(): ?string
    {
        /** @var Mage_Admin_Model_Session $session */
        $session = Mage::getSingleton('admin/session');
        $user = $session->getUser();
        return $user ? $user->getUsername() : null;
    }
}
