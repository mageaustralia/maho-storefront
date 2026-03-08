<?php

declare(strict_types=1);

/**
 * Mageaustralia
 *
 * @package    Mageaustralia_Storefront
 * @copyright  Copyright (c) 2026 Mageaustralia
 * @license    https://opensource.org/licenses/osl-3.0.php  Open Software License (OSL 3.0)
 */

class Mageaustralia_Storefront_Block_Adminhtml_Onboard extends Mage_Adminhtml_Block_Template
{
    public function __construct()
    {
        parent::__construct();
        $this->setTemplate('mageaustralia/storefront/onboard.phtml');
    }

    public function getListZonesUrl(): string
    {
        return $this->getUrl('*/storefront_onboard/listZones');
    }

    public function getListStoresUrl(): string
    {
        return $this->getUrl('*/storefront_onboard/listStores');
    }

    public function getValidateUrl(): string
    {
        return $this->getUrl('*/storefront_onboard/validate');
    }

    public function getProvisionUrl(): string
    {
        return $this->getUrl('*/storefront_onboard/provision');
    }

    public function getProvisionStepUrl(): string
    {
        return $this->getUrl('*/storefront_onboard/provisionStep');
    }

    public function getRollbackUrl(): string
    {
        return $this->getUrl('*/storefront_onboard/rollback');
    }

    public function getRemoveStoreUrl(): string
    {
        return $this->getUrl('*/storefront_onboard/removeStore');
    }

    public function getDashboardUrl(): string
    {
        return $this->getUrl('*/storefront_dashboard/index');
    }

    public function getFormKey(): string
    {
        return Mage::getSingleton('core/session')->getFormKey();
    }

    public function getMahoStoreViews(): array
    {
        $result = [];
        /** @var Mage_Core_Model_Store $store */
        foreach (Mage::app()->getStores() as $store) {
            $website = $store->getWebsite();
            $result[] = [
                'id'      => (int) $store->getId(),
                'name'    => $store->getName(),
                'code'    => $store->getCode(),
                'website' => $website ? $website->getName() : '',
            ];
        }
        return $result;
    }

    public function getWorkerScriptName(): string
    {
        /** @var Mageaustralia_Storefront_Helper_Data $helper */
        $helper = Mage::helper('mageaustralia_storefront');
        return $helper->getWorkerScriptName();
    }
}
