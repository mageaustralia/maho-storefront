<?php

declare(strict_types=1);

/**
 * Mageaustralia
 *
 * @package    Mageaustralia_Storefront
 * @copyright  Copyright (c) 2026 Mageaustralia
 * @license    https://opensource.org/licenses/osl-3.0.php  Open Software License (OSL 3.0)
 */

class Mageaustralia_Storefront_Block_Adminhtml_Dashboard_Log extends Mage_Adminhtml_Block_Widget_Grid
{
    public function __construct()
    {
        parent::__construct();
        $this->setId('storefrontActivityLogGrid');
        $this->setDefaultSort('created_at');
        $this->setDefaultDir('DESC');
        $this->setSaveParametersInSession(true);
        $this->setUseAjax(true);
    }

    #[\Override]
    protected function _prepareCollection(): self
    {
        /** @var Mageaustralia_Storefront_Model_Resource_Log_Collection $collection */
        $collection = Mage::getModel('mageaustralia_storefront/log')->getCollection();
        $this->setCollection($collection);
        return parent::_prepareCollection();
    }

    #[\Override]
    protected function _prepareColumns(): self
    {
        $this->addColumn('created_at', [
            'header' => $this->__('Time'),
            'index'  => 'created_at',
            'type'   => 'datetime',
            'width'  => '160px',
        ]);

        $this->addColumn('action', [
            'header' => $this->__('Action'),
            'index'  => 'action',
            'width'  => '180px',
        ]);

        $this->addColumn('status', [
            'header'  => $this->__('Status'),
            'index'   => 'status',
            'type'    => 'options',
            'options' => [
                'success' => $this->__('Success'),
                'error'   => $this->__('Error'),
            ],
            'width'   => '80px',
        ]);

        $this->addColumn('admin_user', [
            'header' => $this->__('User'),
            'index'  => 'admin_user',
            'width'  => '120px',
            'frame_callback' => [$this, 'decorateUser'],
        ]);

        $this->addColumn('duration_ms', [
            'header' => $this->__('Duration'),
            'index'  => 'duration_ms',
            'type'   => 'number',
            'width'  => '80px',
            'frame_callback' => [$this, 'decorateDuration'],
        ]);

        $this->addColumn('details', [
            'header'   => $this->__('Details'),
            'index'    => 'details',
            'sortable' => false,
            'frame_callback' => [$this, 'decorateDetails'],
        ]);

        return parent::_prepareColumns();
    }

    public function decorateUser(mixed $value, Varien_Object $row, Mage_Adminhtml_Block_Widget_Grid_Column $column, bool $isExport): string
    {
        $val = (string) ($value ?? '');
        return $val !== '' ? $this->escapeHtml($val) : $this->__('Cron');
    }

    public function decorateDuration(mixed $value, Varien_Object $row, Mage_Adminhtml_Block_Widget_Grid_Column $column, bool $isExport): string
    {
        $val = (string) ($value ?? '');
        return $val !== '' ? ((int) $val) . 'ms' : '&mdash;';
    }

    public function decorateDetails(mixed $value, Varien_Object $row, Mage_Adminhtml_Block_Widget_Grid_Column $column, bool $isExport): string
    {
        $val = (string) ($value ?? '');
        if ($val === '') {
            return '';
        }
        $truncated = $this->escapeHtml(mb_substr($val, 0, 120));
        return '<span title="' . $this->escapeHtml($val) . '" style="font-size:11px;color:#666;">' . $truncated . '</span>';
    }

    public function getGridUrl(): string
    {
        return $this->getUrl('*/*/logGrid', ['_current' => true]);
    }

    public function getRowUrl($row): string
    {
        return '';
    }
}
