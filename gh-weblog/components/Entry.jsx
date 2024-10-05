import React from "../lib/vendor/react/react.0.12.min.js";
import utils from "../lib/utils.js";
import MarkDown from "./MarkDown.jsx";
import Editor from "./Editor.jsx";
import Tags from "./Tags.jsx";
import onClickOutside from "../mixins/onclickoutside.js";

export default React.createClass({
  mixins: [onClickOutside],

  getInitialState() {
    return {
      id: -1,
      title: "",
      created: Date.now(),
      published: Date.now(),
      updated: Date.now(),
      tags: [],
      editing: false,
      postdata: "",
    };
  },

  componentDidMount() {
    var state = this.props.metadata;
    state.postdata = this.props.postdata;
    this.setState(state);
  },

  render() {
    var text = this.getText();
    var id = "gh-weblog-" + this.state.created;
    var title = utils.titleReplace(this.state.title);
    var entryURL = ["/", this.state.created, "/", title].join("");
    var deletebutton;
    if (this.props.editable) {
      deletebutton = (
        <button className="admin delete button" onClick={this.delete}>
          remove entry
        </button>
      );
    }
    var posted = new Date(this.state.published).toLocaleString();
    var updated = new Date(this.state.updated).toLocaleString();
    return (
      <div className="entry" id={id}>
        {deletebutton}
        <header>
          <h1>
            <a href={entryURL}>{this.state.title}</a>
          </h1>
          <h2>
            Originally posted on {posted}, last updated on {updated}
          </h2>
        </header>
        <MarkDown
          ref="markdown"
          hidden={this.state.editing}
          text={this.state.postdata}
          onClick={this.edit}
        />
        <Editor
          ref="editor"
          hidden={!this.state.editing}
          text={text}
          update={this.update}
          view={this.view}
          delete={this.delete}
        />
        <a className="comments" href={this.props.issues}>
          leave a comment on github
        </a>
        <Tags
          disabled={!this.props.editable}
          tags={this.state.tags}
          onChange={this.updateTags}
        />
      </div>
    );
  },

  componentDidUpdate() {
    this.props.runProcessors(this.refs.markdown.getDOMNode());
  },

  handleClickOutside(evt) {
    this.view();
  },

  updateTags(tags) {
    var self = this;
    this.setState({ tags: tags }, function () {
      this.props.onSave(self);
    });
  },

  getText() {
    return "#" + this.state.title + "\n\n" + this.state.postdata;
  },

  getMetaData() {
    var md = JSON.parse(JSON.stringify(this.state));
    delete md.editing;
    delete md.postdata;
    return md;
  },

  getPostData() {
    return this.state.postdata;
  },

  getHTMLData() {
    return this.refs.markdown.getHTML();
  },

  edit() {
    if (this.props.editable) {
      this.refs.editor.setText(this.getText());
      this.setState({ editing: true });
    }
  },

  update(evt) {
    var lines = evt.target.value.split("\n");
    var title = lines.splice(0, 1)[0].replace(/^#*/, "");
    var postdata = lines.join("\n").trim();
    this.setState({
      title: title,
      postdata: postdata,
      updated: Date.now(),
    });
  },

  view() {
    if (this.state.editing) {
      this.setState({ editing: false });
      this.props.onSave(this);
    }
  },

  delete() {
    this.props.onDelete(this);
  },

  // serialise this entry to RSS xml
  toRSS() {
    // ... code goes here ...
  },
});
