<?php

/**
 * Maho
 *
 * @package    MahoCLI_Commands
 * @copyright  Copyright (c) 2024-2026 Maho (https://mahocommerce.com)
 * @license    https://opensource.org/licenses/osl-3.0.php  Open Software License (OSL 3.0)
 */

declare(strict_types=1);

namespace MahoCLI\Commands;

use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Process\Process;

#[AsCommand(
    name: 'storefront:build',
    description: 'Build storefront CSS and JS using Bun',
)]
class StorefrontBuild extends BaseMahoCommand
{
    private const BUN_DIR = '.bun/bin';
    private const BUN_BINARY = 'bun';

    #[\Override]
    protected function configure(): void
    {
        $this
            ->addOption('path', 'p', InputOption::VALUE_REQUIRED, 'Storefront project path')
            ->addOption('css-only', null, InputOption::VALUE_NONE, 'Only build CSS')
            ->addOption('js-only', null, InputOption::VALUE_NONE, 'Only build JS')
            ->addOption('install', 'i', InputOption::VALUE_NONE, 'Run bun install first')
            ->addOption('deploy', 'd', InputOption::VALUE_NONE, 'Deploy to Cloudflare Workers after build')
            ->addOption('update-bun', null, InputOption::VALUE_NONE, 'Force re-download of Bun binary');
    }

    #[\Override]
    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $storefrontPath = $this->resolveStorefrontPath($input);
        if ($storefrontPath === null) {
            $output->writeln('<error>Could not find storefront project. Use --path or set STOREFRONT_PATH env var.</error>');
            return Command::FAILURE;
        }

        if (!file_exists($storefrontPath . '/package.json')) {
            $output->writeln("<error>No package.json found in {$storefrontPath}</error>");
            return Command::FAILURE;
        }

        $output->writeln("<info>Storefront path:</info> {$storefrontPath}");

        // Ensure Bun binary
        if ($input->getOption('update-bun')) {
            $bunDir = $storefrontPath . '/' . self::BUN_DIR;
            if (is_file($bunDir . '/' . self::BUN_BINARY)) {
                unlink($bunDir . '/' . self::BUN_BINARY);
            }
        }

        $bun = $this->findBun($storefrontPath);
        if ($bun === null) {
            $output->writeln('<comment>Bun not found. Downloading...</comment>');
            $bun = $this->downloadBun($storefrontPath, $output);
            if ($bun === null) {
                $output->writeln('<error>Failed to download Bun.</error>');
                return Command::FAILURE;
            }
        }

        $output->writeln("<info>Using Bun:</info> {$bun}");

        // bun install
        if ($input->getOption('install')) {
            $output->writeln('');
            $output->writeln('<info>Running bun install...</info>');
            if (!$this->runBun($bun, $storefrontPath, ['install'], $output)) {
                $output->writeln('<error>bun install failed.</error>');
                return Command::FAILURE;
            }
        }

        // Build
        $cssOnly = $input->getOption('css-only');
        $jsOnly = $input->getOption('js-only');
        $buildCss = !$jsOnly;
        $buildJs = !$cssOnly;

        if ($cssOnly && $jsOnly) {
            $output->writeln('<comment>Both --css-only and --js-only specified, building both.</comment>');
            $buildCss = true;
            $buildJs = true;
        }

        if ($buildCss) {
            $output->writeln('');
            $output->writeln('<info>Building CSS...</info>');
            if (!$this->runBun($bun, $storefrontPath, ['run', 'build:css'], $output)) {
                $output->writeln('<error>CSS build failed.</error>');
                return Command::FAILURE;
            }
            $this->reportFileSize($output, $storefrontPath . '/public/styles.css', 'CSS');
        }

        if ($buildJs) {
            $output->writeln('');
            $output->writeln('<info>Building JS...</info>');
            if (!$this->runBun($bun, $storefrontPath, ['run', 'build:js'], $output)) {
                $output->writeln('<error>JS build failed.</error>');
                return Command::FAILURE;
            }
            $this->reportFileSize($output, $storefrontPath . '/public/controllers.js.txt', 'JS');
        }

