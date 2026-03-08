<?php

declare(strict_types=1);

/**
 * Mageaustralia
 *
 * @package    Mageaustralia_Storefront
 * @copyright  Copyright (c) 2026 Mageaustralia
 * @license    https://opensource.org/licenses/osl-3.0.php  Open Software License (OSL 3.0)
 */

class Mageaustralia_Storefront_Adminhtml_Storefront_OnboardController extends Mage_Adminhtml_Controller_Action
{
    #[\Override]
    public function preDispatch()
    {
        $this->_setForcedFormKeyActions(['validate', 'provision', 'provisionStep', 'rollback', 'removeStore']);
        return parent::preDispatch();
    }

    public function indexAction(): void
    {
        $this->_title($this->__('System'))
            ->_title($this->__('Storefront'))
            ->_title($this->__('New Store'));
        $this->loadLayout();
        $this->_setActiveMenu('system/mageaustralia_storefront/onboard');
        $this->renderLayout();
    }

    public function listZonesAction(): void
    {
        try {
            /** @var Mageaustralia_Storefront_Helper_Data $helper */
            $helper = Mage::helper('mageaustralia_storefront');
            $client = $helper->getCloudflareClient();
            $zones = $client->listZones();

            $result = [];
            foreach ($zones as $zone) {
                $result[] = [
                    'id'     => $zone['id'],
                    'name'   => $zone['name'],
                    'status' => $zone['status'] ?? 'unknown',
                ];
            }
            $this->sendJson(['success' => true, 'zones' => $result]);
        } catch (\Exception $e) {
            $this->sendJson(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    public function listStoresAction(): void
    {
        try {
            /** @var Mageaustralia_Storefront_Helper_Data $helper */
            $helper = Mage::helper('mageaustralia_storefront');
            $stores = $helper->getStoreRegistry();
            $this->sendJson(['success' => true, 'stores' => $stores]);
        } catch (\Exception $e) {
            $this->sendJson(['success' => false, 'error' => $e->getMessage()]);
        }
    }

    public function validateAction(): void
    {
        $result = ['success' => false];

        try {
            $subdomain = trim((string) $this->getRequest()->getPost('subdomain'));
            $zoneId = trim((string) $this->getRequest()->getPost('zone_id'));
            $zoneName = trim((string) $this->getRequest()->getPost('zone_name'));
            $domainType = trim((string) $this->getRequest()->getPost('domain_type'));
            $mahoStoreId = (int) $this->getRequest()->getPost('maho_store_id');

            if ($subdomain === '' || $zoneId === '' || $mahoStoreId === 0) {
                $result['error'] = 'Subdomain, zone, and Maho store view are required.';
                $this->sendJson($result);
                return;
            }

            // Resolve store code from the selected Maho store view
            $mahoStore = Mage::app()->getStore($mahoStoreId);
            $storeCode = $mahoStore->getCode();

            /** @var Mageaustralia_Storefront_Helper_Data $helper */
            $helper = Mage::helper('mageaustralia_storefront');

            $checks = [];

            // 1. Check store code uniqueness in KV registry
            $stores = $helper->getStoreRegistry();
            $codeExists = false;
            foreach ($stores as $s) {
                if (($s['code'] ?? '') === $storeCode) {
                    $codeExists = true;
                    break;
                }
            }
            $checks[] = [
                'label' => 'Store code available',
                'pass'  => !$codeExists,
                'error' => $codeExists ? "Store code '{$storeCode}' already exists." : null,
            ];

            // 2. Check DNS conflict — need to init client with the selected zone
            $cfClient = $this->getCfClientForZone($zoneId);
            $fqdn = $subdomain . '.' . $zoneName;
            $dnsRecords = $cfClient->listDnsRecords(['name' => $fqdn]);
            $dnsConflict = count($dnsRecords) > 0;
            $checks[] = [
                'label' => 'No DNS conflict',
                'pass'  => !$dnsConflict,
                'error' => $dnsConflict ? "DNS record already exists for {$fqdn}." : null,
            ];

            // 3. Check worker route conflict
            $routePattern = $fqdn . '/*';
            $routes = $cfClient->listWorkerRoutes();
            $routeConflict = false;
            foreach ($routes as $route) {
                if (($route['pattern'] ?? '') === $routePattern) {
                    $routeConflict = true;
                    break;
                }
            }
            $checks[] = [
                'label' => 'No route conflict',
                'pass'  => !$routeConflict,
                'error' => $routeConflict ? "Worker route already exists for {$routePattern}." : null,
            ];

            $allPass = true;
            foreach ($checks as $c) {
                if (!$c['pass']) {
                    $allPass = false;
                    break;
                }
            }

            $result = ['success' => true, 'checks' => $checks, 'all_pass' => $allPass];
        } catch (\Exception $e) {
            $result['error'] = $e->getMessage();
        }

        $this->sendJson($result);
    }

    public function provisionAction(): void
    {
        $result = ['success' => false];

        try {
            $storeName = trim((string) $this->getRequest()->getPost('store_name'));
            $subdomain = trim((string) $this->getRequest()->getPost('subdomain'));
            $zoneId = trim((string) $this->getRequest()->getPost('zone_id'));
            $zoneName = trim((string) $this->getRequest()->getPost('zone_name'));
            $domainType = trim((string) $this->getRequest()->getPost('domain_type'));
            $mahoStoreId = (int) $this->getRequest()->getPost('maho_store_id');

            if ($subdomain === '' || $zoneId === '' || $zoneName === '' || $mahoStoreId === 0) {
                $result['error'] = 'Missing required fields.';
                $this->sendJson($result);
                return;
            }

            // Resolve the actual Maho store view code — this is the authoritative source
            // It's used as both the KV prefix and the Maho API store code
            $mahoStore = Mage::app()->getStore($mahoStoreId);
            $storeCode = $mahoStore->getCode();
            if ($storeCode === '') {
                $result['error'] = 'Could not resolve Maho store view code.';
                $this->sendJson($result);
                return;
            }

            /** @var Mageaustralia_Storefront_Helper_Data $helper */
            $helper = Mage::helper('mageaustralia_storefront');
            $fqdn = $subdomain . '.' . $zoneName;
            $scriptName = $helper->getWorkerScriptName();
            // Use the existing worker sync secret — the shared worker has a single SYNC_SECRET
            $syncSecret = $helper->getSyncSecret();

            $steps = [
                ['label' => 'Ensuring KV namespace exists', 'action' => 'ensure_kv'],
                ['label' => 'Writing store registry', 'action' => 'registry'],
                ['label' => 'Creating DNS record', 'action' => 'dns', 'skip' => ($domainType === 'external')],
                ['label' => 'Deploying worker (build + upload)', 'action' => 'deploy_worker'],
                ['label' => 'Creating worker route', 'action' => 'route'],
                ['label' => 'Configuring Maho', 'action' => 'maho_config'],
                ['label' => 'Running initial sync', 'action' => 'sync'],
                ['label' => 'Verifying store', 'action' => 'verify'],
            ];

            // Filter out skipped steps
            $steps = array_values(array_filter($steps, fn(array $s) => !($s['skip'] ?? false)));
            // Number the steps
            foreach ($steps as $i => &$step) {
                $step['step'] = $i + 1;
            }
            unset($step);

            $session = Mage::getSingleton('admin/session');
            $session->setOnboardPlan($steps);
            $session->setOnboardCurrentStep(0);
            $session->setOnboardRollbackLog([]);
            $session->setOnboardParams([
                'store_name'     => $storeName,
                'store_code'     => $storeCode,
                'subdomain'      => $subdomain,
                'zone_id'        => $zoneId,
                'zone_name'      => $zoneName,
                'domain_type'    => $domainType,
                'maho_store_id'  => $mahoStoreId,
                'fqdn'           => $fqdn,
                'script_name'    => $scriptName,
                'sync_secret'    => $syncSecret,
                'storefront_url' => 'https://' . $fqdn,
            ]);

            $result = [
                'success'     => true,
                'total_steps' => count($steps),
                'first_step'  => $steps[0]['label'] ?? '',
            ];
        } catch (\Exception $e) {
            $result['error'] = $e->getMessage();
        }

        $this->sendJson($result);
    }

    public function provisionStepAction(): void
    {
        $result = ['success' => false];

        try {
            $session = Mage::getSingleton('admin/session');
            $steps = $session->getOnboardPlan();
            $currentStep = (int) $session->getOnboardCurrentStep();
            $rollbackLog = $session->getOnboardRollbackLog() ?: [];
            $params = $session->getOnboardParams();

            if (!is_array($steps) || $currentStep >= count($steps)) {
                $result['error'] = 'No more steps to execute.';
                $this->sendJson($result);
                return;
            }

            $step = $steps[$currentStep];
            /** @var Mageaustralia_Storefront_Helper_Data $helper */
            $helper = Mage::helper('mageaustralia_storefront');

            $rollbackEntry = $this->executeProvisionStep($step, $params, $helper);
            if ($rollbackEntry !== null) {
                $rollbackLog[] = $rollbackEntry;
            }

            $session->setOnboardCurrentStep($currentStep + 1);
            $session->setOnboardRollbackLog($rollbackLog);

            $nextStep = ($currentStep + 1 < count($steps)) ? $steps[$currentStep + 1] : null;

            $result = [
                'success'    => true,
                'step'       => $currentStep + 1,
                'total'      => count($steps),
                'label'      => $step['label'],
                'percent'    => (int) round(($currentStep + 1) / count($steps) * 100),
                'next_label' => $nextStep ? $nextStep['label'] : null,
                'complete'   => $nextStep === null,
            ];

            if ($nextStep === null) {
                // Provisioning complete — return summary
                $result['store_url'] = $params['storefront_url'];
                $result['store_code'] = $params['store_code'];
                $result['domain_type'] = $params['domain_type'];
                $result['fqdn'] = $params['fqdn'];
                $result['script_name'] = $params['script_name'];
                $result['maho_store_id'] = $params['maho_store_id'];

                if ($params['domain_type'] === 'external') {
                    $result['cname_target'] = $params['script_name'] . '.workers.dev';
                    $result['cname_name'] = $params['fqdn'];
                }

                // Clean up session
                $session->unsOnboardPlan();
                $session->unsOnboardCurrentStep();
                $session->unsOnboardRollbackLog();
                $session->unsOnboardParams();
            }
        } catch (\Exception $e) {
            $session = Mage::getSingleton('admin/session');
            $currentStep = (int) $session->getOnboardCurrentStep();
            $steps = $session->getOnboardPlan() ?: [];
            $step = $steps[$currentStep] ?? ['label' => 'Unknown'];

            $result = [
                'success'      => false,
                'error'        => $e->getMessage(),
                'step'         => $currentStep + 1,
                'total'        => count($steps),
                'label'        => $step['label'],
                'can_rollback' => true,
            ];
        }

        $this->sendJson($result);
    }

    public function rollbackAction(): void
    {
        $result = ['success' => false];

        try {
            $session = Mage::getSingleton('admin/session');
            $rollbackLog = $session->getOnboardRollbackLog() ?: [];
            $params = $session->getOnboardParams() ?: [];

            if (empty($rollbackLog)) {
                $result = ['success' => true, 'message' => 'Nothing to roll back.'];
                $this->sendJson($result);
                return;
            }

            /** @var Mageaustralia_Storefront_Helper_Data $helper */
            $helper = Mage::helper('mageaustralia_storefront');
            $errors = [];

            // Rollback in reverse order
            foreach (array_reverse($rollbackLog) as $entry) {
                try {
                    $this->executeRollbackStep($entry, $params, $helper);
                } catch (\Exception $e) {
                    $errors[] = $entry['action'] . ': ' . $e->getMessage();
                }
            }

            // Clean up session
            $session->unsOnboardPlan();
            $session->unsOnboardCurrentStep();
            $session->unsOnboardRollbackLog();
            $session->unsOnboardParams();

            if (empty($errors)) {
                $result = ['success' => true, 'message' => 'All steps rolled back successfully.'];
            } else {
                $result = ['success' => false, 'error' => 'Partial rollback: ' . implode('; ', $errors)];
            }
        } catch (\Exception $e) {
            $result['error'] = $e->getMessage();
        }

        $this->sendJson($result);
    }

    public function removeStoreAction(): void
    {
        $result = ['success' => false];

        try {
            $storeCode = trim((string) $this->getRequest()->getPost('store_code'));
            $removeDns = (bool) $this->getRequest()->getPost('remove_dns');
            $removeRoute = (bool) $this->getRequest()->getPost('remove_route');

            if ($storeCode === '') {
                $result['error'] = 'Store code is required.';
                $this->sendJson($result);
                return;
            }

            /** @var Mageaustralia_Storefront_Helper_Data $helper */
            $helper = Mage::helper('mageaustralia_storefront');

            // Get store details from registry before removing
            $stores = $helper->getStoreRegistry();
            $storeEntry = null;
            foreach ($stores as $s) {
                if (($s['code'] ?? '') === $storeCode) {
                    $storeEntry = $s;
                    break;
                }
            }

            // Remove from registry
            $helper->removeStoreFromRegistry($storeCode);

            // Optionally clean up DNS and route
            if ($storeEntry !== null) {
                $fqdn = $storeEntry['url'] ?? '';
                $fqdn = preg_replace('#^https?://#', '', $fqdn);

                if ($removeDns && $fqdn !== '') {
                    try {
                        $client = $helper->getCloudflareClient();
                        $dnsRecords = $client->listDnsRecords(['name' => $fqdn]);
                        foreach ($dnsRecords as $record) {
                            $client->deleteDnsRecord($record['id']);
                        }
                    } catch (\Exception $e) {
                        // Non-fatal — store already removed from registry
                    }
                }

                if ($removeRoute && $fqdn !== '') {
                    try {
                        $client = $helper->getCloudflareClient();
                        $routes = $client->listWorkerRoutes();
                        $pattern = $fqdn . '/*';
                        foreach ($routes as $route) {
                            if (($route['pattern'] ?? '') === $pattern) {
                                $client->deleteWorkerRoute($route['id']);
                            }
                        }
                    } catch (\Exception $e) {
                        // Non-fatal
                    }
                }
            }

            $helper->logActivity('onboard_remove', 'success', "Removed store: {$storeCode}");
            $result = ['success' => true];
        } catch (\Exception $e) {
            $result['error'] = $e->getMessage();
        }

        $this->sendJson($result);
    }

    #[\Override]
    protected function _isAllowed(): bool
    {
        return Mage::getSingleton('admin/session')->isAllowed('system/mageaustralia_storefront/onboard');
    }

    private function executeProvisionStep(array $step, array $params, Mageaustralia_Storefront_Helper_Data $helper): ?array
    {
        $action = $step['action'];

        switch ($action) {
            case 'ensure_kv':
                $kvNamespaceId = $helper->getKvNamespaceId();
                if ($kvNamespaceId !== '') {
                    // Already configured
                    return null;
                }
                // Check if one exists in the account
                $cfClient = $this->getCfClientForZone($params['zone_id']);
                $namespaces = $cfClient->listKvNamespaces();
                if ($namespaces !== []) {
                    // Use the first existing namespace
                    $kvNamespaceId = $namespaces[0]['id'];
                } else {
                    // Create a new one
                    $created = $cfClient->createKvNamespace('CONTENT');
                    $kvNamespaceId = $created['id'] ?? '';
                }
                if ($kvNamespaceId !== '') {
                    Mage::getConfig()->saveConfig(
                        Mageaustralia_Storefront_Helper_Data::XML_PATH_KV_NAMESPACE_ID,
                        $kvNamespaceId,
                        'default',
                        0,
                    );
                    Mage::getConfig()->reinit();
                }
                return null;

            case 'registry':
                $entry = [
                    'name'   => $params['store_name'],
                    'code'   => $params['store_code'],
                    'url'    => $params['storefront_url'],
                    'secret' => $params['sync_secret'],
                ];
                $helper->addStoreToRegistry($entry);
                return ['action' => 'registry', 'store_code' => $params['store_code']];

            case 'deploy_worker':
                // Check if worker already exists — skip if so
                $cfClient = $this->getCfClientForZone($params['zone_id']);
                if ($cfClient->workerExists($params['script_name'])) {
                    return null; // Already deployed
                }
                // Deploy via wrangler
                $result = $helper->deployWorker($params);
                if (!$result['success']) {
                    throw new RuntimeException('Worker deploy failed: ' . $result['output']);
                }
                return null; // No rollback for deploy (worker can stay)

            case 'dns':
                $cfClient = $this->getCfClientForZone($params['zone_id']);
                $cnameTo = $params['script_name'] . '.workers.dev';
                $response = $cfClient->createDnsRecord('CNAME', $params['fqdn'], $cnameTo, true);
                $recordId = $response['result']['id'] ?? '';
                return ['action' => 'dns', 'record_id' => $recordId, 'zone_id' => $params['zone_id']];

            case 'route':
                $cfClient = $this->getCfClientForZone($params['zone_id']);
                $pattern = $params['fqdn'] . '/*';
                $response = $cfClient->createWorkerRoute($pattern, $params['script_name']);
                $routeId = $response['result']['id'] ?? '';
                return ['action' => 'route', 'route_id' => $routeId, 'zone_id' => $params['zone_id']];

            case 'maho_config':
                $storeViewId = $params['maho_store_id'];
                $configPaths = [
                    Mageaustralia_Storefront_Helper_Data::XML_PATH_STOREFRONT_URL    => $params['storefront_url'],
                    Mageaustralia_Storefront_Helper_Data::XML_PATH_WORKER_STORE_CODE => $params['store_code'],
                    Mageaustralia_Storefront_Helper_Data::XML_PATH_SYNC_SECRET       => $params['sync_secret'],
                ];
                foreach ($configPaths as $path => $value) {
                    Mage::getConfig()->saveConfig($path, $value, 'stores', $storeViewId);
                }
                Mage::getConfig()->reinit();
                return ['action' => 'maho_config', 'store_view_id' => $storeViewId, 'paths' => array_keys($configPaths)];

            case 'sync':
                // Use an existing configured storefront URL + shared sync secret
                // (new domain DNS may not have propagated yet)
                // The store_code is the Maho store view code, used as both KV prefix
                // and Maho API store parameter (?store=CODE)
                $existingUrl = $helper->getStorefrontUrl();
                $existingSecret = $helper->getSyncSecret();
                if ($existingUrl === '' || $existingSecret === '') {
                    throw new RuntimeException('No existing storefront URL/secret configured to use for initial sync.');
                }
                /** @var Mageaustralia_Storefront_Model_Api_Storefront $syncClient */
                $syncClient = Mage::getModel('mageaustralia_storefront/api_storefront');
                $syncClient->init($existingUrl, $existingSecret, $params['store_code']);
                $syncClient->syncPartial('config');
                $syncClient->syncPartial('categories');
                return null;

            case 'verify':
                // Try direct URL first, fall back to skip if DNS hasn't propagated
                $url = $params['storefront_url'];
                $ch = curl_init($url . '/');
                curl_setopt_array($ch, [
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_FOLLOWLOCATION => true,
                    CURLOPT_TIMEOUT        => 10,
                    CURLOPT_SSL_VERIFYPEER => true,
                ]);
                curl_exec($ch);
                $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
                $curlError = curl_errno($ch);
                curl_close($ch);

                // DNS not propagated yet — not an error, just skip
                if ($curlError === CURLE_COULDNT_RESOLVE_HOST) {
                    // Store will be accessible once DNS propagates
                    return null;
                }
                if ($httpCode > 0 && $httpCode !== 200) {
                    throw new RuntimeException("Store verification failed: HTTP {$httpCode} from {$url}");
                }
                return null; // No rollback for verify
        }

        return null;
    }

    private function executeRollbackStep(array $entry, array $params, Mageaustralia_Storefront_Helper_Data $helper): void
    {
        $action = $entry['action'];

        switch ($action) {
            case 'registry':
                $helper->removeStoreFromRegistry($entry['store_code']);
                break;

            case 'dns':
                if (!empty($entry['record_id'])) {
                    $cfClient = $this->getCfClientForZone($entry['zone_id']);
                    $cfClient->deleteDnsRecord($entry['record_id']);
                }
                break;

            case 'route':
                if (!empty($entry['route_id'])) {
                    $cfClient = $this->getCfClientForZone($entry['zone_id']);
                    $cfClient->deleteWorkerRoute($entry['route_id']);
                }
                break;

            case 'maho_config':
                $storeViewId = $entry['store_view_id'];
                foreach ($entry['paths'] as $path) {
                    Mage::getConfig()->deleteConfig($path, 'stores', $storeViewId);
                }
                Mage::getConfig()->reinit();
                break;
        }
    }

    private function getCfClientForZone(string $zoneId): Mageaustralia_Storefront_Model_Api_Cloudflare
    {
        /** @var Mageaustralia_Storefront_Helper_Data $helper */
        $helper = Mage::helper('mageaustralia_storefront');

        /** @var Mageaustralia_Storefront_Model_Api_Cloudflare $client */
        $client = Mage::getModel('mageaustralia_storefront/api_cloudflare');
        $client->init(
            $helper->getCfApiToken(),
            $helper->getCfAccountId(),
            $zoneId,
            $helper->getCfApiEmail(),
        );
        return $client;
    }

    private function sendJson(array $data): void
    {
        $this->getResponse()
            ->setHeader('Content-Type', 'application/json')
            ->setBody(json_encode($data));
    }
}
