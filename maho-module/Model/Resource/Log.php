<?php

declare(strict_types=1);

/**
 * Mageaustralia
 *
 * @package    Mageaustralia_Storefront
 * @copyright  Copyright (c) 2026 Mageaustralia
 * @license    https://opensource.org/licenses/osl-3.0.php  Open Software License (OSL 3.0)
 */

class Mageaustralia_Storefront_Model_Resource_Log extends Mage_Core_Model_Resource_Db_Abstract
{
    #[\Override]
    protected function _construct(): void
    {
        $this->_init('mageaustralia_storefront/log', 'log_id');
    }
}
