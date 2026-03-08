<?php

declare(strict_types=1);

/**
 * Mageaustralia
 *
 * @package    Mageaustralia_Storefront
 * @copyright  Copyright (c) 2026 Mageaustralia
 * @license    https://opensource.org/licenses/osl-3.0.php  Open Software License (OSL 3.0)
 */

class Mageaustralia_Storefront_Adminhtml_Storefront_CacheController extends Mage_Adminhtml_Controller_Action
{
    #[\Override]
    public function preDispatch()
    {
        $this->_setForcedFormKeyActions(['purgeAll', 'purgeUrls', 'deleteKvAjax']);
        return parent::preDispatch();
    }

    public function purgeAllAction(): void
    {
        $storeId = $this->getSelectedStoreId();

        try {
            /** @var Mageaustralia_Storefront_Helper_Data $helper */
            $helper = Mage::helper('mageaustralia_storefront');
            $cf = $helper->getCloudflareClient($storeId);

            $startTime = microtime(true);
            $result = $cf->purgeAll();
            $durationMs = (int) ((microtime(true) - $startTime) * 1000);

            $helper->logActivity(
                'cache_purge_all',
                'success',
                json_encode($result),
                $durationMs,
            );

            $this->_getSession()->addSuccess(
                $this->__('Edge cache purged successfully (%dms).', $durationMs),
            );
        } catch (\Exception $e) {
            /** @var Mageaustralia_Storefront_Helper_Data $helper */
            $helper = Mage::helper('mageaustralia_storefront');
            $helper->logActivity('cache_purge_all', 'error', $e->getMessage());
            $this->_getSession()->addError($this->__('Cache purge failed: %s', $e->getMessage()));
        }

        $this->_redirect('*/storefront_dashboard/index', $this->getStoreRedirectParam());
    }

    public function purgeUrlsAction(): void
    {
        $storeId = $this->getSelectedStoreId();
        $urlsRaw = $this->getRequest()->getParam('urls', '');
        $urls = array_filter(array_map('trim', preg_split('/[\r\n]+/', $urlsRaw)));

        if (empty($urls)) {
            $this->_getSession()->addError($this->__('Please enter at least one URL.'));
            $this->_redirect('*/storefront_dashboard/index', $this->getStoreRedirectParam());
            return;
        }

        try {
            /** @var Mageaustralia_Storefront_Helper_Data $helper */
            $helper = Mage::helper('mageaustralia_storefront');
            $cf = $helper->getCloudflareClient($storeId);

            $startTime = microtime(true);
            $result = $cf->purgeUrls($urls);
            $durationMs = (int) ((microtime(true) - $startTime) * 1000);

            $helper->logActivity(
                'cache_purge_urls',
                'success',
                json_encode(['urls' => $urls, 'response' => $result]),
                $durationMs,
            );

            $this->_getSession()->addSuccess(
                $this->__('Purged %d URL(s) from edge cache (%dms).', count($urls), $durationMs),
            );
        } catch (\Exception $e) {
            /** @var Mageaustralia_Storefront_Helper_Data $helper */
            $helper = Mage::helper('mageaustralia_storefront');
            $helper->logActivity('cache_purge_urls', 'error', $e->getMessage());
            $this->_getSession()->addError($this->__('URL purge failed: %s', $e->getMessage()));
        }

        $this->_redirect('*/storefront_dashboard/index', $this->getStoreRedirectParam());
    }

    public function deleteKvAjaxAction(): void
    {
        $storeId = $this->getSelectedStoreId();
        $result = ['success' => false];

        $body = json_decode($this->getRequest()->getRawBody(), true);
        $keys = $body['keys'] ?? [];

        if (empty($keys)) {
            $result['error'] = $this->__('Please select at least one key.');
            $this->sendJson($result);
            return;
        }

        try {
            /** @var Mageaustralia_Storefront_Helper_Data $helper */
            $helper = Mage::helper('mageaustralia_storefront');
            $client = $helper->getStorefrontClient($storeId);

            $startTime = microtime(true);
            $response = $client->cacheDelete($keys);
            $durationMs = (int) ((microtime(true) - $startTime) * 1000);

            $helper->logActivity(
                'kv_delete',
                'success',
                json_encode(['keys' => $keys, 'response' => $response]),
                $durationMs,
            );

            $result = [
                'success'  => true,
                'deleted'  => count($keys),
                'duration' => $durationMs,
            ];
        } catch (\Exception $e) {
            /** @var Mageaustralia_Storefront_Helper_Data $helper */
            $helper = Mage::helper('mageaustralia_storefront');
            $helper->logActivity('kv_delete', 'error', $e->getMessage());
            $result['error'] = $e->getMessage();
        }

        $this->sendJson($result);
    }

    public function listKvKeysAction(): void
    {
        $storeId = $this->getSelectedStoreId();
        $prefix = $this->getRequest()->getParam('prefix', '');
        $result = ['success' => false];

        try {
            /** @var Mageaustralia_Storefront_Helper_Data $helper */
            $helper = Mage::helper('mageaustralia_storefront');
            $client = $helper->getStorefrontClient($storeId);
            $keys = $client->cacheKeys($prefix);
            $result = ['success' => true, 'keys' => $keys];
        } catch (\Exception $e) {
            $result['error'] = $e->getMessage();
        }

        $this->getResponse()
            ->setHeader('Content-Type', 'application/json')
            ->setBody(json_encode($result));
    }

    #[\Override]
    protected function _isAllowed(): bool
    {
        return Mage::getSingleton('admin/session')->isAllowed('system/mageaustralia_storefront/cache');
    }

    private function getSelectedStoreId(): ?int
    {
        $storeId = $this->getRequest()->getParam('store');
        return $storeId !== null ? (int) $storeId : null;
    }

    private function getStoreRedirectParam(): array
    {
        $storeId = $this->getRequest()->getParam('store');
        return $storeId !== null ? ['store' => $storeId] : [];
    }

    private function sendJson(array $data): void
    {
        $this->getResponse()
            ->setHeader('Content-Type', 'application/json')
            ->setBody(json_encode($data));
    }
}
