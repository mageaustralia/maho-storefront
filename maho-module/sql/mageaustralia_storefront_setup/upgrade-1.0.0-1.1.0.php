<?php

declare(strict_types=1);

/** @var Mage_Core_Model_Resource_Setup $this */
$installer = $this;
$installer->startSetup();

$orderTable = $installer->getTable('sales/order');
$connection = $installer->getConnection();

$connection->addColumn($orderTable, 'storefront_origin', [
    'type'     => Maho\Db\Ddl\Table::TYPE_VARCHAR,
    'length'   => 255,
    'nullable' => true,
    'default'  => null,
    'comment'  => 'Headless storefront origin URL',
]);

$connection->addColumn($orderTable, 'storefront_order_token', [
    'type'     => Maho\Db\Ddl\Table::TYPE_VARCHAR,
    'length'   => 64,
    'nullable' => true,
    'default'  => null,
    'comment'  => 'One-time token for storefront order verification',
]);

$installer->endSetup();