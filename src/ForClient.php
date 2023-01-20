<?php

namespace NeoanIo\MarketPlace\Broadcast;

use Neoan3\Apps\Stateless;

class ForClient
{
    private string $room;
    private array $body;

    private string|int $id;

    public function __construct()
    {
        Stateless::setSecret($_ENV['JWT_SECRET']);
    }

    public function toRoom(string $room): static
    {
        $this->room = $room;
        return $this;
    }
    public function withId(string|int $id): static
    {
        $this->id = $id;
        return $this;
    }

    public function broadcast(): array
    {
        $identifier = $this->room . '-' . time();
        return [
            ...$this->body,
            'lrs' => [
                'namespace' => '/entity/' . $this-> room . (isset($this->id) ? '/' . $this->id : ''),
                'token' => Stateless::assign($identifier, $this->room)
            ]
        ];
    }

    public static function wrapEntity(array $modelArray): static
    {
        $instance = new self();
        $instance->body = $modelArray;
        return $instance;
    }

    public static function exposeClient(): void
    {
        $stub = file_get_contents(__DIR__ . '/js/client.js');
        $stub = str_replace(
            ['[[server]]', '[[port]]'],
            [$_ENV['SOCKET_SERVER_URL'], $_ENV['SOCKET_SERVER_PORT']],
            $stub
        );
        header('Content-Type: text/javascript');
        echo $stub;
        exit();
    }
}