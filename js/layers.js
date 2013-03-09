  function Layer(options)
  {
    $.extend(this, {
      name: null,
      group_name: null,
      bg: null,
      chunks: null,
      all_physics: [],
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

      for (var phy_obj in self.all_physics)
      {
        context.save()

        try
        {
          var phys = self.all_physics[phy_obj]
          var anim = phys.sprite.current
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

    self.process_physics = function()
    {
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
