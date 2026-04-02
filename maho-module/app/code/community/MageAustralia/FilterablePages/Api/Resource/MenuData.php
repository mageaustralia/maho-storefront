<?php

declare(strict_types=1);

namespace MageAustralia\FilterablePages\Api\Resource;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use MageAustralia\FilterablePages\Api\State\Provider\MenuDataProvider;

#[ApiResource(
    shortName: 'MenuData',
    description: 'Megamenu data for categories (columns, featured product)',
    provider: MenuDataProvider::class,
    operations: [
        new Get(
            uriTemplate: '/menu-data/{id}',
            security: 'true',
            description: 'Get megamenu data for a single category',
        ),
        new GetCollection(
            uriTemplate: '/menu-data',
            security: 'true',
            description: 'Get megamenu data for all top-level categories',
        ),
    ],
)]
class MenuData
{
    #[ApiProperty(identifier: true)]
    public ?int $id = null;

    /** @var array<int, array{title: string, attributeCode: string, items: list<array{label: string, urlKey: string, optionId: int, count: int}>}> */
    #[ApiProperty(description: 'Attribute columns for megamenu')]
    public array $columns = [];

    /** @var array{sku: string, name: string, price: float, imageUrl: string, url: string}|null */
    #[ApiProperty(description: 'Featured product for this category')]
    public ?array $featuredProduct = null;
}
