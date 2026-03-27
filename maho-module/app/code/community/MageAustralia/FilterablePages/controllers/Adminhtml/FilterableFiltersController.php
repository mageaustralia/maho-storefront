<?php

declare(strict_types=1);

class MageAustralia_FilterablePages_Adminhtml_FilterableFiltersController extends Mage_Adminhtml_Controller_Action
{
    public function indexAction(): void
    {
        $this->_title('Filterable Pages')->_title('Filter Configuration');
        $this->loadLayout();
        $this->_setActiveMenu('catalog/filterablepages');
        $this->_addContent($this->getLayout()->createBlock('filterablepages/adminhtml_filter_grid'));
        $this->renderLayout();
    }

    public function saveAction(): void
    {
        $data = $this->getRequest()->getPost();
        if (!$data) {
            $this->_redirect('*/*/');
            return;
        }

        $resource = Mage::getSingleton('core/resource');
        $write = $resource->getConnection('core_write');
        $table = $resource->getTableName('mageaustralia_filterable_filter');

        try {
            // Process each row from the grid form
            $filters = $data['filters'] ?? [];
            foreach ($filters as $filterId => $row) {
                $write->update($table, [
                    'position'             => (int) ($row['position'] ?? 0),
                    'default_open'         => !empty($row['default_open']) ? 1 : 0,
                    'seo_url_enabled'      => !empty($row['seo_url_enabled']) ? 1 : 0,
                    'depend_on_attribute'  => $row['depend_on_attribute'] ?? null,
                ], ['filter_id = ?' => (int) $filterId]);
            }

            Mage::getSingleton('adminhtml/session')->addSuccess('Filter configuration saved.');
        } catch (Exception $e) {
            Mage::getSingleton('adminhtml/session')->addError('Error saving: ' . $e->getMessage());
        }

        $this->_redirect('*/*/');
    }

    public function importAction(): void
    {
        try {
            $importer = Mage::getModel('filterablepages/import_amasty');
            $result = $importer->run();
            $msg = sprintf(
                'Import complete: %d values, %d filters, %d pages. %d errors.',
                $result['values'],
                $result['filters'],
                $result['pages'],
                count($result['errors']),
            );
            Mage::getSingleton('adminhtml/session')->addSuccess($msg);
            if (!empty($result['errors'])) {
                foreach (array_slice($result['errors'], 0, 5) as $err) {
                    Mage::getSingleton('adminhtml/session')->addNotice($err);
                }
            }
        } catch (Exception $e) {
            Mage::getSingleton('adminhtml/session')->addError('Import failed: ' . $e->getMessage());
        }

        $this->_redirect('*/*/');
    }

    protected function _isAllowed(): bool
    {
        return Mage::getSingleton('admin/session')->isAllowed('catalog/filterablepages');
    }
}
