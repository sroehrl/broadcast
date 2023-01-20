# 3-way data-binding with PHP & socket.io

Keep multiple clients & your database in sync!

Designed for [LENKRAD](https://lenkrad.neoan3.rocks), but agnostic enough to be used in any framework.

> Make any database a live-database

## Installation

### 1. install package

 `composer require neoan.io/broadcast`

### 2. Add required ENV-variables to your .env
   - JWT_SECRET (your encryption key)
   - SOCKET_SERVER_PORT (e.g. 3000)
   - SOCKET_SERVER_URL (e.g. "localhost")

### 3. Add the following script to your composer.json
```json
...
"scripts": {
  "install-socket": "NeoanIo\\MarketPlace\\Broadcast\\NpmHandler::package"
}
...
```
### 4. Run said script

`composer run install-socket` 

### 5. Install required node packages

`yarn install` or `npm install`

### 6. Test socket-server

`yarn sockert-server` or `npm run socket-server`

## Setup

### Client functionality

This package includes a client-library to automate synchronization with your database.
In LENKRAD, you would typically expose the library via a route:

```php
<?php

namespace App\Socket;

use Neoan\Routing\Attributes\Get;
use Neoan\Routing\Interfaces\Routable;
use NeoanIo\MarketPlace\Broadcast\ForClient;

// exposes the client-library to the path /client.js
#[Get('/client.js')]
class Client implements Routable
{
    public function __invoke(): void
    {
        // This will deliver a generated JS-file 
        ForClient::exposeClient();
    }
}

```

And then use it in whatever capacity you need at the front-end:

```html
<script type="module" async>
    import {SyncEntity, HTMLBinder} from "/client.js";
</script>

```

### Backend

Two things need to happen in order for the synchronization to work.
Firstly, a returned entity must expose the socket-information (including auth).
We can achieve this with `ForClient::wrapEntity`. A typical API-route
could look like this:

```php 
<?php

namespace App\Note;

use Neoan\Request\Request;
use Neoan\Routing\Attributes\Get;
use Neoan\Routing\Interfaces\Routable;
use NeoanIo\MarketPlace\Broadcast\ForClient;

#[Get('/api/note/:id')]
class GetNote implements Routable
{
    public function __invoke(): array
    {
        // retrieving a single record
        $model = NoteModel::get(Request::getParameter('id'));

        // wrapping the record 
        return ForClient::wrapEntity($model->toArray())
            ->toRoom('notes')
            ->withId($model->id)
            ->broadcast();

    }
}
```

Next, we want to set a hook for whenever the model is written to.
In LENKRAD, we can use the `Model::afterStore` method to achieve this.
Our Note-model could look like this:

```php
<?php

namespace App\Note;

use NeoanIo\MarketPlace\Broadcast\Broadcast;
use Neoan\Model\Attributes\IsPrimaryKey;
use Neoan\Model\Attributes\Type;
use Neoan\Model\Model;

class NoteModel extends Model
{
    #[IsPrimaryKey]
    public int $id;

    #[Type('MEDIUMTEXT')]
    public string $content;

    // will fire whenever the model is saved to the database
    protected function afterStore(): void
    {
        // this broadcasts updates to the socket server
        Broadcast::toChannel('notes')
            ->withId($this->id)
            ->withBody($this->toArray())
            ->emit();
    }

}
```
We don't have to worry about any specific code in our update routes.
Given the example, it could look like this:

```php
<?php

namespace App\Note;

use Neoan\Request\Request;
use Neoan\Routing\Attributes\Put;
use Neoan\Routing\Interfaces\Routable;

#[Put('/api/note/:id')]
class PutNote implements Routable
{
    public function __invoke(): NoteModel
    {
        $find = NoteModel::get(Request::getParameter('id'));
        $find->content = Request::getInput('content');
        return $find->store();
    }
}
```

## Frontend usage

```javascript
// taken from earlier example
import {SyncEntity, HTMLBinder} from "/client.js";

// allow for programmatic updates on any change (without event)
// careful: this produces a lot of traffic and is usually not necessary)
let updateOnAnyChange = true;

// SyncEntity grabs the wrapped entity via GET
// (the PUT-request needs ot be in the same format)
// SyncEntity returns a proxy triggering PUT-requests as needed,
// and receiving updates via socket alike!
let note = await SyncEntity('/api/note/1', updateOnAnyChange)

// if `updateOnAnyChange` is true, every change will be broadcasted
setTimeout(()=> {
    note.content += '!';
    updateOnAnyChange = false;
}, 1000)

// however, we usually want to trigger on specific events
const binder = new HTMLBinder(note)
// e.g. on form submission

binder.toForm('#my-form')

// or directly on the element-level

binder.toElements({
    '#my-input':{
        property: 'content',
        event: 'blur'
    }
})



```

## Acknowledgements

The proxy-logic is based on a modified version of Sindre Sorhus' [on-change](https://github.com/sindresorhus/on-change).
Make sure to leave a star ;-)