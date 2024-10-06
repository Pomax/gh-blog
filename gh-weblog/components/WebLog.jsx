import React from "../lib/vendor/react/react.0.12.min.js";
import utils from "../lib/utils.js";
import Admin from "./Admin.jsx";
import Entry from "./Entry.jsx";

import WebLogSettings from "../lib/weblogsettings.js";
import Connector from "../lib/connector.js";
import timeToId from "../lib/timetoid.js";

export default React.createClass({
  // local cache, because we don't want to load the entire
  // index at once, and we don't want to requery for it.
  index: [],

  // local cache, because we can't be sure state won't
  // be modified multiple times per time slice.
  list: {},

  getInitialState() {
    return {
      singleton: false,
      entries: this.list,
      slice: { start: 0, end: 10 },
      githubissues: "",
      authenticated: false,
      site: "",
      issues: "",
    };
  },

  componentDidMount() {
    const settings = WebLogSettings.getSettings();
    if (settings) {
      this.connector = new Connector(settings);
      if (settings.token) {
        this.setState({ authenticated: true });
      }
    } else {
      this.connector = new this.Connector();
    }

    // are we loading one entry, or "all" entries?
    var fragmentId = location.hash || false;
    if (fragmentId) {
      if (fragmentId.indexOf("#gh-weblog") > -1) {
        fragmentId = fragmentId.replace("#gh-weblog-", "");
      } else {
        fragmentId = false;
      }
    }
    var id = timeToId(fragmentId);
    if (id) {
      this.setState({ singleton: true });
    }

    // load the necessary index information
    this.connector.loadIndex(this.loadIndex, id);

    // determine the issue tracker to use:
    var a = document.createElement("a");
    a.href = this.props.base;
    var user = a.host.replace(".github.io", "");
    var path = a.pathname.replace(/^\//, "").trim().split("/")[0];
    var repo = path ? path : a.host;
    this.setState({
      site: "http://github.com/" + user + "/" + repo,
      issues: "http://github.com/" + user + "/" + repo + "/issues",
    });
  },

  render() {
    if (!!this.state.singleton) {
      return this.renderContent();
    }
    var postbutton = this.state.authenticated ? (
      <button className="admin post button" onClick={this.create}>
        new entry
      </button>
    ) : (
      false
    );
    var adminbutton = (
      <button
        className="authenticate"
        onClick={this.showSettings}
        onClose={this.bindSettings}
      >
        admin
      </button>
    );
    var morebutton = <button onClick={this.more}>Load more posts</button>;
    return this.renderContent(adminbutton, postbutton, morebutton);
  },

  renderContent(adminbutton, postbutton, morebutton) {
    // ensure the URL looks "normal"
    var entry = false;
    if (arguments.length === 0) {
      entry = this.getSlice()[0];
      if (!entry) {
        return false;
      }
      var title = utils.titleReplace(entry.metadata.title);
      var vanityURL = ["/", entry.metadata.created, "/", title].join("");
      history.replaceState({}, title, vanityURL);
    }
    return (
      <div ref="weblog" className="gh-weblog">
        <Admin
          ref="admin"
          hidden="true"
          onClose={this.bindSettings}
          onLogout={this.onLogOut}
        />
        {adminbutton}
        {postbutton}
        {this.generateEntries(entry ? [entry] : false)}
        {morebutton}
      </div>
    );
  },

  generateEntries(entries) {
    entries = entries || this.getSlice();
    return entries.map((entry) => {
      return (
        <Entry
          key={entry.metadata.created}
          ref={entry.metadata.id}
          issues={this.state.issues}
          metadata={entry.metadata}
          postdata={entry.postdata}
          editable={!this.state.singleton && this.state.authenticated}
          runProcessors={this.runProcessors}
          onSave={this.save}
          onDelete={this.delete}
        />
      );
    });
  },

  runProcessors(domNode) {
    if (this.props.processors && this.props.processors instanceof Array) {
      this.props.processors.forEach(function (process) {
        process(domNode);
      });
    }
  },

  showSettings() {
    this.refs.admin.show();
  },

  bindSettings(settings) {
    this.connector.setProperties(settings);
    if (settings.token.trim()) {
      this.setState({ authenticated: true });
    }
  },

  onLogOut() {
    this.setState({ authenticated: false });
  },

  more() {
    this.setState(
      {
        slice: {
          start: this.state.slice.start,
          end: this.state.slice.end + 10,
        },
      },
      this.loadEntries
    );
  },

  getSlice() {
    var list = this.list;
    var start = this.state.slice.start;
    var end = this.state.slice.end;
    var ids = Object.keys(list).sort().reverse().slice(start, end);
    return ids.map(function (id) {
      return list[id];
    });
  },

  loadIndex(err, index) {
    // latest entry on top
    this.index = index.reverse();
    this.loadEntries();
  },

  loadEntries() {
    var connector = this.connector;
    var setEntry = this.setEntry;
    // find load slice
    var start = this.state.slice.start;
    var end = this.state.slice.end;
    var slice = this.index.slice(start, end);
    var cache = this.list;
    // run through all
    (function next(list) {
      if (list.length === 0) return;
      var id = list.splice(0, 1)[0];
      if (cache[id]) return next(list);
      connector.loadMetadata(id, function (err, metadata) {
        if (err) {
          console.error("no metadata found for id: " + id + " (" + err + ")");
          next(list);
          return;
        }
        connector.loadEntry(id, function (err, postdata) {
          if (err) {
            console.error(
              "no post data found for id: " + id + " (" + err + ")"
            );
            next(list);
            return;
          }
          setEntry(id, metadata, postdata);
          next(list);
        });
      });
    })(slice);
  },

  setEntry(id, metadata, postdata) {
    metadata.id = id;
    if (this.index.indexOf(id) === -1) {
      this.index.push(id);
    }
    this.list[id] = {
      metadata: metadata,
      postdata: postdata,
    };
    this.setState({ entries: this.list });
  },

  create() {
    var date = new Date();
    var timestamp = date.getTime();
    var metadata = {
      title: "New Entry",
      created: timestamp,
      published: timestamp, // we can turn this into -1 for drafts
      updated: timestamp,
      tags: [],
    };
    var postdata = "...click here to start editing your post...";
    var id = timeToId(timestamp);
    this.setEntry(id, metadata, postdata);
  },

  save(entry) {
    this.setEntry(entry.state.id, entry.getMetaData(), entry.postdata);
    this.saveRSS();
    this.connector.saveEntry(entry, this.index, () => {
      console.log("save handled");
    });
  },

  delete(entry) {
    var confirmed = confirm("really delete post?");
    if (confirmed) {
      var id = entry.state.id;
      // remove from index:
      var pos = this.index.indexOf(id);
      this.index.splice(pos, 1);
      // remove from list of loaded entries:
      delete this.list[id];
      this.setState({ entries: this.list });
      this.connector.deleteEntry(entry, this.index, () => {
        console.log("delete handled");
        this.saveRSS();
      });
    }
  },

  saveRSS() {
    var connector = this.connector;
    console.log(`Updating RSS...`);
    connector.saveRSS(this.toRSS(), () => {
      console.log(`updated.`);
      if (this.props.rssfeeds) {
        console.log(`Updating category-specific RSS...`);
        const feeds = this.props.rssfeeds
          .split(",")
          .map((v) => v.trim())
          .filter((v) => !!v);

        (function nextCategory(self) {
          if (feeds.length === 0) return console.log(`All RSS feeds updated`);
          var category = feeds.splice(0, 1)[0];
          console.log(`Updating category ${category}`);
          connector.saveRSS(
            self.toRSS(category),
            category.toLowerCase(),
            nextCategory
          );
        })(this);
      }
    });
  },

  toRSS(category) {
    // Don't update RSS if we're looking at a single entry.
    // We shouldn't even get to this function, really.
    if (this.state.singleton) return;

    // Don't update if there was a change to out-of-RSS content,
    // because those changes won't make it into the RSS feed anyway.
    if (this.state.slice.start >= 10) return;

    const { base } = this.props;

    // Boilerplate RSS 2.0 header
    var rssHeading = `<?xml version="1.0" encoding="UTF-8" ?>
  <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
      <atom:link href="${base}/${
      this.props.path
    }/rss.xml" rel="self" type="application/rss+xml" />
      <title>${this.props.title}</title>
      <description>${this.props.description}${
      category ? ` [${category} posts only]` : ``
    }</description>
      <link>${base}</link>
      <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
      <pubDate>${new Date().toUTCString()}</pubDate>
      <ttl>1440</ttl>
  `;

    // generate the RSS for the latest 10 entries only.
    var entryIds = Object.keys(this.list).sort().reverse().slice(0, 10);
    var entriesRSS = entryIds
      .map((id) => this.refs[id].toRSS(base, category))
      .filter((v) => !!v)
      .join("\n");

    // Boilerplate tail bit for the RSS feed
    var rssTail = `
    </channel>
  </rss>
  `;

    // concatenated
    var rss = rssHeading + entriesRSS + rssTail;
    console.log(rss);

    // we're done here.
    return rss;
  },
});
