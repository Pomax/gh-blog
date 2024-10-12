import { Octokit as OctokitCore } from "@octokit/core";
import { createOrUpdateTextFile } from "@octokit/plugin-create-or-update-text-file";
const Octokit = OctokitCore.plugin(createOrUpdateTextFile);

export default class Connector {
  constructor(options) {
    if (options && options.token && options.token.trim()) {
      this.options = options;
      this.setProperties(options);
    } else {
      this.path = `gh-weblog`;
      this.options = {
        path: this.path,
      };
    }
  }

  setProperties(options) {
    this.path = options.path;
    this.octokit = new Octokit({ auth: options.token });
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
    return await this.get(`${this.path}/content/posts/index.json`);
  }

  async loadMetaData(id) {
    return this.get(`${this.path}/content/posts/metadata/${id}.json`);
  }

  async loadPostData(id) {
    return this.get(`${this.path}/content/posts/markdown/${id}.md`);
  }

  // -----------------------------------------------------------

  async getCurrentSha() {
    const { octokit, options } = this;
    const { user, repo, branch } = options;
    return (
      await octokit.request(`GET /repos/${user}/${repo}/commits/${branch}`)
    ).data.sha;
  }

  async makeBlob(data) {
    const { user, repo } = this.options;
    const blobData = await this.octokit.git.createBlob({
      owner: user,
      repo,
      data,
      encoding: "utf-8",
    });
    return blobData.data;
  }

  async saveEntry({ id, metaData, postData }, index, saved) {
    const { options, octokit } = this;
    const { user: owner, repo, branch } = options;
    const path = `${this.path}/content/posts/`;
    const message = `Saving new entry ${id}`;
    const content = {};

    // Prepare our "files"

    console.log(`index`, index);
    const indexData = JSON.stringify(index, false, 2);
    const indexFilename = `${path}index.json`;
    content[indexFilename] = (
      await this.octokit.git.createBlob({
        owner,
        repo,
        content: indexData,
        encoding: "utf-8",
      })
    ).data;

    console.log(`metadata`, metaData);
    metaData = JSON.stringify(metaData, false, 2);
    const metaDataFilename = `${path}metadata/${id}.json`;
    content[metaDataFilename] = (
      await this.octokit.git.createBlob({
        owner,
        repo,
        content: metaData,
        encoding: "utf-8",
      })
    ).data;

    console.log(`postdata`, postData);
    const postDataFilename = `${path}markdown/${id}.md`;
    content[postDataFilename] = (
      await this.octokit.git.createBlob({
        owner,
        repo,
        content: postData,
        encoding: "utf-8",
      })
    ).data;

    // Then prepare a tree that we'll push up
    console.log(`forming path/blob tree association`);
    const paths = Object.keys(content);
    const blobs = Object.values(content);
    const tree = blobs.map(({ sha }, index) => ({
      path: paths[index],
      mode: `100644`,
      type: `blob`,
      sha,
    }));

    // Create the tree and get its sha
    const currentSha = await this.getCurrentSha();
    console.log(`create tree, currentSha is ${currentSha}`);
    const treeSha = (
      await octokit.git.createTree({
        owner,
        repo,
        tree,
        base_tree: currentSha,
      })
    ).data.sha;

    // Create a commit and get its sha
    const newCommit = (
      await octokit.git.createCommit({
        owner,
        repo,
        message,
        tree: treeSha,
        parents: [currentSha],
      })
    ).data;

    // Update the branch ref
    octokit.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: newCommit.sha,
    });
  }

  deleteEntry(entry, index, deleted) {
    const id = entry.state.id;
    const path = `${this.path}/content/posts/`;
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
    const rssFilename = `${this.path}/${category}rss.xml`;
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
