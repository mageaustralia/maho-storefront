<?php

declare(strict_types=1);

/**
 * Mageaustralia
 *
 * @package    Mageaustralia_Storefront
 * @copyright  Copyright (c) 2026 Mageaustralia
 * @license    https://opensource.org/licenses/osl-3.0.php  Open Software License (OSL 3.0)
 */

class Mageaustralia_Storefront_Model_System_Config_Backend_Cron extends Mage_Core_Model_Config_Data
{
    /**
     * After saving the frequency field, write the actual cron expression
     * to the cron schedule config path.
     */
    #[\Override]
    protected function _afterSave(): self
    {
        $frequency = $this->getValue();
        $cronExpr = $frequency;

        if ($frequency === 'custom') {
            $groups = $this->getData('groups');
            $cronExpr = $groups['cron']['fields']['custom_cron_expr']['value'] ?? '';

            if (!Mageaustralia_Storefront_Model_System_Config_Source_Syncfrequency::isValidCronExpression($cronExpr)) {
                throw Mage::exception(
                    'Mage_Core',
                    Mage::helper('mageaustralia_storefront')->__('Invalid cron expression. Use 5-field format: minute hour day month weekday'),
                );
            }
        }

        Mage::getModel('core/config_data')
            ->load('mageaustralia_storefront/cron/schedule', 'path')
            ->setValue($cronExpr)
            ->setPath('mageaustralia_storefront/cron/schedule')
            ->save();

        return parent::_afterSave();
    }
}
