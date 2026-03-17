<?php

/**
 * Maho
 *
 * @package    MahoCLI
 * @copyright  Copyright (c) 2026 Maho (https://mahocommerce.com)
 * @license    https://opensource.org/licenses/osl-3.0.php  Open Software License (OSL 3.0)
 */

declare(strict_types=1);

namespace MahoCLI\Commands;

use Mage;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'storefront:theme:import',
    description: 'Import a theme package into the Maho Storefront',
)]
class StorefrontThemeImport extends BaseMahoCommand
{
    private const STOREFRONT_DIR = '/var/www/maho.tenniswarehouse.com.au/maho-storefront';
    private const MEDIA_DIR = '/var/www/maho.tenniswarehouse.com.au/web/public/media';

    private SymfonyStyle $io;

    #[\Override]
    protected function configure(): void
    {
        $this
            ->addArgument('path', InputArgument::REQUIRED, 'Path to the theme package directory')
            ->addOption('store', 's', InputOption::VALUE_REQUIRED, 'Target store ID', '0')
            ->addOption('no-sync', null, InputOption::VALUE_NONE, 'Skip storefront sync trigger')
            ->addOption('deploy', null, InputOption::VALUE_NONE, 'Also deploy the Cloudflare Worker')
            ->addOption('dry-run', null, InputOption::VALUE_NONE, 'Show what would be done without making changes')
            ->addOption('no-backup', null, InputOption::VALUE_NONE, 'Skip backing up current theme files');
    }

    #[\Override]
    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $this->initMaho();
        $this->io = new SymfonyStyle($input, $output);
        $this->io->title('Storefront Theme Import');

        $packagePath = realpath($input->getArgument('path'));
        $storeId = (int) $input->getOption('store');
        $dryRun = (bool) $input->getOption('dry-run');
        $noSync = (bool) $input->getOption('no-sync');
        $deploy = (bool) $input->getOption('deploy');
        $noBackup = (bool) $input->getOption('no-backup');

        if ($dryRun) {
            $this->io->note('DRY RUN — no changes will be made');
        }

        // Step 1: Validate package
        $manifest = $this->validatePackage($packagePath);
        if ($manifest === null) {
            return Command::FAILURE;
        }

        $this->io->success("Package validated: {$manifest['name']} v{$manifest['version']}");
        if (!empty($manifest['description'])) {
            $this->io->text("  {$manifest['description']}");
        }

        // Show summary of what will be imported
        $this->printImportSummary($manifest, $packagePath);

        if ($dryRun) {
            $this->io->note('Dry run complete — no changes were made');
            return Command::SUCCESS;
        }

        // Step 2: Backup current theme
        if (!$noBackup) {
            $this->backupCurrentTheme($output);
        }

        $errors = 0;

        // Step 3: Copy styles.css
        $errors += $this->copyStylesCss($packagePath) ? 0 : 1;

        // Step 4: Copy theme.json
        $errors += $this->copyThemeJson($packagePath) ? 0 : 1;

        // Step 5: Copy images
        $errors += $this->copyImages($manifest, $packagePath) ? 0 : 1;

        // Step 6: Import CMS blocks
        if (!empty($manifest['cmsBlocks'])) {
            $errors += $this->importCmsBlocks($manifest, $packagePath, $storeId) ? 0 : 1;
        }

        // Step 7: Import CMS pages
        if (!empty($manifest['cmsPages'])) {
            $errors += $this->importCmsPages($manifest, $packagePath, $storeId) ? 0 : 1;
        }

        // Step 8: Assign category images
        if (!empty($manifest['categoryImages'])) {
            $errors += $this->assignCategoryImages($manifest, $packagePath) ? 0 : 1;
        }

        // Step 8b: Import product images
        if (!empty($manifest['productImages'])) {
            $errors += $this->importProductImages($manifest, $packagePath) ? 0 : 1;
        }

        // Step 9: Apply config overrides
        $configFile = $packagePath . '/config.json';
        if (file_exists($configFile)) {
            $errors += $this->applyConfigOverrides($configFile, $storeId) ? 0 : 1;
        }

        // Step 10: Post-import
        $this->postImport($noSync, $deploy, $output);

        if ($errors > 0) {
            $this->io->warning("Import completed with {$errors} error(s) — check output above");
            return Command::FAILURE;
        }

