import { React, createClass } from "../lib/create-component.js";
import utils from "../lib/utils.js";
import Admin from "./Admin.jsx";
import Entry from "./Entry.jsx";

import WebLogSettings from "../lib/weblogsettings.js";
import Connector from "../lib/connector.js";

function timeToId(timestamp) {
  if (!timestamp) return false;
  var d = new Date(parseInt(timestamp, 10));
  var s = d.toISOString();
  var id = s.replace("T", "-").replace(/\..*/, "").replace(/\:/g, "-");
  return id;
}

export default createClass({
  // local cache, because we don't want to load the entire
  // index at once, and we don't want to requery for it.
  index: [],

  // local cache, because we can't be sure state won't
  // be modified multiple times per time slice.
  list: {},

  initialState: {
    singleton: false,
    entries: {},
    entryIds: [],
    index: {},
    slice: { start: 0, end: 10 },
    authenticated: false,
    site: ``,
    issues: ``,
    categories: undefined,
  },

  getPostId() {
    // are we loading one entry, or "all" entries?
    let fragmentId = location.hash || false;
    if (fragmentId) {
      if (fragmentId.indexOf(`#gh-weblog`) > -1) {
        fragmentId = fragmentId.replace(`#gh-weblog-`, ``);
      } else {
        fragmentId = false;
      }
    }
    const id = timeToId(fragmentId);
    if (id) {
      this.setState({ singleton: true });
    }
    return id;
  },

  setIssueTracker() {
    const site = document.getElementById(`gh-weblog`).dataset.site;
    this.setState({ site, issues: `${site}/issues` });
  },

  async onMount() {
    this.loadSettings();
    const id = this.getPostId();

    // load the necessary index information
    const index = await this.connector.loadIndex();
    const categories = new Set();
    Object.values(index).forEach((e) => categories.add(e.category));
    this.setState(
      {
        index,
        categories: [...categories],
        entryIds: Object.keys(index).sort().reverse(),
      },
      () => {
        this.props.onCategories?.(this.state.categories);
        this.loadEntries(id);
        this.setIssueTracker();
      }
    );
  },

  render() {
    const { state } = this;

    if (!!state.singleton) {
      return this.renderContent();
    }

    var postButton = state.authenticated ? (
      <button className="admin post button" onClick={this.createEntry}>
        new entry
      </button>
    ) : (
      false
    );
    var adminButton = (
      <button
        className="authenticate"
        onClick={this.showSettings}
        onClose={this.bindSettings}
      >
        admin
      </button>
    );
    var moreButton = <button onClick={this.more}>Load more posts</button>;
    return this.renderContent(adminButton, postButton, moreButton);
  },

  renderContent(adminButton, postButton, moreButton) {
    // ensure the URL looks "normal"
    var entry = false;
    if (arguments.length === 0) {
      entry = this.getSlice()[0];
      if (!entry) {
        return false;
      }
      var title = utils.titleReplace(entry.metaData.title);
      var vanityURL = ["/", entry.metaData.created, "/", title].join("");
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
        {adminButton}
        {postButton}
        {this.generateEntries(entry ? [entry] : false)}
        {moreButton}
      </div>
    );
  },

  getSlice() {
    const { state } = this;
    var start = state.slice.start;
    var end = state.slice.end;
    var ids = state.entryIds.slice(start, end);
    return ids.map((id) => state.entries[id]).filter(Boolean);
  },

  generateEntries(entries) {
    entries = entries || this.getSlice();
    if (!entries.length) return;

    const { issues, singleton, authenticated } = this.state;

    return entries.map((entry) => {
      return entry.metaData.draft && !authenticated ? null : (
        <Entry
          key={entry.metaData.id}
          id={entry.metaData.id}
          ref={entry.metaData.id}
          issues={issues}
          metaData={entry.metaData}
          postData={entry.postData}
          editable={!singleton && authenticated}
          onSave={this.saveEntry}
          onDelete={this.deleteEntry}
        />
      );
    });
  },

  // ------------------------------------------------------------

  loadSettings() {
    const settings = WebLogSettings.getSettings();
    this.connector = new Connector(settings);
    if (settings && settings.token) {
      this.setState({ authenticated: true });
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

  // ------------------------------------------------------------

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

  // ------------------------------------------------------------

  loadEntries(id) {
    const { updateEntry, connector, state } = this;
    const { entryIds } = state;

    // find load slice
    const start = state.slice.start;
    const end = state.slice.end;
    const slice = id ? [id] : entryIds.slice(start, end);

    // run through all
    (async function next(list) {
      if (!list.length) return;
      const id = list.shift();
      const metaData = await connector.loadMetaData(id);
      const postData = await connector.loadPostData(id);
      updateEntry(id, metaData, postData);
      next(list);
    })(slice);
  },

  createEntry() {
    console.log(`create entry!`);
    const date = new Date();
    const timestamp = date.getTime();
    const metaData = {
      title: "New Entry",
      created: timestamp,
      published: timestamp,
      updated: timestamp,
      tags: [],
      draft: undefined,
    };
    const postData = "...click here to start editing your post...";
    const id = (metaData.id = timeToId(timestamp));
    console.log(`created:`, { id, metaData, postData });
    this.updateEntry(id, metaData, postData);
  },

  updateEntry(id, metaData, postData) {
    const { entries, index } = this.state;
    entries[id] = { metaData, postData };
    const entryIds = Object.keys(entries).sort().reverse();
    const { title, published, category, draft } = metaData;
    index[id] = { title, published, category, draft };
    return new Promise((resolve) =>
      this.setState({ entryIds, entries, index }, resolve)
    );
  },

  async saveEntry(entry) {
    const metaData = entry.getMetaData();
    const id = metaData.id;
    const postData = entry.getPostData();
    await this.updateEntry(id, metaData, postData);
    this.connector.saveEntry(
      { id, metaData, postData },
      this.state.index,
      () => {
        console.log("save handled");
        this.saveRSS();
      }
    );
  },

  deleteEntry(entry) {
    if (confirm("really delete post?")) {
      var id = entry.state.id;

      // remove from entryIds, entries, and index
      const { entryIds, entries, index } = this.state;
      const pos = entryIds.indexOf(id);
      entryIds.splice(pos, 1);
      delete entries[id];
      delete index[id];

      this.setState({ entryIds, entries, index });
      this.connector.deleteEntry(id, index, () => {
        console.log("delete handled");
        this.saveRSS();
      });
    }
  },

  // ------------------------------------------------------------

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
    const html = document.getElementById(`gh-weblog`);
    const { description } = html.dataset;

    // Boilerplate RSS 2.0 header
    var rssHeading = `<?xml version="1.0" encoding="UTF-8" ?>
  <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
      <atom:link href="${base}/${
      this.props.path
    }/rss.xml" rel="self" type="application/rss+xml" />
      <title>${document.title}</title>
      <description>${description}${
      category ? ` [${category} posts only]` : ``
    }</description>
      <link>${location.toString()}</link>
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
