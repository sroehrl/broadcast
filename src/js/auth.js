const jwt = require('jsonwebtoken')

module.exports = {
    blockUnauthorizedSocketConnections(socket){
        const token = socket.handshake.auth.token;
        try{
            const decoded = jwt.verify(token, process.env.JWT_SECRET)
            if(!socket.nsp.name.includes(decoded.scope) ) {
                socket.disconnect(true)
            }
        } catch (e) {
            socket.disconnect(true)
        }
    },
    phpAuthMiddleware(req, res, next){
        if(jwt.verify(req.headers['Authorization'].substring(6), process.env.JWT_SECRET)){
            next()
        }
    }
}
