const express = require("express")

const server = express()

server.all("/", (req,res) => {
    res.send("Hi.")
})

function ping() {
    server.listen(6942, () => {
        console.log("On the run.")
    })
}

module.exports = ping