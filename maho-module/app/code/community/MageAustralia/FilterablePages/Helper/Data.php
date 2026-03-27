<?php

declare(strict_types=1);

class MageAustralia_FilterablePages_Helper_Data extends Mage_Core_Helper_Abstract
{
    public const CACHE_TAG = 'MAGEAUS_FILTERABLE_PAGES';
    public const CACHE_TTL = 86400; // 24 hours

    /**
     * Generate a URL-safe slug from a label string
     */
    public function generateUrlKey(string $label): string
    {
        $key = strtolower(trim($label));
        $key = preg_replace('/[^a-z0-9\s-]/', '', $key);
        $key = preg_replace('/[\s-]+/', '-', $key);
        return trim($key, '-');
    }

    // ── Value lookups (our table: mageaustralia_filterable_value) ────

    /**
     * Load filterable value row for a given option_id + store
     *
     * Falls back to store 0 (default) if no store-specific row exists.
     *
     * @return array|null Row from mageaustralia_filterable_value
     */
    public function getValue(int $optionId, ?int $storeId = null): ?array
    {
        if ($storeId === null) {
            $storeId = (int) Mage::app()->getStore()->getId();
        }

        $resource = Mage::getSingleton('core/resource');
        $read = $resource->getConnection('core_read');
        $table = $resource->getTableName('mageaustralia_filterable_value');

        // Try store-specific first, then default
        $select = $read->select()
            ->from($table)
            ->where('option_id = ?', $optionId)
            ->where('store_id IN (?)', [$storeId, 0])
            ->order(new Maho\Db\Expr("FIELD(store_id, {$storeId}, 0)"))
            ->limit(1);

        $row = $read->fetchRow($select);
        return $row ?: null;
    }

    /**
     * Load filterable value by url_alias for a given store
     *
     * @return array|null Row from mageaustralia_filterable_value
     */
    public function getValueByAlias(string $alias, ?int $storeId = null): ?array
    {
        if ($storeId === null) {
            $storeId = (int) Mage::app()->getStore()->getId();
        }

        $resource = Mage::getSingleton('core/resource');
        $read = $resource->getConnection('core_read');
        $table = $resource->getTableName('mageaustralia_filterable_value');

        $select = $read->select()
            ->from($table)
            ->where('url_alias = ?', $alias)
            ->where('store_id IN (?)', [$storeId, 0])
            ->order(new Maho\Db\Expr("FIELD(store_id, {$storeId}, 0)"))
            ->limit(1);

        $row = $read->fetchRow($select);
        return $row ?: null;
    }

    /**
     * Load all filterable values indexed by option_id for a given store
     *
     * Used by FilterOptionProvider to batch-lookup URLs.
     *
     * @return array<int, array> option_id => row
     */
    public function getAllValues(?int $storeId = null): array
    {
        if ($storeId === null) {
            $storeId = (int) Mage::app()->getStore()->getId();
        }

        $resource = Mage::getSingleton('core/resource');
        $read = $resource->getConnection('core_read');
        $table = $resource->getTableName('mageaustralia_filterable_value');

        // Get all rows for this store + default, prefer store-specific
        $select = $read->select()
            ->from($table)
            ->where('store_id IN (?)', [$storeId, 0])
            ->order('store_id DESC'); // store-specific first

        $rows = $read->fetchAll($select);
        $map = [];

        foreach ($rows as $row) {
            $oid = (int) $row['option_id'];
            // First hit wins (store-specific rows come first due to ORDER BY)
            if (!isset($map[$oid])) {
                $map[$oid] = $row;
            }
        }

        return $map;
    }

    // ── Filter config (our table: mageaustralia_filterable_filter) ──

    /**
     * Check if an attribute has SEO URLs enabled
     */
    public function isSeoUrlEnabled(int $attributeId): bool
    {
        $resource = Mage::getSingleton('core/resource');
        $read = $resource->getConnection('core_read');
        $table = $resource->getTableName('mageaustralia_filterable_filter');

        $select = $read->select()
            ->from($table, ['seo_url_enabled'])
            ->where('attribute_id = ?', $attributeId)
            ->limit(1);

        $value = $read->fetchOne($select);
        if ($value === false) {
            return true; // Default to enabled if no config
        }
        return (bool) $value;
    }

