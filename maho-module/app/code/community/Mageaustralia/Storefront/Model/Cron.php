<?php

declare(strict_types=1);

/**
 * Mageaustralia
 *
 * @package    Mageaustralia_Storefront
 * @copyright  Copyright (c) 2026 Mageaustralia
 * @license    https://opensource.org/licenses/osl-3.0.php  Open Software License (OSL 3.0)
 */

class Mageaustralia_Storefront_Model_Cron
{
    public function cleanupActivityLog(): void
    {
        $days = (int) Mage::getStoreConfig('mageaustralia_storefront/general/log_retention_days');
        if ($days <= 0) {
            return;
        }

        $cutoff = date('Y-m-d H:i:s', strtotime("-{$days} days"));

        /** @var Mage_Core_Model_Resource $resource */
        $resource = Mage::getSingleton('core/resource');
        $db = $resource->getConnection('core_write');
        $table = $resource->getTableName('mageaustralia_storefront/log');

        $deleted = $db->delete($table, ['created_at < ?' => $cutoff]);

        if ($deleted > 0) {
            Mage::log("Storefront: cleaned up {$deleted} activity log entries older than {$days} days", 6);
        }
    }

    public function runScheduledSync(): void
    {
        /** @var Mageaustralia_Storefront_Helper_Data $helper */
        $helper = Mage::helper('mageaustralia_storefront');

        if (!$helper->isCronEnabled()) {
            return;
        }

        $syncTypes = $helper->getCronSyncTypes();
        if (empty($syncTypes)) {
            return;
        }

        /** @var Mage_Core_Model_Store[] $stores */
        $stores = Mage::app()->getStores();

        foreach ($stores as $store) {
            $storeId = (int) $store->getId();

            if (!$helper->isConfigured($storeId)) {
                continue;
            }

            try {
                $client = $helper->getStorefrontClient($storeId);

                foreach ($syncTypes as $type) {
                    $startTime = microtime(true);
                    try {
                        $result = $client->syncPartial(trim($type));
                        $durationMs = (int) ((microtime(true) - $startTime) * 1000);
                        $helper->logActivity(
                            'cron_sync_' . trim($type),
                            'success',
                            json_encode([
                                'store_id' => $storeId,
                                'store'    => $store->getCode(),
                                'response' => $result,
                            ]),
                            $durationMs,
                        );
                    } catch (\Exception $e) {
                        $durationMs = (int) ((microtime(true) - $startTime) * 1000);
                        $helper->logActivity(
                            'cron_sync_' . trim($type),
                            'error',
                            json_encode([
                                'store_id' => $storeId,
                                'error'    => $e->getMessage(),
                            ]),
                            $durationMs,
                        );
                        Mage::logException($e);
                    }
                }
            } catch (\Exception $e) {
                Mage::logException($e);
            }
        }
    }
}
