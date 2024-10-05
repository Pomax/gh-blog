import React from "../lib/vendor/react/react.0.12.min.js";
import marked from "../lib/vendor/marked/marked.js";

export default React.createClass({
  render() {
    var html = { __html: marked(this.props.text) };
    return (
      <div
        ref="post"
        className="post"
        hidden={this.props.hidden}
        onClick={this.props.onClick}
        dangerouslySetInnerHTML={html}
      />
    );
  },
  getHTML() {
    return this.refs.post.getDOMNode().innerHTML;
  },
});
