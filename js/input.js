function Action(options, kb_trigger)
{
  var action_name = "";

  if (typeof options == "string")
  {
    action_name = options;
    kb_trigger = arguments[2]
    options = arguments[1]
  }
  if ($.isFunction(options))
  {
    options = {
      handler: options,
    }
  }

  var _id = guid()

  $.extend(true, this, {
    action_name: action_name,
    handler: $.noop,
    triggers: {
      kb: kb_trigger,
      click: null,
      action: new action_check(_id),
    },
    data: {}
  }, options);

  var self = this;

  self.id = function() { return _id; };
  self.action_id = self.id

  if (!($.isFunction(self.handler)))
    die("handler for Action must be a function", self.handler);

  self.set_trigger = function(trigger, trigger_class)
  {
    var found_type = false
    var new_trigger
    var new_trigger_class

    $.each(triggers, function(trigger_name, trigger_type)
    {
      if (trigger instanceof trigger_type)
      {
        new_trigger = trigger
        new_trigger_class = trigger_name
        return false;
      }
    })

    // We also accept arrays that will contain Actions for checking
    if (   new_trigger == undefined
        && trigger_class != undefined
        && trigger instanceof Array )
    {
      $.each(triggers, function(trigger_name, trigger_type)
      {
        if (trigger_type == trigger_class)
        {
          new_trigger = trigger
          new_trigger_class = trigger_name
          return false;
        }
      })
    }

    if (new_trigger == undefined)
    {
      $.each(triggers, function(trigger_name, trigger_type)
      {
        var result
        try { result = new trigger_type(trigger); } catch(e){};

        if (result != undefined)
        {
          new_trigger = result
          new_trigger_class = trigger_name
          return false;
        }
      })
    }

    if (new_trigger == undefined)
    {
      die("Could not find trigger type for " + trigger)
    }

    if (new_trigger._action != undefined && new_trigger._action != self)
      die("Trigger can only be assigned to one Action")

    new_trigger._action = self
    self.triggers[new_trigger_class] = new_trigger
  }

  $.each(self.triggers, function(trigger_name)
  {
    if (this == undefined)
      return

    if (trigger_name == "action")
      return

    self.set_trigger(this)
  })

  self.check_trigger = function(trigger_type, trigger_name)
  {
    if (self.triggers[trigger_type] == undefined)
      return

    if (self.triggers[trigger_type] instanceof Array)
    {
      var trigger_actions = []

      $.each(self.triggers[trigger_type], function(i, action)
      {
        if ( !( action instanceof Action) )
          return

        var new_actions = action.check_trigger(trigger_type, trigger_name)
        trigger_actions.push(new_actions)
      })

      return combine_arrays(trigger_actions)
    }

    return self.triggers[trigger_type].check(trigger_name)
  }

  self.trigger = function()
  {
    return self.handler()
  }

  self.toString = function()
  {
    if (self.action_name != undefined)
      return self.action_name;

    return self.id()
  }
}

var triggers = {
  kb: function(key)
  {
    if ($.type(key) != "string")
      die("Must pass a key string to triggers.kb")

    var self = this;

    $.extend(true, this, {
      toString: function() { return key }
    })

    self.check = function(trigger_name)
    {
      if (trigger_name == key)
        return self._action
    }
  },

  click: function(pos)
  {
    $.extend(true, this, pos);

    var self = this;

    $.each(["x", "y", "xw", "yh"], function(i, k)
    {
      if (! $.isNumeric(self[k]))
      {
        die("Must pass a number in " + k + " to new clickAction")
      }
    });

    self.check = function(trigger_name)
    {
      // Click events are in the form of x,y
      var points = trigger_name.split(',')
      var x = points[0]
      var y = points[1]
      if (   x >= self.x && x <= self.x + self.xw
          && y >= self.y && y <= self.y + self.yh )
      {
        return self._action
      }
    }
  },
}

var action_check = function(id)
{
  this.check = function(trigger_name)
  {
    if (trigger_name == id)
      return this._action
  }
}

