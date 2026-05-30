<?php

declare(strict_types=1);

/**
 * Mageaustralia
 *
 * @package    Mageaustralia_Storefront
 * @copyright  Copyright (c) 2026 Mageaustralia
 * @license    https://opensource.org/licenses/osl-3.0.php  Open Software License (OSL 3.0)
 */

class Mageaustralia_Storefront_Block_Adminhtml_System_Config_SyncButton extends Mage_Adminhtml_Block_System_Config_Form_Field
{
    #[\Override]
    protected function _getElementHtml(Varien_Data_Form_Element_Abstract $element): string
    {
        $dashboardUrl = $this->getUrl('adminhtml/storefront_dashboard/index');

        return <<<HTML
<button type="button" class="scalable" onclick="window.location.href='{$dashboardUrl}'">
    <span>{$this->escapeHtml($this->__('Open Dashboard'))}</span>
</button>
<p class="note" style="margin-top:5px;">
    {$this->escapeHtml($this->__('Use the Storefront Dashboard for sync operations and cache management.'))}
</p>
HTML;
    }
}
