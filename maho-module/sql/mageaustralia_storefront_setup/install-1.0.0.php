<?php

declare(strict_types=1);

/**
 * Mageaustralia
 *
 * @package    Mageaustralia_Storefront
 * @copyright  Copyright (c) 2026 Mageaustralia
 * @license    https://opensource.org/licenses/osl-3.0.php  Open Software License (OSL 3.0)
 */

/** @var Mage_Core_Model_Resource_Setup $this */
$installer = $this;
$installer->startSetup();

$table = $installer->getConnection()
    ->newTable($installer->getTable('mageaustralia_storefront/log'))
    ->addColumn('log_id', Maho\Db\Ddl\Table::TYPE_INTEGER, null, [
        'identity' => true,
        'unsigned' => true,
        'nullable' => false,
        'primary'  => true,
    ], 'Log ID')
    ->addColumn('action', Maho\Db\Ddl\Table::TYPE_VARCHAR, 50, [
        'nullable' => false,
    ], 'Action')
    ->addColumn('status', Maho\Db\Ddl\Table::TYPE_VARCHAR, 20, [
        'nullable' => false,
    ], 'Status')
    ->addColumn('details', Maho\Db\Ddl\Table::TYPE_TEXT, null, [
        'nullable' => true,
    ], 'Details')
    ->addColumn('admin_user', Maho\Db\Ddl\Table::TYPE_VARCHAR, 100, [
        'nullable' => true,
    ], 'Admin User')
    ->addColumn('duration_ms', Maho\Db\Ddl\Table::TYPE_INTEGER, null, [
        'unsigned' => true,
        'nullable' => true,
    ], 'Duration in Milliseconds')
    ->addColumn('created_at', Maho\Db\Ddl\Table::TYPE_DATETIME, null, [
        'nullable' => false,
    ], 'Created At')
    ->addIndex(
        $installer->getIdxName('mageaustralia_storefront/log', ['created_at']),
        ['created_at'],
    )
    ->setComment('Storefront Activity Log');

$installer->getConnection()->createTable($table);

$installer->endSetup();
