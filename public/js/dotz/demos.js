function runDemo(sourceId, containerId, options) {
  options = options || {}
  var width = options.width || 300
  var height = options.height || 300

  var el = $(containerId).get(0)
  Crafty("*").each(function() { this.destroy() })
  Crafty.init(width, height, el)
  var source = $(sourceId).text()
  // evil! :D
  eval(source)

}

