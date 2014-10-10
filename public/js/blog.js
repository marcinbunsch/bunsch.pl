
$('a').click(function(e) {

  var label = $.trim($(e.target).text())

  ga('send', 'event', {
    eventCategory: 'Navigation',
    eventAction: 'Click',
    eventLabel: label
  });

})

