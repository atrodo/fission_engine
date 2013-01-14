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

    var tile_info = init.tile_info || {};
    delete init.tile_info;

    $.extend(self, {
      background: "empty.png",
      foreground: "empty.png",

      tiles_bd: 0,
      tiles_xw: 10,
      tiles_yh: 10,

      tiles_rxw: 10,
      tiles_ryh: 10,
    }, init)

    self.loaded = false;

    $.each(tile_info, function(i, v)
    {
      if (!$.isNumeric(i))
        return;

      self[i] = new Tile(v)
    })

    var split_tiles = function(img, attr)
    {
      var tiles_on_dom = $("<div/>")
        .appendTo(content)

      img = img.get(0)

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

          /*
          tiles_on_dom.append("<br/>")
          tiles_on_dom.append(raw_tiles[entry])
          tiles_on_dom.append(entry)
          */

        }
    }

    var set_loaded = function()
    {
      if ( $.type( self.foreground ) != "string"
        && $.type( self.background ) != "string" )
      {
        self.loaded = true;
        runtime.events.emit('tiles_done', self);
      }
    }

    preload(self.background, function(img) {
      self.background = img;
      split_tiles(img, "background")
      set_loaded()
    }, false)
    preload(self.foreground, function(img) {
      self.foreground = img;
      split_tiles(img, "foreground")
      set_loaded()
    }, false)
  }


