  function Animation(options)
  {
    [% WRAPPER per_second name="New Animations" %]
    $.extend(this, {
      name: null,
      img: null,

      frames: 1,
      frame_inc: 1/8,
      frame: 0,
      can_interrupt: true,
      loop: true,

      frame_x: null,
      frame_y: null,
      x: 0,
      y: 0,
      xw: 1,
      yh: 1,

      flip_xw: false,
      center: 5,
      trim_s: 0,
      trim_b: 0,
    }, options);

    var self = this;

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
    [% END %]
  }
