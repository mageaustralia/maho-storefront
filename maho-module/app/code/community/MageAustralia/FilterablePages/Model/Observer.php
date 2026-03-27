<?php

declare(strict_types=1);

class MageAustralia_FilterablePages_Model_Observer
{
    /**
     * Enrich layered filter DTOs with clean SEO URLs from our filterable values.
     *
     * Listens to: api_layered_filter_dto_build
     * Adds filterablePageUrls to extensions: { optionId => "/category/slug" }
     */
    public function enrichFilterOptions(Varien_Event_Observer $observer): void
    {
        /** @var MageAustralia_FilterablePages_Helper_Data $helper */
        $helper = Mage::helper('filterablepages');

        if (!$helper->hasOwnTables()) {
            return;
        }

        $dto = $observer->getEvent()->getDto();
        if (!$dto || !property_exists($dto, 'extensions')) {
            return;
        }

        $category = $observer->getEvent()->getCategory();
        if (!$category) {
            return;
        }

        $categoryUrlKey = $category->getUrlKey();
        if (!$categoryUrlKey) {
            return;
        }

        $storeId = (int) Mage::app()->getStore()->getId();
        $attributeId = null;

        if (property_exists($dto, 'code')) {
            $attribute = Mage::getSingleton('eav/config')
                ->getAttribute(Mage_Catalog_Model_Product::ENTITY, $dto->code);
            if ($attribute && $attribute->getId()) {
                $attributeId = (int) $attribute->getId();
            }
        }

        // Check if SEO URLs are enabled for this attribute
        if ($attributeId && !$helper->isSeoUrlEnabled($attributeId)) {
            return;
        }

        if (property_exists($dto, 'options') && is_array($dto->options)) {
            $urlMap = [];
            foreach ($dto->options as $option) {
                $optionId = (int) ($option->value ?? 0);
                if ($optionId === 0) {
                    continue;
                }

                $valueRow = $helper->getValue($optionId, $storeId);
                if ($valueRow) {
                    $slug = !empty($valueRow['url_alias'])
                        ? $valueRow['url_alias']
                        : $helper->generateUrlKey($option->label ?? '');
                    $urlMap[(string) $optionId] = '/' . $categoryUrlKey . '/' . $slug;
                }
            }

            if (!empty($urlMap)) {
                $dto->extensions['filterablePageUrls'] = $urlMap;
            }
        }
    }
}
