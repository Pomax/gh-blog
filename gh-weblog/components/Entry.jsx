import { React, createClass } from "../lib/create-component.js";
import utils from "../lib/utils.js";
import MarkDown from "./MarkDown.jsx";
import Editor from "./Editor.jsx";
import Tags from "./Tags.jsx";

// TODO: add a category field

export default createClass({
  initialState: {
    id: -1,
    title: "",
    created: Date.now(),
    published: Date.now(),
    updated: Date.now(),
    tags: [],
    editing: false,
    postData: "",
  },

  onMount() {
    const { metaData, postData } = this.props;
    const update = { ...metaData, postData };
    console.log(`update:`, update);
    this.setState(update);
    const root = document.querySelector(`:root`);
    root.addEventListener(`click`, (evt) => {
      if (evt.target !== root) return;
      this.view();
    });
  },

  render() {
    const { props, state } = this;
    const title = utils.titleReplace(state.title);
    let deleteButton;
    if (props.editable) {
      deleteButton = (
        <button className="admin delete button" onClick={this.delete}>
          remove entry
        </button>
      );
    }
    const posted = new Date(state.published).toLocaleString();
    const updated = new Date(state.updated).toLocaleString();
    return (
      <div className="entry" id={`gh-weblog-${state.created}`}>
        {deleteButton}
        <header>
          <h1>
            <a href={`/${state.created}/${title}`}>{state.title}</a>
          </h1>
          <h2>
            Originally posted on {posted}, last updated on {updated}
          </h2>
        </header>
        <MarkDown
          ref="markdown"
          hidden={state.editing}
          text={state.postData}
          onClick={this.edit}
        />
        <Editor
          ref="editor"
          hidden={!state.editing}
          text={this.getText()}
          update={this.update}
          view={this.view}
          delete={this.delete}
        />
        <a className="comments" href={props.issues}>
          leave a comment on github
        </a>
        <Tags
          disabled={!props.editable}
          tags={state.tags}
          onChange={this.updateTags}
        />
      </div>
    );
  },

  updateTags(tags) {
    this.setState({ tags }, () => this.props.onSave(this));
  },

  getText() {
    return `#${this.state.title}\n\n${this.state.postData}`;
  },

  getMetaData() {
    const md = JSON.parse(JSON.stringify(this.state));
    delete md.editing;
    delete md.postData;
    return md;
  },

  getPostData() {
    return this.state.postData;
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
    const postData = lines.join("\n").trim();
    this.setState({ title, postData, updated: Date.now() });
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
      ${this.state.tags
        .map((tag) => `<category>${tag}</category>`)
        .join(`\n      `)}
      <link>${base}/#gh-weblog-${this.state.published}</link>
      <guid>${base}/#gh-weblog-${this.state.published}</guid>
      <pubDate>${new Date(this.state.published).toUTCString()}</pubDate>
    </item>
`;
  },
});
