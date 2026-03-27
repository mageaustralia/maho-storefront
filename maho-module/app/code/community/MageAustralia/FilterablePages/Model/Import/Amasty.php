<?php

declare(strict_types=1);

/**
 * One-time importer: reads Amasty ShopBy tables and populates our own tables.
 *
 * Usage from shell/script:
 *   Mage::getModel('filterablepages/import_amasty')->run();
 *
 * Safe to run multiple times — truncates our tables before import.
 * Never modifies Amasty tables.
 */
class MageAustralia_FilterablePages_Model_Import_Amasty
{
    private int $valuesImported = 0;
    private int $filtersImported = 0;
    private int $pagesImported = 0;
    private array $errors = [];

    /**
     * Run the full import
     *
     * @return array{values: int, filters: int, pages: int, errors: string[]}
     */
    public function run(): array
    {
        $this->valuesImported = 0;
        $this->filtersImported = 0;
        $this->pagesImported = 0;
        $this->errors = [];

        $resource = Mage::getSingleton('core/resource');
        $read = $resource->getConnection('core_read');
        $write = $resource->getConnection('core_write');

        // Check Amasty tables exist
        if (!$read->isTableExists($resource->getTableName('am_shopby_value'))) {
            $this->errors[] = 'am_shopby_value table not found — nothing to import';
            return $this->getResult();
        }

        $this->importValues($read, $write, $resource);
        $this->importFilters($read, $write, $resource);
        $this->importPages($read, $write, $resource);

        return $this->getResult();
    }

    private function importValues(
        Varien_Db_Adapter_Interface $read,
        Varien_Db_Adapter_Interface $write,
        Mage_Core_Model_Resource $resource,
    ): void {
        $sourceTable = $resource->getTableName('am_shopby_value');
        $targetTable = $resource->getTableName('mageaustralia_filterable_value');

        // Truncate target
        $write->truncateTable($targetTable);

        $rows = $read->fetchAll($read->select()->from($sourceTable));

        // We need filter_id → attribute_id mapping
        $filterMap = $this->loadFilterAttributeMap($read, $resource);

        foreach ($rows as $row) {
            $optionId = (int) $row['option_id'];
            $filterId = (int) $row['filter_id'];
            $attributeId = $filterMap[$filterId] ?? null;

            if (!$attributeId) {
                $this->errors[] = "Skipping am_shopby_value {$row['value_id']}: filter_id {$filterId} has no attribute mapping";
                continue;
            }

            // Deserialize each store value and insert a row per store
            $storeValues = $this->expandStoreValues($row);

            foreach ($storeValues as $storeId => $values) {
                // Skip if all values are empty for this store
                if ($this->isEmptyRow($values)) {
                    continue;
                }

                try {
                    $write->insert($targetTable, [
                        'store_id'           => $storeId,
                        'attribute_id'       => $attributeId,
                        'option_id'          => $optionId,
                        'title'              => $values['title'],
                        'description'        => $values['description'],
                        'meta_title'         => $values['meta_title'],
                        'meta_description'   => $values['meta_description'],
                        'meta_keywords'      => $values['meta_keywords'],
                        'image'              => $row['img_big'] ?: null,
                        'url_alias'          => $values['url_alias'],
                        'cms_block_id'       => $values['cms_block_id'] ? (int) $values['cms_block_id'] : null,
                        'cms_block_bottom_id' => $values['cms_block_bottom_id'] ? (int) $values['cms_block_bottom_id'] : null,
                        'is_featured'        => (int) ($row['is_featured'] ?? 0),
                        'sort_order'         => (int) ($row['featured_order'] ?? 0),
                    ]);
                    $this->valuesImported++;
                } catch (\Exception $e) {
                    $this->errors[] = "Failed to insert value for option {$optionId} store {$storeId}: {$e->getMessage()}";
                }
            }
        }
    }

    /**
     * Expand serialized per-store columns into separate rows.
     *
     * Given a raw am_shopby_value row with serialized fields like:
     *   title = a:4:{i:0;s:6:"Wilson";i:1;s:0:"";i:2;s:0:"";i:3;s:6:"Wilson";}
     *
     * Returns:
     *   [0 => ['title' => 'Wilson', ...], 3 => ['title' => 'Wilson', ...]]
     *
     * Only includes stores that have at least one non-empty value.
     *
     * @return array<int, array{title: string, description: string, meta_title: string, meta_description: string, meta_keywords: string, url_alias: string, cms_block_id: string, cms_block_bottom_id: string}>
     */
    private function expandStoreValues(array $row): array
    {
        $serializedFields = [
            'title'              => 'title',
            'descr'              => 'description',
            'meta_title'         => 'meta_title',
            'meta_descr'         => 'meta_description',
            'meta_kw'            => 'meta_keywords',
            'url_alias'          => 'url_alias',
            'cms_block_id'       => 'cms_block_id',
            'cms_block_bottom_id' => 'cms_block_bottom_id',
        ];

        // First pass: decode all serialized fields, collect all store IDs
        $decoded = [];
        $allStoreIds = [];

        foreach ($serializedFields as $sourceCol => $targetCol) {
            $raw = $row[$sourceCol] ?? '';
            $values = $this->decodeMultiStore($raw);
            $decoded[$targetCol] = $values;
            foreach (array_keys($values) as $sid) {
                $allStoreIds[$sid] = true;
            }
        }

        // Second pass: build per-store row
        $result = [];
        foreach (array_keys($allStoreIds) as $storeId) {
            $storeRow = [];
            foreach ($serializedFields as $sourceCol => $targetCol) {
                $storeRow[$targetCol] = $decoded[$targetCol][$storeId] ?? '';
            }
            $result[(int) $storeId] = $storeRow;
        }

        return $result;
    }

