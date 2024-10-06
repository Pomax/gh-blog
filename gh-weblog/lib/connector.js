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

  get(url, options, processData) {
    if (options && !processData) {
      processData = options;
      options = {};
    }
    const xhr = new XMLHttpRequest();
    xhr.open("GET", `${url}?t=${Date.now()}`, true);
    Object.keys(options).forEach(function (key) {
      xhr[key] = options[key];
    });
    xhr.onreadystatechange = function (evt) {
      if (xhr.status === 0 || xhr.status === 200) {
        if (xhr.readyState === 4) {
          const obj = evt.target.response;
          processData(!obj, obj);
        }
      } else {
        processData(`xhr error ${xhr.status} for ${url}`);
      }
    };
    xhr.onerror = processData;
    xhr.send(null);
  }

  json(url, processData) {
    this.get(url, function (err, data) {
      if (err) {
        return console.error(err);
      }
      try {
        processData(false, JSON.parse(data));
      } catch (error) {
        processData(error);
      }
    });
  }

  loadIndex(handleIndex, entryId) {
    this.json(
      `${this.options.path}/content/posts/index.json`,
      function (err, result) {
        if (entryId) {
          return handleIndex(err, result ? [entryId] : false);
        }
        handleIndex(err, result ? result.index.sort() : false);
      }
    );
  }

  loadMetadata(id, handleMetadata) {
    this.json(
      `${this.options.path}/content/posts/metadata/${id}.json`,
      function (err, result) {
        handleMetadata(err, result);
      }
    );
  }

  loadEntry(id, handleEntry) {
    this.get(
      `${this.options.path}/content/posts/markdown/${id}.md`,
      function (err, result) {
        handleEntry(err, result);
      }
    );
  }

  saveEntry(entry, index, saved) {
    const id = entry.state.id;
    const path = `${this.options.path}/content/posts/`;
    const commitMessage = `Saving new entry ${id}`;
    const content = {};

    const indexdata = JSON.stringify({ index: index.sort() }, false, 2);
    const indexFilename = `${path}index.json`;
    content[indexFilename] = indexdata;

    const metadata = JSON.stringify(entry.getMetaData(), false, 2);
    const metadataFilename = `${path}metadata/${id}.json`;
    content[metadataFilename] = metadata;

    const postData = entry.getpostData();
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

  updateEntry(entry, updated) {
    const id = entry.state.id;
    const path = `${this.options.path}/content/posts/`;
    const content = {};
    const commitMessage = `Updating entry ${id}`;

    const metadata = JSON.stringify(entry.getMetaData(), false, 2);
    const metadataFilename = `${path}metadata/${id}.json`;
    content[metadataFilename] = metadata;

    const postData = entry.getpostData();
    const postDataFilename = `${path}markdown/${id}.md`;
    content[postDataFilename] = postData;

    try {
      this.branch.writeMany(content, commitMessage).then(function () {
        console.log(`Updated entry ${id} on github.`);
        if (updated) updated(entry);
      });
    } catch (e) {
      console.error(`updating went horribly wrong`);
      throw e;
    }
  }

  deleteEntry(entry, index, deleted) {
    const id = entry.state.id;
    const path = `${this.options.path}/content/posts/`;
    const commitMessage = `Removing entry ${id}`;

    const indexdata = JSON.stringify({ index: index.sort() }, false, 2);
    const indexFilename = `${path}index.json`;

    const metadataFilename = `${path}metadata/${id}.json`;
    const postDataFilename = `${path}markdown/${id}.md`;

    const branch = this.branch;

    try {
      // update index
      branch
        .write(indexFilename, indexdata, commitMessage)
        // then remove posts
        .then(() => branch.remove(metadataFilename, commitMessage))
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
