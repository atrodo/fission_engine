    [% IF record %]
      var record_progress = $("<div/>")
      var record_skip = $("<input/>")
      var record_play = $("<div/>")
        .append($("<textarea/>").width("600px"))
        .append("<br/>")
        .append(record_progress)
        .append("<label>Skip</label>")
        .append(record_skip)
        .append("<br/>")
        .append($("<button/>")
          .text("Generate")
          .click(function()
          {
            //mkdir
            Zippie.mkdir({d: Date.now() + ""},
            function(stat)
            {
              console.log(arguments);
              var orig_json = record_play.find('textarea').val()

              Zippie.writeFile({
                d: stat.d,
                f: "original.json",
                s: btoa(orig_json),
              }, function() {});

              var data = $.parseJSON(orig_json)
              var old_all_physics = all_physics;
              var old_cou = cou;
              var old_chunks = chunks;

              var chunk_storage = {};
              chunks = new Chunks(chunk_storage);

              event_div.trigger('fission.cache_flush_all');

              var done = function()
              {
                all_physics = old_all_physics;
                cou = old_cou;
              }

              var output_files = [];

              if ($.type(data) == "array")
              {
                data = {
                  p: data,
                };
              }

              var all_frames = data.p;
              var frame_count = data.p.length;
              var skip = record_skip.val();

              var flushed_chunks = {}

              var load_chunks = function(frame_chunks)
              {
                if (frame_chunks != undefined)
                {
                  for (var name in frame_chunks)
                  {
                    var chunk = frame_chunks[name];
                    var old_chunk = chunks.get_chunk_by_name(name);
                    chunks.invalid(old_chunk)
                    chunk_storage[name] = chunk
                    flushed_chunks[name] = 1
                  }
                }
              }

              var write_file = function()
              {
                var frame = all_frames.shift();

                if (frame == undefined)
                {
                  done();
                  return;
                }

                var i = (frame_count - all_frames.length)

                all_physics = []
                cou = frame.cou;

                load_chunks(frame.c)

                if ( i < skip )
                {
                  var skipped = 0;
                  while ( i < skip )
                  {
                    var frame = all_frames.shift();
                    load_chunks(frame.c)
                    record_progress.text("Skip: " + i);
                    i = (frame_count - all_frames.length)
                    skipped++;
                    if (skipped > 100)
                      break;
                  }
                  window.setTimeout(write_file, 1);
                  return;
                }

                $.each(flushed_chunks, function(name, v)
                {
                  var old_chunk = chunks.get_chunk_by_name(name);
                  chunks.flush(old_chunk)
                });

                flushed_chunks = {}

                if (frame.p != undefined)
                  $.each(frame.p, function(i, phys)
                  {
                    all_physics.push(Physics.quick_load(phys))
                  })

                paint_chunks()
                repaint()

                record_data = "[]"

                i = i + "";

                while (i.length < 10)
                {
                  i = "0" + i;
                }
                var data_url = canvas.get(0).toDataURL().split(/,/);
                var file = data_url[1];

                var file_data = {
                  d: stat.d,
                  f: i + ".png",
                  s: file,
                }

                /*
                $.ajax({
                  type: 'POST',
                  url: '/zippie/writeFile.pl',
                  data: file_data,
                  //contentType: "image/png",
                  success: write_file,
                });
                */
                Zippie.writeFile(file_data, write_file);

                record_progress.text("Done: " + i);
              }

              write_file();
              write_file();
            })
          })
        )
        .hide()

      var record_data = "[]"
      console.log(chunks);
      content
        .append($("<button/>")
          .text("Build Record Data")
          .css("display", "block")
          .click(function(e)
          {
            e.preventDefault()
            var final_data = "[" + record_data + "]";
            var recording = "data:text/plane;base64," + btoa(final_data);
            content
              /*
              .append($("<a/>")
                .attr("href", recording)
                .text("Recording")
                .css("display", "block")
              )
              */
            record_play.find('textarea').val(final_data)
          })
        )
        .append($("<button/>")
          .text("Gen Recording")
          .click(function() { record_play.toggle() })
        )

      content
        .append(record_play)

      var flushed_chunks = {};
      event_div.bind('fission.cache_flush fission.chunk_change', function(e, chunk_name)
      {
        flushed_chunks[chunk_name] = chunks.get_chunk_storage_by_name(chunk_name);
      });
    [% END %]

