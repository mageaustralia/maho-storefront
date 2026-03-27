<?php

declare(strict_types=1);

class MageAustralia_FilterablePages_Block_Adminhtml_Filter_Grid extends Mage_Adminhtml_Block_Widget_Container
{
    public function __construct()
    {
        parent::__construct();
        $this->setTemplate('widget/grid/container.phtml');
        $this->_blockGroup = 'filterablepages';
        $this->_headerText = 'Filter Configuration';

        $this->_addButton('import_amasty', [
            'label'   => 'Re-import from Amasty',
            'onclick' => "setLocation('{$this->getUrl('*/*/import')}')",
            'class'   => 'add',
        ]);

        $this->_addButton('save', [
            'label'   => 'Save Configuration',
            'onclick' => 'filterConfigForm.submit()',
            'class'   => 'save',
        ]);
    }

    protected function _toHtml(): string
    {
        $resource = Mage::getSingleton('core/resource');
        $read = $resource->getConnection('core_read');
        $filterTable = $resource->getTableName('mageaustralia_filterable_filter');

        $filters = $read->fetchAll(
            $read->select()->from($filterTable)->order('position ASC'),
        );

        // Load attribute labels
        $attrLabels = [];
        foreach ($filters as $row) {
            $attr = Mage::getSingleton('eav/config')
                ->getAttribute(Mage_Catalog_Model_Product::ENTITY, (int) $row['attribute_id']);
            if ($attr && $attr->getId()) {
                $attrLabels[(int) $row['attribute_id']] = $attr->getFrontendLabel() . ' (' . $attr->getAttributeCode() . ')';
            }
        }

        // Get all filterable attribute codes for the depend_on dropdown
        $allAttrCodes = [];
        foreach ($filters as $row) {
            $attr = Mage::getSingleton('eav/config')
                ->getAttribute(Mage_Catalog_Model_Product::ENTITY, (int) $row['attribute_id']);
            if ($attr && $attr->getId()) {
                $allAttrCodes[$attr->getAttributeCode()] = $attr->getFrontendLabel();
            }
        }

        $saveUrl = $this->getUrl('*/*/save');

        $html = parent::_toHtml();

        $html .= '<form id="filterConfigForm" method="post" action="' . $this->escapeUrl($saveUrl) . '">';
        $html .= '<input type="hidden" name="form_key" value="' . Mage::getSingleton('core/session')->getFormKey() . '">';
        $html .= '<table class="data" cellspacing="0">';
        $html .= '<thead><tr>';
        $html .= '<th>Attribute</th>';
        $html .= '<th style="width:80px">Position</th>';
        $html .= '<th style="width:100px">Default Open</th>';
        $html .= '<th style="width:100px">SEO URLs</th>';
        $html .= '<th style="width:200px">Depend On Attribute</th>';
        $html .= '</tr></thead><tbody>';

        foreach ($filters as $row) {
            $id = (int) $row['filter_id'];
            $label = $attrLabels[(int) $row['attribute_id']] ?? 'Unknown (ID: ' . $row['attribute_id'] . ')';
            $pos = (int) $row['position'];
            $open = !empty($row['default_open']);
            $seo = !empty($row['seo_url_enabled']);
            $dependOn = $row['depend_on_attribute'] ?? '';

            $html .= '<tr>';
            $html .= '<td>' . $this->escapeHtml($label) . '</td>';
            $html .= '<td><input type="number" name="filters[' . $id . '][position]" value="' . $pos . '" style="width:60px" class="input-text"></td>';
            $html .= '<td style="text-align:center"><input type="checkbox" name="filters[' . $id . '][default_open]" value="1"' . ($open ? ' checked' : '') . '></td>';
            $html .= '<td style="text-align:center"><input type="checkbox" name="filters[' . $id . '][seo_url_enabled]" value="1"' . ($seo ? ' checked' : '') . '></td>';

            // Depend on dropdown
            $html .= '<td><select name="filters[' . $id . '][depend_on_attribute]" class="select">';
            $html .= '<option value="">-- None --</option>';
            foreach ($allAttrCodes as $code => $attrLabel) {
                $selected = ($dependOn === $code) ? ' selected' : '';
                $html .= '<option value="' . $this->escapeHtml($code) . '"' . $selected . '>'
                    . $this->escapeHtml($attrLabel . ' (' . $code . ')')
                    . '</option>';
            }
            $html .= '</select></td>';

            $html .= '</tr>';
        }

        $html .= '</tbody></table>';
        $html .= '</form>';

        return $html;
    }
}
