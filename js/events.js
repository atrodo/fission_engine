  function Events()
  {
    var listeners = {}
    var self = this;

    var run_apply = function(cb, args)
    {
      try
      {
        if (cb instanceof Cooldown)
        {
          // Cooldown returns itself or a function
          var cd = cb.frame()

          if (cd != cb)
          {
            cb.reset()
            cb = cd
          }
        }

        if ($.isFunction(cb))
        {
          return cb.apply(self, args)
        }
      }
      catch(e)
      {
        warn(e);
      }
    }

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
        var cd_observer = function()
        {
          var c = cb.frame()
          if (c != cb)
          {
            this.off(type, cd_observer)
            return c.apply(this, arguments)
          }
        }

        var observer = function()
        {
          this.off(type, observer)
          return cb.apply(this, arguments)
        }

        if (cb instanceof Cooldown)
        {
          this.on(type, cd_observer)
        }
        else
        {
          this.on(type, observer)
        }

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
          result.push(run_apply(cbs.shift(), args))
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
