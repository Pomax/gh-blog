import React from "../lib/vendor/react/react.0.12.min.js";
import utils from "../lib/utils.js";
import MarkDown from "./MarkDown.jsx";
import Editor from "./Editor.jsx";
import Tags from "./Tags.jsx";

export default React.createClass({
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
    const { metadata, postdata } = this.props;
    metadata.postdata = postdata;
    this.setState(metadata);
    const root = document.querySelector(`:root`);
    root.addEventListener(`click`, (evt) => {
      if (evt.target !== root) return;
      this.view();
    });
  },

  render() {
    const title = utils.titleReplace(this.state.title);
    let deleteButton;
    if (this.props.editable) {
      deleteButton = (
        <button className="admin delete button" onClick={this.delete}>
          remove entry
        </button>
      );
    }
    const posted = new Date(this.state.published).toLocaleString();
    const updated = new Date(this.state.updated).toLocaleString();
    return (
      <div className="entry" id={`gh-weblog-${this.state.created}`}>
        {deleteButton}
        <header>
          <h1>
            <a href={`/${this.state.created}/${title}`}>{this.state.title}</a>
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
          text={this.getText()}
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

  updateTags(tags) {
    this.setState({ tags }, () => this.props.onSave(this));
  },

  getText() {
    return `#${this.state.title}\n\n${this.state.postdata}`;
  },

  getMetaData() {
    const md = JSON.parse(JSON.stringify(this.state));
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
    const lines = evt.target.value.split("\n");
    const title = lines.splice(0, 1)[0].replace(/^#*/, "");
    const postdata = lines.join("\n").trim();
    this.setState({ title, postdata, updated: Date.now() });
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
  toRSS(base, category) {
    // If we need to filter for categories, entries that do not match
    // that category contribute an empty string.
    if (category && entry.state.tags.indexOf(category) === -1) {
      return false;
    }
    // Everything else contributes genuine RSS code
    var html = this.getHTMLData();
    var safifier = document.createElement("div");
    safifier.textContent = html;

    return `
    <item>
      <title>${this.state.title}</title>
      <description>${safifier.innerHTML}</description>
      ${this.state.tags.map((tag) => `<category>${tag}</category>`).join(`\n      `)}
      <link>${base}/#gh-weblog-${this.state.published}</link>
      <guid>${base}/#gh-weblog-${this.state.published}</guid>
      <pubDate>${new Date(this.state.published).toUTCString()}</pubDate>
    </item>
`;
  },
});
