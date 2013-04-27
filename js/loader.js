  [% WRAPPER scope %]
    var loaded_chunks = {}
    var load_order = [];
    [% WRAPPER scope %]
      var range = ceil( ( [% chunk_draw_range %] - 1 ) / 2);
      for (var x = -range; x <= range; x++)
        for (var y = -range; y <= range; y++)
        {
          load_order.push({x: x, y: y})
        }
      load_order = load_order.sort(function(a, b)
      {
        return (a.x*a.x + a.y*a.y) - (b.x*b.x + b.y*b.y)
      })

      // Chunks are loaded with unshift, so last one we check will
      //  be the first one in the queue
      load_order.reverse()
    [% END %]

    var to_paint = []

    var paint_chunks = function(cou)
    {
      if (!runtime.tiles.loaded)
        return;

      var tiles = runtime.tiles
      var chunks = runtime.chunks
      var start = Date.now()

      var cou = cou || {}

      // Find our chunks
      var x_chunk = floor((cou.x || 0) / chunks.chunk_xw)
      var y_chunk = floor((cou.y || 0) / chunks.chunk_yh)

      var unseen = {}
      $.each(loaded_chunks, function(k)
      {
        unseen[k] = true
      })

      var added = 0;
      var removed = 0;

      $.each(load_order, function(i, load)
      {
        var x = x_chunk + load.x
        var y = y_chunk + load.y

        delete unseen[x + "_" + y]

        if (loaded_chunks[x + "_" + y] != undefined)
          return

        if (chunks.has_chunk(x, y) == false)
          return;

        added++

        to_paint.unshift({ x: x, y: y})
      })

      $.each(unseen, function(k) { removed++; delete loaded_chunks[k] });

      if (added != 0 || removed != 0)
      {
        console.log(loaded_chunks)
        console.log(to_paint)

        var finish = Date.now()
        console.log((finish - start) / 1000, "seconds, ", added, " Added, ", removed, " Removed");
      }
    }

    var paint_interval = window.setInterval(function()
    {
      if (to_paint.length == 0)
      {
        runtime.events.emit('painted_chunks', count_object_keys(loaded_chunks));
        return;
      }

      var start = Date.now()
      var done = 0;

      $.each(to_paint, function(i, load)
      {
        if (Date.now() > start + [% max_do_aux %])
          return false;

        maybe_paint_one(load.x, load.y);

        done = i+1;
      });

      to_paint.splice(0, done);

      var finish = Date.now()
      console.log((finish - start) / 1000, "seconds, ", done, " Painted");
      runtime.events.emit('painted_chunks', count_object_keys(loaded_chunks));

    }, [% paint_chunk_interval %]);

    var paint_one = function(chunk_x, chunk_y)
    {
      var chunk = runtime.chunks.get_chunk(chunk_x, chunk_y)

      if (chunk == undefined)
        return

      var tiles = runtime.tiles

      // TODO: This cuts off each chunk edge by tiles.tiles_bd
      var xw = tiles.tiles_xw * runtime.chunks.chunk_xw
      var yh = tiles.tiles_yh * runtime.chunks.chunk_yh

      var scratch_bg = new Gfx(xw, yh)
      var scratch_fg = new Gfx(xw, yh)
      var bg_c = scratch_bg.context
      var fg_c = scratch_fg.context

      for (var x = 0; x < runtime.chunks.chunk_xw; x++)
      {
        for (var y = 0; y < runtime.chunks.chunk_yh; y++)
        {
          var c = chunk[x][y]
          if (c == undefined)
            continue;

          if (tiles[c.tile] == undefined)
            continue;

          bg_c.drawImage(
            tiles[c.tile].background,
            x * tiles.tiles_xw - tiles.tiles_bd,
            y * tiles.tiles_yh - tiles.tiles_bd,
            tiles.tiles_rxw,
            tiles.tiles_ryh
          )
          fg_c.drawImage(
            tiles[c.tile].foreground,
            x * tiles.tiles_xw - tiles.tiles_bd,
            y * tiles.tiles_yh - tiles.tiles_bd,
            tiles.tiles_rxw,
            tiles.tiles_ryh
          )

          [% IF show_phys_box %]
            var xl = x * tiles.tiles_xw
            var xr = x * tiles.tiles_xw + tiles.tiles_xw
            var yt = y * tiles.tiles_yh
            var yb = y * tiles.tiles_yh + tiles.tiles_yh
            if (c.physics.angle_tl)
            {
              fg_c.strokeStyle = "rgba(255, 0, 0, 0.5)"
              fg_c.beginPath()
              fg_c.moveTo(xl, yt)
              fg_c.lineTo(xr, yb)
              fg_c.stroke()
            }
            if (c.physics.angle_tr)
            {
              fg_c.strokeStyle = "rgba(0, 255, 0, 0.5)"
              fg_c.beginPath()
              fg_c.moveTo(xr, yt)
              fg_c.lineTo(xl, yb)
              fg_c.stroke()
            }
            if (c.physics.angle_bl)
            {
              fg_c.strokeStyle = "rgba(0, 0, 255, 0.5)"
              fg_c.beginPath()
              fg_c.moveTo(xl, yb)
              fg_c.lineTo(xr, yt)
              fg_c.stroke()
            }
            if (c.physics.angle_br)
            {
              fg_c.strokeStyle = "rgba(255, 0, 255, 0.5)"
              fg_c.beginPath()
              fg_c.moveTo(xr, yb)
              fg_c.lineTo(xl, yt)
              fg_c.stroke()
            }
          [% END %]
        }
      }

      /*
      var scratch_oil = $("<canvas/>")
        .attr("width",  tiles.tiles_rxw * chunks.chunk_xw)
        .attr("height", tiles.tiles_ryh * chunks.chunk_yh)
      var context_oil = scratch_oil.get(0).getContext("2d")

      for (var x = 0; x < tiles.tiles_rxw * chunks.chunk_xw; x++)
        for (var y = 0; y < tiles.tiles_ryh * chunks.chunk_yh; y++)
        {
          var pixels = context_bg.getImageData(x-4, y-4, 1, 1)
          var d = pixels.data
          for (var i = 0; i < d.length; i += 4)
          {
            var r = d[i];
            var g = d[i+1];
            var b = d[i+2];
            var v = 0.2126*r + 0.7152*g + 0.0722*b;
            d[i] = d[i+1] = d[i+2] = v
          }
          context_oil.putImageData(pixels, x-4, y-4)
        }
        */


      loaded_chunks[chunk.get_name()] =
      {
        x: chunk.meta.chunk_x,
        y: chunk.meta.chunk_y,
        fg: scratch_fg,
        bg: scratch_bg,
      }
    }

    var maybe_paint_one = function(chunk_x, chunk_y)
    {
      var chunk = runtime.chunks.get_chunk(chunk_x, chunk_y)

      if (chunk == undefined)
        return

      if (loaded_chunks[chunk.get_name()] != undefined)
        return

      paint_one(chunk);
    }

    var repaint_chunks = function(cou, field)
    {
      var result = []

      var xw = runtime.tiles.tiles_xw * runtime.chunks.chunk_xw
      var yh = runtime.tiles.tiles_yh * runtime.chunks.chunk_yh
      var mul_x = runtime.chunks.chunk_xw
      var mul_y = runtime.chunks.chunk_yh

      var min_xw = cou.x - [% width / 2 %] / runtime.tiles.tiles_xw
      var max_xw = cou.x + [% width / 2 %] / runtime.tiles.tiles_xw

      $.each(loaded_chunks, function(i, painted_chunk)
      {
        var x = painted_chunk.x * mul_x
        var y = painted_chunk.y * mul_y

        if (x <= max_xw && x + mul_x >= min_xw)
        {
          result.push(
            new Animation({
              xw: xw,
              yh: yh,
              x: x,
              y: y,
              get_gfx: function()
              {
                return painted_chunk[field]
              },
            })
          )
        }
      })

      return result
    }

    engine.events.on('repaint.chunks_bg', function(cou)
    {
      return repaint_chunks(cou, 'bg')
    })

    engine.events.on('repaint.chunks_fg', function(cou)
    {
      return repaint_chunks(cou, 'fg')
    })

    engine.events.on('runtime.maintaince', paint_chunks);
    engine.events.on('loader.paint_one_chunk', paint_one);
  [% END %]
