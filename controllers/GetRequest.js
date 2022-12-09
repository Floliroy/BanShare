const ApiTwitch = require("../services/ApiTwitch")
const Users = require("../services/Users")
const Database = require("../services/Database")

module.exports = function(app){

    app.get("/login", async function(req, res) {
        if(req.query.grant_type) return res.redirect("/")
        await ApiTwitch.login(req, res)
    
        return res.redirect("/")
    })

    app.get("/logout", async function(req, res) {
        res.clearCookie("userId")
        res.clearCookie("accessToken")
    
        return res.redirect("/")
    })
    
    app.get("/", async function(req, res){
        const con = await Database.getConnection()
        try{
            console.log(req)
            const user = await Users.getDatas(req.cookies.userId, con)
            const allUsers = await Users.getAllDatas(con)
            return res.render("partials/layout", {body: "index", user: user, allUsers: allUsers, req: req})
        }catch(error){
            return res.redirect("/logout")
        }finally{
            Database.releaseConnection(con)
        }
    })

}