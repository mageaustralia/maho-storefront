<?php

declare(strict_types=1);

/**
 * Mageaustralia
 *
 * @package    Mageaustralia_Storefront
 * @copyright  Copyright (c) 2026 Mageaustralia
 * @license    https://opensource.org/licenses/osl-3.0.php  Open Software License (OSL 3.0)
 */

class Mageaustralia_Storefront_Model_System_Config_Source_Synctype
{
    public function toOptionArray(): array
    {
        return [
            ['value' => 'config',     'label' => Mage::helper('mageaustralia_storefront')->__('Store Config')],
            ['value' => 'countries',  'label' => Mage::helper('mageaustralia_storefront')->__('Countries')],
            ['value' => 'categories', 'label' => Mage::helper('mageaustralia_storefront')->__('Categories')],
            ['value' => 'products',   'label' => Mage::helper('mageaustralia_storefront')->__('Products')],
            ['value' => 'cms',        'label' => Mage::helper('mageaustralia_storefront')->__('CMS Pages & Blocks')],
            ['value' => 'blog',       'label' => Mage::helper('mageaustralia_storefront')->__('Blog Posts')],
        ];
    }
}
