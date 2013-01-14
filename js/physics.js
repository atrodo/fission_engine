  var all_physics = []

  function Physics(options)
  {
    var sub_pixel = 1/8

    $.extend(true, this, {
      x: 100,
      y: 101,
      xw: 3,
      yh: 3,
      max_speed: 10,
      max_jump: 6,
      gravity: -9,

      momentum_j: 0,
      momentum_l: 0,
      momentum_r: 0,
      current_j: 0,

      chunk: null,

      // The physics that created this object
      owner: null,
      relative_x: null,
      relative_y: null,

      last_frame: {
        was_m: false,
        was_j: false,
        momentum_j: 0,
        momentum_l: 0,
        momentum_r: 0
      },

      sprite: null,
      input: new Input(),
      ai: null,

      deferred: $.Deferred(),

      flags: {
        facing_left: false,
        solid: true,
        reduce_momentum: true,
        destroy_with_owner: true,
      },
    }, options)

    if ($.type(this.sprite) == "string")
      this.sprite = sprite_catalog[this.sprite];

    if (!(this.sprite instanceof Sprite))
      throw "Must provide a valid Sprite";

    this.sprite = this.sprite.clone()

    [%
      important_fields = {
        x  => "x",
        y  => "y",
        s  => "sprite.name",
        sc => "sprite.current.name",
        sf => "sprite.frame",
        fl => "flags.facing_left",
      }
    %]

    this.save_state = function()
    {
      try
      {
        return {
          [% FOREACH field IN important_fields %]
            [% field.key %]: this.[% field.value %],
          [% END %]
        }
      }
      catch (e)
      {
        return {}
      }
    }

    Physics.quick_load = function(import_data)
    {
      var result = $.extend(true, {},
        [% FOREACH field IN important_fields %]
          [% new_key = field.value _ ' ' %]
          [%~ PERL %]
            my $k = '[% field.value %] :import_data[% field.key %]';
            while ($k =~ m/[.]/)
            {
              $k =~ s/[.](\w*)(.*)$/: {$1 $2}/;
            }
            $k =~ s/import_data/import_data./;
            print "{$k},\n";
          [%~ END ~%]
        [% END %]
        {
          sprite_img: function()
          {
            if (this.sprite.current == null)
              return $("<img/>").get(0)

            return this.sprite.current.sprite
          },
          sprite_frame: function()
          {
            return floor(this.sprite.frame)
          },
        }
      )

      result.sprite = sprite_catalog[result.sprite.name].clone()
      result.sprite.frame = import_data.sf
      result.sprite.current = result.sprite.animations[import_data.sc]
      return result;
    }

    if ($.isFunction(this.cb_data))
      this.cb_data = this.cb_data()

    if (this.ai != undefined)
    {
      if (!$.isFunction(this.ai))
        throw "ai must be a function in Physics";
      if (!AI.test(this.ai))
        this.ai = new AI(this.ai)
    }

    if (this.callback == undefined)
      this.callback = {}

    this.callback = $.extend({
        start_j: function() {},
        end_j:   function() {},
        start_m: function() {},
        end_m:   function() {},
        frame:   function() {},
        collide: function() {},

        full_collide: null,
        sprite_done:  function() {},
        removed: function() {},
    }, this.callback)

    $.extend(this, {
      is_m: function()
      {
        return this.momentum_l || this.momentum_r
      },
    });

    $.extend(this, {
      add_momentum: function(dir)
      {
        if (dir == "l")
          return this.add_momentum_l()
        if (dir == "r")
          return this.add_momentum_r()
        if (dir == "j")
          return this.add_momentum_j()
      },

      add_momentum_l: function()
      {
        if (this.momentum_r > 0)
        {
          this.momentum_r -= 1
          this.momentum_r = Math.max(this.momentum_r, 0)
        } else {
          this.flags.facing_left = true
          this.momentum_l += 1
          this.momentum_l = Math.min(this.momentum_l, this.max_speed)
        }
      },

      add_momentum_r: function()
      {
        if (this.momentum_l > 0)
        {
          this.momentum_l -= 1
          this.momentum_l = Math.max(this.momentum_l, 0)
        } else {
          this.flags.facing_left = false
          this.momentum_r += 1
          this.momentum_r = Math.min(this.momentum_r, this.max_speed)
        }
      },

      add_momentum_j: function()
      {
        // Ignore jumps if the current jump is as high as they can go
        if (this.current_j < this.max_jump)
        {
          this.momentum_j += 1
          this.momentum_j = Math.min(this.momentum_j, this.max_speed)
        }
      },
    })

    $.extend(this, {
      is_collide: function(round, full)
      {
        full = !!full
        var is_solid = this.flags.solid
        if (full)
          is_solid = true;

        if (!is_solid)
          return false;

        var all_colide = []

        if (round == undefined)
          round = floor;

        if (this.chunk == undefined)
          return;

        var tile_x = round(this.x)
        var tile_y = round(this.y)

        for (var i = tile_x; i < tile_x + this.xw; i++)
          for (var j = tile_y; j < tile_y + this.yh; j++)
          {
            var tile = this.chunk.get_phys(i, j)
            if (tile.solid)
            {
              if (full)
                all_colide.push($.extend({x: i, y: j}, this.chunk.get(i, j)))
              else
                return true;
            }
          }

        // Check all physics
        var xmin = this.x, xmax = this.x + this.xw;
        var ymin = this.y, ymax = this.y + this.yh;

        for (var i = 0; i < all_physics.length; i++)
        {
          if (all_physics[i] == this || all_physics[i] == this.owner || !all_physics[i].flags.solid)
            continue;

          var other = all_physics[i]
          
          // See if the two objects are even close
          if ( floor(this.x - other.x) < 16
            && floor(this.y - other.y) < 16 )
          {
            if ( ( other.x < xmax && other.x + other.xw > xmin )
              && ( other.y < ymax && other.y + other.yh > ymin))
            {
              if (full)
                all_colide.push(other)
              else
                return true;
            }
          }
        }
        if (full)
          return all_colide
        else
          return false
      },
      drop: function()
      {
        var old_y = this.y
        while (old_y > 0 && !this.is_collide())
        {
          old_y = this.y
          this.y--
        }
        var result = this.is_collide(null, true)
        this.y = old_y
        return result
      },

      set_pos_relative: function(relative_x, relative_y)
      {
        var owner = this.owner
        if (owner == undefined || relative_x == undefined || relative_y == undefined)
          return false;

        // Figure out where the corner of the new attack obj is.
        //  If they are facing left, relative_x moved to the other side
        if (!owner.flags.facing_left)
          relative_x += owner.xw;
        else
          relative_x = -relative_x - this.xw

        /*
        this.x = owner.x + (relative_x < 0 ? relative_x - this.xw : relative_x);
        this.y = owner.y + (relative_y < 0 ? relative_y - this.yh : relative_y);
        */

        this.x = owner.x + relative_x;
        this.y = owner.y + relative_y;

        return true;
      },

      set_pos: function()
      {
        var old_pos = {
          y: this.y,
          x: this.x,
          current_j: this.current_j,
        }

        var self = this

        if (this.momentum_l > this.momentum_r)
        {
          this.x += sub_pixel * -this.momentum_l

          while (this.x < old_pos.x)
          {
            if (!self.is_collide(floor))
              break;
            this.x = floor(this.x + 1)
            this.momentum_l = 0
          }
        } else if (this.momentum_l < this.momentum_r) {
          this.x += sub_pixel * this.momentum_r

          while (this.x > old_pos.x)
          {
            if (!self.is_collide(ceil))
              break;
            this.x = ceil(this.x - 1)
            this.momentum_r = 0
          }
        }

        this.y += sub_pixel * this.momentum_j
        this.current_j += sub_pixel * this.momentum_j

        var hit_floor = false

        if (this.momentum_j > 0)
        {
          while (this.y > old_pos.y)
          {
            if (!self.is_collide(ceil))
              break;
            this.y = ceil(this.y - 1)
            this.momentum_j = 0
            this.current_j = this.max_jump
          }
        } else if (this.momentum_j < 0) {
          while (this.y < old_pos.y)
          {
            if (!self.is_collide(floor))
              break;
            this.y = floor(this.y + 1)
            this.momentum_j = 0
            this.current_j = 0
            hit_floor = true
          }
        }

        return { hit_floor: hit_floor }
      },

      frame: function()
      {

        var self = this

        var pos_info = { hit_floor: false }

        // Move the object and check collision
        if ( !this.set_pos_relative(this.relative_x, this.relative_y) )
        {
          pos_info = this.set_pos()
        }

        // Do full processing collision
        if ($.isFunction(this.callback.full_collide))
        {
          this.callback.full_collide.call(this, self.is_collide(floor, true))
        }

        // Handle all the momentums

        // Enact gravity
        if (this.last_frame.momentum_j == this.momentum_j)
        {
          // If they stopped jumping, they have jumped max
          this.current_j = this.max_jump

          if (!pos_info.hit_floor)
          {
            this.momentum_j -= 1
            this.momentum_j = Math.max(this.momentum_j, this.gravity)
          }

          // Don't let the momentum reduction run, we've taken care of it
          this.last_frame.momentum_j = 0
        }

        var m_stats = {
          is_m: this.momentum_l != 0 || this.momentum_r != 0,
          is_j: this.momentum_j != 0,
          was_m: this.last_frame.was_m,
          was_j: this.last_frame.was_j
        }

        // Reduce momentum
        var reduce = function(key, amount)
        {
          if (self.last_frame[key] == self[key])
          {
            self[key] -= amount
            self[key] = Math.max(self[key], 0)
          }
          self.last_frame[key] = self[key]
        }

        if (this.flags.reduce_momentum)
        {
          reduce("momentum_j", 1)
          reduce("momentum_l", 1.5)
          reduce("momentum_r", 1.5)
        }

        this.last_frame.was_m = m_stats.is_m
        this.last_frame.was_j = m_stats.is_j

        // Handle callbacks
        if (!m_stats.was_m && m_stats.is_m)
          this.callback.start_m.call(this)

        if (m_stats.was_m && !m_stats.is_m)
          this.callback.end_m.call(this)

        if (!m_stats.was_j && m_stats.is_j)
          this.callback.start_j.call(this)

        if (m_stats.was_j && !m_stats.is_j)
          this.callback.end_j.call(this)

        this.callback.frame.call(this)

        if (this.ai != undefined)
        {
          this.ai();
        }

        // Handle the sprite/frame
        this.sprite.next_frame(function()
        {
          self.callback.sprite_done.call(self);
        });
      }
    })

    $.extend(this, {
      attack: function(attack_obj, relative_x, relative_y)
      {
        var deferred = $.Deferred();

        relative_x = relative_x || 0
        relative_y = relative_y || 0

        attack_obj = $.extend({
          xw: 2,
          yh: 3,
          gravity: 0,
          speed: null,
          fall: null,

          sprite: "empty",

          solid: false,
          reduce_momentum: true,
        }, attack_obj);

        if (!$.isFunction(attack_obj.collide))
          throw "Must pass a collide test for attack";

        attack_obj.relative_x = null
        attack_obj.relative_y = null

        if (attack_obj.speed == undefined)
        {
          attack_obj.relative_x = relative_x
          attack_obj.relative_y = relative_y
        }

        var frame_number = 0;
        var new_phys = new Physics({
          chunk: this.chunk,
          owner: this,

          xw: attack_obj.xw,
          yh: attack_obj.yh,

          relative_x: attack_obj.relative_x,
          relative_y: attack_obj.relative_y,

          gravity: attack_obj.gravity,

          sprite: attack_obj.sprite,

          callback: {
            full_collide: attack_obj.collide,
            sprite_done: function()
            {
              if (frame_number >= attack_obj.frames)
                remove_physics(this);

              frame_number += attack_obj.frame_inc
            },
            removed: function()
            {
              deferred.resolve()
            },
          },
          flags: {
            solid: attack_obj.solid,
            reduce_momentum: attack_obj.reduce_momentum,
            destroy_with_owner: false,
          },
        });

        if (attack_obj.speed != undefined)
        {
          if (this.flags.facing_left == true)
          {
            new_phys.momentum_l = attack_obj.speed
          }
          else
          {
            new_phys.momentum_r = attack_obj.speed
          }
        }
        if (attack_obj.fall != undefined)
        {
          new_phys.momentum_j = attack_obj.fall
        }

        /*
        if (attack_obj.frames == undefined)
          attack_obj.frames = new_phys.sprite.frames

        if (attack_obj.frame_inc == undefined)
          attack_obj.frame_inc = new_phys.sprite.frame_inc
        */

        new_phys.set_pos_relative(relative_x, relative_y);
        add_physics(new_phys);

        /*
        attack_obj = new Attack(attack_obj, this);

        // Create a new Physics object according to the attack object
        add_physics(attack_obj.make_physics(relative_x, relative_y));
        */

        return deferred.promise();
      },
    });

  }

  var add_physics = function(new_phys)
  {
    if (!(new_phys instanceof Physics))
      throw "Physics elements must be a 'Physics'";

    all_physics.push(new_phys)
    return new_phys.deferred.promise();
  }
  var remove_physics = function(old_phys)
  {
    var remove_one = function(current_phys)
    {
      $.each(all_physics, function(i, phys)
      {
        if (phys == undefined)
          return

        if (phys.flags.destroy_with_owner && phys.owner == current_phys)
        {
          remove_one(phys)
        }
        if (phys == current_phys)
        {
           phys.callback.removed.call(phys);
           phys.deferred.resolve()
           delete all_physics[i]
        }
      })
    }

    remove_one(old_phys)

    fix_all_physics()
  }
  var clear_physics = function()
  {
    for (var phy_obj in all_physics)
    {
      remove_physics(all_physics[phy_obj])
    }
  }

  var process_physics = function()
  {
    for (var phy_obj in all_physics)
    {
      var phys = all_physics[phy_obj]

      if (phys == null)
        continue

      phys.frame()
    }
    return
  }

  var fix_all_physics = function()
  {
    var new_all_physics = []
    for (var phy_obj in all_physics)
    {
      if (all_physics[phy_obj] != undefined)
      {
        new_all_physics.push(all_physics[phy_obj])
      }
    }
    all_physics = new_all_physics
  }
