<?php

declare(strict_types=1);

namespace MageAustralia\FilterablePages\Api\State\Provider;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use Maho\ApiPlatform\Pagination\ArrayPaginator;
use Maho\ApiPlatform\Service\StoreContext;
use MageAustralia\FilterablePages\Api\Resource\FilterablePage;

/**
 * Provides brand/filter page content from our own tables.
 *
 * Lookup by categoryUrlKey + optionUrlKey:
 * 1. Find the category by URL key
 * 2. Find the option by generated URL slug (or url_alias)
 * 3. Load mageaustralia_filterable_value for content
 * 4. Check mageaustralia_filterable_page for landing page overrides
 *
 * @implements ProviderInterface<FilterablePage>
 */
final class FilterablePageProvider implements ProviderInterface
{
    #[\Override]
    public function provide(Operation $operation, array $uriVariables = [], array $context = []): ArrayPaginator
    {
        StoreContext::ensureStore();

        $filters = $context['filters'] ?? [];
        $categoryUrlKey = $filters['categoryUrlKey'] ?? null;
        $optionUrlKey = $filters['optionUrlKey'] ?? null;
        $attributeCode = $filters['attributeCode'] ?? 'brand_id';

        if (!$categoryUrlKey || !$optionUrlKey) {
            return new ArrayPaginator(items: [], currentPage: 1, itemsPerPage: 1, totalItems: 0);
        }

        /** @var \MageAustralia_FilterablePages_Helper_Data $helper */
        $helper = \Mage::helper('filterablepages');

        if (!$helper->hasOwnTables()) {
            return new ArrayPaginator(items: [], currentPage: 1, itemsPerPage: 1, totalItems: 0);
        }

        $storeId = StoreContext::getStoreId();

        // Find category by URL key
        $category = $this->findCategoryByUrlKey($categoryUrlKey, $storeId);
        if (!$category) {
            return new ArrayPaginator(items: [], currentPage: 1, itemsPerPage: 1, totalItems: 0);
        }
        $categoryId = (int) $category->getId();

        // Find the attribute and option
        $attribute = \Mage::getSingleton('eav/config')
            ->getAttribute(\Mage_Catalog_Model_Product::ENTITY, $attributeCode);
        if (!$attribute || !$attribute->getId()) {
            return new ArrayPaginator(items: [], currentPage: 1, itemsPerPage: 1, totalItems: 0);
        }

        // Match option by URL key
        $matchedOption = $this->findOptionByUrlKey($attribute, $optionUrlKey, $helper, $storeId);
        if (!$matchedOption) {
            return new ArrayPaginator(items: [], currentPage: 1, itemsPerPage: 1, totalItems: 0);
        }

        $optionId = (int) $matchedOption['value'];
        $optionLabel = $matchedOption['label'];

        // Load our value row (already per-store, no deserialization needed)
        $valueRow = $helper->getValue($optionId, $storeId);

        // Build DTO
        $dto = new FilterablePage();
        $dto->id = $optionId;
        $dto->categoryId = $categoryId;
        $dto->attributeCode = $attributeCode;
        $dto->optionId = $optionId;
        $dto->filters = [$attributeCode => (string) $optionId];

        if ($valueRow) {
            $dto->title = $valueRow['title'] ?: $optionLabel;
            $dto->description = $valueRow['description'] ?: null;
            $dto->metaTitle = $valueRow['meta_title'] ?: null;
            $dto->metaDescription = $valueRow['meta_description'] ?: null;
            $dto->metaKeywords = $valueRow['meta_keywords'] ?: null;

            if (!empty($valueRow['image'])) {
                $dto->image = '/media/amshopby/' . ltrim($valueRow['image'], '/');
            }

            $dto->cmsBlockId = $valueRow['cms_block_id'] ? (int) $valueRow['cms_block_id'] : null;
            $dto->cmsBlockBottomId = $valueRow['cms_block_bottom_id'] ? (int) $valueRow['cms_block_bottom_id'] : null;
        } else {
            $dto->title = $optionLabel;
        }

        $dto->canonicalUrl = '/' . $categoryUrlKey . '/' . $optionUrlKey;

        // Check for landing page override
        $page = $helper->findPage($categoryId, $attributeCode, (string) $optionId);
        if ($page) {
            $dto->pageId = (int) $page['page_id'];
            $dto->pageUrl = $page['url'] ?? null;

            if (!empty($page['title'])) {
                $dto->title = $page['title'];
            }
            if (!empty($page['description'])) {
                $dto->description = $page['description'];
            }
            if (!empty($page['meta_title'])) {
                $dto->metaTitle = $page['meta_title'];
            }
            if (!empty($page['meta_description'])) {
                $dto->metaDescription = $page['meta_description'];
            }
            if (!empty($page['meta_keywords'])) {
                $dto->metaKeywords = $page['meta_keywords'];
            }
            if (!empty($page['cms_block_id'])) {
                $dto->cmsBlockId = (int) $page['cms_block_id'];
            }
            if (!empty($page['cms_block_bottom_id'])) {
                $dto->cmsBlockBottomId = (int) $page['cms_block_bottom_id'];
            }
        }

        return new ArrayPaginator(items: [$dto], currentPage: 1, itemsPerPage: 1, totalItems: 1);
    }

    private function findCategoryByUrlKey(string $urlKey, int $storeId): ?\Mage_Catalog_Model_Category
    {
        $collection = \Mage::getModel('catalog/category')->getCollection()
            ->setStoreId($storeId)
            ->addAttributeToSelect(['name', 'url_key'])
            ->addAttributeToFilter('url_key', $urlKey)
            ->addAttributeToFilter('is_active', 1)
            ->setPageSize(1);

        $category = $collection->getFirstItem();
        return $category && $category->getId() ? $category : null;
    }

    /**
     * Find an attribute option whose label generates the given URL key
     */
    private function findOptionByUrlKey(
        \Mage_Eav_Model_Entity_Attribute_Abstract $attribute,
        string $urlKey,
        \MageAustralia_FilterablePages_Helper_Data $helper,
        int $storeId,
    ): ?array {
        $options = $attribute->getSource()->getAllOptions(false);

        // First: match by generated slug from label
        foreach ($options as $option) {
            if ($option['value'] === '') {
                continue;
            }
            if ($helper->generateUrlKey((string) $option['label']) === $urlKey) {
                return $option;
            }
        }

        // Fallback: match by url_alias in our values table
        $valueRow = $helper->getValueByAlias($urlKey, $storeId);
        if ($valueRow) {
            $optionId = (int) $valueRow['option_id'];
            foreach ($options as $option) {
                if ((int) $option['value'] === $optionId) {
                    return $option;
                }
            }
        }

        return null;
    }
}