    /**
     * Decode a serialized/JSON multi-store value into [storeId => value] map
     */
    private function decodeMultiStore(string $raw): array
    {
        if (empty($raw)) {
            return [];
        }

        // Try JSON
        if ($raw[0] === '[' || $raw[0] === '{') {
            $decoded = json_decode($raw, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                return $decoded;
            }
        }

        // Try PHP unserialize
        if (str_starts_with($raw, 'a:') || str_starts_with($raw, 's:')) {
            $decoded = @unserialize($raw);
            if (is_array($decoded)) {
                return $decoded;
            }
        }

        // Plain string — treat as store 0
        return [0 => $raw];
    }

    private function isEmptyRow(array $values): bool
    {
        foreach ($values as $v) {
            if ((string) $v !== '') {
                return false;
            }
        }
        return true;
    }

    private function importFilters(
        Varien_Db_Adapter_Interface $read,
        Varien_Db_Adapter_Interface $write,
        Mage_Core_Model_Resource $resource,
    ): void {
        $sourceTable = $resource->getTableName('am_shopby_filter');
        $targetTable = $resource->getTableName('mageaustralia_filterable_filter');

        if (!$read->isTableExists($sourceTable)) {
            return;
        }

        $write->truncateTable($targetTable);

        $rows = $read->fetchAll($read->select()->from($sourceTable));

        foreach ($rows as $row) {
            try {
                $write->insert($targetTable, [
                    'attribute_id'    => (int) $row['attribute_id'],
                    'seo_url_enabled' => empty($row['disable_seo_url']) ? 1 : 0,
                    'display_type'    => (int) ($row['display_type'] ?? 0),
                ]);
                $this->filtersImported++;
            } catch (\Exception $e) {
                $this->errors[] = "Failed to insert filter for attribute {$row['attribute_id']}: {$e->getMessage()}";
            }
        }
    }

    private function importPages(
        Varien_Db_Adapter_Interface $read,
        Varien_Db_Adapter_Interface $write,
        Mage_Core_Model_Resource $resource,
    ): void {
        $sourceTable = $resource->getTableName('am_shopby_page');
        $targetTable = $resource->getTableName('mageaustralia_filterable_page');

        if (!$read->isTableExists($sourceTable)) {
            return;
        }

        $write->truncateTable($targetTable);

        $rows = $read->fetchAll($read->select()->from($sourceTable));

        foreach ($rows as $row) {
            // Decode conditions from serialized PHP to JSON
            $condRaw = $row['cond'] ?? '';
            $conditions = $this->decodeMultiStore($condRaw);
            // Conditions are an array of {attribute_code, attribute_value}, not per-store
            if (!is_array($conditions)) {
                $conditions = [];
            }

            try {
                $write->insert($targetTable, [
                    'store_ids'          => $row['stores'] ?? '0',
                    'category_ids'       => $row['cats'] ?? null,
                    'conditions'         => json_encode($conditions, JSON_UNESCAPED_UNICODE),
                    'url'                => $row['url'] ?? null,
                    'title'              => $row['title'] ?? null,
                    'description'        => $row['description'] ?? null,
                    'meta_title'         => $row['meta_title'] ?? null,
                    'meta_description'   => $row['meta_descr'] ?? null,
                    'meta_keywords'      => $row['meta_kw'] ?? null,
                    'cms_block_id'       => $row['cms_block_id'] ? (int) $row['cms_block_id'] : null,
                    'cms_block_bottom_id' => $row['bottom_cms_block_id'] ? (int) $row['bottom_cms_block_id'] : null,
                    'is_active'          => 1,
                    'sort_order'         => (int) ($row['num'] ?? 0),
                ]);
                $this->pagesImported++;
            } catch (\Exception $e) {
                $this->errors[] = "Failed to insert page '{$row['title']}': {$e->getMessage()}";
            }
        }
    }

    /**
     * Build filter_id → attribute_id map from am_shopby_filter
     */
    private function loadFilterAttributeMap(Varien_Db_Adapter_Interface $read, Mage_Core_Model_Resource $resource): array
    {
        $table = $resource->getTableName('am_shopby_filter');
        if (!$read->isTableExists($table)) {
            return [];
        }
        return $read->fetchPairs(
            $read->select()->from($table, ['filter_id', 'attribute_id']),
        );
    }

    private function getResult(): array
    {
        return [
            'values'  => $this->valuesImported,
            'filters' => $this->filtersImported,
            'pages'   => $this->pagesImported,
            'errors'  => $this->errors,
        ];
    }
}
