<?php

declare(strict_types=1);

namespace MageAustralia\FilterablePages\Api\State\Provider;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use Maho\ApiPlatform\Pagination\ArrayPaginator;
use Maho\ApiPlatform\Service\StoreContext;
use MageAustralia\FilterablePages\Api\Resource\FilterOption;

/**
 * Enriches layered nav filters with clean SEO URLs from our own tables.
 *
 * Options with url: null → client-side JS filter (?attr=value)
 * Options with a URL → clean SEO link (/category/brand-slug)
 *
 * @implements ProviderInterface<FilterOption>
 */
final class FilterOptionProvider implements ProviderInterface
{
    #[\Override]
    public function provide(Operation $operation, array $uriVariables = [], array $context = []): ArrayPaginator
    {
        StoreContext::ensureStore();

        $filters = $context['filters'] ?? [];
        $categoryId = (int) ($filters['categoryId'] ?? 0);

        if ($categoryId === 0) {
            return new ArrayPaginator(items: [], currentPage: 1, itemsPerPage: 100, totalItems: 0);
        }

        $storeId = StoreContext::getStoreId();

        /** @var \MageAustralia_FilterablePages_Helper_Data $helper */
        $helper = \Mage::helper('filterablepages');

        // Load category for URL key
        $category = \Mage::getModel('catalog/category')->load($categoryId);
        if (!$category->getId()) {
            return new ArrayPaginator(items: [], currentPage: 1, itemsPerPage: 100, totalItems: 0);
        }
        $categoryUrlKey = $category->getUrlKey();

        // Use Maho's built-in layered nav
        /** @var \Mage_Catalog_Model_Layer $layer */
        $layer = \Mage::getSingleton('catalog/layer');
        $layer->setCurrentCategory($category);

        $filterableAttributes = $layer->getFilterableAttributes();

        // Batch-load our data
        $valueMap = $helper->hasOwnTables() ? $helper->getAllValues($storeId) : [];
        $seoEnabledMap = $helper->hasOwnTables() ? $helper->getSeoEnabledMap() : [];

        $result = [];

        foreach ($filterableAttributes as $attribute) {
            $attrCode = $attribute->getAttributeCode();
            $attributeId = (int) $attribute->getId();
            $seoEnabled = $seoEnabledMap[$attributeId] ?? true;

            /** @var \Mage_Catalog_Model_Layer_Filter_Attribute $filterModel */
            $filterModel = \Mage::getModel('catalog/layer_filter_attribute');
            $filterModel->setLayer($layer);
            $filterModel->setAttributeModel($attribute);

            $dto = new FilterOption();
            $dto->code = $attrCode;
            $dto->label = $attribute->getStoreLabel() ?: $attribute->getFrontendLabel();
            $dto->type = $attribute->getFrontendInput();
            $dto->position = (int) $attribute->getPosition();

            $items = $filterModel->getItems();
            foreach ($items as $item) {
                $optionId = (int) $item->getValue();
                $label = (string) $item->getLabel();

                $url = null;
                if ($seoEnabled && $categoryUrlKey && isset($valueMap[$optionId])) {
                    $row = $valueMap[$optionId];
                    $slug = !empty($row['url_alias']) ? $row['url_alias'] : $helper->generateUrlKey($label);
                    $url = '/' . $categoryUrlKey . '/' . $slug;
                }

                $dto->options[] = [
                    'value' => (string) $optionId,
                    'label' => $label,
                    'count' => (int) $item->getCount(),
                    'url' => $url,
                ];
            }

            if (!empty($dto->options)) {
                $result[] = $dto;
            }
        }

        usort($result, fn(FilterOption $a, FilterOption $b) => $a->position <=> $b->position);

        return new ArrayPaginator(
            items: $result,
            currentPage: 1,
            itemsPerPage: 100,
            totalItems: count($result),
        );
    }
}
