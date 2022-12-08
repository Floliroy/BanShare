const ApiTwitch = require("../services/ApiTwitch")
const BanChannel = require("../services/BanChannel")
const SubChannel = require("../services/SubChannel")
const Users = require("../services/Users")

function checkParams(body, params){
    for(const param of params){
        if(!body[param]) return false
    }
    return true
}

module.exports = function(app){

    app.post("/subTo", async function(req, res){
        if(req.query.grant_type) return res.redirect("/")
        if(!await Users.checkConnected(req.cookies.userId, req.cookies.accessToken)){
            return res.status(401).send("Not authorized")
        }

        await ApiTwitch.subToUser(req.body.subId, req.body.subName, req.cookies.userId)

        return res.redirect("/")
    })

    app.post("/unsubTo", async function(req, res){
        if(!await Users.checkConnected(req.cookies.userId, req.cookies.accessToken)){
            return res.status(401).send("Not authorized")
        }

        await SubChannel.unsubToUser(req.body.subId, req.cookies.userId)

        return res.redirect("/")
    })

    app.post("/share", async function(req, res){
        if(req.query.grant_type) return res.redirect("/")
        if(!await Users.checkConnected(req.cookies.userId, req.cookies.accessToken)){
            return res.status(401).send("Not authorized")
        }

        await ApiTwitch.shareBans(req.cookies.userId)

        return res.redirect("/")
    })

    app.post("/unshare", async function(req, res){
        if(!await Users.checkConnected(req.cookies.userId, req.cookies.accessToken)){
            return res.status(401).send("Not authorized")
        }

        await Users.updateShare(req.cookies.userId, false)
        await BanChannel.removeFromUser(req.cookies.userId)

        return res.redirect("/")
    })

}