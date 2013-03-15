  function Physics(options, extra)
  {
    var sub_pixel = 1/8

    $.extend(true, this, {
      x: 100,
      y: 101,
      xw: 3,
      yh: 3,

      max_jump: 6,
      min_momentum_x: 0,
      max_momentum_x: 10,
      min_momentum_y: -9,
      max_momentum_y: 10,

      momentum_y: 0,
      momentum_x: 0,
      current_j: 0,

      layer: null,

      // The physics that created this object
      owner: null,
      relative_x: null,
      relative_y: null,

      next_frame: {
        momentum_y: false,
        momentum_x: false,
        min_momentum_x: false,
        max_momentum_x: false,
        min_momentum_y: false,
        max_momentum_y: false,
      },

      animation: null,
      input: new Input(),
      ai: null,

      deferred: $.Deferred(),

      flags: {
        facing_left: false,
        upside_down: false,
        solid: true,
        reduce_momentum: true,
        destroy_with_owner: true,
      },
    }, options, extra || {})

    if ($.isFunction(this.animation))
    {
      this.animation = new Animation({
        xw: this.xw * [% tiles_xw %],
        yh: this.yh * [% tiles_yh %],
        get_gfx: this.animation,
      })
    }

    if (!(this.animation instanceof Animation))
    {
      if (this.animation == undefined)
        throw "Physics Animation must be passed";

      if (!$.isFunction(this.animation.get_animation) && !$.isFunction(this.animation.frame))
      throw "Invalid Physics Animation, missing get_animation() or frame()";
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
        removed: function() {},
    }, this.callback)

    $.extend(this, {
      is_m: function()
      {
        return this.momentum_x != 0
      },

      ultimate_owner: function()
      {
        var result = this.owner
        if (result != undefined)
          while (result.owner != undefined)
            result = result.owner;
        return result
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

        for (var i = 0; i < this.layer.all_physics.length; i++)
        {
          if (this.layer.all_physics[i] == this || this.layer.all_physics[i] == this.owner || !this.layer.all_physics[i].flags.solid)
            continue;

          var other = this.layer.all_physics[i]

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
        var y_dir = this.flags.upside_down ? -1 : 1

        x_dir *= this.momentum_x < 0 ? -1 : 1
        y_dir *= this.momentum_y < 0 ? -1 : 1

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

        var momentum_bounds = {
          min_momentum_x: false,
          max_momentum_x: false,
          min_momentum_y: false,
          max_momentum_y: false,
        }

        if (self.next_frame.min_momentum_x !== false
            && self.next_frame.max_momentum_x === false)
        {
          self.next_frame.max_momentum_x = self.max_momentum_x + self.next_frame.min_momentum_x
        }

        if (self.next_frame.min_momentum_y !== false
            && self.next_frame.max_momentum_y === false)
        {
          self.next_frame.max_momentum_y = self.max_momentum_y + self.next_frame.min_momentum_y
        }

        $.each(momentum_bounds, function(k, v)
        {
          momentum_bounds[k] = self.next_frame[k] || self[k]
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

        if (this.callback.full_collide instanceof Events)
        {
          [% WRAPPER scope %]
          var buckets = {
            all_objects: [],
            all_physics: [],
            all_tiles: [],
            unrelated_physics: []
          }

          var full_collide = self.callback.full_collide
          $.each(buckets, function(bucket)
          {
            if (!full_collide.exists(bucket))
              delete buckets[bucket]
          })

          if (count_object_keys(buckets) != 0)
          {
            var all_objects = self.is_collide(true)

            var ultimate_owner = self.ultimate_owner()

            $.each(all_objects, function(i, obj)
            {
              if (buckets.all_objects)
                buckets.all_objects.push(obj)
              if (buckets.all_physics && (obj instanceof Physics))
                buckets.all_physics.push(obj)
              if (buckets.all_tiles && !(obj instanceof Physics))
                buckets.all_tiles.push(obj)
              if (ultimate_owner && buckets.unrelated_physics
                  && (obj instanceof Physics)
                  && ultimate_owner != obj.ultimate_owner()
                 )
                buckets.unrelated_physics.push(obj)
            })

            $.each(buckets, function(bucket, bucket_objs)
            {
              if (bucket_objs.length > 0)
                full_collide.emit(bucket, bucket_objs)
            })
          }
          [% END %]
        }

        // Handle callbacks
        var was_m = this.is_m();

        // Handle all the momentums
        if (this.flags.reduce_momentum)
        {
          if (!this.next_frame.momentum_x)
          {
            if (pos_info.hit_floor)
              this.momentum_x -= 2
            else
              this.momentum_x -= 1
          }
          else
          {
            this.momentum_x += this.next_frame.momentum_x
          }

          if (pos_info.hit_wall)
          {
            this.momentum_x = 0
          }

          this.momentum_x = min(this.momentum_x, momentum_bounds.max_momentum_x)
          this.momentum_x = max(momentum_bounds.min_momentum_x, this.momentum_x)

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
            this.momentum_y = min(this.momentum_y, momentum_bounds.max_momentum_y)
            this.momentum_y = max(momentum_bounds.min_momentum_y, this.momentum_y)
          }
          else
          {
            this.momentum_y += this.next_frame.momentum_y
          }
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
        this.animation.frame()

        this.next_frame = {
          momentum_x: false,
          momentum_y: false,
          min_momentum_x: false,
          max_momentum_x: false,
          min_momentum_y: false,
          max_momentum_y: false,
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
          min_momentum_y: 0,
          speed: null,
          fall: null,

          //animation: "empty",

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

          min_momentum_y: attack_obj.min_momentum_y,

          //sprite: attack_obj.sprite,

          callback: {
            full_collide: attack_obj.collide,
            /*
            sprite_done: function()
            {
              if (frame_number >= attack_obj.frames)
                remove_physics(this);

              frame_number += attack_obj.frame_inc
            },
            */
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

    this.get_animation = function()
    {
      if (this.animation instanceof Animation)
        return this.animation
      return this.animation.get_animation()
    }

    this.set_layer = function(new_layer)
    {
      if (new_layer == this.layer)
        return this.deferred.promise();

      var old_layer = this.layer

      this.layer = null

      if (old_layer instanceof Layer)
      {
        old_layer.remove_physics(this);
      }

      if (new_layer == null && old_layer != null)
      {
        this.callback.removed.call(this);
        this.deferred.resolve()
        return;
      }

      if (!(new_layer instanceof Layer))
        throw new Error("Must pass a Layer to set_layer")

      this.layer = new_layer;

      return this.deferred.promise();
    }

    if (this.layer != null)
    {
      var new_layer = this.layer
      this.layer = null
      this.set_layer(new_layer)
    }

    this.callback.init.call(this)

  }
