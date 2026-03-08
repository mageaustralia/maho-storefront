<?php

declare(strict_types=1);

/**
 * Rewrite of the checkout success page controller.
 *
 * If the order was placed via the headless storefront (has storefront_origin),
 * redirect the customer to the storefront success page with a one-time
 * verification token. Otherwise, render the normal Maho success page.
 *
 * This is transparent to payment modules — they redirect to
 * checkout/onepage/success as usual, and this rewrite handles the rest.
 */
class Mageaustralia_Storefront_OnepageController extends Mage_Checkout_OnepageController
{
    public function successAction(): void
    {
        $order = $this->_findStorefrontOrder();

        if ($order) {
            $storefrontOrigin = $order->getData('storefront_origin');
            $orderToken = $order->getData('storefront_order_token');

            if ($storefrontOrigin && $orderToken) {
                $successUrl = rtrim($storefrontOrigin, '/')
                    . '/order/success?order=' . urlencode($order->getIncrementId())
                    . '&token=' . urlencode($orderToken);

                $this->getResponse()->setRedirect($successUrl);
                return;
            }
        }

        // No storefront origin — render the normal Maho success page
        parent::successAction();
    }

    /**
     * Find the order that should be checked for storefront redirect.
     *
     * Checks multiple sources because not all payment modules set
     * lastOrderId in the checkout session before redirecting here.
     */
    private function _findStorefrontOrder(): ?\Mage_Sales_Model_Order
    {
        // 1. Try checkout session (standard Maho checkout flow)
        $session = Mage::getSingleton('checkout/session');
        $orderId = $session->getLastOrderId();

        if ($orderId) {
            $order = Mage::getModel('sales/order')->load($orderId);
            if ($order->getId() && $order->getData('storefront_origin')) {
                return $order;
            }
        }

        // 2. Look up the most recent storefront order for this session's quote
        $quoteId = $session->getLastQuoteId();
        if ($quoteId) {
            $order = Mage::getModel('sales/order')->getCollection()
                ->addFieldToFilter('quote_id', $quoteId)
                ->addFieldToFilter('storefront_origin', ['notnull' => true])
                ->setOrder('entity_id', 'desc')
                ->setPageSize(1)
                ->getFirstItem();
            if ($order && $order->getId()) {
                return $order;
            }
        }

        // 3. Check if we arrived here from a payment return that has order context.
        //    Look for the most recent order with storefront_origin in the last 10 minutes
        //    that hasn't been verified yet (token still present).
        $resource = Mage::getSingleton('core/resource');
        $db = $resource->getConnection('core_read');
        $orderId = $db->fetchOne(
            "SELECT entity_id FROM {$resource->getTableName('sales/order')}
             WHERE storefront_origin IS NOT NULL
               AND storefront_order_token IS NOT NULL
               AND storefront_order_token != ''
               AND created_at > DATE_SUB(NOW(), INTERVAL 10 MINUTE)
             ORDER BY entity_id DESC
             LIMIT 1"
        );

        if ($orderId) {
            $order = Mage::getModel('sales/order')->load($orderId);
            if ($order->getId()) {
                return $order;
            }
        }

        return null;
    }
}