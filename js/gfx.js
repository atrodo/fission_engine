  var Gfx = function(xw, yh)
  {
    [% WRAPPER per_second name="New Gfxs" %]
      var self = this
      self.canvas = $("<canvas/>")
        .attr("width", xw || 0)
        .attr("height", yh || 0)
        .get(0)

      self.context = self.canvas.getContext("2d")

      self.clear = function()
      {
        self.context.clearRect(0, 0, xw, yh)
        return self
      }

      self.reset = function()
      {
        self.clear()
        var c = self.context
        c.beginPath()
        c.globalAlpha = 1
        c.globalCompositeOperation = 'source-over'
        c.fillStyle = '#000'
        c.strokeStyle = '#000'
        c.font = '10px sans-serif'
        c.setTransform(1, 0, 0, 1, 0, 0)

        return self
      }

      self.full_reset = function()
      {
        self.width = self.width
        return self
      }

      self.preload = function(url, do_flip)
      {
        if (do_flip == undefined)
          do_flip = true

        var result = $.Deferred()
        var promise = engine.events.emit('gfx.add_preload', url);

        if ($.isArray(promise) && promise.length == 1)
          promise = promise[0];

        promise.then(function(img)
        {
          img = $(img);
          $(self.canvas)
            .attr("height", img.height())
            .attr("width", img.width())

          var context = self.context

          if (do_flip)
          {
            context.translate(0, img.height())
            context.scale(1, -1)
          }
          context.drawImage(img.get(0), 0, 0)

          result.resolve(self)
        })

        return result
      }

    [% END %]
    return self;
  }

  [% WRAPPER scope %]
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
            engine.events.emit('preload_done');
          })
        }

        return false;
      })
    }, [% preload_interval %]);

    engine.events.on('gfx.add_preload', function(url)
    {
      var result = $.Deferred()

      var status_line = $("<div/>")
        .appendTo(status)
        .text(url)

      var loaded_img = function()
      {
        status_line.append("...loaded")

        result.resolve(img.get(0))

        img.remove()

        status_line.append("...done")
      }

      var img = $("<img/>")
      preload_list.push(function() {
        img
          .load(loaded_img)
          .attr("src", "r/" + url)
          .appendTo(preload_div)
        })

      progress.attr("max", preload_list.length);

      return result.promise()
    });
  [% END %]
