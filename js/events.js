  var event_div = $("<div/>")

  function Events()
  {
    var listeners = {}

    $.extend(this, {
      on: function(type, cb)
      {
        if (!$.isArray(listeners[type]))
          listeners[type] = []
        if (listeners[type].indexOf(cb) < 0)
          listeners[type].push(cb)
      },
      once: function(type, cb)
      {
        this.on(type, function observer()
        {
          this.off(type, observer)
          cb.apply(this, arguments)
        })
      },
      emit: function(type)
      {
        if (!$.isArray(listeners[type]))
          listeners[type] = []

        var args = Array.slice(arguments, 1)
        var cbs = listeners[type].slice()
        while (cbs.length > 0)
        {
          cb.shift().apply(this, args)
        }
      },
      off: function(type, cb)
      {
        if (cb == undefined)
          throw new Error("You cannot remove all listeners on an event")

        if (!$.isFunction(c))
          throw new Error("You must pass a listener to Event.off")

        if (listeners[type].indexOf(cb) < 0)
        {
          listeners[type].splice(index, 1);
        }
      },
    })
  }
