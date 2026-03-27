<?php

declare(strict_types=1);

/**
 * MageAustralia FilterablePages — Install script
 *
 * Creates:
 * - mf_filter_by + featured_product category attributes
 * - mageaustralia_filterable_value table (replaces am_shopby_value)
 * - mageaustralia_filterable_page table (replaces am_shopby_page)
 * - mageaustralia_filterable_filter table (replaces am_shopby_filter)
 */

/** @var Mage_Catalog_Model_Resource_Setup $installer */
$installer = $this;
$installer->startSetup();

$connection = $installer->getConnection();

// ── Category attributes ─────────────────────────────────────────────

$installer->addAttribute(Mage_Catalog_Model_Category::ENTITY, 'mf_filter_by', [
    'type'             => 'varchar',
    'label'            => 'Megamenu Filter Attributes',
    'input'            => 'text',
    'required'         => false,
    'sort_order'       => 100,
    'global'           => Mage_Catalog_Model_Resource_Eav_Attribute::SCOPE_STORE,
    'group'            => 'General Information',
    'note'             => 'Comma-separated attribute codes for megamenu columns (e.g. shoe_surface_type,shoe_gender)',
]);

$installer->addAttribute(Mage_Catalog_Model_Category::ENTITY, 'featured_product', [
    'type'             => 'varchar',
    'label'            => 'Featured Product SKU',
    'input'            => 'text',
    'required'         => false,
    'sort_order'       => 101,
    'global'           => Mage_Catalog_Model_Resource_Eav_Attribute::SCOPE_STORE,
    'group'            => 'General Information',
    'note'             => 'SKU of the product to feature in the megamenu for this category',
]);

// ── mageaustralia_filterable_value ──────────────────────────────────
// Per-option content: brand pages, SEO meta, images, CMS blocks
// One row per option per store (denormalized from Amasty's serialized blobs)

$valueTable = $installer->getTable('mageaustralia_filterable_value');
if (!$connection->isTableExists($valueTable)) {
    $table = $connection->newTable($valueTable)
        ->addColumn('value_id', Varien_Db_Ddl_Table::TYPE_INTEGER, null, [
            'identity' => true,
            'unsigned' => true,
            'nullable' => false,
            'primary'  => true,
        ], 'Value ID')
        ->addColumn('store_id', Varien_Db_Ddl_Table::TYPE_SMALLINT, null, [
            'unsigned' => true,
            'nullable' => false,
            'default'  => 0,
        ], 'Store ID (0 = default)')
        ->addColumn('attribute_id', Varien_Db_Ddl_Table::TYPE_SMALLINT, null, [
            'unsigned' => true,
            'nullable' => false,
        ], 'EAV Attribute ID')
        ->addColumn('option_id', Varien_Db_Ddl_Table::TYPE_INTEGER, null, [
            'unsigned' => true,
            'nullable' => false,
        ], 'EAV Attribute Option ID')
        ->addColumn('title', Varien_Db_Ddl_Table::TYPE_TEXT, 255, [
            'nullable' => true,
        ], 'Display Title')
        ->addColumn('description', Varien_Db_Ddl_Table::TYPE_TEXT, null, [
            'nullable' => true,
        ], 'Description (HTML)')
        ->addColumn('meta_title', Varien_Db_Ddl_Table::TYPE_TEXT, 255, [
            'nullable' => true,
        ], 'Meta Title')
        ->addColumn('meta_description', Varien_Db_Ddl_Table::TYPE_TEXT, null, [
            'nullable' => true,
        ], 'Meta Description')
        ->addColumn('meta_keywords', Varien_Db_Ddl_Table::TYPE_TEXT, 255, [
            'nullable' => true,
        ], 'Meta Keywords')
        ->addColumn('image', Varien_Db_Ddl_Table::TYPE_TEXT, 255, [
            'nullable' => true,
        ], 'Image path (relative to media)')
        ->addColumn('url_alias', Varien_Db_Ddl_Table::TYPE_TEXT, 255, [
            'nullable' => true,
        ], 'Custom URL alias (overrides auto-generated slug)')
        ->addColumn('cms_block_id', Varien_Db_Ddl_Table::TYPE_INTEGER, null, [
            'unsigned' => true,
            'nullable' => true,
        ], 'CMS Block ID (top)')
        ->addColumn('cms_block_bottom_id', Varien_Db_Ddl_Table::TYPE_INTEGER, null, [
            'unsigned' => true,
            'nullable' => true,
        ], 'CMS Block ID (bottom)')
        ->addColumn('is_featured', Varien_Db_Ddl_Table::TYPE_BOOLEAN, null, [
            'nullable' => false,
            'default'  => 0,
        ], 'Featured flag')
        ->addColumn('sort_order', Varien_Db_Ddl_Table::TYPE_INTEGER, null, [
            'unsigned' => true,
            'nullable' => false,
            'default'  => 0,
        ], 'Sort order for featured display')
        ->addIndex(
            $installer->getIdxName('mageaustralia_filterable_value', ['store_id', 'option_id']),
            ['store_id', 'option_id'],
            ['type' => 'unique'],
        )
        ->addIndex(
            $installer->getIdxName('mageaustralia_filterable_value', ['attribute_id']),
            ['attribute_id'],
        )
        ->addIndex(
            $installer->getIdxName('mageaustralia_filterable_value', ['option_id']),
            ['option_id'],
        )
        ->setComment('MageAustralia Filterable Pages — Option Values');

    $connection->createTable($table);
}

