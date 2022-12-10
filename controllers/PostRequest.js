const ApiTwitch = require("../services/ApiTwitch")
const BanChannel = require("../services/BanChannel")
const SubChannel = require("../services/SubChannel")
const Users = require("../services/Users")
const Database = require("../services/Database")

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

        await ApiTwitch.shareBans(req.cookies.userId, req.body.shareKeywords)

        return res.redirect("/")
    })

    app.post("/unshare", async function(req, res){
        if(!await Users.checkConnected(req.cookies.userId, req.cookies.accessToken)){
            return res.status(401).send("Not authorized")
        }

        const con = await Database.getConnection()
        try{
            await Users.updateShare(req.cookies.userId, false, con)
            await BanChannel.removeFromUser(req.cookies.userId, con)
            await ApiTwitch.unshareBans(req.cookies.userId)
        }catch(error){
            throw new Error(error.message)
        }finally{
            Database.releaseConnection(con)
        }

        return res.redirect("/")
    })

}