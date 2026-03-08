<?php

declare(strict_types=1);

/**
 * Mageaustralia
 *
 * @package    Mageaustralia_Storefront
 * @copyright  Copyright (c) 2026 Mageaustralia
 * @license    https://opensource.org/licenses/osl-3.0.php  Open Software License (OSL 3.0)
 */

class Mageaustralia_Storefront_Block_Adminhtml_System_Config_TestConnection extends Mage_Adminhtml_Block_System_Config_Form_Field
{
    #[\Override]
    protected function _getElementHtml(Varien_Data_Form_Element_Abstract $element): string
    {
        $url = $this->getUrl('adminhtml/storefront_dashboard/testConnection');
        $buttonId = $element->getHtmlId() . '_button';
        $resultId = $element->getHtmlId() . '_result';

        return <<<HTML
<button id="{$buttonId}" type="button" class="scalable" onclick="storefrontTestConnection(this)">
    <span>{$this->escapeHtml($this->__('Test Connection'))}</span>
</button>
<span id="{$resultId}" style="margin-left:10px;"></span>
<script>
async function storefrontTestConnection(btn) {
    var resultEl = document.getElementById('{$resultId}');
    btn.disabled = true;
    resultEl.innerHTML = 'Testing...';
    resultEl.style.color = '#666';
    try {
        var r = await mahoFetch('{$url}', { method: 'POST' });
        if (r.success) {
            resultEl.innerHTML = '&#10003; Connected';
            resultEl.style.color = 'green';
        } else {
            resultEl.innerHTML = '&#10007; ' + (r.error || 'Failed');
            resultEl.style.color = 'red';
        }
    } catch (e) {
        resultEl.innerHTML = '&#10007; ' + (e.message || 'Request failed');
        resultEl.style.color = 'red';
    }
    btn.disabled = false;
}
</script>
HTML;
    }
}
