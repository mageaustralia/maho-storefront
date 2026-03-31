<?php

declare(strict_types=1);

/**
 * Source model for mf_filter_by category attribute.
 * Returns all product attributes that are enabled for layered navigation.
 */
class MageAustralia_FilterablePages_Model_Source_FilterableAttributes extends Mage_Eav_Model_Entity_Attribute_Source_Abstract
{
    protected $_options = null;

    public function getAllOptions(): array
    {
        if ($this->_options !== null) {
            return $this->_options;
        }

        $this->_options = [];

        $entityType = Mage::getSingleton('eav/config')->getEntityType(Mage_Catalog_Model_Product::ENTITY);

        $collection = Mage::getResourceModel('catalog/product_attribute_collection')
            ->addFieldToFilter('is_filterable', 1)
            ->setOrder('frontend_label', 'ASC');

        foreach ($collection as $attribute) {
            $code = $attribute->getAttributeCode();
            $label = $attribute->getFrontendLabel();
            if (!$label) {
                continue;
            }
            $this->_options[] = [
                'value' => $code,
                'label' => $label . ' (' . $code . ')',
            ];
        }

        return $this->_options;
    }
}
