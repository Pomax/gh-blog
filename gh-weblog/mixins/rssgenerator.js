export default {
  /**
   * So, this is weird given that
   */
  toRSS: function(category) {
    var self = this;
    var base = this.props.base;

    // Don't update RSS if we're looking at a single entry.
    // We shouldn't even get to this function, really.
    if(this.state.singleton) return;

    // Don't update if there was a change to out-of-RSS content,
    // because those changes won't make it into the RSS feed anyway.
    if(this.state.slice.start>=10) return;

    // Boilerplate RSS 2.0 header
    var rssHeading = [
        '<?xml version="1.0" encoding="UTF-8" ?>'
      , '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">'
      , '<channel>'
      , '<atom:link href="' + this.props.base + '/' + this.props.path + '/rss.xml" rel="self" type="application/rss+xml" />'
      , '<title>' + this.props.title + '</title>'
      , '<description>' + this.props.description + (category ? " ["+category+" posts only]":'') + '</description>'
      , '<link>' +  base + '</link>'
      , '<lastBuildDate>' + (new Date()).toUTCString() + '</lastBuildDate>'
      , '<pubDate>' + (new Date()).toUTCString() + '</pubDate>'
      , '<ttl>1440</ttl>'
    ].join("\n") + "\n";

    // generate the RSS for the latest 10 entries only.
    var entryIds = Object.keys(this.list).sort().reverse().slice(0,10);
    var entriesRSS = entryIds.map(function(id) {
      var entry = self.refs[id];
      // If we need to filter for categories, entries that do not match
      // that category contribute an empty string.
      if(category && entry.state.tags.indexOf(category)===-1) return "";
      // Everything else contributes genuine RSS code
      var html = entry.getHTMLData();
      var safifier = document.createElement("div");
      safifier.textContent = html;
      var rsshtml = safifier.innerHTML;
      var rssForm = [
          '<item>'
        , '<title>' + entry.state.title + '</title>'
        , '<description>' + rsshtml + '</description>'
        , entry.state.tags.map(function(tag) { return '<category>' + tag + '</category>'; }).join("\n")
        , '<link>' + base + '/#gh-weblog-' + entry.state.published + '</link>'
        , '<guid>' + base + '/#gh-weblog-' + entry.state.published + '</guid>'
        , '<pubDate>' + (new Date(entry.state.published)).toUTCString() + '</pubDate>'
        , '</item>'
      ];
      return rssForm.join('\n');
    }).filter(function(v) { return !!v }).join('\n');

    // Boilerplate tail bit for the RSS feed
    var rssTail = [
        '</channel>'
      , '</rss>'
    ].join("\n") + "\n";

    // concatenated
    var rss = rssHeading + entriesRSS + rssTail;

    // we're done here.
    return rss;
  }
};
