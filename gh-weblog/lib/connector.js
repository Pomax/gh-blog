import Octokit from "../lib/vendor/octokit/octokit.js";

export default class Connector {
  constructor(options) {
    if (options && options.token && options.token.trim()) {
      this.options = options;
      this.setProperties(options);
    } else {
      this.options = {
        path: "gh-weblog",
      };
    }
  }

  setProperties(options) {
    this.path = options.path;
    this.repo = new Octokit({ token: options.token }).getRepo(
      options.user,
      options.repo
    );
    this.branch = this.repo.getBranch(options.branch);
  }

  async get(url) {
    const type = url.endsWith(`.json`) ? `json` : `text`;
    const result = await fetch(`${url}?t=${Date.now()}`);
    if (result.ok) {
      return await result[type]();
    }
    throw new Error(result.status);
  }

  async loadIndex() {
    return await this.get(`${this.options.path}/content/posts/index.json`);
  }

  async loadMetaData(id) {
    return this.get(`${this.options.path}/content/posts/metadata/${id}.json`);
  }

  async loadPostData(id) {
    return this.get(`${this.options.path}/content/posts/markdown/${id}.md`);
  }

  saveEntry({ id, metaData, postData }, index, saved) {
    const path = `${this.options.path}/content/posts/`;
    const commitMessage = `Saving new entry ${id}`;
    const content = {};

    const indexData = JSON.stringify(index, false, 2);
    const indexFilename = `${path}index.json`;
    content[indexFilename] = indexData;

    metaData = JSON.stringify(metaData, false, 2);
    const metaDataFilename = `${path}metadata/${id}.json`;
    content[metaDataFilename] = metaData;

    const postDataFilename = `${path}markdown/${id}.md`;
    content[postDataFilename] = postData;

    try {
      this.branch.writeMany(content, commitMessage).then(function () {
        console.log(`Saved entry ${id} to github.`);
        if (saved) saved(entry);
      });
    } catch (e) {
      console.error(`saving went horribly wrong`);
      throw e;
    }
  }

  deleteEntry(entry, index, deleted) {
    const id = entry.state.id;
    const path = `${this.options.path}/content/posts/`;
    const commitMessage = `Removing entry ${id}`;

    const indexData = JSON.stringify({ index: index.sort() }, false, 2);
    const indexFilename = `${path}index.json`;
    const metaDataFilename = `${path}metaData/${id}.json`;
    const postDataFilename = `${path}markdown/${id}.md`;
    const branch = this.branch;

    try {
      // update index
      branch
        .write(indexFilename, indexData, commitMessage)
        // then remove posts
        .then(() => branch.remove(metaDataFilename, commitMessage))
        .then(() => branch.remove(postDataFilename, commitMessage))
        .then(() => {
          console.log(`Removed entry ${id} from github.`);
          if (deleted) deleted(entry);
        });
    } catch (e) {
      console.error(`deleting went horribly wrong`);
      throw e;
    }
  }

  saveRSS(rss, category, updated) {
    if (typeof category === "function") {
      updated = category;
      category = false;
    }
    category = category ? `${category}-` : ``;
    const rssFilename = `${this.options.path}/${category}rss.xml`;
    const commitMessage = `Update to RSS XML`;

    try {
      this.branch.write(rssFilename, rss, commitMessage).then(() => {
        console.log(`Updated RSS on github.`);
        if (updated) updated();
      });
    } catch (e) {
      console.error(`updating RSS went horribly wrong`);
      throw e;
    }
  }
}
