var seconds_match = /^(\d)*s$/;

var Cooldown = Moo.class(function()
{
  this.method("BUILDARGS", function(frames, inital_result)
  {
    if (typeof frames == "object")
      return frames;

    var result = {}
    if (frames != undefined)
    {
      result.total = frames;
    }

    if (inital_result != undefined)
    {
      result.result = inital_result
    }

    return result;
  })

  this.has("frames", {
    is: "rw",
    lazy: true,
    default: function() { return this.total; },
  })

  this.has("total", {
    is: "ro",
    default: 10,
    coerce: function(frames)
    {
      if ($.type(frames) == "string")
      {
        var seconds = frames.match(seconds_match)
        if (seconds)
        {
          frames = seconds[1] * runtime.fps
        }
        else
        {
          frames = parseInt(frames)
        }
      }
      return frames;
    }
  })

  this.has("result", {
    is: "rw",
    default: false,
  })

  this.method("action_id", function()
  {
    if (this.result instanceof Action)
      return this.result.id()
    return
  })

  this.method("frame", function()
  {
    this.frames--
    if (this.frames <= 0)
      return this.result
    return this
  })

  this.method("reset", function()
  {
    this.frames = this.total
  })

  this.method("is_done", function()
  {
    return this.frames >= this.total
  })

  this.method("get_remaining", function()
  {
    return this.total - this.frames
  })

  this.method("get_pctdone", function()
  {
    return (this.total - this.frames) / this.total
  })

})
