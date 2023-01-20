const router = require('express').Router()
const auth = require('./auth')

module.exports = io => {
    router.get('/', auth.phpAuthMiddleware, (req, res) => {
        res.send('Socket server running...')
    });

    router.post('/broadcast/:room/:id', (req, res) => {
        io.of(`/entity/${req.params.room}/${req.params.id}`).emit( 'update',req.body)
        res.json({
            request: 'received'
        })
    })

    router.get('/broadcast/:room', auth.phpAuthMiddleware, (req, res) => {
        // does room exist?
        io.of(`/entity/${req.params.room}`).emit( 'update',req.body)
        res.json({
            request: 'received'
        })
    })
    return router;
}
