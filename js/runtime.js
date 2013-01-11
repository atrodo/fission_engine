  var start_runtime = function() {};
  var stop_runtime  = function() {};
  var runtime_frame = function() {};
  var add_frame_logic = function() {};
  var suspend_physics = function() {};
  var resume_physics = function() {};
  var input

    var zoom = 1;
    var trans_x = 0;
    var trans_y = 0;

  [% IF show_map %]
  zoom = 0.0625;
  trans_x = -4800
  trans_y = 3200
  [% END %]
    var physics_timing = 40
    var draw_timing = 33

    var width  = 640
    var height = 480

  $(function()
  {
    var frames_done = 0;
    var frames_time = 0;
    var phys_done = 0;
    var phys_time = 0;
    var fps_span = $("<span/>")

    var frame_logics = [];
    var run_physics = true

    input = new Input()

    var fps = function()
    {
      fps_span
        .text("Frames Per Second: " + frames_done)
        .append(" Frames total ms: " + frames_time)
        .append(" Frames avg ms: " + ~~(frames_time / frames_done))
        .append("<br>")
        .append("Physics Per Second: " + phys_done)
        .append(" Physics total ms: " + phys_time)
        .append(" Physics avg ms: " + ~~(phys_time / phys_done))

      frames_done = 0
      frames_time = 0
      phys_done = 0
      phys_time = 0
    }

    var canvas = $("<canvas/>")
      .attr("height", height)
      .attr("width", width)
      .css({
        height: height * 1.0,
        width:  width * 1.0,
      })

    content
      .empty()
      .append(canvas)

    // Center of universe
    var cou_source
    var _last_cou

    var repaint = function()
    {
      var frame_start = Date.now();
      frames_done++

      var cou = {
        x: cou_source.x,
        y: cou_source.y,
      }

      /*
      if (_last_cou != undefined)
      {
        var diff_x = cou.x - _last_cou.x
        if (_last_cou.needs_moved || abs(diff_x) > 10)
        {
          cou.x = _last_cou.x + (diff_x / 10)//signed_log(diff_x * 2)
          if (abs(diff_x) > 1)
            cou.needs_moved = true;
        }
      }
      */

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

      frames_time += Date.now() - frame_start;
    }

    [% INCLUDE js/recording.js %]

    var bot = Date.now()
    var last_frame = bot;

    var physics = function(reset_last_frame)
    {
      var phys_start = Date.now()

      var now = Date.now();

      while (last_frame < now)
      {
        phys_done++
        last_frame += physics_timing

        if (run_physics)
        {
          input.frame()
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
      }
      phys_time += Date.now() - phys_start;
    }

    var phys_interval    //= setInterval(physics, physics_timing);
    var repaint_interval //= setInterval(repaint, draw_timing);
    var fps_interval     //= setInterval(fps, 1000);
    var chunks_interval  //= setInterval(paint_chunks, 1000);
    var mon_gen_interval //= setInterval(mon_gen, 1000);

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
      if (repaint_interval)
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

      phys_interval    = setInterval(physics, physics_timing);
      repaint_interval = true;
      //repaint_interval = setInterval(repaint, draw_timing);
      fps_interval     = setInterval(fps, 1000);
      chunks_interval  = setInterval(paint_chunks, 1000);
      mon_gen_interval = setInterval(mon_gen, 1000);
    }

    stop_runtime = function()
    {
      console.log("Runtime stopping")
      clearInterval(phys_interval)
      repaint_interval = false;
      //clearInterval(repaint_interval)
      clearInterval(fps_interval)
      clearInterval(chunks_interval)
      clearInterval(mon_gen_interval)
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

    event_div.bind('fission.preload_done', function()
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

  });
