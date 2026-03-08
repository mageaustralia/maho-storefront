<?php

declare(strict_types=1);

/**
 * Mageaustralia
 *
 * @package    Mageaustralia_Storefront
 * @copyright  Copyright (c) 2026 Mageaustralia
 * @license    https://opensource.org/licenses/osl-3.0.php  Open Software License (OSL 3.0)
 */

class Mageaustralia_Storefront_Adminhtml_Storefront_DashboardController extends Mage_Adminhtml_Controller_Action
{
    #[\Override]
    public function preDispatch()
    {
        $this->_setForcedFormKeyActions(['testConnection', 'discover']);
        return parent::preDispatch();
    }

    public function indexAction(): void
    {
        $this->_title($this->__('System'))
            ->_title($this->__('Storefront'))
            ->_title($this->__('Dashboard'));

        $this->loadLayout();
        $this->_setActiveMenu('system/mageaustralia_storefront/dashboard');
        $this->renderLayout();
    }

    public function pulseAction(): void
    {
        $result = ['success' => false];

        try {
            /** @var Mageaustralia_Storefront_Helper_Data $helper */
            $helper = Mage::helper('mageaustralia_storefront');
            $storeId = $this->getSelectedStoreId();

            if (!$helper->isConfigured($storeId)) {
                $result['error'] = 'Storefront is not configured. Please set up credentials in System > Configuration > Storefront.';
                $this->sendJson($result);
                return;
            }

            $client = $helper->getStorefrontClient($storeId);
            $pulse = $client->getPulse();
            $result = ['success' => true, 'pulse' => $pulse];
        } catch (\Exception $e) {
            $result['error'] = $e->getMessage();
        }

        $this->sendJson($result);
    }

    public function testConnectionAction(): void
    {
        $result = ['success' => false, 'cloudflare' => false, 'storefront' => false];

        try {
            /** @var Mageaustralia_Storefront_Helper_Data $helper */
            $helper = Mage::helper('mageaustralia_storefront');
            $storeId = $this->getSelectedStoreId();

            if (!$helper->isConfigured($storeId)) {
                $result['error'] = 'Please fill in all configuration fields first.';
                $this->sendJson($result);
                return;
            }

            $startTime = microtime(true);

            $cf = $helper->getCloudflareClient($storeId);
            $result['cloudflare'] = $cf->verifyToken();

            $sfClient = $helper->getStorefrontClient($storeId);
            $pulse = $sfClient->getPulse();
            $result['storefront'] = true;
            $result['pulse'] = $pulse;

            $result['success'] = $result['cloudflare'];
            $durationMs = (int) ((microtime(true) - $startTime) * 1000);

            $helper->logActivity(
                'test_connection',
                $result['success'] ? 'success' : 'error',
                json_encode($result),
                $durationMs,
            );
        } catch (\Exception $e) {
            $result['error'] = $e->getMessage();
            /** @var Mageaustralia_Storefront_Helper_Data $helper */
            $helper = Mage::helper('mageaustralia_storefront');
            $helper->logActivity('test_connection', 'error', $e->getMessage());
        }

        $this->sendJson($result);
    }


    /**
     * AJAX: Discover Account ID and Zone ID from API credentials.
     * Called from system config page before credentials are saved.
     * Accepts unsaved form values directly in the POST body.
     */
    public function discoverAction(): void
    {
        $result = ['success' => false];

        try {
            $apiToken = (string) $this->getRequest()->getPost('api_token', '');
            $apiEmail = (string) $this->getRequest()->getPost('api_email', '');

            // If token looks like placeholder stars (unchanged obscure field), read from saved config
            if ($apiToken === '' || preg_match('/^\*+$/', $apiToken)) {
                $storeId = $this->getSelectedStoreId();
                $apiToken = (string) Mage::getStoreConfig('mageaustralia_storefront/cloudflare/api_token', $storeId);
            }

            if ($apiToken === '') {
                $result['error'] = 'Please enter an API Token or API Key first.';
                $this->sendJson($result);
                return;
            }

            $discovered = Mageaustralia_Storefront_Model_Api_Cloudflare::discover($apiToken, $apiEmail);

            $result['success'] = true;
            $result['accounts'] = $discovered['accounts'];
            $result['zones'] = $discovered['zones'];
        } catch (\Throwable $e) {
            $result['error'] = $e->getMessage();
        }

        $this->sendJson($result);
    }

    public function logGridAction(): void
    {
        $this->loadLayout();
        $this->getResponse()->setBody(
            $this->getLayout()->createBlock('mageaustralia_storefront/adminhtml_dashboard_log')->toHtml(),
        );
    }

    #[\Override]
    protected function _isAllowed(): bool
    {
        return Mage::getSingleton('admin/session')->isAllowed('system/mageaustralia_storefront/dashboard');
    }

    private function getSelectedStoreId(): ?int
    {
        $storeId = $this->getRequest()->getParam('store');
        return $storeId !== null ? (int) $storeId : null;
    }

    private function sendJson(array $data): void
    {
        $this->getResponse()
            ->setHeader('Content-Type', 'application/json')
            ->setBody(json_encode($data));
    }
}