        // Deploy
        if ($input->getOption('deploy')) {
            $output->writeln('');
            $output->writeln('<info>Deploying to Cloudflare Workers...</info>');

            $wranglerConfig = $storefrontPath . '/wrangler.demo-only.toml';
            if (!file_exists($wranglerConfig)) {
                $output->writeln('<error>Missing wrangler.demo-only.toml in storefront directory.</error>');
                return Command::FAILURE;
            }

            $cfCredentials = $this->parseDeployCredentials($storefrontPath);
            $cfEnv = array_merge(getenv(), array_filter([
                'CLOUDFLARE_API_KEY' => $cfCredentials['apiKey'],
                'CLOUDFLARE_EMAIL' => $cfCredentials['email'],
            ]));

            if (!$this->runBun($bun, $storefrontPath, ['x', 'wrangler', 'deploy', '-c', 'wrangler.demo-only.toml'], $output, $cfEnv)) {
                $output->writeln('<error>Deploy failed.</error>');
                return Command::FAILURE;
            }

            // Purge edge cache
            $output->writeln('');
            $output->writeln('<info>Purging edge cache...</info>');
            if ($this->purgeCloudflareCache($cfCredentials, $output)) {
                $output->writeln('<info>Cache purged successfully.</info>');
            } else {
                $output->writeln('<comment>Cache purge failed — you may need to purge manually.</comment>');
            }
        }

