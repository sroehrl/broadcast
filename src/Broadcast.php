<?php

namespace NeoanIo\MarketPlace\Broadcast;

use Curl\Curl;
use Neoan3\Apps\Stateless;

class Broadcast
{
    private array $bodyData = [];
    private string $channel;
    private string|int $id;

    public function withBody(array $bodyData): static
    {
        $this->bodyData = $bodyData;
        return $this;
    }

    public function withId(string|int $id): static
    {
        $this->id = $id;
        return $this;
    }

    public function emit(): array
    {
        Stateless::setSecret($_ENV['JWT_SECRET']);
        $url = '//' . $_ENV['SOCKET_SERVER_URL'] . ':' . $_ENV['SOCKET_SERVER_PORT'] . '/broadcast/';
        $call = new Curl();
        $call->setHeader('Content-Type', 'application/json');
        $call->setHeader('Authorization', 'token ' . Stateless::assign('from-php', 'emitter'));
        $url = $url . $this->channel . (isset($this->id) ? '/' . $this->id : '');

        return [
            'result' => $call->post($url, $this->bodyData)
        ];
    }
    public static function toChannel(string $socketNamespace): static
    {
        $instance = new self();
        $instance->channel = $socketNamespace;
        return $instance;

    }
}