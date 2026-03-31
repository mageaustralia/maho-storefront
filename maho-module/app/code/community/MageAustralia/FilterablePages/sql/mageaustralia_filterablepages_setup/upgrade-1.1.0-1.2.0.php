<?php

declare(strict_types=1);

/** @var Mage_Catalog_Model_Resource_Setup $installer */
$installer = $this;
$installer->startSetup();

// Change mf_filter_by from text to multiselect, sourced from filterable product attributes
$installer->updateAttribute(
    Mage_Catalog_Model_Category::ENTITY,
    'mf_filter_by',
    'frontend_input',
    'multiselect',
);
$installer->updateAttribute(
    Mage_Catalog_Model_Category::ENTITY,
    'mf_filter_by',
    'source_model',
    'filterablepages/source_filterableAttributes',
);
$installer->updateAttribute(
    Mage_Catalog_Model_Category::ENTITY,
    'mf_filter_by',
    'backend_model',
    'eav/entity_attribute_backend_array',
);
$installer->updateAttribute(
    Mage_Catalog_Model_Category::ENTITY,
    'mf_filter_by',
    'note',
    'Select which product attributes appear as columns in the megamenu dropdown',
);

$installer->endSetup();
