var st = require('st');
var expressmount = require("expressmount")

module.exports = function(config) {
  var app = this.app
  if(config.log)
    console.log("static", config.mount, "->", __dirname+"/context/public")
  if(config.theme)
    app.use(st({
      path: config.theme,
      url: config.mount,
      index: false,
      passthrough: true
    }))
  
  app.use(st({
    path: __dirname+"/context/public",
    url: config.mount,
    index: false,
    passthrough: true
  }))

  var actions = require("./context/routes")(config)
  if(config.log)
    console.log("mount", config.mount)
  app.use(config.mount, expressmount(actions, config).router)
}
