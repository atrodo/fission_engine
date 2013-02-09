  var sprite_catalog = {}

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

    this._img = this.img;
    this.img = null;

    if (this.get_gfx != undefined)
    {
      this.gfx = new Gfx(this.xw, this.yh)
      this.get_img = this.get_gfx;
    }

    if (!$.isFunction(this.get_img))
    {
      if (!(this._img instanceof HTMLElement))
      {
        if ($.type(this._img) != "string")
          throw "Must provide img for an Animation";

        this._img = preload(this._img);
      }

      this.get_img = function()
      {
        return this._img;
      }

      var gfx = new Gfx(this.xw, this.yh)
      this.get_gfx = function()
      {
        gfx.reset()
        var c = gfx.context

        c.drawImage(
          this._img,
          floor(this.frame) * this.xw,
          0,
          this.xw,
          this.yh,
          0,
          0,
          this.xw,
          this.yh
        )

        return gfx
      }
    }
    [% END %]
  }

  function Sprite(options)
  {
    $.extend(this, {
      name: null,
      animations: {},
      default: null,

      current: null,
      next: null,

      isa_clone: false,
    }, options);

    //if ($.type(this.name) != "string")
    //  throw "Must provide a sprite name";

    if ($.type(this.animations) == "array")
    {
      var new_animations = {};
      $.each(this.animations, function(i, animation)
      {
        if ($.isPlainObject(animation))
          animation = new Animation(animation);

        new_animations[animation.name] = animation;
      });
      this.animations = new_animations
    }

    if ($.type(this.default) == "string")
      this.default = this.animations[this.default];

    if (!(this.default instanceof Animation))
      throw "Must provide a default Animation";

    this.clone = function()
    {
      var result = $.extend({}, this);
      result.isa_clone = true;

      $.extend(result, {
        img: function()
        {
          return this.current.get_img();
        },

        current_frame: function()
        {
          return floor(this.current.frame)
        },

        set_next: function(next)
        {
          if ($.type(next) == "string")
            next = this.animations[next];

          if (next == null)
          {
            this.next = null;
            return;
          }

          if (!(next instanceof Animation))
            return;

          if (this.next != null)
            return;

          this.next = next
        },

        next_frame: function(done_cb)
        {
          this.current.frame += this.current.frame_inc || 1
          if (this.current.frame >= this.current.frames)
          {
            if ($.isFunction(done_cb))
              done_cb.call(this)

            var next = this.next
            if (next == null)
            {
              if (this.current.loop)
              {
                next = this.current
              } else {
                next = this.default
              }
            }

            if (this.current == next)
            {
              this.current.frame -= this.current.frames
            } else {
              this.current.frame = 0
            }

            this.current = next
            this.next = null
          }
          else if (this.current.can_interrupt && this.next != null)
          {
            if (this.next != this.current)
            {
              this.current = this.next
              this.current.frame = 0
            }
            this.next = null
          }
        }
      });

      var next = result.next;
      result.next = null;
      result.set_next(next);

      return result;
    }

    if (this.current == undefined)
      this.current = this.default;

    if (this.name)
      sprite_catalog[this.name] = this;
  }

  Sprite.empty_sprite = new Sprite({
    default: new Animation({
      get_gfx: function() { this.gfx.reset(); return this.gfx },
    })
  })
