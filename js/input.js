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
    state: {}
  }, options);

  var self = this;

  self.id = function() { return _id; };
  self.action_id = self.id

  self.setTrigger = function(trigger)
  {
    var found_type = false
    $.each(triggers, function(trigger_name, trigger_type)
    {
      if (trigger instanceof trigger_type)
      {
        self.triggers[trigger_name] = trigger
        found_type = true
        return false;
      }
    })

    if (found_type == false)
    {
      $.each(triggers, function(trigger_name, trigger_type)
      {
        var result
        try { result = new trigger_type(trigger); } catch(e){};

        if (result != undefined)
        {
          self.triggers[trigger_name] = result
          found_type = true
          return false;
        }
      })
    }

    if (found_type == false)
    {
      die("Could not find trigger type for " + trigger)
    }
  }

  $.each(self.triggers, function(trigger_name)
  {
    if (this == undefined)
      return

    if (trigger_name == "action")
      return

    self.setTrigger(this)
  })

  self.trigger = function()
  {
    return self.handler()
  }

  self.toString = function()
  {
    return self.action_name || self.id()
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
      return trigger_name == key
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
        return true
      }

      return false
    }
  },
}

var action_check = function(id)
{
  this.check = function(trigger_name)
  {
    return trigger_name == id
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

  var actions = []
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
    {
      die("Must pass String to trigger_on_key");
    }

    self.add_action(new Action({
      action_name: "",
      handler: action,
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

    actions.push(action)
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

    var cur_actions = $.grep(actions, function(action)
    {
      if (action.triggers[trigger_type] == undefined)
        return false

      if (action.triggers[trigger_type].check(trigger_name))
        return true

      return false
    })

    if (active_actions[trigger_type] == undefined)
      active_actions[trigger_type] = {}

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

    delete active_actions[trigger_type][trigger_name]
  }

  this.trigger = function(trigger_name)
  {
    if ($.type(trigger_name) != "string" && !(trigger_name instanceof Action))
      return

    trigger_type = get_trigger_type(trigger_type)

    if (trigger_name instanceof Action)
    {
      trigger_type = "actions"
      trigger_name  = trigger_name.id()
    }

    $.each(actions, function(i, action)
    {
      if (action.triggers[trigger_type] == undefined)
        return

      if (action.triggers[trigger_type].check(trigger_name))
        action.trigger()
    })
  }

  this.frame = function()
  {
    var done_actions = {}

    $.each(active_actions, function(trigger_type_name, triggers)
    {
      $.each(triggers, function(trigger_name, actions)
      {
        $.each(actions, function(i, action)
        {
          if (action == undefined)
            return

          var action_id

          if ($.isFunction(action.action_id))
          {
            action_id = action.action_id()
          }

          if (action_id == undefined)
            return

          if (action_id in done_actions)
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
              result = e
            else
              throw e
          }

          if (result instanceof Cooldown)
          {
            result.set_result(action)
            actions[i] = result
          }

          done_actions[action_id] = result

          if (result === false)
          {
            delete actions[i]
          }
        })
      })
    })
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

  self.get_current = function()
  {
    return self[self.current]
  }

  var key_prev = self.prev
  var key_next = self.next
  var key_select = self.select

  self.prev = function()
  {
    self.current = (self.current - 1) % self.length
    return new Cooldown()
  }
  self.next = function()
  {
    self.current = (self.current + 1) % self.length
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
}
