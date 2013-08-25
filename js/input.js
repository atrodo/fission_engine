  function Input(options)
  {
    $.extend(true, this, {
      layer: null,
      default_actions: true,
      default_adv_actions: false,
      active: true,
    }, options);

    var self = this;

    var actions = { }
    var bounds = {}
    var active_actions = {}

    var special_keys = {
      8:  "backspace", 9:  "tab",   13: "enter",  16: "shift",
      17: "ctrl",      18: "alt",   19: "pause",  20: "capslock",
      27: "esc",       32: "space", 33: "pageup", 34: "pagedown",
      35: "end",       36: "home",  37: "left",   38: "up",
      39: "right",     40: "down",  45: "insert", 46: "del",

      96:  "0", 97:  "1", 98:  "2", 99:  "3", 100: "4",
      101: "5", 102: "6", 103: "7", 104: "8", 105: "9",
      106: "*", 107: "+", 109: "-", 110: ".", 111: "/",

      112: "f1", 113: "f2",  114: "f3",  115: "f4",
      116: "f5", 117: "f6",  118: "f7",  119: "f8",
      120: "f9", 121: "f10", 122: "f11", 123: "f12",

      144: "numlock", 145: "scroll", 191: "/", 192: '`',
      224: "meta",
    }

    var nice_name = function(e)
    {
      var key = special_keys[e.which] || String.fromCharCode(e.which)
      key = key.toLowerCase()

      var keys = [ key ];

      if (e.altKey && key != "alt")
        keys.unshift("alt")
      if (e.ctrlKey && key != "ctrl")
        keys.unshift("ctrl")
      if (e.shiftKey && key != "shift")
        keys.unshift("shift")

      //console.log(e.type, e.which, keys.join('+'))
      return keys.join('+');
    }

    this.register_action = function(action_name, default_bound, cb)
    {
      actions[action_name] = {
        bound: default_bound,
        cb: [],
      }
      var all_bound = default_bound.split(" ")
      $.each(all_bound, function(i, bound)
      {
        if (bound)
        {
          var modifiers = bound.split("+")
          var key = modifiers.pop()
          modifiers.sort().push(key)
          bound = modifiers.join("+")
          //console.log(bound, action_name)
          bounds[bound] = action_name
        }
      })

      if ($.isFunction(cb))
      {
        this.add_action(action_name, cb)
      }
    }
    this.add_action = function(added_action, cb)
    {
      if ($.isPlainObject(added_action))
      {
        $.each(added_action, this.add_action)
        return
      }

      var action = actions[added_action]
      if (action == undefined)
        return

      action.cb.push(cb)
    }

    this.frame = function()
    {
      $.each(active_actions, function(action, cbs)
      {
        $.each(cbs, function(i, cb)
        {
          if (cb instanceof Cooldown)
          {
            cbs[i] = cb.frame()
            return;
          }

          if (!self.active || !self.layer.active_input)
            return;

          if (!$.isFunction(cb))
            return

          var result
          try
          {
            result = cb()
          }
          catch (e)
          {
            if (e instanceof Cooldown)
              result = e
            else
              throw e
          }

          if (result instanceof Cooldown)
          {
            result.set_result(cb)
            cbs[i] = result
          }

          if (result === false)
          {
            delete cbs[i]
          }
        })
      })
    }

    this.activate = function()
    {
      this.active = true
    }

    this.deactivate = function()
    {
      this.active = false
    }

    this.activate_action = function(action)
    {
      if (action == undefined)
        return

      active_actions[action] = $.merge([], actions[action].cb)
    }

    this.deactivate_action = function(action)
    {
      if (action == undefined)
        return

      delete active_actions[action]
    }

    //runtime.events.on('input_frame', this.frame)

    if (this.default_actions)
    {
      this.register_action("right", "right")
      this.register_action("left",  "left")
      this.register_action("up",    "up")
      this.register_action("down",  "down")
    }
    if (this.default_adv_actions)
    {
      this.register_action("jump",  "space")
      this.register_action("atk_pri", "x")
      this.register_action("atk_sec", "z")
    }

    this.set_layer = function(new_layer)
    {
      if (new_layer == this.layer)
        return;

      var old_layer = this.layer

      this.layer = null

      if (old_layer instanceof Layer)
      {
        old_layer.remove_input(this);
      }

      if (new_layer == null)
      {
        return;
      }

      if (!(new_layer instanceof Layer))
        throw new Error("Must pass a Layer to set_layer")

      this.layer = new_layer;

      this.layer.add_input({
        "frame": function()
        {
          self.frame();
        },
        "keydown": function(e)
        {
          var action = bounds[nice_name(e)]

          if (action == undefined)
            return

          e.preventDefault();
          self.activate_action(action)
        },

        "keyup": function(e)
        {
          var action = bounds[nice_name(e)]

          if (action == undefined)
            return

          e.preventDefault();
          self.deactivate_action(action)
        },

      })

      return;
    }

    var first_layer = this.layer;
    this.layer = null;
    this.set_layer(first_layer);

    [% IF engine_input %]
    this.register_action('force_up', 'a', function()
    {
      user.y += 2;
    })
    this.register_action('force_down', 'shift+a', function()
    {
      user.y -= 2;
    })

    this.register_action('show_frame', 't', function()
    {
      console.log('t');
      runtime_frame();
    })

    this.register_action('show_all_phys', 'y', function()
    {
      //all_physics.pop()
      console.log(all_physics)
    })

    this.register_action('remove_last_phys', 'shift+y', function()
    {
      all_physics.pop()
      console.log(all_physics)
    })

    this.register_action('start_runtime','shift+q `', function()
    {
      start_runtime()
    })

    this.register_action('stop_runtime', 'q esc', function()
    {
      stop_runtime()
    })

    this.register_action('zoom_out', '-', function()
    {
      zoom = zoom / 2
      console.log(zoom)
    })

    this.register_action('zoom_in', '+', function()
    {
      zoom = zoom * 2
      console.log(zoom)
    })

    this.register_action('trans_l', 'h', function()
    {
      trans_x -= 200
      console.log(trans_x, trans_y)
    })

    this.register_action('trans_r', 'l', function()
    {
      trans_x += 200
      console.log(trans_x, trans_y)
    })

    this.register_action('trans_d', 'j', function()
    {
      trans_y -= 200
      console.log(trans_x, trans_y)
    })

    this.register_action('trans_u', 'k', function()
    {
      trans_y += 200
      console.log(trans_x, trans_y)
    })
    [% END %]
  }

