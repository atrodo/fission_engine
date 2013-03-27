  function Layer(options)
  {
    $.extend(this, {
      name: null,
      group_name: null,
      bg: null,

      all_animations: [],
      chunks: null,
      all_physics: [],

      events: new Events(),

    }, options);

    if (this.name == undefined)
      throw "Must name all Layers";

    var self = this;

    self.repaint = function(stage, cou)
    {
      if (self.bg instanceof Animation)
        stage.draw_animation(self.bg, cou)

      var context = stage.context
      var tiles = runtime.tiles

      for (var anim_obj in self.all_animations)
      {
        context.save()

        try
        {
          var anim = self.all_animations[anim_obj]
          stage.draw_animation(anim, cou)
        }
        catch (e)
        {
          console.log("exception:", e)
        }
        finally
        {
          context.restore()
        }
      }

      for (var phy_obj in self.all_physics)
      {
        context.save()

        try
        {
          var phys = self.all_physics[phy_obj]
          var anim = phys.get_animation()
          anim.x = phys.x
          anim.y = phys.y
          anim.flip_xw = phys.flags.facing_left;
          stage.draw_animation(anim, cou);

          [% IF show_phys_box %]
          var x = (phys.x - cou.x) * tiles.tiles_xw
          var y = (phys.y - cou.y) * tiles.tiles_yh

          context.strokeStyle = "rgba(255, 165, 0, 0.5)"
          context.strokeRect(
            x,
            y,
            phys.xw * tiles.tiles_xw,
            phys.yh * tiles.tiles_yh
          )
          [% END %]
        }
        catch (e)
        {
          console.log("exception:", e)
        }
        finally
        {
          context.restore()
        }
      }
    }

    self.add_animation = function(new_anim)
    {
      if (!(new_anim instanceof Animation))
      {
        new_anim = new Animation($.extend({}, new_anim));
      }

      if ($.inArray(new_anim, self.all_animations) == -1)
        self.all_animations.push(new_anim)
    }

    self.remove_animation = function(old_anim)
    {
      var remove_one = function(current_anim)
      {
        $.each(self.all_animations, function(i, anim)
        {
          if (anim == undefined)
            return

          if (anim.flags.destroy_with_owner && anim.owner == current_anim)
          {
            remove_one(anim)
          }
          if (anim == current_anim)
          {
             delete self.all_animations[i]
             anim.set_layer(null)
          }
        })
      }

      remove_one(old_anim)

      self.all_animations = compact_array(self.all_animations)
    }

    self.add_physics = function(new_phys)
    {
      if (!(new_phys instanceof Physics))
      {
        new_phys = new Physics($.extend({}, new_phys, { layer: self }));
      }

      if ($.inArray(new_phys, self.all_physics) == -1)
        self.all_physics.push(new_phys)
      return new_phys.set_layer(self)
    }

    self.remove_physics = function(old_phys)
    {
      var remove_one = function(current_phys)
      {
        $.each(self.all_physics, function(i, phys)
        {
          if (phys == undefined)
            return

          if (phys.flags.destroy_with_owner && phys.owner == current_phys)
          {
            remove_one(phys)
          }
          if (phys == current_phys)
          {
             delete self.all_physics[i]
             phys.set_layer(null)
          }
        })
      }

      remove_one(old_phys)

      self.all_physics = compact_array(self.all_physics)
    }

    self.process_frame = function()
    {
      self.events.emit('frame_logic')

      for (var anim_obj in self.all_animations)
      {
        var anim = self.all_animations[phy_obj]

        if (anim == null)
          continue

        anim.frame()
      }

      for (var phy_obj in self.all_physics)
      {
        var phys = self.all_physics[phy_obj]

        if (phys == null)
          continue

        phys.frame()
      }
      return
    }

  }
