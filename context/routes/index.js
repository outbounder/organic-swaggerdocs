var esprima = require("esprima")
var escodegen = require("escodegen")
var path = require("path")
var fs = require('fs')
var glob = require("glob")
var _ = require("underscore")
var mustache = require("mustache")

var allowFromAll = function(req, res, next) {
  res.header('Access-Control-Allow-Origin', "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type, api_key");
  res.header("Content-Type", "application/json; charset=utf-8");
  next()
}

var walk = function(syntax, walker){
  for(var key in syntax) {
    if(Array.isArray(syntax[key])) {
      var returnvalue = walk(syntax[key], walker)
      if(returnvalue)
        return returnvalue
    } else
    if(syntax[key] && typeof syntax[key] == "object") {
      var returnvalue = walker(syntax[key])
      if(returnvalue)
        return returnvalue
      returnvalue = walk(syntax[key], walker)
      if(returnvalue)
        return returnvalue
    }
  }
}

var findLeadingComments = function(syntax, key) {
  return walk(syntax, function(node) {
    if(node.type && node.type == "Property" &&
      node.key && node.key.value == key) {
      return node.leadingComments
    }
  })
}

module.exports = function index(config){
  return {
    "GET /ui": [allowFromAll, function(req, res){
      fs.readFile(__dirname+"/../templates/index.stache", function(err, content){
        res.setHeader("content-type", "text/html")
        res.send(mustache.render(content.toString(), config))
      })
    }],
    "GET /modules": [allowFromAll, function(req, res, next){
      var root = process.cwd()+"/"+config.dynamicDocumentation
      glob(root+"/**/*.js", function(err, files){
        if(err) return next(err)
        var result = {
          "apiVersion": require(process.cwd()+"/package.json").version,
          "swaggerVersion": "1.2",
          "apis": []
        }
        for(var i = 0; i<files.length; i++) {
          var name = files[i].replace(root, "")
          name = name.replace(/\//g, "-")
          result.apis.push({ 
            path: "/"+name, 
            description: files[i].replace(root, "")
          })
        }
        res.send(result)
      })
    }],
    "GET /modules/*": [allowFromAll, function(req, res, next){
      var name = req.url.replace("/modules/", "")
      var filePath = process.cwd()+"/"+config.dynamicDocumentation+"/"+name.replace(/-/g, "/")
      var fileContents = fs.readFileSync(filePath)
      var actionFile = require(filePath)
      var actions = actionFile({})
      var syntax = esprima.parse(fileContents, { tokens: true, range: true, comment: true }); 
      syntax = escodegen.attachComments(syntax, syntax.comments, syntax.tokens); 
      var result = {
        "apiVersion": require(process.cwd()+"/package.json").version,
        "swaggerVersion": "1.2",
        "basePath": config.apiEndpoint,
        "apis": []
      }
      for(var key in actions) {
        var method = key.split(" ")[0]
        var urlsuffix = key.split(" ")[1] || ""
        var comments = findLeadingComments(syntax.body, key)
        var parameters = comments?JSON.parse(comments[0].value):[]
        var operationPath = path.normalize("/"+name
          .replace(/-/g, "/")
          .replace(".js", "")
          .replace("/index", "")
          .replace("index", "")
          +(key.split(" ")[1]?key.split(" ")[1]:""))
        result.apis.push({
          path: operationPath,
          "operations":[
            {
              "method": method,
              "nickname": key,
              "parameters": parameters
            }
          ]
        })
      }
      res.send(result)
    }]
  }
}