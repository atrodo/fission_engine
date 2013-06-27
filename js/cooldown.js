  var seconds_match = /^(\d)*s$/;
  function Cooldown(frames, inital_result)
  {
    frames = frames || 10
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
    var total = frames

    var result = false
    this.set_result = function(new_result)
    {
      result = new_result
    }

    if ($.isFunction(inital_result))
      this.set_result(inital_result)

    this.frame = function()
    {
      frames--
      if (frames <= 0)
        return result
      return this
    }

    this.reset = function()
    {
      frames = total
    }
    this.is_done = function()
    {
      return frames >= total
    }
    this.get_remaining = function()
    {
      return total - frames
    }
    this.get_pctdone = function()
    {
      return (total - frames) / total
    }
  }