function Input(options)
{
  $.extend(true, this, {
    layer: null,
    default_actions: true,
    default_adv_actions: false,
  }, options);

  var self = this;

  var my_actions = []
  var active_actions = {}
  var indv_action_name = "-"

  // kb specific
  {
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
  }

  this.trigger_on_key = function(action, key)
  {
    if ($.type(action) != "string")
      die("Must pass String to trigger_on_key");

    self.add_action(new Action({
      action_name: "",
      handler: function()
      {
        self.trigger(action, triggers.kb)
      },
      input: self,
      triggers: {
        kb: key,
      }
    }));
  }

  this.add_action = function(action_name, action)
  {
    // Passing a plain object will do a mass add
    if ($.isPlainObject(action_name))
    {
      $.each(action_name, this.add_action)
      return
    }

    if (action == undefined)
    {
      action = action_name
      action_name = ""
    }

    if ($.type(action_name) == "string" && $.isFunction(action))
    {
      action = new Action(action_name, action)
    }

    if ($.type(action) != "string" && !(action instanceof Action))
    {
      die("Must pass Action or String to add_action");
    }

    if ($.inArray(action, my_actions) < 0)
      my_actions.push(action)
  }

  var get_trigger_type = function(trigger_type)
  {
    if ($.type(trigger_type) == "string")
      trigger_type = triggers[trigger_type]

    var tc_name = ""
    $.each(triggers, function(k, tc)
    {
      if (tc == trigger_type)
      {
        tc_name = k;
        return false;
      }
    });

    return tc_name
  }

  this.activate_action = function(trigger_name, trigger_type)
  {
    if ($.type(trigger_name) != "string" && !(trigger_name instanceof Action))
      return

    trigger_type = get_trigger_type(trigger_type)

    if (trigger_name instanceof Action)
    {
      trigger_type = "actions"
      trigger_name  = trigger_name.id()
    }

    var trigger_actions = []
    $.each(my_actions, function(i, action)
    {
      if (action.triggers[trigger_type] == undefined)
        return

      var new_actions = action.check_trigger(trigger_type, trigger_name)
      trigger_actions.push(new_actions)
    })

    if (active_actions[trigger_type] == undefined)
      active_actions[trigger_type] = {}

    var cur_actions = combine_arrays(trigger_actions)
    active_actions[trigger_type][trigger_name] = cur_actions
  }

  this.deactivate_action = function(trigger_name, trigger_type)
  {
    if ($.type(trigger_name) != "string" && !(trigger_name instanceof Action))
      return

    trigger_type = get_trigger_type(trigger_type)

    if (trigger_name instanceof Action)
    {
      trigger_type = "actions"
      trigger_name  = trigger_name.id()
    }

    if (trigger_type in active_actions)
      delete active_actions[trigger_type][trigger_name]
  }

  this.trigger = function(trigger_name, trigger_type)
  {
    if ($.type(trigger_name) != "string" && !(trigger_name instanceof Action))
      return

    trigger_type = get_trigger_type(trigger_type)

    if (trigger_name instanceof Action)
    {
      trigger_type = "actions"
      trigger_name  = trigger_name.id()
    }

    var trigger_actions = []
    $.each(my_actions, function(i, action)
    {
      if (action.triggers[trigger_type] == undefined)
        return

      var new_actions = action.check_trigger(trigger_type, trigger_name)
      trigger_actions.push(new_actions)
    })

    process_actions(combine_arrays(trigger_actions))
  }

  var done_actions = null;

  var process_actions = function(actions)
  {
    $.each(actions, function(i, action)
    {
      if (action == undefined)
        return

      var is_done_actions = done_actions != null

      var action_id

      if ($.isFunction(action.action_id))
      {
        action_id = action.action_id()
      }

      if (action_id == undefined)
        return

      if (is_done_actions && action_id in done_actions)
      {
        actions[i] = done_actions[action_id]

        if (done_actions[action_id] === false)
        {
          delete actions[i]
        }

        return
      }

      if (action instanceof Cooldown)
      {
        actions[i] = action.frame()

        if (is_done_actions)
          done_actions[action_id] = actions[i]

        return;
      }

      if (!(action instanceof Action))
        return

      var result
      try
      {
        result = action.trigger()
      }
      catch (e)
      {
        if (e instanceof Cooldown)
        {
          result = e
        }
        else
        {
          warn(e);
          throw e
        }
      }

      if (result instanceof Cooldown)
      {
        result.result = action
        actions[i] = result
      }

      if (is_done_actions)
        done_actions[action_id] = result

      if (result === false)
      {
        delete actions[i]
      }
    })
  }

  this.frame = function()
  {
    if (done_actions != undefined)
    {
      done_actions = null
      die("Input.frame was called inside of Input.frame")
    }

    done_actions = {}

    $.each(active_actions, function(trigger_type_name, triggers)
    {
      $.each(triggers, function(trigger_name, actions)
      {
        process_actions(actions)
      })
    })

    done_actions = null
  }

  if (this.default_actions)
  {
    this.trigger_on_key("right", "right")
    this.trigger_on_key("left",  "left")
    this.trigger_on_key("up",    "up")
    this.trigger_on_key("down",  "down")
  }
  if (this.default_adv_actions)
  {
    this.trigger_on_key("jump",  "space")
    this.trigger_on_key("atk_pri", "x")
    this.trigger_on_key("atk_sec", "z")
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
        var key = nice_name(e)

        e.preventDefault();
        self.activate_action(key, triggers.kb)
      },

      "keyup": function(e)
      {
        var key = nice_name(e)

        e.preventDefault();
        self.deactivate_action(key, triggers.kb)
      },

      "click": function(e)
      {
        warn(e);

        var target_pos = $(e.currentTarget).position()
        var x = e.pageX - target_pos.left
        var y = e.pageY - target_pos.top

        self.trigger(x + "," + y, triggers.click)
      }

    })

    return;
  }

  var init_layer = this.layer;
  this.layer = null;
  this.set_layer(init_layer);
}

