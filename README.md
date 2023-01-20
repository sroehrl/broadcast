# 3-way data-binding with PHP & socket.io

Keep multiple clients & your database in sync!

Designed for [LENKRAD](https://lenkrad.neoan3.rocks), but agnostic enough to be used in any framework.

## Installation

`composer require neoan.io/broadcast`

## Setup

### Required environment variables

- JWT_SECRET (your encryption key)
- SOCKET_SERVER_PORT (e.g. 3000)
- SOCKET_SERVER_URL (e.g. "localhost")