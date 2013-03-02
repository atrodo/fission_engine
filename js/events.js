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
        return this;
      },
      once: function(type, cb)
      {
        this.on(type, function observer()
        {
          this.off(type, observer)
          cb.apply(this, arguments)
        })
        return this;
      },
      exists: function(type)
      {
        if (!$.isArray(listeners[type]))
          return false;
        if (listeners[type].length > 0)
          return true;
        return false;
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
          try
          {
            result.push(cbs.shift().apply(this, args))
          } catch (e) { console.log(e) }
        }

        return result
      },
      call: function(type)
      {
        var result = this.emit.apply(this, arguments)
        if (result.length > 1)
          warn("Too many results, choosing the first one")
        return result[0]
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
        return this;
      },
    })
  }
