<?php

declare(strict_types=1);

/**
 * Mageaustralia
 *
 * @package    Mageaustralia_Storefront
 * @copyright  Copyright (c) 2026 Mageaustralia
 * @license    https://opensource.org/licenses/osl-3.0.php  Open Software License (OSL 3.0)
 */

class Mageaustralia_Storefront_Block_Adminhtml_Dashboard_Status extends Mage_Adminhtml_Block_Template
{
    public function __construct()
    {
        parent::__construct();
        $this->setTemplate('mageaustralia/storefront/dashboard/status.phtml');
    }

    public function getPulseUrl(): string
    {
        return $this->getUrl('*/storefront_dashboard/pulse', ['store' => $this->getSelectedStoreId()]);
    }

    public function isConfigured(): bool
    {
        /** @var Mageaustralia_Storefront_Helper_Data $helper */
        $helper = Mage::helper('mageaustralia_storefront');
        return $helper->isConfigured($this->getSelectedStoreId());
    }

    public function getStorefrontUrl(): string
    {
        /** @var Mageaustralia_Storefront_Helper_Data $helper */
        $helper = Mage::helper('mageaustralia_storefront');
        return $helper->getStorefrontUrl($this->getSelectedStoreId());
    }

    public function getWorkerStoreCode(): string
    {
        /** @var Mageaustralia_Storefront_Helper_Data $helper */
        $helper = Mage::helper('mageaustralia_storefront');
        return $helper->getWorkerStoreCode($this->getSelectedStoreId());
    }

    public function getLastSync(): ?string
    {
        /** @var Mageaustralia_Storefront_Model_Resource_Log_Collection $collection */
        $collection = Mage::getModel('mageaustralia_storefront/log')->getCollection();
        $collection->addFieldToFilter('action', ['like' => 'sync_%'])
            ->addFieldToFilter('status', 'success')
            ->setOrder('created_at', 'DESC')
            ->setPageSize(1);

        $item = $collection->getFirstItem();
        return $item->getId() ? $item->getCreatedAt() : null;
    }

    public function getConfigUrl(): string
    {
        return $this->getUrl('adminhtml/system_config/edit', ['section' => 'mageaustralia_storefront']);
    }

    /**
     * Get store views that have a worker store code mapped, for the store selector.
     * Only includes stores with an explicit store_code set at the store-view scope,
     * plus the default config entry.
     */
    public function getConfiguredStores(): array
    {
        /** @var Mageaustralia_Storefront_Helper_Data $helper */
        $helper = Mage::helper('mageaustralia_storefront');
        $stores = [];

        foreach (Mage::app()->getStores() as $store) {
            $storeId = (int) $store->getId();
            $workerCode = $helper->getWorkerStoreCode($storeId);
            if ($workerCode !== '' && $helper->getStorefrontUrl($storeId) !== '') {
                $stores[] = [
                    'id'          => $storeId,
                    'name'        => $store->getName(),
                    'code'        => $store->getCode(),
                    'worker_code' => $workerCode,
                    'website'     => $store->getWebsite()->getName(),
                ];
            }
        }

        // Always include the default config entry (unprefixed store)
        if ($helper->getStorefrontUrl() !== '') {
            array_unshift($stores, [
                'id'          => 0,
                'name'        => $this->__('Default Config'),
                'code'        => 'default',
                'worker_code' => '',
                'website'     => '',
            ]);
        }

        return $stores;
    }

    public function getSelectedStoreId(): ?int
    {
        $storeId = $this->getRequest()->getParam('store');
        return $storeId !== null ? (int) $storeId : null;
    }

    public function getDashboardUrl(): string
    {
        return $this->getUrl('*/storefront_dashboard/index');
    }
}
