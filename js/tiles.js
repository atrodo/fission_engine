  function Tile(init)
  {
    $.extend(this, {
      solid: false,
      angle_tl: false,
      angle_tr: false,
      angle_bl: false,
      angle_br: false,

      background: null,
      foreground: null,
      combined:   null,
    }, init)

    this.combine = function()
    {
      // TODO
      this.combined = this.background;
    }
  }

  function Tiles(init)
  {
    var self = this;

    var default_tile_info = {
      0: { solid: false },
      1: { solid: true },
    }

    var tile_info = init.tile_info || default_tile_info
    delete init.tile_info;

    $.extend(self, {
      background: "empty.png",
      foreground: "empty.png",

      tiles_bd: 0,
      tiles_xw: 10,
      tiles_yh: 10,

      tiles_rxw: null,
      tiles_ryh: null,
    }, init)

    self.loaded = false;

    self.tiles_rxw = self.tiles_xw + (2 * self.tiles_bd)
    self.tiles_ryh = self.tiles_yh + (2 * self.tiles_bd)

    self.add_tile_info = function(additional)
    {
      $.each(additional, function(i, v)
      {
        if (!$.isNumeric(i))
          return;

        self[i] = new Tile(v)
      })

      if ( self.loaded )
      {
        do_splits()
      }
    }

    self.all_tiles = function()
    {
      var result = [];

      $.each(self, function(i, tile)
      {
        if (!$.isNumeric(i))
          return;

        result[i] = tile;
      })

      return result
    }

    var do_splits = function()
    {
      self.loaded = true;
      split_tiles("background")
      split_tiles("foreground")
      runtime.events.emit('tiles_done', self);
    }

    var split_tiles = function(attr)
    {
      var gfx = self[attr]
      var img = gfx.canvas

      var tiles_count_x = (img.width  / self.tiles_rxw) | 0
      var tiles_count_y = (img.height / self.tiles_ryh) | 0

      var scratch = $("<canvas/>")
        .attr("width",  self.tiles_rxw)
        .attr("height", self.tiles_ryh)

      var context = scratch.get(0).getContext("2d")
      context.translate(0, self.tiles_ryh)
      context.scale(1, -1)

      for (var y = 0; y < tiles_count_y; y++)
        for (var x = 0; x < tiles_count_x; x++)
        {
          var entry = (tiles_count_x * y) + x

          if (self[entry] == undefined)
            continue;

          //context.clearRect(0, 0, self.tiles_rxw, self.tiles_ryh)
          var result = $("<canvas/>")
            .attr("width",  self.tiles_rxw)
            .attr("height", self.tiles_rxw)
            .get(0)

          context = result.getContext('2d')

          context.translate(0, self.tiles_ryh)
          context.scale(1, -1)

          // Why is this so slow?

          /*
          */
          context.drawImage(img,
                    x * self.tiles_rxw,
                    y * self.tiles_ryh,
                    self.tiles_rxw,
                    self.tiles_ryh,
                    0,
                    0,
                    self.tiles_rxw,
                    self.tiles_ryh
                  )

          /*
          // This makes it slightly better performing...
          var result = $("<img/>")
            .attr("src", scratch.get(0).toDataURL())
          self[entry][attr] = result.get(0)
          self[entry].combine()
          */

          self[entry][attr] = result

          //raw_tiles[entry] = scratch.get(0)


        }

      [% IF show_tiles %]
      content.find("ul.tiles_on_dom").remove()
      var tiles_on_dom = $("<ul/>")
        .addClass("tiles_on_dom")
        .appendTo(content)

        $.each(self.all_tiles(), function(i, tile)
        {
          if (tile == undefined)
            return;
          tiles_on_dom
            .append($("<li/>")
              .append(i + ": ")
              .append(tile.background)
              .append(tile.foreground)
            )
        })
      [% END %]
    }

    $.when(
      new Gfx().preload(self.background, false).then(function(gfx)
      {
        self.background = gfx;
      }),
      new Gfx().preload(self.background, false).then(function(gfx)
      {
        self.foreground = gfx;
      })
    )
    .then(do_splits);
  }


