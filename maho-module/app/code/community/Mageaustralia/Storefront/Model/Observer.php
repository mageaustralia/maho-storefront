<?php

declare(strict_types=1);

/**
 * Mageaustralia
 *
 * @package    Mageaustralia_Storefront
 * @copyright  Copyright (c) 2026 Mage Australia Pty Ltd (https://mageaustralia.com.au)
 * @license    AGPL-3.0-only Open source release; commercial licence available. See LICENSE-COMMERCIAL.md.
 */

class Mageaustralia_Storefront_Model_Observer
{
    /**
     * Pending invalidations grouped by type: ['products' => [id1, id2], 'categories' => [...]]
     */
    private static array $pendingInvalidations = [];

    public function onProductSave(Maho\Event\Observer $observer): void
    {
        if (!$this->getHelper()->isEventBasedSyncEnabled()) {
            return;
        }

        /** @var Mage_Catalog_Model_Product $product */
        $product = $observer->getEvent()->getProduct();
        if ($product && $product->getId()) {
            self::$pendingInvalidations['products'][] = (int) $product->getId();
        }
    }

    public function onCategorySave(Maho\Event\Observer $observer): void
    {
        if (!$this->getHelper()->isEventBasedSyncEnabled()) {
            return;
        }

        /** @var Mage_Catalog_Model_Category $category */
        $category = $observer->getEvent()->getCategory();
        if ($category && $category->getId()) {
            self::$pendingInvalidations['categories'][] = (int) $category->getId();
        }
    }

    public function onCmsPageSave(Maho\Event\Observer $observer): void
    {
        if (!$this->getHelper()->isEventBasedSyncEnabled()) {
            return;
        }

        /** @var Mage_Cms_Model_Page $page */
        $page = $observer->getEvent()->getObject();
        if ($page && $page->getId()) {
            self::$pendingInvalidations['cms'][] = $page->getIdentifier();
        }
    }

    public function onCmsBlockSave(Maho\Event\Observer $observer): void
    {
        if (!$this->getHelper()->isEventBasedSyncEnabled()) {
            return;
        }

        /** @var Mage_Cms_Model_Block $block */
        $block = $observer->getEvent()->getObject();
        if ($block && $block->getId()) {
            self::$pendingInvalidations['cms'][] = 'block:' . $block->getIdentifier();
        }
    }

    public function onBlogPostSave(Maho\Event\Observer $observer): void
    {
        if (!$this->getHelper()->isEventBasedSyncEnabled()) {
            return;
        }

        if (!Mage::helper('core')->isModuleEnabled('Maho_Blog')
            || !class_exists('Maho_Blog_Model_Post')
        ) {
            return;
        }

        $post = $observer->getEvent()->getObject();
        if ($post && $post->getId()) {
            self::$pendingInvalidations['blog'][] = (int) $post->getId();
        }
    }

    public function onConfigChange(Maho\Event\Observer $observer): void
    {
        if (!$this->getHelper()->isEventBasedSyncEnabled()) {
            return;
        }

        self::$pendingInvalidations['config'][] = 'store_config';
    }

    public function onStockChange(Maho\Event\Observer $observer): void
    {
        if (!$this->getHelper()->isEventBasedSyncEnabled()) {
            return;
        }

        /** @var Mage_CatalogInventory_Model_Stock_Item $stockItem */
        $stockItem = $observer->getEvent()->getItem();
        if ($stockItem && $stockItem->getProductId()) {
            self::$pendingInvalidations['products'][] = (int) $stockItem->getProductId();
        }
    }

    public function onAttributeSave(Maho\Event\Observer $observer): void
    {
        if (!$this->getHelper()->isEventBasedSyncEnabled()) {
            return;
        }

        self::$pendingInvalidations['config'][] = 'attributes';
    }

