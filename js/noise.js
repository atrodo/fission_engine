  //http://jsperf.com/lprng-vs-math-random
  function Noise(options)
  {
    $.extend(this, {
      width: undefined,
      height: undefined,
      depth: undefined,
      octaves: 1,
      perlin: false,
      seed: floor(Math.random() * Math.pow(2, 32)),
    }, options);

    var self = this

    var dims = 3;

    if (self.depth == undefined)
    {
      dims = 2
    }

    if (self.height == undefined)
    {
      dims = 1
      self.depth = null
    }

    if (self.width == undefined)
      throw "Must provide at least on dimension"

    var perm;

    [% WRAPPER scope %]
      var octave = 0
      var dimensions = [self.width, self.height, self.depth]

      var rng = new lprng([self.seed])

      var do_dim = function(dim)
      {
        if (dimensions[dim] == undefined)
        {
          return rng.prng();
        }

        var result = []
        for (var i = 0; i <= ceil(dimensions[dim] / (octave+1)); i++)
        {
          result[i] = do_dim(dim+1);
        }

        return result
      }

      perm = []
      for ( ; octave < self.octaves; octave++)
      {
        perm[octave] = do_dim(0)
      }
    [% END %]

    var noise2 = function()
    {
      var result = []
      for (var x = 0; x < self.width; x++)
      {
        result[x] = []
        for (var y = 0; y < self.height; y++)
        {
          result[x][y] = 0;
          for (var octave = 0; octave < self.octaves; octave++)
          {
            var p = perm[octave]
            var octa_steps = (1 << octave)
            var base_x = x >> octave
            var base_y = y >> octave
            var frac_x = x & (octa_steps - 1)
            var frac_y = y & (octa_steps - 1)

            var i = 0
            var diff_x = p[base_x][base_y]
            var diff_y = p[base_x][base_y]
            if (frac_x != 0)
              diff_x = p[base_x+1][base_y] - diff_x
            if (frac_y != 0)
              diff_y = p[base_x][base_y+1] - diff_y

            i += diff_x * (frac_x / octa_steps) + p[base_x][base_y]
            i += diff_y * (frac_y / octa_steps) + p[base_x][base_y]
            result[x][y] += i / 2
          }

          result[x][y] /= octave

        }
      }
      return result

      for (var x = 0; x < width; x++)
      {
        result[x] = []
        for (var y = 0; y < height; y++)
        {
          var xl = x - 1; xl = xl < 0 ? width-1 : xl
          var xr = x + 1; xr %= width
          var yt = y - 1; yt = yt < 0 ? height-1 : yt
          var yb = y + 1; yb %= height
          var m = 0
            + perm[xl][yt]
            + perm[xr][yt]
            + perm[xl][yb]
            + perm[xr][yb]

          m /= 4
          result[x][y] = m*m*m*(m*(m*6-15)+10)
          //result[x][y] = perm[x][y]
        }
      }

      return result
    }

    self.noise = function(start_x, start_y, start_z)
    {
      start_x = floor(start_x)
      start_y = floor(start_y)
      start_z = floor(start_z)

      if (dims == 2)
        return noise2(start_x, start_y)
    }

[%#

/* coherent noise function over 1, 2 or 3 dimensions */
/* (copyright Ken Perlin) */

#include <stdlib.h>
#include <stdio.h>
#include <math.h>

#define B 0x100
#define BM 0xff

#define N 0x1000
#define NP 12   /* 2^N */
#define NM 0xfff

static p[B + B + 2];
static float g3[B + B + 2][3];
static float g2[B + B + 2][2];
static float g1[B + B + 2];
static start = 1;

static void init(void);

#define s_curve(t) ( t * t * (3. - 2. * t) )

#define lerp(t, a, b) ( a + t * (b - a) )

#define setup(i,b0,b1,r0,r1)\
        t = vec[i] + N;\
        b0 = ((int)t) & BM;\
        b1 = (b0+1) & BM;\
        r0 = t - (int)t;\
        r1 = r0 - 1.;

double noise1(double arg)
{
        int bx0, bx1;
        float rx0, rx1, sx, t, u, v, vec[1];

        vec[0] = arg;
        if (start) {
                start = 0;
                init();
        }

        setup(0, bx0,bx1, rx0,rx1);

        sx = s_curve(rx0);

        u = rx0 * g1[ p[ bx0 ] ];
        v = rx1 * g1[ p[ bx1 ] ];

        return lerp(sx, u, v);
}

float noise2(float vec[2])
{
        int bx0, bx1, by0, by1, b00, b10, b01, b11;
        float rx0, rx1, ry0, ry1, *q, sx, sy, a, b, t, u, v;
        register i, j;

        if (start) {
                start = 0;
                init();
        }

        setup(0, bx0,bx1, rx0,rx1);
        setup(1, by0,by1, ry0,ry1);

        i = p[ bx0 ];
        j = p[ bx1 ];

        b00 = p[ i + by0 ];
        b10 = p[ j + by0 ];
        b01 = p[ i + by1 ];
        b11 = p[ j + by1 ];

        sx = s_curve(rx0);
        sy = s_curve(ry0);

#define at2(rx,ry) ( rx * q[0] + ry * q[1] )

        q = g2[ b00 ] ; u = at2(rx0,ry0);
        q = g2[ b10 ] ; v = at2(rx1,ry0);
        a = lerp(sx, u, v);

        q = g2[ b01 ] ; u = at2(rx0,ry1);
        q = g2[ b11 ] ; v = at2(rx1,ry1);
        b = lerp(sx, u, v);

        return lerp(sy, a, b);
}

float noise3(float vec[3])
{
        int bx0, bx1, by0, by1, bz0, bz1, b00, b10, b01, b11;
        float rx0, rx1, ry0, ry1, rz0, rz1, *q, sy, sz, a, b, c, d, t, u, v;
        register i, j;

        if (start) {
                start = 0;
                init();
        }

        setup(0, bx0,bx1, rx0,rx1);
        setup(1, by0,by1, ry0,ry1);
        setup(2, bz0,bz1, rz0,rz1);

        i = p[ bx0 ];
        j = p[ bx1 ];

        b00 = p[ i + by0 ];
        b10 = p[ j + by0 ];
        b01 = p[ i + by1 ];
        b11 = p[ j + by1 ];

        t  = s_curve(rx0);
        sy = s_curve(ry0);
        sz = s_curve(rz0);

#define at3(rx,ry,rz) ( rx * q[0] + ry * q[1] + rz * q[2] )

        q = g3[ b00 + bz0 ] ; u = at3(rx0,ry0,rz0);
        q = g3[ b10 + bz0 ] ; v = at3(rx1,ry0,rz0);
        a = lerp(t, u, v);

        q = g3[ b01 + bz0 ] ; u = at3(rx0,ry1,rz0);
        q = g3[ b11 + bz0 ] ; v = at3(rx1,ry1,rz0);
        b = lerp(t, u, v);

        c = lerp(sy, a, b);

        q = g3[ b00 + bz1 ] ; u = at3(rx0,ry0,rz1);
        q = g3[ b10 + bz1 ] ; v = at3(rx1,ry0,rz1);
        a = lerp(t, u, v);

        q = g3[ b01 + bz1 ] ; u = at3(rx0,ry1,rz1);
        q = g3[ b11 + bz1 ] ; v = at3(rx1,ry1,rz1);
        b = lerp(t, u, v);

        d = lerp(sy, a, b);

        return lerp(sz, c, d);
}

static void normalize2(float v[2])
{
        float s;

        s = sqrt(v[0] * v[0] + v[1] * v[1]);
        v[0] = v[0] / s;
        v[1] = v[1] / s;
}

static void normalize3(float v[3])
{
        float s;

        s = sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
        v[0] = v[0] / s;
        v[1] = v[1] / s;
        v[2] = v[2] / s;
}

static void init(void)
{
        int i, j, k;

        for (i = 0 ; i < B ; i++) {
                p[i] = i;

                g1[i] = (float)((random() % (B + B)) - B) / B;

                for (j = 0 ; j < 2 ; j++)
                        g2[i][j] = (float)((random() % (B + B)) - B) / B;
                normalize2(g2[i]);

                for (j = 0 ; j < 3 ; j++)
                        g3[i][j] = (float)((random() % (B + B)) - B) / B;
                normalize3(g3[i]);
        }

        while (--i) {
                k = p[i];
                p[i] = p[j = random() % B];
                p[j] = k;
        }

        for (i = 0 ; i < B + 2 ; i++) {
                p[B + i] = p[i];
                g1[B + i] = g1[i];
                for (j = 0 ; j < 2 ; j++)
                        g2[B + i][j] = g2[i][j];
                for (j = 0 ; j < 3 ; j++)
                        g3[B + i][j] = g3[i][j];
        }
}

%]
  }