        $this->io->success('Theme imported successfully!');
        return Command::SUCCESS;
    }

    private function validatePackage(string|false $packagePath): ?array
    {
        if ($packagePath === false || !is_dir($packagePath)) {
            $this->io->error('Package path does not exist or is not a directory');
            return null;
        }

        $manifestFile = $packagePath . '/manifest.json';
        if (!file_exists($manifestFile)) {
            $this->io->error('manifest.json not found in package directory');
            return null;
        }

        $manifest = json_decode(file_get_contents($manifestFile), true);
        if (!is_array($manifest)) {
            $this->io->error('manifest.json is not valid JSON');
            return null;
        }

        // Required fields
        foreach (['name', 'version'] as $field) {
            if (empty($manifest[$field])) {
                $this->io->error("manifest.json missing required field: {$field}");
                return null;
            }
        }

        // Required files
        if (!file_exists($packagePath . '/styles.css')) {
            $this->io->error('styles.css not found in package directory');
            return null;
        }

        if (!file_exists($packagePath . '/theme.json')) {
            $this->io->error('theme.json not found in package directory');
            return null;
        }

        // Validate referenced files exist
        $missing = [];

        if (!empty($manifest['logo']) && !file_exists($packagePath . '/' . $manifest['logo'])) {
            $missing[] = $manifest['logo'];
        }

        foreach ($manifest['categoryImages'] ?? [] as $urlKey => $imagePath) {
            if (!file_exists($packagePath . '/' . $imagePath)) {
                $missing[] = $imagePath;
            }
        }

        foreach ($manifest['productImages'] ?? [] as $sku => $imagePath) {
            if (!file_exists($packagePath . '/' . $imagePath)) {
                $missing[] = $imagePath;
            }
        }

        foreach ($manifest['cmsBlocks'] ?? [] as $id => $block) {
            $file = $block['file'] ?? '';
            if ($file && !file_exists($packagePath . '/' . $file)) {
                $missing[] = $file;
            }
        }

        foreach ($manifest['cmsPages'] ?? [] as $id => $page) {
            $file = $page['file'] ?? '';
            if ($file && !file_exists($packagePath . '/' . $file)) {
                $missing[] = $file;
            }
        }

        if (!empty($missing)) {
            $this->io->error('The following files referenced in manifest.json are missing:');
            $this->io->listing($missing);
            return null;
        }

        return $manifest;
    }

    private function printImportSummary(array $manifest, string $packagePath): void
    {
        $this->io->section('Import Summary');

        $rows = [];
        $rows[] = ['styles.css', 'Replace storefront CSS'];
        $rows[] = ['theme.json', 'Replace design tokens'];

        if (!empty($manifest['logo'])) {
            $rows[] = ['Logo', $manifest['logo']];
        }

        $categoryCount = count($manifest['categoryImages'] ?? []);
        if ($categoryCount > 0) {
            $rows[] = ['Category images', "{$categoryCount} image(s)"];
        }

        $productImageCount = count($manifest['productImages'] ?? []);
        if ($productImageCount > 0) {
            $rows[] = ['Product images', "{$productImageCount} product(s)"];
        }

        $blockCount = count($manifest['cmsBlocks'] ?? []);
        if ($blockCount > 0) {
            $identifiers = implode(', ', array_keys($manifest['cmsBlocks']));
            $rows[] = ['CMS blocks', "{$blockCount}: {$identifiers}"];
        }

        $pageCount = count($manifest['cmsPages'] ?? []);
        if ($pageCount > 0) {
            $identifiers = implode(', ', array_keys($manifest['cmsPages']));
            $rows[] = ['CMS pages', "{$pageCount}: {$identifiers}"];
        }

        if (file_exists($packagePath . '/config.json')) {
            $config = json_decode(file_get_contents($packagePath . '/config.json'), true);
            $configCount = is_array($config) ? count($config) : 0;
            $rows[] = ['Config overrides', "{$configCount} setting(s)"];
        }

        $this->io->table(['Asset', 'Action'], $rows);
    }

    private function backupCurrentTheme(OutputInterface $output): void
    {
        $timestamp = date('Ymd_His');

        $stylesSrc = self::STOREFRONT_DIR . '/public/styles.css';
        if (file_exists($stylesSrc)) {
            $backupPath = $stylesSrc . ".bak.{$timestamp}";
            copy($stylesSrc, $backupPath);
            if ($output->isVerbose()) {
                $this->io->text('  Backed up styles.css → ' . basename($backupPath));
            }
        }

        $themeSrc = self::STOREFRONT_DIR . '/theme.json';
        if (file_exists($themeSrc)) {
            $backupPath = $themeSrc . ".bak.{$timestamp}";
            copy($themeSrc, $backupPath);
            if ($output->isVerbose()) {
                $this->io->text('  Backed up theme.json → ' . basename($backupPath));
            }
        }

        $this->io->text('Current theme backed up');
    }

    private function copyStylesCss(string $packagePath): bool
    {
        $src = $packagePath . '/styles.css';
        $dest = self::STOREFRONT_DIR . '/public/styles.css';

        if (!copy($src, $dest)) {
            $this->io->error('Failed to copy styles.css');
            return false;
        }

        $this->io->text('styles.css replaced');
        return true;
    }

    private function copyThemeJson(string $packagePath): bool
    {
        $src = $packagePath . '/theme.json';
        $dest = self::STOREFRONT_DIR . '/theme.json';

        if (!copy($src, $dest)) {
            $this->io->error('Failed to copy theme.json');
            return false;
        }

        $this->io->text('theme.json replaced');
        return true;
    }

    private function copyImages(array $manifest, string $packagePath): bool
    {
        $success = true;

        // Copy logo (auto-convert to webp)
        if (!empty($manifest['logo'])) {
            $src = $packagePath . '/' . $manifest['logo'];
            $destDir = self::MEDIA_DIR . '/wysiwyg/theme';
            if (!is_dir($destDir)) {
                mkdir($destDir, 0755, true);
            }

            $ext = strtolower(pathinfo($src, PATHINFO_EXTENSION));
            if ($ext !== 'webp' && $ext !== 'svg') {
                $webpFile = $this->convertToWebp($src);
                if ($webpFile !== null) {
                    $filename = pathinfo(basename($manifest['logo']), PATHINFO_FILENAME) . '.webp';
                    $dest = $destDir . '/' . $filename;
                    if (copy($webpFile, $dest)) {
                        $this->io->text("  Logo → media/wysiwyg/theme/{$filename} (converted to webp)");
                        @unlink($webpFile);
                    } else {
                        $this->io->error("Failed to copy logo: {$manifest['logo']}");
                        $success = false;
                    }
                } else {
                    // Fall through to raw copy if conversion fails
                    $dest = $destDir . '/' . basename($manifest['logo']);
                    if (copy($src, $dest)) {
                        $this->io->text('  Logo → media/wysiwyg/theme/' . basename($manifest['logo']));
                    } else {
                        $this->io->error("Failed to copy logo: {$manifest['logo']}");
                        $success = false;
                    }
                }
            } else {
                // SVG or already webp — copy as-is
                $dest = $destDir . '/' . basename($manifest['logo']);
                if (copy($src, $dest)) {
                    $this->io->text('  Logo → media/wysiwyg/theme/' . basename($manifest['logo']));
                } else {
                    $this->io->error("Failed to copy logo: {$manifest['logo']}");
                    $success = false;
                }
            }
        }

        // Copy category images (auto-convert to webp)
        foreach ($manifest['categoryImages'] ?? [] as $urlKey => $imagePath) {
            $src = $packagePath . '/' . $imagePath;
            $destDir = self::MEDIA_DIR . '/catalog/category';
            if (!is_dir($destDir)) {
                mkdir($destDir, 0755, true);
            }

            $ext = strtolower(pathinfo($src, PATHINFO_EXTENSION));
            if ($ext !== 'webp') {
                $webpFile = $this->convertToWebp($src);
                if ($webpFile !== null) {
                    $filename = pathinfo(basename($imagePath), PATHINFO_FILENAME) . '.webp';
                    $dest = $destDir . '/' . $filename;
                    if (copy($webpFile, $dest)) {
                        $this->io->text("  Category image ({$urlKey}) → media/catalog/category/{$filename} (converted to webp)");
                        @unlink($webpFile);
                    } else {
                        $this->io->error("Failed to copy category image: {$imagePath}");
                        $success = false;
                    }
                    continue;
                }
                // Fall through to raw copy if conversion fails
            }

            $filename = basename($imagePath);
            $dest = $destDir . '/' . $filename;
            if (copy($src, $dest)) {
                $this->io->text("  Category image ({$urlKey}) → media/catalog/category/{$filename}");
            } else {
                $this->io->error("Failed to copy category image: {$imagePath}");
                $success = false;
            }
        }

        // Copy any other images in the images/ directory to wysiwyg/theme/
        $imagesDir = $packagePath . '/images';
        if (is_dir($imagesDir)) {
            $destDir = self::MEDIA_DIR . '/wysiwyg/theme';
            if (!is_dir($destDir)) {
                mkdir($destDir, 0755, true);
            }

            $iterator = new \DirectoryIterator($imagesDir);
            foreach ($iterator as $file) {
                if ($file->isDot() || !$file->isFile()) {
                    continue;
                }
                $filename = $file->getFilename();
                // Skip logo (already copied) and category images (handled separately)
                $categoryFiles = array_map('basename', $manifest['categoryImages'] ?? []);
                if (!empty($manifest['logo']) && $filename === basename($manifest['logo'])) {
                    continue;
                }
                if (in_array($filename, $categoryFiles)) {
                    continue;
                }
                // Auto-convert to webp (skip SVGs)
                $ext = strtolower($file->getExtension());
                if ($ext !== 'webp' && $ext !== 'svg' && in_array($ext, ['png', 'jpg', 'jpeg', 'gif'])) {
                    $webpFile = $this->convertToWebp($file->getPathname());
                    if ($webpFile !== null) {
                        $webpFilename = pathinfo($filename, PATHINFO_FILENAME) . '.webp';
                        $dest = $destDir . '/' . $webpFilename;
                        if (copy($webpFile, $dest)) {
                            $this->io->text("  Image → media/wysiwyg/theme/{$webpFilename} (converted to webp)");
                            @unlink($webpFile);
                        } else {
                            $this->io->error("Failed to copy image: {$filename}");
                            $success = false;
                        }
                        continue;
                    }
                    // Fall through to raw copy if conversion fails
                }
                $dest = $destDir . '/' . $filename;
                if (copy($file->getPathname(), $dest)) {
                    $this->io->text("  Image → media/wysiwyg/theme/{$filename}");
                } else {
                    $this->io->error("Failed to copy image: {$filename}");
                    $success = false;
                }
            }
        }

        return $success;
    }

    private function importCmsBlocks(array $manifest, string $packagePath, int $storeId): bool
    {
        $this->io->section('Importing CMS Blocks');
        $success = true;

        foreach ($manifest['cmsBlocks'] as $identifier => $blockDef) {
            $file = $packagePath . '/' . $blockDef['file'];
            $title = $blockDef['title'] ?? ucwords(str_replace('_', ' ', $identifier));
            $content = file_get_contents($file);

            if ($content === false) {
                $this->io->error("Failed to read CMS block file: {$blockDef['file']}");
                $success = false;
                continue;
            }

            try {
                $block = Mage::getModel('cms/block')->load($identifier, 'identifier');
                $isNew = !$block->getId();

                if ($isNew) {
                    $block->setIdentifier($identifier);
                    $block->setIsActive(1);
                }

                $block->setTitle($title);
                $block->setContent($content);
                $block->setStores([$storeId]);
                $block->save();

                $action = $isNew ? 'Created' : 'Updated';
                $this->io->text("  {$action} block: {$identifier} (ID: {$block->getId()})");
            } catch (\Exception $e) {
                $this->io->error("Failed to import CMS block '{$identifier}': {$e->getMessage()}");
                $success = false;
            }
        }

        return $success;
    }

    private function importCmsPages(array $manifest, string $packagePath, int $storeId): bool
    {
        $this->io->section('Importing CMS Pages');
        $success = true;

        foreach ($manifest['cmsPages'] as $identifier => $pageDef) {
            $file = $packagePath . '/' . $pageDef['file'];
            $title = $pageDef['title'] ?? ucwords(str_replace('-', ' ', $identifier));
            $content = file_get_contents($file);

            if ($content === false) {
                $this->io->error("Failed to read CMS page file: {$pageDef['file']}");
                $success = false;
                continue;
            }

            try {
                $page = Mage::getModel('cms/page');
                $pageId = $page->checkIdentifier($identifier, $storeId);

                if ($pageId) {
                    $page->load($pageId);
                } else {
                    $page->setIdentifier($identifier);
                    $page->setIsActive(1);
                    $page->setRootTemplate('one_column');
                }

                $page->setTitle($title);
                $page->setContent($content);
                $page->setStores([$storeId]);
                $page->save();

                $action = $pageId ? 'Updated' : 'Created';
                $this->io->text("  {$action} page: {$identifier} (ID: {$page->getId()})");
            } catch (\Exception $e) {
                $this->io->error("Failed to import CMS page '{$identifier}': {$e->getMessage()}");
                $success = false;
            }
        }

        return $success;
    }

    private function assignCategoryImages(array $manifest, string $packagePath): bool
    {
        $this->io->section('Assigning Category Images');
        $success = true;

        foreach ($manifest['categoryImages'] as $urlKey => $imagePath) {
            $filename = basename($imagePath);

            try {
                $category = Mage::getModel('catalog/category')->getCollection()
                    ->addAttributeToFilter('url_key', $urlKey)
                    ->setPageSize(1)
                    ->getFirstItem();

                if (!$category->getId()) {
                    $this->io->warning("Category not found for url_key: {$urlKey} — skipping image assignment");
                    continue;
                }

                $fullCategory = Mage::getModel('catalog/category')->load($category->getId());
                $fullCategory->setImage($filename)->save();
                $this->io->text("  Assigned {$filename} → category '{$fullCategory->getName()}' (ID: {$fullCategory->getId()})");
            } catch (\Exception $e) {
                $this->io->error("Failed to assign category image for '{$urlKey}': {$e->getMessage()}");
                $success = false;
            }
        }

        return $success;
    }

    private function applyConfigOverrides(string $configFile, int $storeId): bool
    {
        $this->io->section('Applying Config Overrides');

        $config = json_decode(file_get_contents($configFile), true);
        if (!is_array($config)) {
            $this->io->error('config.json is not valid JSON');
            return false;
        }

        $success = true;
        $scope = $storeId === 0 ? 'default' : 'stores';

        foreach ($config as $path => $value) {
            try {
                Mage::getConfig()->saveConfig($path, $value, $scope, $storeId);
                $this->io->text("  Set {$path} = {$value}");
            } catch (\Exception $e) {
                $this->io->error("Failed to set config '{$path}': {$e->getMessage()}");
                $success = false;
            }
        }

        return $success;
    }

    /**
     * Convert an image to webp format using GD
     *
     * @return string|null Path to webp file, or null on failure
     */
    private function convertToWebp(string $sourcePath, int $quality = 85): ?string
    {
        $ext = strtolower(pathinfo($sourcePath, PATHINFO_EXTENSION));
        if ($ext === 'webp') {
            return $sourcePath; // Already webp
        }

        $image = match ($ext) {
            'png' => @imagecreatefrompng($sourcePath),
            'jpg', 'jpeg' => @imagecreatefromjpeg($sourcePath),
            'gif' => @imagecreatefromgif($sourcePath),
            default => false,
        };

        if ($image === false) {
            return null;
        }

        // Preserve transparency for PNG
        if ($ext === 'png') {
            imagepalettetotruecolor($image);
            imagealphablending($image, true);
            imagesavealpha($image, true);
        }

        $webpPath = preg_replace('/\.[^.]+$/', '.webp', $sourcePath);
        if (!imagewebp($image, $webpPath, $quality)) {
            imagedestroy($image);
            return null;
        }

        imagedestroy($image);
        return $webpPath;
    }

    /**
     * Import product images from the theme package
     *
     * Manifest format:
     *   "productImages": {
     *     "SKU-001": "images/products/product-one.png",
     *     "SKU-002": "images/products/product-two.jpg"
     *   }
     *
     * Images are auto-converted to webp and imported via addImageToMediaGallery()
     */
    private function importProductImages(array $manifest, string $packagePath): bool
    {
        $this->io->section('Importing Product Images');
        $success = true;

        foreach ($manifest['productImages'] as $sku => $imagePath) {
            $srcFile = $packagePath . '/' . $imagePath;

            if (!file_exists($srcFile)) {
                $this->io->error("Image file not found: {$imagePath}");
                $success = false;
                continue;
            }

            // Load product by SKU
            $productId = Mage::getModel('catalog/product')->getIdBySku($sku);
            if (!$productId) {
                $this->io->warning("Product not found for SKU: {$sku} — skipping");
                continue;
            }

            $product = Mage::getModel('catalog/product')->load($productId);

            // Convert to webp if needed
            $importFile = $this->convertToWebp($srcFile);
            if ($importFile === null) {
                $this->io->error("Failed to convert image to webp: {$imagePath}");
                $success = false;
                continue;
            }

            $wasConverted = $importFile !== $srcFile;

            try {
                // Remove existing gallery images to avoid duplicates on re-import
                $mediaGallery = $product->getMediaGalleryImages();
                if ($mediaGallery && $mediaGallery->getSize() > 0) {
                    $mediaApi = Mage::getModel('catalog/product_attribute_media_api');
                    foreach ($mediaGallery as $image) {
                        try {
                            $mediaApi->remove($productId, $image->getFile());
                        } catch (\Exception $e) {
                            // Ignore removal errors
                        }
                    }
                }

                // Import via media gallery — handles file copy + sets all 3 image attributes
                $product->addImageToMediaGallery(
                    $importFile,
                    ['image', 'small_image', 'thumbnail'],
                    false,
                    false,
                );
                $product->save();

                $format = $wasConverted ? ' (converted to webp)' : '';
                $this->io->text("  {$sku} → {$product->getImage()}{$format}");

                // Clean up converted temp file
                if ($wasConverted && file_exists($importFile)) {
                    @unlink($importFile);
                }
            } catch (\Exception $e) {
                $this->io->error("Failed to import image for SKU '{$sku}': {$e->getMessage()}");
                $success = false;

                // Clean up on error too
                if ($wasConverted && file_exists($importFile)) {
                    @unlink($importFile);
                }
            }
        }

        return $success;
    }

    private function postImport(bool $noSync, bool $deploy, OutputInterface $output): void
    {
        $this->io->section('Post-Import');

        // Flush Maho cache
        try {
            Mage::app()->getCache()->clean();
            $this->io->text('Maho cache flushed');
        } catch (\Exception $e) {
            $this->io->warning("Cache flush failed: {$e->getMessage()}");
        }

        // Reset opcache
        if (function_exists('opcache_reset')) {
            opcache_reset();
            $this->io->text('OPcache reset');
        }

        // Trigger storefront sync
        if (!$noSync) {
            $syncScript = self::STOREFRONT_DIR . '/sync.sh';
            if (file_exists($syncScript)) {
                $this->io->text('Running storefront sync (cms + config)...');
                $cmd = sprintf('cd %s && bash sync.sh cms config 2>&1', escapeshellarg(self::STOREFRONT_DIR));
                exec($cmd, $syncOutput, $exitCode);

                if ($exitCode === 0) {
                    $this->io->text('Storefront sync completed');
                } else {
                    $this->io->warning('Storefront sync failed (exit code: ' . $exitCode . ')');
                    if ($output->isVerbose() && !empty($syncOutput)) {
                        $this->io->text(implode("\n", $syncOutput));
                    }
                }
            } else {
                $this->io->warning('sync.sh not found — skipping storefront sync');
            }
        } else {
            $this->io->text('Storefront sync skipped (--no-sync)');
        }

        // Deploy if requested
        if ($deploy) {
            $deployScript = self::STOREFRONT_DIR . '/deploy.sh';
            if (file_exists($deployScript)) {
                $this->io->text('Deploying Cloudflare Worker...');
                $cmd = sprintf('cd %s && bash deploy.sh 2>&1', escapeshellarg(self::STOREFRONT_DIR));
                exec($cmd, $deployOutput, $exitCode);

                if ($exitCode === 0) {
                    $this->io->text('Worker deployed successfully');
                } else {
                    $this->io->warning('Deploy failed (exit code: ' . $exitCode . ')');
                    if ($output->isVerbose() && !empty($deployOutput)) {
                        $this->io->text(implode("\n", $deployOutput));
                    }
                }
            } else {
                $this->io->warning('deploy.sh not found — skipping deployment');
            }
        }
    }
}