    /**
     * Queue pending invalidations to core_flag for async processing by cron.
     * This runs at the end of the request but does NOT make HTTP calls - just a fast DB write.
     */
    public function flushPendingInvalidations(Maho\Event\Observer $observer): void
    {
        if (empty(self::$pendingInvalidations)) {
            return;
        }

        $helper = $this->getHelper();
        if (!$helper->isConfigured()) {
            self::$pendingInvalidations = [];
            return;
        }

        $pending = self::$pendingInvalidations;
        self::$pendingInvalidations = [];

        try {
            /** @var Mage_Core_Model_Flag $flag */
            $flag = Mage::getModel('core/flag', ['flag_code' => 'storefront_sync_queue'])->loadSelf();
            $existing = $flag->getFlagData() ?: [];

            // Merge new invalidations with any already-queued ones
            foreach ($pending as $type => $ids) {
                $existingIds = $existing[$type] ?? [];
                $existing[$type] = array_values(array_unique(array_merge($existingIds, $ids)));
            }

            $flag->setFlagData($existing)->save();
        } catch (\Exception $e) {
            Mage::logException($e);
        }
    }

    /**
     * Process queued invalidations (called by cron every minute).
     */
    public function processQueuedInvalidations(): void
    {
        /** @var Mage_Core_Model_Flag $flag */
        $flag = Mage::getModel('core/flag', ['flag_code' => 'storefront_sync_queue'])->loadSelf();
        $queued = $flag->getFlagData();

        if (empty($queued)) {
            return;
        }

        // Clear the queue immediately to avoid re-processing
        $flag->setFlagData(null)->save();

        $helper = $this->getHelper();
        if (!$helper->isConfigured()) {
            return;
        }

        try {
            $client = $helper->getStorefrontClient();

            foreach ($queued as $type => $ids) {
                $ids = array_values(array_unique($ids));
                $startTime = microtime(true);

                try {
                    // For products and categories, sync only the changed items by ID
                    if ($type === 'products' && !empty($ids)) {
                        $result = $client->syncProductsByIds($ids);
                    } elseif ($type === 'categories' && !empty($ids)) {
                        $result = $client->syncCategoriesByIds($ids);
                    } else {
                        $result = $client->syncPartial($type);
                    }

                    $durationMs = (int) ((microtime(true) - $startTime) * 1000);
                    $helper->logActivity(
                        'event_sync_' . $type,
                        'success',
                        json_encode(['ids' => $ids, 'response' => $result]),
                        $durationMs,
                    );
                } catch (\Exception $e) {
                    $durationMs = (int) ((microtime(true) - $startTime) * 1000);
                    $helper->logActivity(
                        'event_sync_' . $type,
                        'error',
                        $e->getMessage(),
                        $durationMs,
                    );
                    Mage::logException($e);
                }
            }
        } catch (\Exception $e) {
            Mage::logException($e);
        }
    }

    private function getHelper(): Mageaustralia_Storefront_Helper_Data
    {
        /** @var Mageaustralia_Storefront_Helper_Data $helper */
        $helper = Mage::helper('mageaustralia_storefront');
        return $helper;
    }

    /**
     * Release PHP session lock early for read-only requests.
     * Prevents 503s on browser prefetch requests caused by concurrent session file locking.
     *
     * Skips checkout/cart/customer routes because those pages consume and clear
     * session flash messages during rendering - session must stay writable.
     */
    public function releaseSessionForReadRequest(Maho\Event\Observer $observer): void
    {
        // Skip ALL admin requests regardless of front-name. Module name alone
        // can't catch this - sites may rename the admin frontname, so admin
        // GETs would slip past a hardcoded list and corrupt session writes.
        $controller = $observer->getEvent()->getControllerAction();
        if ($controller instanceof Mage_Adminhtml_Controller_Action) {
            return;
        }

        $request = Mage::app()->getRequest();

        // Only for GET/HEAD (read-only) requests
        if (!in_array($request->getMethod(), ['GET', 'HEAD'], true)) {
            return;
        }

        // Don't release session on pages that clear flash messages or modify session
        $module = $request->getModuleName();
        if (in_array($module, ['checkout', 'customer', 'onestepcheckout', 'firecheckout', 'admin', 'adminhtml'], true)) {
            return;
        }

        // Don't release if there are pending flash messages that need to be consumed
        try {
            $coreSession = Mage::getSingleton('core/session');
            $adminSession = Mage::getSingleton('adminhtml/session');
            if ($coreSession->getMessages()->count() > 0 || $adminSession->getMessages()->count() > 0) {
                return;
            }
        } catch (\Exception $e) {
        }

        // Release the session write lock - data is still readable from $_SESSION
        if (session_status() === PHP_SESSION_ACTIVE) {
            session_write_close();
        }
    }

}
