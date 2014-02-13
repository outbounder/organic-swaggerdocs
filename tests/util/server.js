var express = require("express")
var swaggerdocs = require("../../index")

var app = express()

swaggerdocs.call({
  app: app
}, {
  "mount": "/apidocs",
  "apiEndpoint": "/api",
  "dynamicDocumentation": "tests/data/",
  "log": true
})

var server = app.listen(1337, function(){
  console.log("running at http://127.0.0.1:1337")
})