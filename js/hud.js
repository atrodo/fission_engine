  var all_huds = []

  function Hud(options)
  {
    $.extend(this, {
      animation: null,

      x: 10,
      y: 10,
    }, options);

    if (!(this.animation instanceof Animation))
      throw "Must provide a Animation";
  }

  var add_hud = function(new_hud)
  {
    if (!(new_hud instanceof Hud))
      throw "Hud elements must be a 'Hud'";

    all_huds.push(new_hud)
  }

  var remove_hud = function(old_hud)
  {
    for (var obj in all_huds)
    {
      var hud = all_huds[obj]

      if (hud == old_hud)
      {
         delete all_huds[obj]
      }
    }

    all_huds = fix_all(all_huds)
  }