// ── mageaustralia_filterable_filter ─────────────────────────────────
// Per-attribute config: SEO settings, display options

$filterTable = $installer->getTable('mageaustralia_filterable_filter');
if (!$connection->isTableExists($filterTable)) {
    $table = $connection->newTable($filterTable)
        ->addColumn('filter_id', Varien_Db_Ddl_Table::TYPE_INTEGER, null, [
            'identity' => true,
            'unsigned' => true,
            'nullable' => false,
            'primary'  => true,
        ], 'Filter ID')
        ->addColumn('attribute_id', Varien_Db_Ddl_Table::TYPE_SMALLINT, null, [
            'unsigned' => true,
            'nullable' => false,
        ], 'EAV Attribute ID')
        ->addColumn('seo_url_enabled', Varien_Db_Ddl_Table::TYPE_BOOLEAN, null, [
            'nullable' => false,
            'default'  => 1,
        ], 'Generate clean SEO URLs for options')
        ->addColumn('display_type', Varien_Db_Ddl_Table::TYPE_SMALLINT, null, [
            'unsigned' => true,
            'nullable' => false,
            'default'  => 0,
        ], 'Display type (0=default, 1=images, 2=text-swatch)')
        ->addIndex(
            $installer->getIdxName('mageaustralia_filterable_filter', ['attribute_id']),
            ['attribute_id'],
            ['type' => 'unique'],
        )
        ->setComment('MageAustralia Filterable Pages — Filter Config');

    $connection->createTable($table);
}

// ── mageaustralia_filterable_page ───────────────────────────────────
// Custom landing pages with multi-filter conditions (e.g. Wilson Blade Racquets)

$pageTable = $installer->getTable('mageaustralia_filterable_page');
if (!$connection->isTableExists($pageTable)) {
    $table = $connection->newTable($pageTable)
        ->addColumn('page_id', Varien_Db_Ddl_Table::TYPE_INTEGER, null, [
            'identity' => true,
            'unsigned' => true,
            'nullable' => false,
            'primary'  => true,
        ], 'Page ID')
        ->addColumn('store_ids', Varien_Db_Ddl_Table::TYPE_TEXT, 255, [
            'nullable' => false,
            'default'  => '0',
        ], 'Comma-separated store IDs (0 = all)')
        ->addColumn('category_ids', Varien_Db_Ddl_Table::TYPE_TEXT, 255, [
            'nullable' => true,
        ], 'Comma-separated category IDs')
        ->addColumn('conditions', Varien_Db_Ddl_Table::TYPE_TEXT, null, [
            'nullable' => true,
        ], 'Filter conditions (JSON array of {attribute_code, attribute_value})')
        ->addColumn('url', Varien_Db_Ddl_Table::TYPE_TEXT, 255, [
            'nullable' => true,
        ], 'Canonical URL')
        ->addColumn('title', Varien_Db_Ddl_Table::TYPE_TEXT, 255, [
            'nullable' => true,
        ], 'Page Title')
        ->addColumn('description', Varien_Db_Ddl_Table::TYPE_TEXT, null, [
            'nullable' => true,
        ], 'Page Description (HTML)')
        ->addColumn('meta_title', Varien_Db_Ddl_Table::TYPE_TEXT, 255, [
            'nullable' => true,
        ], 'Meta Title')
        ->addColumn('meta_description', Varien_Db_Ddl_Table::TYPE_TEXT, null, [
            'nullable' => true,
        ], 'Meta Description')
        ->addColumn('meta_keywords', Varien_Db_Ddl_Table::TYPE_TEXT, 255, [
            'nullable' => true,
        ], 'Meta Keywords')
        ->addColumn('cms_block_id', Varien_Db_Ddl_Table::TYPE_INTEGER, null, [
            'unsigned' => true,
            'nullable' => true,
        ], 'CMS Block ID (top)')
        ->addColumn('cms_block_bottom_id', Varien_Db_Ddl_Table::TYPE_INTEGER, null, [
            'unsigned' => true,
            'nullable' => true,
        ], 'CMS Block ID (bottom)')
        ->addColumn('is_active', Varien_Db_Ddl_Table::TYPE_BOOLEAN, null, [
            'nullable' => false,
            'default'  => 1,
        ], 'Active flag')
        ->addColumn('sort_order', Varien_Db_Ddl_Table::TYPE_INTEGER, null, [
            'unsigned' => true,
            'nullable' => false,
            'default'  => 0,
        ], 'Sort order')
        ->setComment('MageAustralia Filterable Pages — Custom Landing Pages');

    $connection->createTable($table);
}

$installer->endSetup();
