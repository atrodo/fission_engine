  var tile_toJSON
  var tile_fromJSON
  var chunk_xw = [% chunk_xw %]
  var chunk_yh = [% chunk_yh %]

  [%
    chunk_attr = [
      "env",
      "solid_n",
      "solid_e",
      "solid_s",
      "solid_w",
      "story_area_num",
    ]
  %]
  function Chunk(chunk_x, chunk_y)
  {
    $.extend(this, {
      env: null,
      meta: {
        chunk_x: chunk_x,
        chunk_y: chunk_y,
      },
      get_name: function()
      {
        return chunk_x + "_" + chunk_y;
      },
    })
  }

  [%
    chunks_attr = [
      "story_areas",
    ]
  %]
  function Chunks(localStorage)
  {
    if (localStorage == undefined)
    {
      localStorage = window.localStorage
    }

    var cache = {}

    [% TILE    = "0" %]
    [% PHYSICS = "1" %]
    var tile_trans = {
      solid: 0x0001,
      angle_tl: 0x0100,
      angle_tr: 0x0200,
      angle_bl: 0x0400,
      angle_br: 0x0800,
    }

    var self = this;

    $.extend(this, JSON.parse(localStorage.attr || "{}"))

    $.extend(this, {
      chunk_xw: chunk_xw,
      chunk_yh: chunk_yh,
      get: function(x, y)
      {
        if (x < 0 || y < 0)
          return;

        x = floor(x)
        y = floor(y)

        var chunk_x = floor(x / this.chunk_xw)
        var chunk_y = floor(y / this.chunk_yh)

        var chunk = this.get_chunk(chunk_x, chunk_y)
        if (chunk == undefined)
          chunk = this.create_chunk(chunk_x, chunk_y)
        if (chunk == undefined)
          throw "No chunk";

        x = x % this.chunk_xw
        y = y % this.chunk_yh

        return chunk[x][y]
      },
      get_phys: function(x, y)
      {
        var tile = this.get(x, y);
        if (tile == undefined)
          return {};
        return tile.physics;
      },
      set: function(x, y, value)
      {
        var chunk_x = Math.floor(x / this.chunk_xw)
        var chunk_y = Math.floor(y / this.chunk_yh)

        var chunk = this.get_chunk(chunk_x, chunk_y)
        if (chunk == undefined)
          chunk = this.create_chunk(chunk_x, chunk_y)
        if (chunk == undefined)
          return

        x = x % this.chunk_xw
        y = y % this.chunk_yh

        if (x < 0 || x > this.chunk_xw)
          return

        if (y < 0 || y > this.chunk_yh)
          return

        if ($.isNumeric(value))
        {
          value = {
            tile: value,
            physics: $.extend({}, runtime.tiles[value]),
          }
        }

        value = $.extend({}, value)
        value.tile = $.isNumeric(value.tile) ? value.tile : 0
        value.physics = typeof value.physics == "object" ? value.physics : {}

        if (chunk[x] == undefined)
          chunk[x] = []

        chunk[x][y] = value

        return value;
      },
      get_chunk: function(chunk_x, chunk_y)
      {
        if (chunk_x instanceof Chunk)
        {
          chunk_y = chunk_x.meta.chunk_y
          chunk_x = chunk_x.meta.chunk_x
        }

        var chunk_name = chunk_x + "_" + chunk_y;
        if (cache[chunk_name] != undefined)
          return cache[chunk_name]

        var raw_json = localStorage[chunk_name]

        if (raw_json == undefined)
          return;

        var raw_obj = JSON.parse(raw_json);

        var chunk = new Chunk(chunk_x, chunk_y)

        $.each(raw_obj, function(i, v)
        {
          if (i == 0)
          {
            $.extend(chunk, v);
            [% FOR attr IN chunk_attr %]
            if (v[[% loop.index %]] != undefined)
              chunk.[% attr %] = v[[% loop.index %]]
            [% END %]
            return;
          }

          chunk[i-1] = []
          $.each(v, function(j, v)
          {
            var phy = {}
            var input = v[[% PHYSICS %]]
            for (var k in tile_trans)
            {
              phy[k] = (input & tile_trans[k]) == tile_trans[k]
            }
            chunk[i-1][j] = {
              tile: v[[% TILE %]] || 0,
              physics: phy
            }
          })
        })

        cache[chunk_name] = chunk;
        return chunk;
      },
      has_chunk: function(chunk_x, chunk_y)
      {
        var chunk_name = chunk_x + "_" + chunk_y;
        if (cache[chunk_name] != undefined)
          return true;
        if (localStorage[chunk_name] != undefined)
          return true;
        return false;
      },
      get_chunk_by_name: function(chunk_name)
      {
        var s = chunk_name.split('_');
        return this.get_chunk(s[0], s[1]);
      },
      get_chunk_storage_by_name: function(chunk_name)
      {
        return localStorage[chunk_name]
      },
      get_chunk_for: function(x, y)
      {
        if (x < 0 || y < 0)
          return;

        var chunk_x = floor(x / this.chunk_xw)
        var chunk_y = floor(y / this.chunk_yh)

        return this.get_chunk(chunk_x, chunk_y)
      },
      create_chunk: function(chunk_x, chunk_y)
      {
        var chunk = this.get_chunk(chunk_x, chunk_y)
        if (chunk != undefined)
          return chunk;

        chunk = new Chunk(chunk_x, chunk_y)

        for (var x = 0; x < this.chunk_xw; x++)
        {
          chunk[x] = []
          for (var y = 0; y < this.chunk_yh; y++)
          {
            chunk[x][y] = null
          }
        }
        /*
        */

        var chunk_name = chunk_x + "_" + chunk_y;
        cache[chunk_name] = chunk;

        //throw "asdf"

        return chunk;
      },
      invalid: function(chunk)
      {
        if (chunk == undefined)
          return;

        var chunk_y = chunk.meta.chunk_y
        var chunk_x = chunk.meta.chunk_x
        var chunk_name = chunk_x + "_" + chunk_y;

        delete cache[chunk_name];
      },
      flush: function(chunk_x, chunk_y)
      {
        if (chunk_x instanceof Chunk)
        {
          chunk_y = chunk_x.meta.chunk_y
          chunk_x = chunk_x.meta.chunk_x
        }

        if (chunk_x == undefined || chunk_y == undefined)
        {
          var self = this
          $.each(cache, function(chunk_name, chunk)
          {
            if (chunk.meta.chunk_x == undefined || chunk.meta.chunk_y == undefined)
              return;

            self.flush(chunk.meta.chunk_x, chunk.meta.chunk_y);
          });
          return;
        }

        var chunk_name = chunk_x + "_" + chunk_y;
        var chunk = cache[chunk_name];

        if (chunk != undefined)
        {
          delete cache[chunk_name];

          localStorage[chunk_name] = JSON.stringify(stringify(chunk));
        }

        if (localStorage.attr == undefined)
          localStorage.attr = {}

        var attrs = {}
        [% FOR attr IN chunks_attr %]
        if (this.[% attr %] != undefined)
          attrs.[% attr %] = this.[% attr %]
        [% END %]
        localStorage.attr = JSON.stringify(attrs)
      }
    });

    var stringify = function(chunk)
    {
      // This is deleted, so we can trash it at will
      delete chunk.meta
      var attr = {}
      var raw_obj = [attr];
      for (var i = 0; i < self.chunk_xw; i++)
      {
        var row = [];
        raw_obj[i + 1] = row;
        $.each(chunk[i], function(i, tile)
        {
          tile = tile || {}
          var phy = tile.physics || {}
          var input = 0;
          for (var k in tile_trans)
          {
            input += phy[k] * tile_trans[k]
          }

          var store = {
            [% TILE %]: tile.tile || 0,
            [% PHYSICS %]: input
          }
          store.length = 2; //store.keys.length
          row[i] = $.makeArray(store);
        });
      }
      [% FOR attr IN chunk_attr %]
      if (chunk.[% attr %] != undefined)
      {
        if (typeof chunk.[% attr %] == "boolean")
        {
          attr[[% loop.index %]] = chunk.[% attr %] + 0
        }
        else
        {
          attr[[% loop.index %]] = chunk.[% attr %]
        }
      }
      [% END %]

      return raw_obj
    }


  }
