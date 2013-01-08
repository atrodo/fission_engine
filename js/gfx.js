  var preload = function() { throw "Must call preload after onReady" };

  var loaded_chunks = {}
  var paint_chunks = function() { throw "Must call paint_chunks after onReady" };
  var paint_one = function(chunk_x, chunk_y) { throw "Must call paint_one after onReady" };

  $(function()
  {
    var status = $("<div/>")
      .prependTo("body")
      .hide()

    var progress = $("<div/>")
      .addClass("progress progress-striped active")
      .append($("<div/>")
        .addClass("bar")
      )
      .prependTo(content.parent())

    var preload_list = [];

    var preload_div = $("<div/>")
      .addClass("preload")
      .appendTo("body")

    preload = function(url, callback, do_flip)
    {
      if (do_flip == undefined)
        do_flip = true

      var result = $("<canvas/>")

      var status_line = $("<div/>")
        .appendTo(status)
        .text(url)

      var loaded_img = function()
      {
        status_line.append("...loaded")

        result
          .attr("height", img.height())
          .attr("width", img.width())

        var context = result.get(0).getContext("2d")

        if (do_flip)
        {
          context.translate(0, img.height())
          context.scale(1, -1)
        }
        status_line.append("...fraw")
        context.drawImage(img.get(0), 0, 0)

        if (callback != undefined)
        {
          status_line.append("...cb")
          callback(result)
        }

        img.remove()

        status_line.append("...done")
      }

      var img = $("<img/>")
      preload_list.push(function() {
        img
          .load(loaded_img)
          .attr("src", "r/img/" + url)
          .appendTo(preload_div)
        })

      progress.attr("max", preload_list.length);

      return result.get(0)
    }

    var preload_interval = window.setInterval(function()
    {
      $.each(preload_list, function(i, func)
      {
        if (func == undefined)
          return;

        func();
        preload_list[i] = null;

        progress.attr("value", i+1);
        progress.find(".bar").width( round((i+1) / preload_list.length * 100) + "%")

        if (i == preload_list.length-1)
        {
          window.clearInterval(preload_interval)
          progress.fadeOut(function()
          {
            event_div.trigger('fission.preload_done');
          })
        }

        return false;
      })
    }, [% preload_interval %]);

    var load_order = [];
    (function()
    {
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

    })()

    var to_paint = []

    paint_chunks = function()
    {
      if (!tiles.loaded)
        return;

      var start = Date.now()

      // Find our chunks
      var x_chunk = Math.floor(user.x / chunks.chunk_xw)
      var y_chunk = Math.floor(user.y / chunks.chunk_yh)

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
        event_div.trigger('fission.painted_chunks', count_object_keys(loaded_chunks));
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
      event_div.trigger('fission.painted_chunks', count_object_keys(loaded_chunks));

    }, [% paint_chunk_interval %]);

    paint_one = function(chunk_x, chunk_y)
    {
      var chunk = chunks.get_chunk(chunk_x, chunk_y)

      if (chunk == undefined)
        return

      var scratch_bg = $("<canvas/>")
        .attr("width",  tiles.tiles_rxw * chunks.chunk_xw)
        .attr("height", tiles.tiles_ryh * chunks.chunk_yh)

      var scratch_fg = $("<canvas/>")
        .attr("width",  tiles.tiles_rxw * chunks.chunk_xw)
        .attr("height", tiles.tiles_ryh * chunks.chunk_yh)

      var context_bg = scratch_bg.get(0).getContext("2d")
      var context_fg = scratch_fg.get(0).getContext("2d")

      context_bg.mozImageSmoothingEnabled = false;
      context_fg.mozImageSmoothingEnabled = false;

      for (var x = 0; x < chunks.chunk_xw; x++)
      {
        for (var y = 0; y < chunks.chunk_yh; y++)
        {
          var c = chunk[x][y]
          if (c == undefined)
            continue;

          context_bg.drawImage(
            tiles[c.tile].background,
            x * tiles.tiles_xw - tiles.tiles_bd,
            y * tiles.tiles_yh - tiles.tiles_bd
          )
          context_fg.drawImage(
            tiles[c.tile].foreground,
            x * tiles.tiles_xw - tiles.tiles_bd,
            y * tiles.tiles_yh - tiles.tiles_bd
          )
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
        fg: scratch_fg.get(0),
        data: scratch_bg.get(0)
      }
    }

    var maybe_paint_one = function(chunk_x, chunk_y)
    {
      var chunk = chunks.get_chunk(chunk_x, chunk_y)

      if (chunk == undefined)
        return

      if (loaded_chunks[chunk.get_name()] != undefined)
        return

      paint_one(chunk);
    }

    event_div.bind('fission.cache_flush', function(e, chunk_name)
    {
      console.log('---', chunk_name);
      delete loaded_chunks[chunk_name]
      try
      {
        paint_chunks()
      }
      catch(e) { console.log(e) }
    });

    event_div.bind('fission.cache_flush_all', function(e, chunk_name)
    {
      console.log('---', chunk_name);
      $.each(loaded_chunks, function(k, v)
      {
        delete loaded_chunks[k]
      });

      try
      {
        paint_chunks()
      }
      catch(e) { console.log(e) }
    });

  })
