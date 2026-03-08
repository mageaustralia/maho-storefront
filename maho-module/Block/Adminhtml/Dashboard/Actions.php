<?php

declare(strict_types=1);

/**
 * Mageaustralia
 *
 * @package    Mageaustralia_Storefront
 * @copyright  Copyright (c) 2026 Mageaustralia
 * @license    https://opensource.org/licenses/osl-3.0.php  Open Software License (OSL 3.0)
 */

class Mageaustralia_Storefront_Block_Adminhtml_Dashboard_Actions extends Mage_Adminhtml_Block_Template
{
    public function __construct()
    {
        parent::__construct();
        $this->setTemplate('mageaustralia/storefront/dashboard/actions.phtml');
    }

    public function getFullSyncUrl(): string
    {
        return $this->getUrl('*/storefront_sync/full', $this->getStoreParam());
    }

    public function getSyncStepUrl(): string
    {
        return $this->getUrl('*/storefront_sync/step', $this->getStoreParam());
    }

    public function getPartialSyncUrl(string $type): string
    {
        return $this->getUrl('*/storefront_sync/partial', array_merge(['type' => $type], $this->getStoreParam()));
    }

    public function getPurgeAllUrl(): string
    {
        return $this->getUrl('*/storefront_cache/purgeAll', $this->getStoreParam());
    }

    public function getPurgeUrlsUrl(): string
    {
        return $this->getUrl('*/storefront_cache/purgeUrls', $this->getStoreParam());
    }

    public function getListKvKeysUrl(): string
    {
        return $this->getUrl('*/storefront_cache/listKvKeys', $this->getStoreParam());
    }

    public function getDeleteKvAjaxUrl(): string
    {
        return $this->getUrl('*/storefront_cache/deleteKvAjax', $this->getStoreParam());
    }

    public function getSyncTypes(): array
    {
        return [
            'config'     => $this->__('Config'),
            'countries'  => $this->__('Countries'),
            'categories' => $this->__('Categories'),
            'products'   => $this->__('Products'),
            'cms'        => $this->__('CMS'),
            'blog'       => $this->__('Blog'),
        ];
    }

    public function getFormKey(): string
    {
        return Mage::getSingleton('core/session')->getFormKey();
    }

    private function getStoreParam(): array
    {
        $storeId = $this->getRequest()->getParam('store');
        return $storeId !== null ? ['store' => $storeId] : [];
    }
}
