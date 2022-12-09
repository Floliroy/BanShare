require("dotenv").config()

/**
 * My libraries
 */
const ApiTwitch = require("./services/ApiTwitch")
//ApiTwitch.initListener()

const express = require("express")
const cookieParser = require("cookie-parser")
const app = express()

/**
 * Website Init
 */
app.set("view engine", "ejs")
app.use(express.urlencoded({ extended: true }))
app.use(express.static("public"))
app.use(express.json())
app.use(cookieParser())

/**
 * Website pages
 */
const GetRequest = require("./controllers/GetRequest")
GetRequest(app)
const PostRequest = require("./controllers/PostRequest")
PostRequest(app)

/**
 * Lancement serveur web
 */
app.use(function (req, res){
    return res.sendStatus(404)
})
app.listen(process.env.PORT, function(){
    console.log(`Server running on port ${process.env.PORT}!`)
})

/**
 * To avoid crashes
 */
process.on("uncaughtException", (err) => {
    console.log(err)
})