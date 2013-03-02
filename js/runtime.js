  function Runtime(options)
  {
    $.extend(this, {
      width:  640,
      height: 480,

      chunks: new Chunks(),
      events: engine.events,

      tiles:  new Tiles({
        background: "[% tiles_bg %]",
        foreground: "[% tiles_fg %]",

        tiles_bd: [% tiles_bd %],
        tiles_xw: [% tiles_xw %],
        tiles_yh: [% tiles_yh %],
      })

    }, options);

    var self = this;

    var physics_timing = 40

    [% IF show_timings %]
    var fps_span = $("<span/>")
    var fps = function()
    {
      var table = $("<table class='table table-striped table-condensed'/>")
      fps_span
        .empty()
        .append(table)

      table.append($("<tr/>")
        .append($("<th/>").text("Metric"))
        .append($("<th/>").text("Per Second"))
        .append($("<th/>").text("Total (ms)"))
        .append($("<th/>").text("Avg (ms)"))
      )

      var timing_names = Object.keys(timings).sort()
      for (var i = 0; i < timing_names.length; i++)
      {
        var name = timing_names[i]
        var timing = timings[name] || { done: 0, time: 0}
        table.append($("<tr/>")
          .append($("<th/>").text(name))
          .append($("<th/>").text(timing.done))
          .append($("<th/>").text(timing.time))
          .append($("<th/>").text(floor(timing.time / timing.done)))
        )
        timings[name] = null
      }
    }
    var fps_interval     = setInterval(fps, 1000);
    [% END %]

    var frame_logics = [];
    var run_physics = true

    var stage = new Gfx(self.width, self.height)

    content
      .empty()
      .append(stage.canvas)
      [% IF show_timings %]
      .append(fps_span)
      [% END %]

    // Center of universe
    var get_cou = function()
    {
      var cou_source = runtime.events.call("runtime.cou_source") || {}
      var cou = {
        x: cou_source.x || 0,
        y: cou_source.y || 0,
      }
      return cou;
    }

    var repaint = function()
    {
      [% WRAPPER per_second name="Frame" %]

      var cou = get_cou()
      var chunks = self.chunks
      var tiles = self.tiles

      var chunk_x_mid = chunks.chunk_xw >> 1
      var chunk_y_mid = chunks.chunk_yh >> 1

      var cou_chunk = chunks.get_chunk_for(cou.x, cou.y) || {}

      // Check all of the cardinal directions to stop from scrolling into
      //  unseen areas
      if (cou_chunk.solid_n)
      {
        if (cou.y - chunk_y_mid > cou_chunk.meta.chunk_y * chunks.chunk_yh)
          cou.y = cou_chunk.meta.chunk_y * chunks.chunk_yh + chunk_y_mid
      }
      if (cou_chunk.solid_s)
      {
        if (cou.y - chunk_y_mid < cou_chunk.meta.chunk_y * chunks.chunk_yh)
          cou.y = cou_chunk.meta.chunk_y * chunks.chunk_yh + chunk_y_mid
      }
      if (cou_chunk.solid_e)
      {
        if (cou.x - chunk_x_mid > cou_chunk.meta.chunk_x * chunks.chunk_xw)
          cou.x = cou_chunk.meta.chunk_x * chunks.chunk_xw + chunk_x_mid
      }
      if (cou_chunk.solid_w)
      {
        if (cou.x - chunk_x_mid < cou_chunk.meta.chunk_x * chunks.chunk_xw)
          cou.x = cou_chunk.meta.chunk_x * chunks.chunk_xw + chunk_x_mid
      }

      var context = stage.context

      context.restore()
      context.clearRect(0, 0, self.width, self.height)
      context.save()

      try
      {
        context.save()
        context.translate(self.width * (1/2), self.height * (1/2))
        context.scale(1, -1)

        $.each(runtime.events.emit('repaint.background', cou), function()
        {
          var backgrounds = this
          if (!$.isArray(backgrounds))
            backgrounds = [backgrounds]
          stage.draw_animations(backgrounds, cou)
        })

        $.each(runtime.events.emit('repaint.chunks_bg', cou), function()
        {
          var paints = this
          if (!$.isArray(paints))
            paints = [paints]
          stage.draw_animations(paints, cou)
        })

        for (var phy_obj in all_physics)
        {
          context.save()

          try
          {
            var phys = all_physics[phy_obj]
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

        $.each(runtime.events.emit('repaint.chunks_fg', cou), function()
        {
          var paints = this
          if (!$.isArray(paints))
            paints = [paints]
          stage.draw_animations(paints, cou)
        })

        context.restore()

        /*
        for (var hud_obj in all_huds)
        {
          try
          {
            var hud = all_huds[hud_obj]
            var img = hud.animation.get_img()
            if (img != undefined)
            {
              context.drawImage(
                img,
                hud.x,
                hud.y
              )
            }
          }
          catch (e)
          {
            console.log("exception:", e)
            //console.log(" ==> ", e.get_stack())
          }
        }
        */

        context.save()

      } catch (e) {
        console.log("exception:", e)
      } finally {
        context.restore()
      }

      [% END %]
    }

    [% INCLUDE js/recording.js %]

    var bot = Date.now()
    var last_frame = bot;

    var physics = function(reset_last_frame)
    {
      var now = Date.now();

      while (last_frame < now)
      {
        [% WRAPPER per_second name="Physics" %]
        last_frame += physics_timing

        if (run_physics)
        {
          runtime.events.emit('input_frame')
          process_physics()
        }

        runtime.events.emit('runtime.frame_logic', last_frame)

        if (reset_last_frame)
          last_frame = now;

        [% IF record %]
          var frame = [];
          for (var phy_obj in all_physics)
          {
            var phys = all_physics[phy_obj]

            if (phys == null)
              continue

            frame.push(phys.save_state())
          }
          var row = {
            c: $.extend({}, flushed_chunks),
            p: frame,
          };
          if (cou != undefined)
          {
            row.cou = {
              x: cou.x,
              y: cou.y,
            }
          }

          record_data += ",\n" + JSON.stringify(row)

          flushed_chunks = {}
        [% END %]

        [% END %]
      }
    }

    var maintaince = function()
    {
      runtime.events.emit('runtime.maintaince', get_cou())
    }

    var maintain_interval
    var phys_interval
    var process_painting = false

    var anim_frame =
      window.requestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      function(callback)
      {
        window.setTimeout(callback, 33);
      };

    var frame_requested = function()
    {
      if (process_painting)
      try
      {
        repaint()
      }
      catch (e) { warn(e) }
      anim_frame(frame_requested)
    }
    anim_frame(frame_requested)

    self.start_runtime = function()
    {
      self.stop_runtime();
      console.log("Runtime starting")

      bot = Date.now()
      last_frame = bot

      maintain_interval  = setInterval(maintaince, 1000);
      phys_interval    = setInterval(physics, physics_timing);
      process_painting = true;
    }

    self.stop_runtime = function()
    {
      console.log("Runtime stopping")
      clearInterval(maintain_interval)
      clearInterval(phys_interval)
      process_painting = false;
    }

    self.events.on('preload_done', function()
    {
      self.start_runtime()
    });

    self.runtime_frame = function()
    {
      physics(true);
      repaint();
    }

    self.suspend_physics = function() { run_physics = false };
    self.resume_physics = function() { run_physics = true };

  }
  var runtime = new Runtime()
