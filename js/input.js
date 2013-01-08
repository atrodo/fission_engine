  function Input(options)
  {
    $.extend(true, this, {
    }, options);

    var actions = { }
    var bounds = {}
    var active_actions = {}

    var nice_name = function(e)
    {
      var result = jQuery.hotkeys.specialKeys[e.which]
      if (result != undefined)
        return result
      return String.fromCharCode(e.which).toLowerCase()
    }

    $(document).bind("keydown", function(e)
    {
      var action = bounds[nice_name(e)]

      if (action == undefined)
        return

      e.preventDefault();

      active_actions[action] = $.merge([], actions[action].cb)
    });

    $(document).bind("keyup", function(e)
    {
      var action = bounds[nice_name(e)]

      if (action == undefined)
        return

      e.preventDefault();

      delete active_actions[action]
    });

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
          bounds[bound] = action_name
      })

      if ($.isFunction(cb))
      {
        this.add_action(action_name, cb)
      }
    }
    this.add_action = function(added_action, cb)
    {
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
          if (!$.isFunction(cb))
            return

          var result = cb()
          if (result === false)
          {
            delete cbs[i]
          }
        })
      })
    }

    this.register_action("right", "right")
    this.register_action("left",  "left")
    this.register_action("jump",  "space up")
    this.register_action("atk_pri", "x")
    this.register_action("atk_sec", "z")

  }

  [% IF engine_input %]
  $(function()
  {
    input.register_action('force_up', 'a', function()
    {
      user.y += 2;
    })
    input.register_action('force_down', 'shift+a', function()
    {
      user.y -= 2;
    })

    input.register_action('show_frame', 't', function()
    {
      console.log('t');
      runtime_frame();
    })

    input.register_action('show_all_phys', 'y', function()
    {
      //all_physics.pop()
      console.log(all_physics)
    })

    input.register_action('remove_last_phys', 'shift+y', function()
    {
      all_physics.pop()
      console.log(all_physics)
    })

    input.register_action('start_runtime','shift+q `', function()
    {
      start_runtime()
    })

    input.register_action('stop_runtime', 'q esc', function()
    {
      stop_runtime()
    })

    input.register_action('zoom_out', '-', function()
    {
      zoom = zoom / 2
      console.log(zoom)
    })

    input.register_action('zoom_in', '+', function()
    {
      zoom = zoom * 2
      console.log(zoom)
    })

    input.register_action('trans_l', 'h', function()
    {
      trans_x -= 200
      console.log(trans_x, trans_y)
    })

    input.register_action('trans_r', 'l', function()
    {
      trans_x += 200
      console.log(trans_x, trans_y)
    })

    input.register_action('trans_d', 'j', function()
    {
      trans_y -= 200
      console.log(trans_x, trans_y)
    })

    input.register_action('trans_u', 'k', function()
    {
      trans_y += 200
      console.log(trans_x, trans_y)
    })

  })
  [% END %]
