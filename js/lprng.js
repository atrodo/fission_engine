  //http://jsperf.com/lprng-vs-math-random
  function lprng(seed)
  {
    var mod = Math.pow(2, 32);

    var buffer = 16
    this.data = new Uint32Array(buffer)
    this.idx = 0

    for (var i = 0; i < buffer; i++)
    {
      this.data[i] = 0;
    }

    var tmp_data = new Uint32Array(buffer)
    this.seed = function(seed)
    {
      if (seed.length == undefined)
        seed = [seed]

      for (var i = 1; i < buffer; i++)
        this.data[i] = 0;

      for (var iseed = 0; iseed < seed.length; iseed++)
      {
        tmp_data[0] = seed[iseed];
        this.data[iseed] ^= tmp_data[0];

        for (var i = 1; i < buffer; i++)
        {
          tmp_data[i] = tmp_data[i - 1] * 69069 + 13
          this.data[i] ^= tmp_data[i]
        }
      }

      for (var i = 0; i <= buffer; i++)
      {
        this.prng()
      }

      return this;
    }

    this.prng = function(multi)
    {
      var self = this
      var s,result,idx
      [% WRAPPER scope %]
      multi = multi || 1
      s = self.data[self.idx]
      result = s
      [% END %]

      [% WRAPPER scope %]
      idx = self.idx++
      self.idx %= buffer
      [% END %]

      [% WRAPPER scope %]
      s ^= self.data[0]
      s ^= self.data[2]
      s ^= self.data[3]
      s ^= self.data[5]
      [% END %]
      [% WRAPPER scope %]

      self.data[idx-1] = s

      [% END %]
      [% WRAPPER scope %]
      result += self.data[2]
      result += self.data[5]

      [% END %]
      [% WRAPPER scope %]
      result = result % mod
      result *= 1/mod

      [% END %]
      return result * multi
    }

    this.choose = function()
    {
      var choices = arguments
      if (arguments.length == 1 && arguments[0] instanceof Array)
        choices = arguments[0]

      return choices[Math.floor(this.random(choices.length))];
    }


    this.random = this.prng

    if (seed === null)
      this.seed(Math.floor(Math.random() * Math.pow(2, 32)))
    else if (seed != undefined)
      this.seed(seed);
  }
