  function Runtime(options)
  {
    $.extend(this, {
      width:  [% width %],
      height: [% height %],
      trax_x: [% widht / 2 %],
      trax_y: [% height / 2 %],

      //
      chunks: new Chunks(),

      layer_groups: [],

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
    this.fps = floor(1000 / physics_timing)

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
        //context.translate(self.width * (1/2), self.height * (1/2))
        context.translate(0, self.height);
        context.scale(1, -1)

        self.foreach_active_layer(function(layer)
        {
          context.save()
          try
          {
            layer.repaint(stage, cou)
          } catch (e) {
            console.log("exception:", e)
          } finally {
            context.restore()
          }
        })

        context.save()
      } catch (e) {
        console.log("exception:", e)
      } finally {
        context.restore()
      }

      [% END %]
    }

    var bot = Date.now()
    var last_frame = bot;
    var frame_number = 0;

    var physics = function(reset_last_frame)
    {
      var now = Date.now();

      var frames_done = 0

      while (last_frame < now)
      {
        [% WRAPPER per_second name="Physics" %]
        last_frame += physics_timing
        frame_number++

        if (frame_number % (self.fps * 10) == 0)
          warn("Frame: ", frame_number);

        runtime.events.emit('input_frame')

        runtime.events.emit('runtime.frame_logic', last_frame)

        self.foreach_active_layer(function(layer)
        {
          layer.process_frame()
        })

        if (reset_last_frame)
          last_frame = now;

        frames_done++
        if (frames_done > [% bankrupt_frames %])
          last_frame = now;

        [% END %]
      }
    }

    var maintaince = function()
    {
      runtime.events.emit('runtime.maintaince', get_cou())
    }

    $(document).bind("keydown", function(e)
    {
      self.foreach_active_layer(function(layer)
      {
        layer.process_keydown(e)
      })
    })

    $(document).bind("keyup", function(e)
    {
      self.foreach_active_layer(function(layer)
      {
        layer.process_keyup(e)
      })
    })

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

    /* */

    self.get_frame = function()
    {
      return frame_number
    }

    var name_match = /^(\w*)[.](.*)$/
    self.find_group = function(name)
    {
      var name_split = name.match(name_match)
      var group_name = name_split[1]
      var layer_name = name_split[2]

      var group = null;
      $.each(self.layer_groups, function(i, layer_group)
      {
        if (layer_group.name == group_name)
        {
          group = layer_group
          return false
        }
      })

      if (group == null)
      {
        group = { name: group_name, layers: [], active: true, }
        self.layer_groups.push(group)
      }

      return group
    }

    self.find_layer = function(name)
    {
      var name_split = name.match(name_match)
      var group_name = name_split[1]
      var layer_name = name_split[2]

      var group = self.find_group(name)

      var result;

      $.each(group.layers, function(i, layer)
      {
        if (layer.name == layer_name)
        {
          result = layer
          return false;
        }
      })

      return result
    }

    self.add_layer = function(name, layer)
    {
      var name_split = name.match(name_match)
      var group_name = name_split[1]
      var layer_name = name_split[2]

      var group = self.find_group(name)

      if (!(layer instanceof Layer) && $.type(layer) == "object")
      {
        $.extend(layer, {name: layer_name, group_name: group.name})
        layer = new Layer(layer)
      }

      layer.group_name = group.name

      group.layers.push(layer)

      return layer
    }

    self.deactivate_group = function(name)
    {
      var group = self.find_group(name)
      group.active = false;
    }

    self.foreach_active_layer = function(callback)
    {
      $.each(self.layer_groups, function(i, group)
      {
        if (group.active)
        {
          $.each(group.layers, function(i, layer)
          {
            if (layer.active)
            {
              callback(layer);
            }
          });
        }
      });
    }

    self.start_runtime = function()
    {
      self.stop_runtime();
      console.log("Runtime starting")

      bot = Date.now()
      last_frame = bot

      maintain_interval  = setInterval(maintaince, 1000);
      phys_interval    = setInterval(physics, physics_timing);
      process_painting = true;

      self.events.emit('start_runtime');
    }

    self.stop_runtime = function()
    {
      console.log("Runtime stopping")
      clearInterval(maintain_interval)
      clearInterval(phys_interval)
      process_painting = false;

      self.events.emit('stop_runtime');
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
