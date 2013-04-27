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

      self.reset_transform = function()
      {
        self.context.setTransform(1, 0, 0, 1, 0, 0)
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

        c.shadowColor = 'rgba(0,0,0,0)'
        c.shadowBlur = 0

        self.reset_transform()

        return self
      }

      self.full_reset = function()
      {
        self.width = self.width
        return self
      }

      self.draw_animation = function(anim, cou)
      {
        if (!(anim instanceof Animation))
          throw new Error("Can only draw an Animation")

        cou = cou || { x: 0, y: 0 }
        var context = this.context
        context.save()

        try
        {
          var img = anim.get_gfx()

          var x = anim.frame_x
          var y = anim.frame_y

          if (x == undefined)
            x = ((anim.x - cou.x) * runtime.tiles.tiles_xw) + runtime.trans_x
          if (y == undefined)
            y = ((anim.y - cou.y) * runtime.tiles.tiles_yh) + runtime.trans_y

          if (!img)
            return;

          if (!(img instanceof Gfx))
          {
            warn(img, " is not an Gfx, ignoring");
            return;
          }

          if (anim.flip_xw)
          {
            context.scale(-1, 1)
            context.translate(-anim.center, 0)
            x = -x
          }

          context.drawImage(
            img.canvas,
            x - anim.trim_s,
            y - anim.trim_b,
            anim.xw,
            anim.yh
          )

          [% IF show_draw_box %]
          context.strokeStyle = "rgba(255, 0, 165, 0.5)"
          context.strokeRect(
            x - anim.trim_s,
            y - anim.trim_b,
            anim.xw,
            anim.yh
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

      self.draw_animations = function(anims, cou)
      {
        if (!$.isArray(anims))
          throw new Error("Must pass an array to 'draw_animations'");

        $.each(anims, function(i, anim)
        {
          try
          {
            self.draw_animation(anim, cou);
          } catch(e) { console.log(e) };
        })
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
          xw = img.width()
          yh = img.height()

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

      self.xw = function()
      {
        return xw
      }

      self.yh = function()
      {
        return yh
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
