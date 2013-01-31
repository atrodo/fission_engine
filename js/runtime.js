  var start_runtime = function() {};
  var stop_runtime  = function() {};
  var runtime_frame = function() {};
  var add_frame_logic = function() {};
  var suspend_physics = function() {};
  var resume_physics = function() {};

    var zoom = 1;
    var trans_x = 0;
    var trans_y = 0;

  [% IF show_map %]
  zoom = 0.0625;
  trans_x = -4800
  trans_y = 3200
  [% END %]

    var width  = 640
    var height = 480
  function Runtime(options)
  {
    $.extend(this, {
      width:  640,
      height: 480,

      events: new Events(),
    }, options);

    var self = this;

    var physics_timing = 40

    [% IF show_timings %]
    var fps_span = $("<span/>")
    var fps = function()
    {
      fps_span
        .empty()

      var timing_names = Object.keys(timings).sort()
      for (var i = 0; i < timing_names.length; i++)
      {
        var name = timing_names[i]
        var timing = timings[name] || { done: 0, time: 0}
        fps_span
          .append(" " + name + " Per Second: " + timing.done)
          .append(" " + name + " total ms: " + timing.time)
          .append(" " + name + " avg ms: " + floor(timing.time / timing.done))
          .append("<br/>")
        timings[name] = null
      }
    }
    var fps_interval     = setInterval(fps, 1000);
    [% END %]

    var frame_logics = [];
    var run_physics = true

    var canvas = $("<canvas/>")
      .attr("height", height)
      .attr("width", width)
      .css({
        height: height * 1.0,
        width:  width * 1.0,
      })

    content
      .empty()
      [% IF show_timings %]
      .append(fps_span)
      .append("<br/>")
      [% END %]
      .append(canvas)

    // Center of universe
    var cou_source
    var _last_cou

    var draw_animation = function(context, cou, anim)
    {
      if (!(anim instanceof Animation))
        throw new Error("Can only draw an Animation")

      context.save()

      try
      {
        var x = anim.frame_x
        var y = anim.frame_y

        if (x == undefined)
          x = ((anim.x - cou.x) * tiles.tiles_xw)
        if (y == undefined)
          y = ((anim.y - cou.y) * tiles.tiles_yh)

        var img = anim.get_gfx()

        if (anim.flip_xw)
        {
          context.scale(-1, 1)
          context.translate(-anim.center, 0)
          x = -x
        }

        context.drawImage(
          anim.get_gfx().canvas,
          x - anim.trim_s,
          y - anim.trim_b,
          anim.xw,
          anim.yh
        )
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

    var draw_animations = function(context, cou, anims)
    {
      if (!$.isArray(anims))
        throw new Error("Must pass an array to 'draw_animations'");

      $.each(anims, function(i, anim)
      {
        try
        {
          draw_animation(context, cou, anim);
        } catch(e) { console.log(e) };
      })
    }

    var repaint = function()
    {
      [% WRAPPER per_second name="Frame" %]

      var cou = {
        x: cou_source.x,
        y: cou_source.y,
      }

      var chunk_x_mid = chunks.chunk_xw >> 1
      var chunk_y_mid = chunks.chunk_yh >> 1

      var cou_chunk = chunks.get_chunk_for(cou.x, cou.y)

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

      _last_cou = cou

      var context = canvas.get(0).getContext("2d")

      context.restore()
      context.clearRect(0, 0, width, height)
      context.save()

      context.scale(zoom, zoom);

      try
      {
        $.each(runtime.events.emit('repaint.background', cou), function()
        {
          var backgrounds = this
          if (!$.isArray(backgrounds))
            backgrounds = [backgrounds]
          draw_animations(context, cou, backgrounds)
        })

        context.save()
        context.translate(width * (1/2), height * (1/2))
        context.scale(1, -1)

        $.each(runtime.events.emit('repaint.chunks_bg', cou), function()
        {
          var paints = this
          if (!$.isArray(paints))
            paints = [paints]
          draw_animations(context, cou, paints)
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
            draw_animation(context, cou, anim);

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
          draw_animations(context, cou, paints)
        })

        context.restore()

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

        for (var fl_obj in frame_logics)
        {
          try
          {
            frame_logics[fl_obj](last_frame);
          }
          catch (e)
          {
            console.log("exception:", e)
          }
        }

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

    var chunks_interval  //= setInterval(paint_chunks, 1000);
    var phys_interval    //= setInterval(physics, physics_timing);
    var process_painting = false

    var anim_frame =
      window.requestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      function(callback)
      {
        window.setTimeout(callback, 33);
      };

    var _xw_trans = (width  * (2/8)) - ( width  / 2 )
    var _yh_trans = (height * (3/8)) - ( height / 2 )

    var frame_requested = function()
    {
      if (process_painting)
      try
      {
        var x_offset = (_xw_trans / tiles.tiles_xw)
        var y_offset = (_yh_trans / tiles.tiles_yh)

        if (user.flags.facing_left)
          x_offset = -x_offset

        cou_source =
        {
          x: user.x ,//- x_offset,
          y: user.y ,//- y_offset,
        }
        repaint()
      }
      catch (e) {}
      anim_frame(frame_requested)
    }
    anim_frame(frame_requested)

    start_runtime = function()
    {
      stop_runtime();
      console.log("Runtime starting")

      bot = Date.now()
      last_frame = bot

      chunks_interval  = setInterval(paint_chunks, 1000);
      phys_interval    = setInterval(physics, physics_timing);
      process_painting = true;
    }

    stop_runtime = function()
    {
      console.log("Runtime stopping")
      clearInterval(chunks_interval)
      clearInterval(phys_interval)
      process_painting = false;
    }

    [% IF debug %]
      content
        .append("<br/>")
        .append($("<button/>")
          .text("Start")
          .click(start_runtime)
        )
        .append($("<button/>")
          .text("Stop")
          .click(stop_runtime)
        )
    [% END %]

    self.events.on('preload_done', function()
    {
      chunks.flush()
      paint_chunks()
      start_runtime()
    });

    runtime_frame = function()
    {
      physics(true);
      repaint();
    }

    add_frame_logic = function(new_fl)
    {
      if (!$.isFunction(new_fl))
        throw "add_frame_logic only accepts functions";

      frame_logics.push(new_fl);
    }

    suspend_physics = function() { run_physics = false };
    resume_physics = function() { run_physics = true };

  }
  var runtime = new Runtime()
