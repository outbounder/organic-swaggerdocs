var express = require("express")

describe("index", function(){
  var app = express()
  var swaggerdocs = require("../index")

  it("mounts to express app", function(){
    swaggerdocs.call({
      app: app
    }, {
      "mount": "/apidocs",
      "apiEndpoint": "/api",
      "dynamicDocumentation": "tests/data/"
    })
    
    var server = app.listen(function(){
      // expect app routes to contain swaggerdocs routes
      // last-1 == public folder
      // last == api actions folder
      expect(app.stack.pop().route).toBe("/apidocs")
      expect(app.stack.pop().route).toBe("/apidocs")
      server.close()
    })
    
  })
})