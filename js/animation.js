  function Animation(options)
  {
    [% WRAPPER per_second name="New Animations" %]
    if ($.isFunction(options))
    {
      options = { get_gfx: options };
    }

    $.extend(this, {
      name: null,
      img: null,

      frames: 1,
      frame_inc: 1/8,
      can_interrupt: true,
      loop: true,

      frame_x: null,
      frame_y: null,
      x: 0,
      y: 0,

      is_tile_sized: false,
      xw: 1,
      yh: 1,

      flip_xw: false,
      center: 5,
      trim_s: 0,
      trim_b: 0,
    }, options);

    var self = this;

    if (this.is_tile_sized)
    {
      this.xw *= runtime.tiles.tiles_xw
      this.yh *= runtime.tiles.tiles_yh
      delete this.is_tile_sized
    }

    if (this.gfx instanceof Gfx && this.get_gfx == undefined)
    {
      this.get_gfx = function() { return this.gfx }
      this.xw = this.gfx.xw()
      this.yh = this.gfx.yh()
    }

    if (this.gfx == undefined)
      this.gfx = new Gfx(this.xw, this.yh)

    if (this.get_gfx == undefined)
    {
      if ($.type(this.img) != "string")
        throw "Must provide img or get_gfx for an Animation";

      var img = new Gfx(1, 1);
      img
        .preload(this.img)
        .then(function(img)
          {
            self.img = img;
            self.xw = img.xw()
            self.yh = img.yh()
            self.gfx = new Gfx(self.xw, self.yh)
          }
        )

      this.get_gfx = function()
      {
        return self.img
      }
    }

    var did_last_frame = false
    var frame = 0

    this.reset = function()
    {
      frame = 0
      did_last_frame = false
    }

    this.was_last_frame = function()
    {
      return did_last_frame
    }

    this.frame = function()
    {
      frame += this.frame_inc || 1

      did_last_frame = false

      if (frame >= this.frames)
      {
        frame -= this.frames
        did_last_frame = true
      }

      return did_last_frame
    }
    [% END %]
  }