    /**
     * Load SEO-enabled map for all attributes: attribute_id => bool
     *
     * @return array<int, bool>
     */
    public function getSeoEnabledMap(): array
    {
        $resource = Mage::getSingleton('core/resource');
        $read = $resource->getConnection('core_read');
        $table = $resource->getTableName('mageaustralia_filterable_filter');

        $rows = $read->fetchAll(
            $read->select()->from($table, ['attribute_id', 'seo_url_enabled']),
        );

        $map = [];
        foreach ($rows as $row) {
            $map[(int) $row['attribute_id']] = (bool) $row['seo_url_enabled'];
        }
        return $map;
    }

    // ── Page lookups (our table: mageaustralia_filterable_page) ─────

    /**
     * Find pages matching a category ID + store
     *
     * @return array[] Rows from mageaustralia_filterable_page
     */
    public function getPages(int $categoryId, ?int $storeId = null): array
    {
        if ($storeId === null) {
            $storeId = (int) Mage::app()->getStore()->getId();
        }

        $resource = Mage::getSingleton('core/resource');
        $read = $resource->getConnection('core_read');
        $table = $resource->getTableName('mageaustralia_filterable_page');

        $rows = $read->fetchAll(
            $read->select()->from($table)->where('is_active = ?', 1),
        );

        $matching = [];
        foreach ($rows as $row) {
            // Store match
            $stores = explode(',', (string) $row['store_ids']);
            if (!in_array('0', $stores) && !in_array((string) $storeId, $stores)) {
                continue;
            }

            // Category match
            if (!empty($row['category_ids'])) {
                $cats = explode(',', (string) $row['category_ids']);
                if (!in_array((string) $categoryId, $cats)) {
                    continue;
                }
            }

            $matching[] = $row;
        }

        return $matching;
    }

    /**
     * Find a page matching specific filter conditions for a category
     */
    public function findPage(int $categoryId, string $attributeCode, string $optionValue): ?array
    {
        $pages = $this->getPages($categoryId);

        foreach ($pages as $page) {
            $conditions = json_decode($page['conditions'] ?? '[]', true);
            if (!is_array($conditions)) {
                continue;
            }

            foreach ($conditions as $condition) {
                if (
                    isset($condition['attribute_code'], $condition['attribute_value'])
                    && $condition['attribute_code'] === $attributeCode
                    && $condition['attribute_value'] === $optionValue
                ) {
                    return $page;
                }
            }
        }

        return null;
    }

    // ── Utility ─────────────────────────────────────────────────────

    /**
     * Get the attribute_id for brand_id attribute
     */
    public function getBrandAttributeId(): ?int
    {
        $attribute = Mage::getSingleton('eav/config')
            ->getAttribute(Mage_Catalog_Model_Product::ENTITY, 'brand_id');

        return $attribute && $attribute->getId() ? (int) $attribute->getId() : null;
    }

    /**
     * Get category URL key
     */
    public function getCategoryUrlKey(int $categoryId): string
    {
        $category = Mage::getModel('catalog/category')->load($categoryId);
        return $category->getUrlKey() ?: '';
    }

    /**
     * Check if our tables exist (module installed correctly)
     */
    public function hasOwnTables(): bool
    {
        $resource = Mage::getSingleton('core/resource');
        $read = $resource->getConnection('core_read');
        return $read->isTableExists($resource->getTableName('mageaustralia_filterable_value'));
    }

    /**
     * Check if Amasty ShopBy tables exist (for import availability)
     */
    public function hasAmastyTables(): bool
    {
        $resource = Mage::getSingleton('core/resource');
        $read = $resource->getConnection('core_read');
        return $read->isTableExists($resource->getTableName('am_shopby_value'));
    }
}
