import Octokit from "../lib/vendor/octokit/octokit.js";

export default {
  Connector: (function() {

    var Connector = function(options) {
      if(options && options.token && options.token.trim()) {
        this.options = options;
        this.setProperties(options);
      } else {
        this.options = {
          path: "gh-weblog"
        };
      }
    };

    Connector.prototype = {
      setProperties: function(options) {
        this.path = options.path;
        // We're not requiring Octokit, because doing so will cause it to
        // think it's running in node-mode, and complain that it's missing
        // a million dependencies that we don't want baked into the build!
        var octokit = new Octokit({ token: options.token });
        this.repo = octokit.getRepo(options.user, options.repo);
        this.branch = this.repo.getBranch(options.branch);
      },

      // We don't need zepto or jquery for an xhr .get()
      get: function(url, options, processData) {
        if(options && !processData) {
          processData = options;
          options = {};
        }
        var xhr = new XMLHttpRequest();
        var cachebuster = "?cb="+Date.now();
        xhr.open("GET", url + cachebuster, true);
        Object.keys(options).forEach(function(key) { xhr[key] = options[key]; });
        xhr.onreadystatechange = function(evt) {
          if(xhr.status === 0 || xhr.status===200) {
            if(xhr.readyState === 4) {
              var obj = evt.target.response;
              processData(!obj, obj);
            }
          } else {
            processData("xhr error " + xhr.status + " for "+url, false);
          }
        };
        xhr.onerror = function(evt) {
        }
        xhr.send(null);
      },

      // And we also don't need zepto or jquery for an xhr .json()
      json: function(url, processData) {
        this.get(url, function(err, data) {
          if(err) { return console.error(err); }
          try {
            var obj = JSON.parse(data);
            processData(false, obj);
          }
          catch(error) { processdata(error); }
        });
      },

      loadIndex: function(handleIndex, entryId) {
        this.json(this.options.path + "/content/posts/index.json", function(err, result) {
          if (entryId) {
            return handleIndex(err, result ? [entryId] : false);
          }
          handleIndex(err, result ? result.index.sort() : false);
        });
      },

      loadMetadata: function(id, handleMetadata) {
        this.json(this.options.path + "/content/posts/metadata/"+id+".json", function(err, result) {
          handleMetadata(err, result);
        });
      },

      loadEntry: function(id, handleEntry) {
        this.get(this.options.path + "/content/posts/markdown/"+id+".md", function(err, result) {
          handleEntry(err, result);
        });
      },

      saveEntry: function(entry, index, saved) {
        var id = entry.state.id,
            path = this.options.path + "/content/posts/",
            index = JSON.stringify({index:index.sort()},false,2),
            indexFilename = path + "index.json",
            metadata = JSON.stringify(entry.getMetaData(), false, 2),
            metadataFilename = path + "metadata/" + id + ".json",
            postdata = entry.getPostData(),
            postdataFilename = path + "markdown/" + id + ".md",
            commitMessage = "Saving new entry " + id,
            content = {};
        content[indexFilename] = index;
        content[metadataFilename] = metadata;
        content[postdataFilename] = postdata;
        try {
          this.branch.writeMany(content, commitMessage).then(function() {
            console.log("Saved entry " + id + " to github.");
            if(saved) saved(entry);
          });
        } catch(e) {
          console.error("saving went horribly wrong");
          throw e;
        }
      },

      updateEntry: function(entry, updated) {
        var id = entry.state.id;
        console.log("Updating " + id);
        var path = this.options.path + "/content/posts/",
            metadata = JSON.stringify(entry.getMetaData(), false, 2),
            metadataFilename = path + "metadata/" + id + ".json",
            postdata = entry.getPostData(),
            postdataFilename = path + "markdown/" + id + ".md",
            commitMessage = "Updating entry " + id,
            content = {};
        content[metadataFilename] = metadata;
        content[postdataFilename] = postdata;
        try {
          this.branch.writeMany(content, commitMessage).then(function() {
            console.log("Updated entry " + id + " on github.");
            if(updated) updated(entry);
          });
        } catch(e) {
          console.error("updating went horribly wrong");
          throw e;
        }
      },

      deleteEntry: function(entry, index, deleted) {
        var id = entry.state.id;
        console.log("Deleting " + id);

        var path = this.options.path + "/content/posts/";
        var indexFilename = path + "index.json";
        var index = JSON.stringify({index:index.sort()},false,2);
        var metadataFilename = path + "metadata/" + id + ".json";
        var postdataFilename = path + "markdown/" + id + ".md";
        var commitMessage = "Removing entry " + id;
        var branch = this.branch;

        try {
          // update index
          branch.write(indexFilename, index, commitMessage)
          // then remove posts
          .then(function() {
            return branch.remove(metadataFilename, commitMessage);
          })
          .then(function() {
            return branch.remove(postdataFilename, commitMessage);
          })
          .then(function() {
            console.log("Removed entry " + id + " from github.");
            if(deleted) deleted(entry);
          });
        } catch(e) {
          console.error("deleting went horribly wrong");
          throw e;
        }
      },

      saveRSS: function(rss, category, updated) {
        if(typeof category === "function") {
          updated = category;
          category = false;
        }
        var rssFilename = this.options.path + "/" + (category?category+"-":'') + "rss.xml";
        var commitMessage = "Update to RSS XML";
        try {
          this.branch.write(rssFilename, rss, commitMessage)
          .then(function() {
            console.log("Updated RSS on github.");
            if(updated) updated();
          });
        } catch(e) {
          console.error("updating RSS went horribly wrong");
          throw e;
        }
      }
    };

    return Connector;
  }())
};
