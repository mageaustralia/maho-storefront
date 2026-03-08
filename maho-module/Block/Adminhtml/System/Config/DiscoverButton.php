<?php

declare(strict_types=1);

/**
 * Mageaustralia
 *
 * @package    Mageaustralia_Storefront
 * @copyright  Copyright (c) 2026 Mageaustralia
 * @license    https://opensource.org/licenses/osl-3.0.php  Open Software License (OSL 3.0)
 */

class Mageaustralia_Storefront_Block_Adminhtml_System_Config_DiscoverButton extends Mage_Adminhtml_Block_System_Config_Form_Field
{
    #[\Override]
    protected function _getElementHtml(Varien_Data_Form_Element_Abstract $element): string
    {
        $url = $this->getUrl('adminhtml/storefront_dashboard/discover');
        $buttonId = $element->getHtmlId() . '_button';
        $resultId = $element->getHtmlId() . '_result';

        // Build the field IDs for the account_id and zone_id inputs.
        // The element ID for this button is like: mageaustralia_storefront_cloudflare_discover_credentials
        // The account_id field would be:         mageaustralia_storefront_cloudflare_account_id
        // The zone_id field would be:             mageaustralia_storefront_cloudflare_zone_id
        // The api_token field would be:           mageaustralia_storefront_cloudflare_api_token
        // The api_email field would be:           mageaustralia_storefront_cloudflare_api_email
        $prefix = 'mageaustralia_storefront_cloudflare_';

        return <<<HTML
<button id="{$buttonId}" type="button" class="scalable" onclick="storefrontDiscover(this)">
    <span>{$this->escapeHtml($this->__('Auto-Detect from API'))}</span>
</button>
<span id="{$resultId}" style="margin-left:10px;"></span>
<script>
async function storefrontDiscover(btn) {
    var resultEl = document.getElementById('{$resultId}');
    btn.disabled = true;
    resultEl.innerHTML = 'Detecting...';
    resultEl.style.color = '#666';

    // Read current form values (may not be saved yet)
    var tokenEl = document.getElementById('{$prefix}api_token');
    var emailEl = document.getElementById('{$prefix}api_email');
    var apiToken = tokenEl ? tokenEl.value : '';
    var apiEmail = emailEl ? emailEl.value : '';

    try {
        var r = await mahoFetch('{$url}', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'api_token=' + encodeURIComponent(apiToken)
                + '&api_email=' + encodeURIComponent(apiEmail)
        });

        if (!r.success) {
            resultEl.innerHTML = '&#10007; ' + (r.error || 'Failed');
            resultEl.style.color = 'red';
            btn.disabled = false;
            return;
        }

        // Auto-fill Account ID (use the first account)
        var accountEl = document.getElementById('{$prefix}account_id');
        if (accountEl && r.accounts && r.accounts.length > 0) {
            accountEl.value = r.accounts[0].id;
        }

        // Auto-fill Zone ID — try to match the store's base URL domain
        var zoneEl = document.getElementById('{$prefix}zone_id');
        if (zoneEl && r.zones && r.zones.length > 0) {
            // Try to match based on current base URL
            var baseUrl = '';
            try {
                var baseUrlEl = document.getElementById('mageaustralia_storefront_worker_storefront_url');
                if (baseUrlEl && baseUrlEl.value) {
                    baseUrl = new URL(baseUrlEl.value).hostname;
                }
            } catch(e) {}

            var matched = false;
            if (baseUrl) {
                for (var i = 0; i < r.zones.length; i++) {
                    if (baseUrl.endsWith(r.zones[i].name)) {
                        zoneEl.value = r.zones[i].id;
                        matched = true;
                        break;
                    }
                }
            }
            // If no URL match and only one zone, use it
            if (!matched && r.zones.length === 1) {
                zoneEl.value = r.zones[0].id;
                matched = true;
            }

            // Build summary
            var summary = '&#10003; Found ' + r.accounts.length + ' account(s), ' + r.zones.length + ' zone(s)';
            if (matched) {
                var zoneName = '';
                for (var j = 0; j < r.zones.length; j++) {
                    if (r.zones[j].id === zoneEl.value) { zoneName = r.zones[j].name; break; }
                }
                summary += ' — matched ' + zoneName;
            } else if (r.zones.length > 1) {
                summary += ' — multiple zones found, please select:';
                // Show zone picker
                var picker = '<br/><select onchange="document.getElementById(\'{$prefix}zone_id\').value=this.value" style="margin-top:4px">';
                picker += '<option value="">-- Select Zone --</option>';
                for (var k = 0; k < r.zones.length; k++) {
                    picker += '<option value="' + r.zones[k].id + '">' + r.zones[k].name + ' (' + r.zones[k].status + ')</option>';
                }
                picker += '</select>';
                summary += picker;
            }
            resultEl.innerHTML = summary;
            resultEl.style.color = matched ? 'green' : '#b45309';
        } else {
            resultEl.innerHTML = '&#10003; Account found, no zones available';
            resultEl.style.color = '#b45309';
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
