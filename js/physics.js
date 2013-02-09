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

      momentum_y: 0,
      momentum_x: 0,
      current_j: 0,

      // The physics that created this object
      owner: null,
      relative_x: null,
      relative_y: null,

      next_frame: {
        momentum_y: false,
        momentum_x: false,
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
        init: function() {},
        sprite_done:  function() {},
        removed: function() {},
    }, this.callback)

    $.extend(this, {
      is_m: function()
      {
        return this.momentum_x != 0
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
        this.momentum_x = floor(this.momentum_x)
        if (this.momentum_x == 0)
          this.flags.facing_left = true

        if (this.flags.facing_left)
        {
          this.next_frame.momentum_x = 1
        }
        else
        {
          // Converge to zero
          this.next_frame.momentum_x = (this.momentum_x < 0 ? 1 : -1)
        }
      },

      add_momentum_r: function()
      {
        this.momentum_x = floor(this.momentum_x)
        if (this.momentum_x == 0)
          this.flags.facing_left = false

        if (!this.flags.facing_left)
        {
          this.next_frame.momentum_x = 1
        }
        else
        {
          // Converge to zero
          this.next_frame.momentum_x = (this.momentum_x < 0 ? 1 : -1)
        }
      },

      add_momentum_j: function()
      {
        this.next_frame.momentum_y = 1
      },
    })

    $.extend(this, {
      is_collide: function(full)
      {
        full = !!full
        var is_solid = this.flags.solid
        if (full)
          is_solid = true;

        if (!is_solid)
          return false;

        var all_colide = []

        var chunks = runtime.chunks

        for (var i = floor(this.x); i < this.x + this.xw; i++)
          for (var j = floor(this.y); j < this.y + this.yh; j++)
          {
            var tile = chunks.get_phys(i, j)
            if (tile.solid)
            {
              // Check slope
              var fail_slope = true;

              // bl
              if (tile.angle_bl && i == floor(this.x) && j == floor(this.y))
              {
                var slope = (this.y - j) / (this.x - (i + 1))
                if (slope < -1)
                  fail_slope = false
              }

              // br
              if (tile.angle_br && i == floor(this.x + this.xw) && j == floor(this.y))
              {
                var slope = (this.y - j) / ((this.x + this.xw) - i)
                if (slope > 1)
                  fail_slope = false
              }

              if (fail_slope)
              {
                if (full)
                  all_colide.push($.extend({x: i, y: j}, chunks.get(i, j)))
                else
                  return true
              }
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

          if ( ( other.x < xmax && other.x + other.xw > xmin )
            && ( other.y < ymax && other.y + other.yh > ymin))
          {
            if (full)
              all_colide.push(other)
            else
              return true;
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
        var result = this.is_collide(true)
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

        this.x = owner.x + relative_x;
        this.y = owner.y + relative_y;

        return true;
      },

      set_pos: function()
      {
        var self = this
        var result = {
          hit_wall: false,
          hit_floor: false,
          hit_ceiling: false,
        }

        var orig_x = this.x
        var orig_y = this.y

        var x_dir = this.flags.facing_left ? -1 : 1
        var y_dir = this.momentum_y <= 0 ? -1 : 1

        var x_distance = abs(sub_pixel * this.momentum_x)
        var y_distance = abs(sub_pixel * this.momentum_y)

        var facing_left = this.flags.facing_left

        // Check to see if they were on the floor
        var was_on_floor = false

        if (y_dir < 0)
        {
          this.y -= sub_pixel
          var collide = self.is_collide()
          if (self.is_collide())
            was_on_floor = true
          this.y += sub_pixel
        }

        // While the x_distance is non-zero,
        while (x_distance > 0)
        {
          // Move them no more than 1 tile = distance
          var distance = min(x_distance, 1);
          this.x += x_dir * distance
          x_distance -= distance

          // If they started on the floor
          if (was_on_floor)
          {
            var move_y = 0
            var move_slope_y_dir = -1
            var was_colliding = self.is_collide()

            if (was_colliding)
              move_slope_y_dir = 1

            // Attempt to move them y no more than distance
            while (move_y <= distance)
            {
              this.y += move_slope_y_dir * sub_pixel
              if (self.is_collide() != was_colliding)
                break;
              move_y += sub_pixel
            }

            if (move_y > distance)
            {
              // If they don't hit the floor (check +subpixel), undo y movement
              this.y -= move_slope_y_dir * distance
            }

            if (self.is_collide())
            {
              // If they are currently collide, backup 1 subpixel
              this.y -= move_slope_y_dir * sub_pixel
            }
          }

          // Then check collision. Collision means they've hit a wall
          if (self.is_collide())
          {
            result.hit_wall = true
            break;
          }
        }

        while (self.is_collide() && this.x != orig_x)
        {
          this.x -= x_dir * sub_pixel
        }

        var old_y_pos = this.y

        // Move them the y_distance stepping at most 1 tile
        while (y_distance > 0)
        {
          // Move them no more than 1 tile = distance
          var distance = min(y_distance, 1);
          this.y += y_dir * distance
          y_distance -= distance

          // Then check collision. Collision means they've hit the floor
          if (self.is_collide())
          {
            if (y_dir > 0)
              result.hit_ceiling = true
            else
              result.hit_floor = true
            break;
          }
        }

        while (self.is_collide() && this.y != orig_y)
        {
          this.y -= y_dir * sub_pixel
        }

        if  (y_dir > 0)
          this.current_j += this.y - old_y_pos

        return result
      },

      frame: function()
      {

        var self = this

        var pos_info = { hit_floor: false }
        var m_stats = {}

        m_stats = $.extend(m_stats, {
          was_m: this.momentum_x != 0,
          was_j: this.momentum_y != 0,
        })

        // Move the object and check collision
        if ( !this.set_pos_relative(this.relative_x, this.relative_y) )
        {
          pos_info = this.set_pos()
        }

        // Do full processing collision
        if ($.isFunction(this.callback.full_collide))
        {
          this.callback.full_collide.call(this, self.is_collide(true))
        }

        // Handle callbacks
        var was_m = this.is_m();

        // Handle all the momentums
        if (!this.next_frame.momentum_x)
        {
          if (pos_info.hit_floor)
            this.momentum_x -= 2
          else
            this.momentum_x -= 1
          this.momentum_x = Math.max(this.momentum_x, 0)
        }
        else
        {
          this.momentum_x += this.next_frame.momentum_x
        }

        if (pos_info.hit_wall)
        {
          this.momentum_x = 0
        }

        this.momentum_x = Math.min(this.momentum_x, this.max_speed)

        if (pos_info.hit_floor)
        {
          this.momentum_y = 0
          this.current_j = 0
        }
        if (pos_info.hit_ceiling)
        {
          this.momentum_y = 0
          this.current_j = this.max_jump
        }

        var at_max_jump = this.current_j >= this.max_jump
        if (!this.next_frame.momentum_y || at_max_jump)
        {
          this.current_j = this.max_jump
          this.momentum_y -= 1
          this.momentum_y = Math.max(this.momentum_y, this.gravity)
        }
        else
        {
          this.momentum_y += this.next_frame.momentum_y
        }

        m_stats = $.extend(m_stats, {
          is_m: this.momentum_x != 0,
          is_j: this.momentum_y != 0,
        })

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

        this.next_frame = {
          momentum_x: false,
          momentum_y: false,
        }

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
          throw new Error("Must pass a collide test for attack");

        attack_obj.relative_x = null
        attack_obj.relative_y = null

        if (attack_obj.speed == undefined)
        {
          attack_obj.relative_x = relative_x
          attack_obj.relative_y = relative_y
        }

        var frame_number = 0;
        var new_phys = new Physics({
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
          new_phys.momentum_x = attack_obj.speed
        }
        if (attack_obj.fall != undefined)
        {
          new_phys.momentum_y = attack_obj.fall
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

    this.callback.init.call(this)

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
