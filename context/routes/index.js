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
    "GET": [allowFromAll, function(req, res){
      fs.readFile(__dirname+"/../templates/index.stache", function(err, content){
        res.setHeader("content-type", "text/html")
        res.send(mustache.render(content.toString(), config))
      })
    }],
    "GET /modules": [allowFromAll, function(req, res, next){
      fs.readdir(process.cwd()+"/"+config.dynamicDocumentation, function(err, files){
        console.log(files)
        if(err) return next(err)
        var result = {
          "apiVersion": require(process.cwd()+"/package.json").version,
          "swaggerVersion": "1.2",
          "apis": []
        }
        for(var i = 0; i<files.length; i++) {
          var name = path.basename(files[i], path.extname(files[i]))
          if(name == "index")
            name = path.basename(process.cwd()+"/"+config.dynamicDocumentation)
          result.apis.push({
            path: "/"+name
          })
        }
        res.send(result)
      })
    }],
    "GET /modules/*": [allowFromAll, function(req, res, next){
      var name = req.url.replace("/modules/", "")
      if(path.basename(config.dynamicDocumentation) == name)
        name = "index"
      else
        if(fs.existsSync(process.cwd()+"/"+config.dynamicDocumentation+"/"+name+"/index.js"))
          name += "/index"
      var filePath = process.cwd()+"/"+config.dynamicDocumentation+"/"+name+".js"
      var fileContents = fs.readFileSync(filePath)
      var actionFile = require(filePath)
      var actions = actionFile({})
      var syntax = esprima.parse(fileContents, { tokens: true, range: true, comment: true }); 
      syntax = escodegen.attachComments(syntax, syntax.comments, syntax.tokens); 
      var result = {
        "apiVersion": require(process.cwd()+"/package.json").version,
        "swaggerVersion": "1.2",
        "basePath": config.apiEndpoint,
        "resourcePath": name != "index"?"/"+name.replace("/index",""):"",
        "apis": []
      }
      for(var key in actions) {
        var method = key.split(" ")[0]
        var urlsuffix = key.split(" ")[1] || ""
        var comments = findLeadingComments(syntax.body, key)
        var parameters = comments?JSON.parse(comments[0].value):[]
        
        result.apis.push({
          path: (urlsuffix == ""?"/":urlsuffix),
          "operations":[
            {
              "method": method,
              "nickname": key,
              "summary":"missing summary",
              "notes": "missing notes",
              parameters: parameters
            }
          ]
        })
      }
      res.send(result)
    }]
  }
}