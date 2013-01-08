  //http://jsperf.com/lprng-vs-math-random
  function lprng(seed)
  {
    var mod = Math.pow(2, 32);

    this.data = []
    this.data.length = 16;

    for (var i = 0; i < this.data.length; i++)
    {
      this.data[i] = 0;
    }

    this.seed = function(seed)
    {
      if (seed.length == undefined)
        seed = [seed]

      //this.data[0] = seed;
      for (var i = 0; i < this.data.length; i++)
      {
        if (seed[i] != undefined)
        {
          this.data[i] = seed[i]
        } else {
          this.data[i] = (this.data[i-1] * 69069 + 13) % mod
        }
      }

      for (var i = 0; i <= 16; i++)
      {
        this.prng()
      }
    }

    this.prng = function(multi)
    {
      multi = multi || 1
      var s = this.data.shift()
      var result = s

      s += this.data[0]
      s += this.data[2]
      s += this.data[3]
      s += this.data[5]

      this.data.push(s % mod)

      result += this.data[2]
      result += this.data[5]

      result = result % mod
      result *= 1/mod

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
