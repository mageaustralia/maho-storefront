<?php

declare(strict_types=1);

/**
 * Mageaustralia
 *
 * @package    Mageaustralia_Storefront
 * @copyright  Copyright (c) 2026 Mageaustralia
 * @license    https://opensource.org/licenses/osl-3.0.php  Open Software License (OSL 3.0)
 */

class Mageaustralia_Storefront_Adminhtml_Storefront_SyncController extends Mage_Adminhtml_Controller_Action
{
    #[\Override]
    public function preDispatch()
    {
        $this->_setForcedFormKeyActions(['full', 'step', 'partial']);
        return parent::preDispatch();
    }

    /**
     * Initialize a full sync — returns step plan for the frontend to drive step-by-step
     */
    public function fullAction(): void
    {
        $result = ['success' => false];

        try {
            /** @var Mageaustralia_Storefront_Helper_Data $helper */
            $helper = Mage::helper('mageaustralia_storefront');
            $storeId = $this->getSelectedStoreId();

            if (!$helper->isConfigured($storeId)) {
                $result['error'] = 'Storefront is not configured.';
                $this->sendJson($result);
                return;
            }

            $syncTypes = $this->getSyncStepTypes();
            $steps = [];
            foreach ($syncTypes as $i => $type) {
                $steps[] = [
                    'step'  => $i + 1,
                    'type'  => $type,
                    'label' => ucfirst($type),
                ];
            }

            $session = Mage::getSingleton('admin/session');
            $session->setStorefrontSyncPlan($steps);
            $session->setStorefrontSyncCurrentStep(0);
            $session->setStorefrontSyncResults([]);
            $session->setStorefrontSyncStartTime(microtime(true));
            $session->setStorefrontSyncStoreId($storeId);

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

    /**
     * Execute one sync step — called sequentially by frontend JS
     */
    public function stepAction(): void
    {
        $result = ['success' => false];

        try {
            /** @var Mageaustralia_Storefront_Helper_Data $helper */
            $helper = Mage::helper('mageaustralia_storefront');
            $session = Mage::getSingleton('admin/session');

            $steps = $session->getStorefrontSyncPlan();
            $currentStep = (int) $session->getStorefrontSyncCurrentStep();
            $results = $session->getStorefrontSyncResults() ?: [];
            $storeId = $session->getStorefrontSyncStoreId();

            if (!is_array($steps) || $currentStep >= count($steps)) {
                $result['error'] = 'No more steps to execute.';
                $this->sendJson($result);
                return;
            }

            $step = $steps[$currentStep];
            $client = $helper->getStorefrontClient($storeId);

            $startTime = microtime(true);
            $stepResult = $client->syncPartial($step['type']);
            $durationMs = (int) ((microtime(true) - $startTime) * 1000);

            $results[] = [
                'type'     => $step['type'],
                'status'   => 'success',
                'duration' => $durationMs,
            ];

            $helper->logActivity(
                'sync_' . $step['type'],
                'success',
                json_encode($stepResult),
                $durationMs,
            );

            $session->setStorefrontSyncCurrentStep($currentStep + 1);
            $session->setStorefrontSyncResults($results);

            $nextStep = ($currentStep + 1 < count($steps)) ? $steps[$currentStep + 1] : null;
            $totalStartTime = (float) $session->getStorefrontSyncStartTime();

            $result = [
                'success'    => true,
                'step'       => $currentStep + 1,
                'total'      => count($steps),
                'label'      => $step['label'],
                'duration'   => $durationMs,
                'percent'    => (int) round(($currentStep + 1) / count($steps) * 100),
                'next_label' => $nextStep ? $nextStep['label'] : null,
                'complete'   => $nextStep === null,
                'elapsed_ms' => (int) ((microtime(true) - $totalStartTime) * 1000),
            ];

            if ($nextStep === null) {
                $result['summary'] = $results;
                $session->unsStorefrontSyncPlan();
                $session->unsStorefrontSyncCurrentStep();
                $session->unsStorefrontSyncResults();
                $session->unsStorefrontSyncStartTime();
                $session->unsStorefrontSyncStoreId();
            }
        } catch (\Exception $e) {
            $session = Mage::getSingleton('admin/session');
            $currentStep = (int) $session->getStorefrontSyncCurrentStep();
            $steps = $session->getStorefrontSyncPlan() ?: [];
            $step = $steps[$currentStep] ?? ['type' => 'unknown', 'label' => 'Unknown'];

            /** @var Mageaustralia_Storefront_Helper_Data $helper */
            $helper = Mage::helper('mageaustralia_storefront');
            $helper->logActivity('sync_' . $step['type'], 'error', $e->getMessage());

            $result = [
                'success' => false,
                'error'   => $e->getMessage(),
                'step'    => $currentStep + 1,
                'total'   => count($steps),
                'label'   => $step['label'],
            ];
        }

        $this->sendJson($result);
    }

    /**
     * Single partial sync by type
     */
    public function partialAction(): void
    {
        $type = $this->getRequest()->getParam('type');
        $storeId = $this->getSelectedStoreId();

        if (!$type) {
            $this->_getSession()->addError($this->__('No sync type specified.'));
            $this->_redirect('*/storefront_dashboard/index', $this->getStoreRedirectParam());
            return;
        }

        try {
            /** @var Mageaustralia_Storefront_Helper_Data $helper */
            $helper = Mage::helper('mageaustralia_storefront');
            $client = $helper->getStorefrontClient($storeId);

            $startTime = microtime(true);
            $result = $client->syncPartial($type);
            $durationMs = (int) ((microtime(true) - $startTime) * 1000);

            $helper->logActivity(
                'sync_' . $type,
                'success',
                json_encode($result),
                $durationMs,
            );

            $this->_getSession()->addSuccess(
                $this->__('Successfully synced %s (%dms).', ucfirst($type), $durationMs),
            );
        } catch (\Exception $e) {
            /** @var Mageaustralia_Storefront_Helper_Data $helper */
            $helper = Mage::helper('mageaustralia_storefront');
            $helper->logActivity('sync_' . $type, 'error', $e->getMessage());
            $this->_getSession()->addError($this->__('Sync failed: %s', $e->getMessage()));
        }

        $this->_redirect('*/storefront_dashboard/index', $this->getStoreRedirectParam());
    }

    #[\Override]
    protected function _isAllowed(): bool
    {
        return Mage::getSingleton('admin/session')->isAllowed('system/mageaustralia_storefront/sync');
    }

    private function getSyncStepTypes(): array
    {
        return ['config', 'countries', 'categories', 'products', 'cms', 'blog'];
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
