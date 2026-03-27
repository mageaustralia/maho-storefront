<?php

declare(strict_types=1);

/** @var Mage_Catalog_Model_Resource_Setup $installer */
$installer = $this;
$installer->startSetup();

$connection = $installer->getConnection();
$filterTable = $installer->getTable('mageaustralia_filterable_filter');

if ($connection->isTableExists($filterTable)) {
    if (!$connection->tableColumnExists($filterTable, 'position')) {
        $connection->addColumn($filterTable, 'position', [
            'type'     => Varien_Db_Ddl_Table::TYPE_INTEGER,
            'unsigned' => true,
            'nullable' => false,
            'default'  => 0,
            'comment'  => 'Sort position in layered nav (lower = higher)',
        ]);
    }

    if (!$connection->tableColumnExists($filterTable, 'default_open')) {
        $connection->addColumn($filterTable, 'default_open', [
            'type'     => Varien_Db_Ddl_Table::TYPE_BOOLEAN,
            'nullable' => false,
            'default'  => 0,
            'comment'  => 'Expand filter group by default in layered nav',
        ]);
    }

    if (!$connection->tableColumnExists($filterTable, 'depend_on_attribute')) {
        $connection->addColumn($filterTable, 'depend_on_attribute', [
            'type'     => Varien_Db_Ddl_Table::TYPE_TEXT,
            'length'   => 255,
            'nullable' => true,
            'comment'  => 'Only show when this attribute code has an active filter',
        ]);
    }
}

$installer->endSetup();
