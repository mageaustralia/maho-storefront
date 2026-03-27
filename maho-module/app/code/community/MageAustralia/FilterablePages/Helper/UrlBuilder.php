<?php

declare(strict_types=1);

class MageAustralia_FilterablePages_Helper_UrlBuilder extends Mage_Core_Helper_Abstract
{
    /**
     * Build a clean category+filter URL
     */
    public function buildFilterUrl(string $categoryUrlKey, string $optionSlug): string
    {
        return '/' . trim($categoryUrlKey, '/') . '/' . trim($optionSlug, '/');
    }

    /**
     * Build a clean URL for a given category ID + option ID
     *
     * @return string|null URL path or null if cannot be built
     */
    public function buildFilterUrlFromIds(int $categoryId, string $attributeCode, int $optionId): ?string
    {
        /** @var MageAustralia_FilterablePages_Helper_Data $helper */
        $helper = Mage::helper('filterablepages');

        $categoryUrlKey = $helper->getCategoryUrlKey($categoryId);
        if ($categoryUrlKey === '') {
            return null;
        }

        // Check our values table for url_alias
        $valueRow = $helper->getValue($optionId);
        if ($valueRow && !empty($valueRow['url_alias'])) {
            return $this->buildFilterUrl($categoryUrlKey, $valueRow['url_alias']);
        }

        // Fall back to generating slug from option label
        $attribute = Mage::getSingleton('eav/config')
            ->getAttribute(Mage_Catalog_Model_Product::ENTITY, $attributeCode);
        if (!$attribute || !$attribute->getId()) {
            return null;
        }

        $options = $attribute->getSource()->getAllOptions(false);
        foreach ($options as $option) {
            if ((int) $option['value'] === $optionId) {
                $slug = $helper->generateUrlKey((string) $option['label']);
                return $this->buildFilterUrl($categoryUrlKey, $slug);
            }
        }

        return null;
    }
}
