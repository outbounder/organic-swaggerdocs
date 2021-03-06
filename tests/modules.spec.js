var request = require("request")
var express = require("express")

describe("modules", function(){
  var app
  var server
  var swaggerdocs = require("../index")

  beforeEach(function(next){
    app = express()
    swaggerdocs.call({
      app: app
    }, {
      "mount": "/apidocs",
      "apiEndpoint": "/api",
      "dynamicDocumentation": "tests/data/"
    })
    server = app.listen(1337, function(){
      next()
    })
  })

  afterEach(function(){
    server.close()
  })

  it("serves modules list accordingly to swagger spec", function(next){
    request.get({
      uri: "http://localhost:1337/apidocs/modules", 
      json: {}
    }, function(err, res, body){
      if(err) return next(err)
      expect(body.swaggerVersion).toBe("1.2")
      expect(body.apis[0].path).toBe("/index.js")
      expect(body.apis[1].path).toBe("/sub-index.js")
      expect(body.apis[2].path).toBe("/sub-operation.js")
      next()
    })
  })
})