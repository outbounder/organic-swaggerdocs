# organic-swaggerdocs 

An expressjs middleware suitable to extract at runtime 
documentation found at folders containing [expresshttpactions](https://github.com/outbounder/organic-expressHttpActions).

Can be used as middleware to [organic-expressserver](https://github.com/outbounder/organic-expressServer)

The implementation is based on [swagger UI](https://github.com/wordnik/swagger-ui) and [swagger core](https://github.com/wordnik/swagger-core/wiki) specification.

## usage 

### via DNA `middleware` of expressserver

    {
      "source": "node_modules/organic-swaggerdocs",
      "arguments": [{
        "mount": "/apidocs",
        "apiEndpoint": "/api",
        "dynamicDocumentation": "routes/api",
        "log": true
      }]
    }

### standalone

    var express = require("express")
    var app = express()
    var swaggerdocs = require("organic-swaggerdocs")
    swaggerdocs.call({
      app: app
    }, {
      "mount": "/apidocs",
      "apiEndpoint": "/api",
      "dynamicDocumentation": "routes/api",
      "log": true
    })