        $output->writeln('');
        $output->writeln('<info>Build complete.</info>');
        return Command::SUCCESS;
    }

    private function resolveStorefrontPath(InputInterface $input): ?string
    {
        // 1. Explicit --path option
        $path = $input->getOption('path');
        if ($path !== null) {
            $resolved = realpath($path);
            if ($resolved === false || !is_dir($resolved)) {
                return null;
            }
            return $resolved;
        }

        // 2. Environment variable
        $envPath = getenv('STOREFRONT_PATH');
        if ($envPath !== false && $envPath !== '') {
            $resolved = realpath($envPath);
            if ($resolved !== false && is_dir($resolved)) {
                return $resolved;
            }
        }

        // 3. Auto-detect relative to web root
        $webRoot = getcwd() ?: dirname(__DIR__, 3);
        $candidate = dirname($webRoot) . '/maho-storefront';
        if (is_dir($candidate)) {
            return $candidate;
        }

        return null;
    }

    private function findBun(string $storefrontPath): ?string
    {
        // 1. Project-local
        $local = $storefrontPath . '/' . self::BUN_DIR . '/' . self::BUN_BINARY;
        if (is_executable($local)) {
            return $local;
        }

        // 2. System PATH
        $process = new Process(['which', 'bun']);
        $process->run();
        $which = trim($process->getOutput());
        if ($which !== '' && is_executable($which)) {
            return $which;
        }

        return null;
    }

    private function downloadBun(string $storefrontPath, OutputInterface $output): ?string
    {
        $artifact = $this->getBunArtifactName();
        if ($artifact === null) {
            $output->writeln('<error>Unsupported platform: ' . php_uname('s') . ' ' . php_uname('m') . '</error>');
            return null;
        }

        $url = "https://github.com/oven-sh/bun/releases/latest/download/{$artifact}";
        $output->writeln("Downloading <comment>{$artifact}</comment> from GitHub...");

        $targetDir = $storefrontPath . '/' . self::BUN_DIR;
        $targetBin = $targetDir . '/' . self::BUN_BINARY;
        $zipPath = sys_get_temp_dir() . '/' . $artifact;

        // Stream download to disk (Bun zip is ~50MB)
        $context = stream_context_create([
            'http' => [
                'follow_location' => true,
                'timeout' => 120,
                'header' => "User-Agent: MahoCLI/1.0\r\n",
            ],
        ]);

        $stream = @fopen($url, 'r', false, $context);
        if ($stream === false) {
            $output->writeln('<error>Download failed from: ' . $url . '</error>');
            return null;
        }

        $fp = fopen($zipPath, 'w');
        $bytes = stream_copy_to_stream($stream, $fp);
        fclose($stream);
        fclose($fp);

        if ($bytes === false || $bytes === 0) {
            $output->writeln('<error>Download failed — no data received.</error>');
            @unlink($zipPath);
            return null;
        }

        $output->writeln('Downloaded ' . $this->humanReadableSize($bytes));

        // Extract
        $zip = new \ZipArchive();
        if ($zip->open($zipPath) !== true) {
            $output->writeln('<error>Failed to open zip archive.</error>');
            unlink($zipPath);
            return null;
        }

        // Find the bun binary inside the zip (it's usually in a subdirectory)
        $bunEntry = null;
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $name = $zip->getNameIndex($i);
            if ($name !== false && basename($name) === 'bun' && !str_ends_with($name, '/')) {
                $bunEntry = $name;
                break;
            }
        }

        if ($bunEntry === null) {
            $output->writeln('<error>Could not find bun binary in archive.</error>');
            $zip->close();
            unlink($zipPath);
            return null;
        }

        $bunData = $zip->getFromName($bunEntry);
        $zip->close();
        unlink($zipPath);

        if ($bunData === false) {
            $output->writeln('<error>Failed to extract bun binary.</error>');
            return null;
        }

        // Write binary
        if (!is_dir($targetDir)) {
            if (!@mkdir($targetDir, 0755, true)) {
                $output->writeln("<error>Cannot create directory: {$targetDir}</error>");
                $output->writeln('<comment>Check file permissions — the storefront directory must be writable.</comment>');
                return null;
            }
        }

        if (@file_put_contents($targetBin, $bunData) === false) {
            $output->writeln("<error>Cannot write to: {$targetBin}</error>");
            return null;
        }
        chmod($targetBin, 0755);

        // Verify
        $process = new Process([$targetBin, '--version']);
        $process->setTimeout(10);
        $process->run();
        $version = trim($process->getOutput());

        if (!preg_match('/^\d+\.\d+/', $version)) {
            $output->writeln('<error>Bun binary verification failed: ' . ($version ?: $process->getErrorOutput() ?: 'no output') . '</error>');
            @unlink($targetBin);
            return null;
        }

        $output->writeln("Installed Bun <info>{$version}</info> to {$targetDir}");
        return $targetBin;
    }

    private function getBunArtifactName(): ?string
    {
        $os = php_uname('s');
        $arch = php_uname('m');

        $platform = match ($os) {
            'Linux' => 'linux',
            'Darwin' => 'darwin',
            default => null,
        };

        if ($platform === null) {
            return null;
        }

        $cpuArch = match ($arch) {
            'x86_64', 'amd64' => 'x64',
            'aarch64', 'arm64' => 'aarch64',
            default => null,
        };

        if ($cpuArch === null) {
            return null;
        }

        return "bun-{$platform}-{$cpuArch}.zip";
    }

    private function runBun(string $bun, string $cwd, array $args, OutputInterface $output, array $env = []): bool
    {
        $process = new Process([$bun, ...$args], $cwd, $env ?: null);
        $process->setTimeout(120);
        $process->run(function (string $type, string $buffer) use ($output): void {
            $output->write($buffer);
        });
        return $process->isSuccessful();
    }

    /**
     * Parse CF credentials from deploy.sh in the storefront directory.
     *
     * @return array{apiKey: ?string, email: ?string, zoneId: ?string}
     */
    private function parseDeployCredentials(string $storefrontPath): array
    {
        $result = ['apiKey' => null, 'email' => null, 'zoneId' => null];
        $deployScript = $storefrontPath . '/deploy.sh';

        if (!file_exists($deployScript)) {
            return $result;
        }

        $contents = file_get_contents($deployScript);

        if (preg_match('/CLOUDFLARE_API_KEY="([^"]+)"/', $contents, $m)) {
            $result['apiKey'] = $m[1];
        }
        if (preg_match('/CLOUDFLARE_EMAIL="([^"]+)"/', $contents, $m)) {
            $result['email'] = $m[1];
        }
        if (preg_match('/ZONE_ID="([^"]+)"/', $contents, $m)) {
            $result['zoneId'] = $m[1];
        }

        return $result;
    }

    /**
     * @param array{apiKey: ?string, email: ?string, zoneId: ?string} $credentials
     */
    private function purgeCloudflareCache(array $credentials, OutputInterface $output): bool
    {
        if (!$credentials['apiKey'] || !$credentials['email'] || !$credentials['zoneId']) {
            $output->writeln('<comment>Missing CF credentials — cannot purge cache.</comment>');
            return false;
        }

        $hosts = ['demo.mageaustralia.com.au', 'demo2.mageaustralia.com.au', 'demo3.mageaustralia.com.au', 'cafe.mageaustralia.com.au'];

        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'timeout' => 15,
                'header' => implode("\r\n", [
                    "X-Auth-Email: {$credentials['email']}",
                    "X-Auth-Key: {$credentials['apiKey']}",
                    'Content-Type: application/json',
                ]),
                'content' => json_encode(['hosts' => $hosts]),
            ],
        ]);

        $response = @file_get_contents(
            "https://api.cloudflare.com/client/v4/zones/{$credentials['zoneId']}/purge_cache",
            false,
            $context,
        );

        if ($response === false) {
            return false;
        }

        $data = json_decode($response, true);
        return ($data['success'] ?? false) === true;
    }

    private function reportFileSize(OutputInterface $output, string $filePath, string $label): void
    {
        if (file_exists($filePath)) {
            $size = $this->humanReadableSize((int) filesize($filePath));
            $output->writeln("<info>{$label} built:</info> {$filePath} ({$size})");
        }
    }
}
