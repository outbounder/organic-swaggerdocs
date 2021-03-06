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

var findActions = function(syntax) {
  var documentMethods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
  var result = {}
  for(var i = 0; i<syntax.tokens.length; i++) {
    if(syntax.tokens[i].type != "String") continue

    var tokenValue = syntax.tokens[i].value.replace(/"/g, "").replace(/'/g, "")
    var shouldDocument = _.intersection(tokenValue.split(" "), documentMethods).length > 0
    if(shouldDocument)
      result[tokenValue] = true
  }
  return result
}

var extractParameters = function(syntax, key) {
  var comments = findLeadingComments(syntax.body, key)
  try {
    if(!comments || comments.length == 0) return []
    var value = JSON.parse(comments[0].value)
    return value.parameters || []
  } catch(err) {
    return []
  }
}

var extractDescription = function(syntax, key) {
  var comments = findLeadingComments(syntax.body, key)
  try {
    return comments?JSON.parse(comments[0].value).description:""
  } catch(err) {
    return comments?comments[0].value:""
  }
}

module.exports = function index(config){
  if(!config.template)
    config.template = __dirname+"/../templates/index.stache"
  
  return {
    "GET /ui": [allowFromAll, function(req, res){
      fs.readFile(config.template, function(err, content){
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
      var bodySupportedMethods = ["POST", "PUT", "DELETE"]
      var name = req.url.replace("/modules/", "")
      var filePath = process.cwd()+"/"+config.dynamicDocumentation+"/"+name.replace(/-/g, "/")
      var fileContents = fs.readFileSync(filePath)
      
      var syntax = esprima.parse(fileContents, { tokens: true, range: true, comment: true }); 
      syntax = escodegen.attachComments(syntax, syntax.comments, syntax.tokens); 

      var actions = findActions(syntax)

      var result = {
        "apiVersion": require(process.cwd()+"/package.json").version,
        "swaggerVersion": "1.2",
        "basePath": config.apiEndpoint,
        "apis": []
      }
      for(var key in actions) {
        var method = key.split(" ")[0]
        var urlsuffix = key.split(" ")[1] || ""
        
        var parameters = extractParameters(syntax, key)
        var autoSuggestParameters = parameters.length == 0
        var description = extractDescription(syntax, key)
        var operationPath = path.normalize("/"+name
          .replace(/-/g, "/")
          .replace(".js", "")
          .replace("/index", "")
          .replace("index", "")
          +(key.split(" ")[1]?key.split(" ")[1]:""))

        if(autoSuggestParameters) {
          if(bodySupportedMethods.indexOf(method) > -1)
            parameters.push({
              "paramType": "body",
              "name": "body",
              "dataType": "json"
            })
        }

        var matches = operationPath.match(/:(\w+)/g)
        if(matches)
          for(var i = 0; i<matches.length; i++) {
            operationPath = operationPath.replace(matches[i], "{"+matches[i].replace(":","")+"}")
            if(autoSuggestParameters)
              parameters.push({
                "paramType": "path",
                "name": matches[i].replace(":",""),
                "dataType": "string",
                "format": "string",
                "required": true
              })
          }
        result.apis.push({
          "path": operationPath,
          "operations":[
            {
              "method": method,
              "nickname": key,
              "parameters": parameters,
              "notes": description,
              "summary": operationPath
            }
          ]
        })
      }
      res.send(result)
    }]
  }
}