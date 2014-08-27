  //http://jsperf.com/lprng-vs-math-random
  function lprng(seed)
  {
    var mod = Math.pow(2, 32);
    var magic = 0x80f77deb;

    var buffer = 16
    this.data = new Uint32Array(buffer)
    this.idx = 0

    this.lfsr = 1;

    this.seed = function(seed)
    {
      if (seed.length == undefined)
        seed = [seed]

      var lfsr = 0;

      for (var iseed = 0; iseed < seed.length; iseed++)
      {
        if (iseed < seed.length)
          lfsr ^= seed[iseed];

        this.data[iseed] = lfsr;

        lfsr = (lfsr >> 1) ^ (-(lfsr & 1) & magic);

      }

      this.lfsr = lfsr;

      for (var i = 0; i <= buffer; i++)
      {
        this.prng()
      }

      return this;
    }

    this.prng = function(multi)
    {
      multi = multi || 1
      var lfsr = this.lfsr
      var s = this.data[this.idx] ^ lfsr

      var idx = this.idx ++
      this.idx %= buffer

      s ^= this.data[(idx + lfsr & 0x7) % buffer]
      lfsr = (lfsr >> 1) ^ (-(lfsr & 1) & magic);

      this.data[this.idx] = s
      this.lfsr = lfsr;

      return this.data[this.idx]
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
