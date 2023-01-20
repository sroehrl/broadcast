<?php

namespace NeoanIo\MarketPlace\Broadcast;

use Composer\Script\Event;
class NpmInstall
{
    static function install(Event $event)
    {
        $composer = $event->getComposer();
        $root = dirname($composer->getConfig()->get('vendor-dir'));
        $composerFile = json_decode(file_get_contents($root . '/composer.json'), true);

        $targetPackageFile = self::readJson(
            file_exists($root . '/package.json') ? $root . '/package.json' :
                __DIR__ . '/js/package.json'
        );
        $serverExecutable = __DIR__ . '/js/index.js';
        $targetPackageFile['scripts']['socket-server'] = 'cross-env ENV_PATH=./.env node ' . $serverExecutable;

        foreach ($composerFile['extra']['npm'] as $package => $version){
            $targetPackageFile['dependencies'][$package] = $version;
        }
        $result = json_encode($targetPackageFile);
        file_put_contents($root . '/package.json', $result);

    }
    private static function readJson(string $path): array
    {
        return json_decode(file_get_contents($path),true);
    }
}