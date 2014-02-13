module.exports = function(){
  return {
    "GET": function(){},
    "POST /test": function(){},
    "DELETE /:id": [function(req, res, next){
      
    }, function(){}],
    'PUT /:user/:property': this.store(["req", "res", "next"]),
    "OPTIONS /:user/:property/:value": this.store(["req", "res", "next"])
  }
}