<?php

declare(strict_types=1);

namespace MageAustralia\FilterablePages\Api\State\Provider;

use ApiPlatform\Metadata\CollectionOperationInterface;
use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use Maho\ApiPlatform\Pagination\ArrayPaginator;
use Maho\ApiPlatform\Service\StoreContext;
use MageAustralia\FilterablePages\Api\Resource\MenuData;

/**
 * Builds megamenu data: attribute columns with option counts + featured product.
 *
 * For each category:
 * 1. Always includes brand_id as the first column
 * 2. Reads mf_filter_by category attribute for additional attribute columns
 * 3. Counts option occurrences in category products, sorted by popularity
 * 4. Loads featured_product SKU → product details
 *
 * @implements ProviderInterface<MenuData>
 */
final class MenuDataProvider implements ProviderInterface
{
    private const MAX_OPTIONS_PER_COLUMN = 10;

    #[\Override]
    public function provide(Operation $operation, array $uriVariables = [], array $context = []): MenuData|ArrayPaginator|null
    {
        StoreContext::ensureStore();

        if ($operation instanceof CollectionOperationInterface) {
            return $this->getCollection($context);
        }

        $categoryId = (int) ($uriVariables['id'] ?? 0);
        if ($categoryId === 0) {
            return null;
        }

        return $this->buildMenuData($categoryId);
    }

    /**
     * Collection: returns menu data for all top-level categories
     *
     * @return ArrayPaginator<MenuData>
     */
    private function getCollection(array $context): ArrayPaginator
    {
        $filters = $context['filters'] ?? [];
        $storeId = StoreContext::getStoreId();

        // Get the root category for the current store
        $rootCategoryId = (int) \Mage::app()->getStore($storeId)->getRootCategoryId();

        // Load top-level categories (children of root)
        $categories = \Mage::getModel('catalog/category')
            ->getCollection()
            ->addAttributeToSelect(['name', 'url_key', 'mf_filter_by', 'featured_product'])
            ->addAttributeToFilter('parent_id', $rootCategoryId)
            ->addAttributeToFilter('is_active', 1)
            ->setOrder('position', 'ASC');

        $items = [];
        foreach ($categories as $category) {
            $cacheKey = "api_menu_data_{$category->getId()}_{$storeId}";
            $cached = \Mage::app()->getCache()->load($cacheKey);

            if ($cached !== false) {
                $data = json_decode($cached, true);
                if (is_array($data)) {
                    $items[] = $this->arrayToDto($data);
                    continue;
                }
            }

            $dto = $this->buildMenuDataFromCategory($category);
            if ($dto) {
                $this->cacheDto($dto, $cacheKey, (int) $category->getId());
                $items[] = $dto;
            }
        }

        return new ArrayPaginator(
            items: $items,
            currentPage: 1,
            itemsPerPage: 100,
            totalItems: count($items),
        );
    }

    private function buildMenuData(int $categoryId): ?MenuData
    {
        $storeId = StoreContext::getStoreId();
        $cacheKey = "api_menu_data_{$categoryId}_{$storeId}";

        $cached = \Mage::app()->getCache()->load($cacheKey);
        if ($cached !== false) {
            $data = json_decode($cached, true);
            if (is_array($data)) {
                return $this->arrayToDto($data);
            }
        }

        $category = \Mage::getModel('catalog/category')->load($categoryId);
        if (!$category->getId()) {
            return null;
        }

        $dto = $this->buildMenuDataFromCategory($category);
        if ($dto) {
            $this->cacheDto($dto, $cacheKey, $categoryId);
        }

        return $dto;
    }

    private function buildMenuDataFromCategory(\Mage_Catalog_Model_Category $category): ?MenuData
    {
        /** @var \MageAustralia_FilterablePages_Helper_Data $helper */
        $helper = \Mage::helper('filterablepages');

        $categoryId = (int) $category->getId();

        // Determine which attributes to show as columns
        $attributeCodes = ['brand_id']; // Always first
        $mfFilterBy = trim((string) $category->getData('mf_filter_by'));
        if ($mfFilterBy !== '') {
            $extraCodes = array_map('trim', explode(',', $mfFilterBy));
            foreach ($extraCodes as $code) {
                if ($code !== '' && $code !== 'brand_id') {
                    $attributeCodes[] = $code;
                }
            }
        }

        // Build columns
        $columns = [];
        foreach ($attributeCodes as $attrCode) {
            $column = $this->buildColumn($categoryId, $attrCode, $helper);
            if ($column !== null) {
                $columns[] = $column;
            }
        }

        // Featured product
        $featuredProduct = null;
        $featuredSku = trim((string) $category->getData('featured_product'));
        if ($featuredSku !== '') {
            $featuredProduct = $this->loadFeaturedProduct($featuredSku);
        }

        $dto = new MenuData();
        $dto->id = $categoryId;
        $dto->columns = $columns;
        $dto->featuredProduct = $featuredProduct;

        return $dto;
    }

