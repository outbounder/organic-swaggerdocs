var request = require("request")
var express = require("express")

describe("actions", function(){
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

  it("serves action accordingly to swagger spec", function(next){
    request.get({
      uri: "http://localhost:1337/apidocs/modules/index.js", 
      json: {}
    }, function(err, res, body){
      if(err) return next(err)
      expect(body.swaggerVersion).toBe("1.2")
      expect(body.apis[0].path).toBe("/")
      expect(body.apis[1].path).toBe("/test")
      expect(body.apis[2].path).toBe("/{id}")
      expect(body.apis[3].path).toBe("/{user}/{property}")
      expect(body.apis[4].path).toBe("/{user}/{property}/{value}")
      expect(body.apis[0].operations[0].method).toBe("GET")
      expect(body.apis[1].operations[0].method).toBe("POST")
      next()
    })
  })
})