  function Sprite(options)
  {
    $.extend(this, {
      name: null,
      animations: {},
      default: null,

      current: null,
      next: null,
    }, options);

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

    $.extend(this, {
      get_animation: function()
      {
        return this.current
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

      frame: function()
      {
        this.current.frame()
        if (this.current.was_last_frame())
        {
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

          if (this.current != next)
          {
            next.reset()
          }

          this.current = next
          this.next = null
        }
        else if (this.current.can_interrupt && this.next != null)
        {
          if (this.next != this.current)
          {
            this.next.reset()
          }
          this.next = null
        }
      }
    });

    this.set_next(this.next);

    if (this.current == undefined)
      this.current = this.default;
  }

  Sprite.empty_sprite = new Sprite({
    default: new Animation({
      get_gfx: function() { this.gfx.reset(); return this.gfx },
    })
  })
