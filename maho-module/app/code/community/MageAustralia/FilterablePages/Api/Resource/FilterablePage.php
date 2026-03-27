<?php

declare(strict_types=1);

namespace MageAustralia\FilterablePages\Api\Resource;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\GetCollection;
use MageAustralia\FilterablePages\Api\State\Provider\FilterablePageProvider;

#[ApiResource(
    shortName: 'FilterablePage',
    description: 'Brand/filter page content from Amasty ShopBy data',
    provider: FilterablePageProvider::class,
    operations: [
        new GetCollection(
            uriTemplate: '/filterable-pages',
            description: 'Lookup brand/filter page content by category and option URL keys',
        ),
    ],
)]
class FilterablePage
{
    #[ApiProperty(identifier: true)]
    public ?int $id = null;

    public ?string $title = null;
    public ?string $description = null;
    public ?string $metaTitle = null;
    public ?string $metaDescription = null;
    public ?string $metaKeywords = null;
    public ?string $image = null;
    public ?string $canonicalUrl = null;
    public ?int $categoryId = null;
    public ?string $attributeCode = null;
    public ?int $optionId = null;

    /** @var array<string, string> Active filter conditions */
    public array $filters = [];

    public ?int $cmsBlockId = null;
    public ?int $cmsBlockBottomId = null;

    /** If sourced from am_shopby_page (custom landing page) */
    public ?int $pageId = null;
    public ?string $pageUrl = null;
}