    /**
     * Build a single attribute column: query products in category, count option occurrences
     */
    private function buildColumn(int $categoryId, string $attributeCode, \MageAustralia_FilterablePages_Helper_Data $helper): ?array
    {
        $attribute = \Mage::getSingleton('eav/config')
            ->getAttribute(\Mage_Catalog_Model_Product::ENTITY, $attributeCode);

        if (!$attribute || !$attribute->getId()) {
            return null;
        }

        // Get all options for the attribute
        $options = $attribute->getSource()->getAllOptions(false);
        if (empty($options)) {
            return null;
        }

        // Count products per option in this category
        $resource = \Mage::getSingleton('core/resource');
        $read = $resource->getConnection('core_read');

        $productTable = $resource->getTableName('catalog/category_product');
        $eavTable = $attribute->getBackend()->getTable();

        $superLinkTable = $resource->getTableName('catalog/product_super_link');

        $select = $read->select()
            ->from(['cp' => $productTable], [])
            ->join(
                ['eav' => $eavTable],
                'cp.product_id = eav.entity_id',
                [
                    'value',
                    'cnt' => new \Maho\Db\Expr('COUNT(DISTINCT cp.product_id)'),
                ],
            )
            ->where('cp.category_id = ?', $categoryId)
            ->where('eav.attribute_id = ?', (int) $attribute->getId())
            ->where('eav.value IS NOT NULL')
            ->where('eav.value != ?', '')
            // Exclude child simples (children of configurable parents).
            // catalog_product_super_link.product_id lists every simple that belongs
            // to a configurable — we don't want to count those.
            ->where('cp.product_id NOT IN (SELECT product_id FROM ' . $superLinkTable . ')')
            ->group('eav.value');

        // Filter to only enabled products
        $statusAttribute = \Mage::getSingleton('eav/config')
            ->getAttribute(\Mage_Catalog_Model_Product::ENTITY, 'status');
        if ($statusAttribute) {
            $statusTable = $statusAttribute->getBackend()->getTable();
            $select->join(
                ['status' => $statusTable],
                'cp.product_id = status.entity_id AND status.attribute_id = ' . (int) $statusAttribute->getId(),
                [],
            )->where('status.value = ?', \Mage_Catalog_Model_Product_Status::STATUS_ENABLED);
        }

        $counts = $read->fetchPairs($select);

        // Map option_id => label and build items
        $optionMap = [];
        foreach ($options as $option) {
            if ($option['value'] === '') {
                continue;
            }
            $optionMap[(string) $option['value']] = $option['label'];
        }

        $items = [];
        foreach ($counts as $optionId => $count) {
            $label = $optionMap[(string) $optionId] ?? null;
            if ($label === null) {
                continue;
            }

            $items[] = [
                'label' => $label,
                'urlKey' => $helper->generateUrlKey($label),
                'optionId' => (int) $optionId,
                'count' => (int) $count,
            ];
        }

        // Sort by count descending (popularity), limit
        usort($items, fn(array $a, array $b) => $b['count'] <=> $a['count']);
        $items = array_slice($items, 0, self::MAX_OPTIONS_PER_COLUMN);

        if (empty($items)) {
            return null;
        }

        $titleMap = [
            'brand_id' => 'Shop by Brand',
        ];
        $title = $titleMap[$attributeCode] ?? 'Shop by ' . ($attribute->getStoreLabel() ?: $attribute->getFrontendLabel());

        return [
            'title' => $title,
            'attributeCode' => $attributeCode,
            'items' => $items,
        ];
    }

    private function loadFeaturedProduct(string $sku): ?array
    {
        $product = \Mage::getModel('catalog/product');
        $productId = $product->getIdBySku($sku);

        if (!$productId) {
            return null;
        }

        $product->load($productId);
        if (!$product->getId() || (int) $product->getStatus() !== \Mage_Catalog_Model_Product_Status::STATUS_ENABLED) {
            return null;
        }

        $imageUrl = '';
        try {
            $imageUrl = (string) \Mage::helper('catalog/image')->init($product, 'small_image')->resize(300);
        } catch (\Exception $e) {
            // No image available
        }

        return [
            'sku' => $product->getSku(),
            'name' => $product->getName(),
            'price' => (float) $product->getFinalPrice(),
            'imageUrl' => $imageUrl,
            'url' => $product->getProductUrl(),
        ];
    }

    private function cacheDto(MenuData $dto, string $cacheKey, int $categoryId): void
    {
        $data = $this->dtoToArray($dto);
        \Mage::app()->getCache()->save(
            json_encode($data),
            $cacheKey,
            [
                \MageAustralia_FilterablePages_Helper_Data::CACHE_TAG,
                'catalog_category_' . $categoryId,
            ],
            \MageAustralia_FilterablePages_Helper_Data::CACHE_TTL,
        );
    }

    private function dtoToArray(MenuData $dto): array
    {
        return [
            'id' => $dto->id,
            'columns' => $dto->columns,
            'featuredProduct' => $dto->featuredProduct,
        ];
    }

    private function arrayToDto(array $data): MenuData
    {
        $dto = new MenuData();
        $dto->id = $data['id'] ?? null;
        $dto->columns = $data['columns'] ?? [];
        $dto->featuredProduct = $data['featuredProduct'] ?? null;
        return $dto;
    }
}
