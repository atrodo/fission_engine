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
        var result = []

        if (!$.isArray(listeners[type]))
          listeners[type] = []

        var args = Array.prototype.slice.call(arguments, 1)
        var cbs = listeners[type].slice()
        while (cbs.length > 0)
        {
          result.push(cbs.shift().apply(this, args))
        }

        return result
      },
      off: function(type, cb)
      {
        if (cb == undefined)
          throw new Error("You cannot remove all listeners on an event")

        if (!$.isFunction(cb))
          throw new Error("You must pass a listener to Event.off")

        var index = listeners[type].indexOf(cb)
        if (index != undefined && index >= 0)
        {
          listeners[type].splice(index, 1);
        }
      },
    })
  }
