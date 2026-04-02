<?php

declare(strict_types=1);

namespace MageAustralia\FilterablePages\Api\Resource;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\GetCollection;
use MageAustralia\FilterablePages\Api\State\Provider\FilterOptionProvider;

#[ApiResource(
    shortName: 'EnrichedFilter',
    description: 'Layered navigation filters enriched with clean SEO URLs',
    provider: FilterOptionProvider::class,
    operations: [
        new GetCollection(
            uriTemplate: '/enriched-filters',
            security: 'true',
            description: 'Get layered nav filters with clean URLs for options that have filterable pages',
        ),
    ],
)]
class FilterOption
{
    #[ApiProperty(identifier: true)]
    public string $code = '';

    public string $label = '';
    public string $type = 'select';
    public int $position = 0;

    /** @var list<array{value: string, label: string, count: int, url: string}> */
    public array $options = [];
}
