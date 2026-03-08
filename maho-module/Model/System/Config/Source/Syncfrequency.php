<?php

declare(strict_types=1);

/**
 * Mageaustralia
 *
 * @package    Mageaustralia_Storefront
 * @copyright  Copyright (c) 2026 Mageaustralia
 * @license    https://opensource.org/licenses/osl-3.0.php  Open Software License (OSL 3.0)
 */

class Mageaustralia_Storefront_Model_System_Config_Source_Syncfrequency
{
    public function toOptionArray(): array
    {
        return [
            ['value' => '*/15 * * * *', 'label' => Mage::helper('mageaustralia_storefront')->__('Every 15 minutes')],
            ['value' => '*/30 * * * *', 'label' => Mage::helper('mageaustralia_storefront')->__('Every 30 minutes')],
            ['value' => '0 * * * *',    'label' => Mage::helper('mageaustralia_storefront')->__('Every hour')],
            ['value' => '0 */4 * * *',  'label' => Mage::helper('mageaustralia_storefront')->__('Every 4 hours')],
            ['value' => '0 2 * * *',    'label' => Mage::helper('mageaustralia_storefront')->__('Daily at 2:00 AM')],
            ['value' => 'custom',       'label' => Mage::helper('mageaustralia_storefront')->__('Custom')],
        ];
    }

    /**
     * Validate a cron expression (5 fields: min hour dom month dow)
     */
    public static function isValidCronExpression(string $expression): bool
    {
        $expression = trim($expression);
        if ($expression === '' || $expression === 'custom') {
            return false;
        }
        $parts = preg_split('/\s+/', $expression);
        return count($parts) === 5;
    }
}
