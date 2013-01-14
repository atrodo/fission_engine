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
    var timings = {}
    var fps_span = $("<span/>")
    var fps = function()
    {
      fps_span
        .empty()

      var timing_names = Object.keys(timings).sort()
      for (var i = 0; i < timing_names.length; i++)
      {
        var name = timing_names[i]
        var timing = timings[name]
        fps_span
          .append(" " + name + " Per Second: " + timing.done)
          .append(" " + name + " total ms: " + timing.time)
          .append(" " + name + " avg ms: " + floor(timing.time / timing.done))
          .append("<br/>")
      }

      timings = {}
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
        context.save()
        context.translate(-cou.x * tiles.tiles_xw >> 3, cou.y * tiles.tiles_yh >> 3)
        context.drawImage(
          preload_images.background,
          0,
          -500
        )
        context.restore()

        context.save()
        context.translate(width * (1/2), height * (1/2))
        context.translate(-trans_x + -cou.x * tiles.tiles_xw, trans_y + cou.y * tiles.tiles_yh)
        context.scale(1, -1)

        var mul_x = tiles.tiles_xw * chunks.chunk_xw
        var mul_y = tiles.tiles_yh * chunks.chunk_yh

        for (var painted_chunk in loaded_chunks)
        {
          painted_chunk = loaded_chunks[painted_chunk]
          context.drawImage(
            painted_chunk.data,
            painted_chunk.x * mul_x,
            painted_chunk.y * mul_y
          )
        }

        context.restore()
        context.save()
        context.translate(width * (1/2), height * (1/2))
        context.scale(1, -1)

        for (var phy_obj in all_physics)
        {
          context.save()

          try
          {
            var phys = all_physics[phy_obj]
            var sprite = phys.sprite.current

            var x = (phys.x - cou.x) * tiles.tiles_xw
            var y = (phys.y - cou.y) * tiles.tiles_yh

            // If they are too far off the screen, don't bother with them
            if (Math.abs(x) > width * 2 || Math.abs(y) > height * 2)
              continue

            if (phys.flags.facing_left)
            {
              context.scale(-1, 1)
              context.translate(-sprite.center, 0)
              x = -x
            }

            [% IF show_phys_box %]
            context.strokeStyle = "rgba(255, 165, 0, 0.5)"
            context.strokeRect(
              x,
              y,
              phys.xw * tiles.tiles_xw,
              phys.yh * tiles.tiles_yh
            )
            [% END %]

            context.drawImage(
              phys.sprite.img(),
              phys.sprite.current_frame() * sprite.xw,
              0,
              sprite.xw,
              sprite.yh,
              x - sprite.trim_s,
              y - sprite.trim_b,
              sprite.xw,
              sprite.yh
            )
          }
          catch (e)
          {
            console.log("exception:", e)
            //console.log(" ==> ", e.get_stack())
          }
          finally
          {
            context.restore()
          }
        }

        context.restore()

        context.save()
        context.translate(width * (1/2), height * (1/2))
        context.translate(-trans_x + -cou.x * tiles.tiles_xw, trans_y + cou.y * tiles.tiles_yh)
        context.scale(1, -1)

        var mul_x = tiles.tiles_xw * chunks.chunk_xw
        var mul_y = tiles.tiles_yh * chunks.chunk_yh

        for (var painted_chunk in loaded_chunks)
        {
          painted_chunk = loaded_chunks[painted_chunk]
          context.drawImage(
            painted_chunk.fg,
            painted_chunk.x * mul_x,
            painted_chunk.y * mul_y
          )
        }

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

[% BLOCK per_second %]
  [% DEFAULT name="Misc" %]
  [% IF show_timings %]
    if (timings["[% name %]"] == undefined)
      timings["[% name %]"] = {time: 0, done: 0}
    var timing_start = Date.now();

    [% content %]

    timings["[% name %]"].time += Date.now() - timing_start;
    timings["[% name %]"].done++
  [% ELSE %]
    [% content %]
  [% END %]
[% END %]