function ActionGroup(options)
{
  $.extend(true, this, {
    layer: null,
    next: null,
    prev: null,
    select: null,

    on_change: null,
  }, options);

  var self = this;

  if (self.layer == undefined)
  {
    die("Must pass layer to ActionGroup")
  }

  var input = new Input({layer: self.layer})

  self.clear = function()
  {
    for (var i = 0; i < self.length; i++)
    {
      delete self[i]
    }

    self.length = 0;
    self.current = 0;
  }

  self.clear()

  self.push = function(new_item)
  {
    if ($.isFunction(new_item))
      new_item = new Action(new_item)

    if ($.isArray(new_item))
    {
      $.each(new_item, self.push)
      return
    }

    if (!(new_item instanceof Action))
      die("Can only add Action or Function to ActionGroup")

    self[self.length] = new_item
    self.length++
  }

  self.get = function(i)
  {
    return data[i]
  }

  self.get_current = function()
  {
    return self[self.current]
  }

  self.set_current = function(new_current)
  {
    if (typeof new_current != "number")
    {
      for (var i = 0; i < self.length; i++)
      {
        if (self[i] == new_current)
        {
          new_current = i;
          break;
        }
      }
    }

    new_current = make_between(new_current, 0, self.length - 1);

    self.current = new_current
    if ($.isFunction(self.on_change))
      self.on_change()
  }

  var key_prev = self.prev
  var key_next = self.next
  var key_select = self.select

  self.prev = function()
  {
    self.set_current((self.current - 1) % self.length)

    return new Cooldown()
  }
  self.next = function()
  {
    self.set_current((self.current + 1) % self.length)

    return new Cooldown()
  }
  self.select = function()
  {
    var action = self[self.current]

    if (action == undefined || !(action instanceof Action) )
      return;

    action.trigger()

    return new Cooldown()
  }

  input.add_action(new Action("prev",   self.prev,   key_prev))
  input.add_action(new Action("next",   self.next,   key_next))
  input.add_action(new Action("select", self.select, key_select))

  var action_catch = new Action()
  $.each(triggers, function(k, trigger_class)
  {
    action_catch.set_trigger(self, trigger_class)
  });

  input.add_action(action_catch)
}

ActionGroup.prototype = new Array()
