import React from "../lib/vendor/react/react.0.12.min.js";

export default React.createClass({

  getInitialState: function() {
    return { text: '' };
  },

  componentDidMount: function() {
    this.setState({ text: this.props.text });
  },

  render: function() {
    return (
      <textarea ref="textarea"
                className="editor"
                hidden={this.props.hidden}
                value={this.state.text}
                onChange={this.record} />
    );
  },

  setText: function(text) {
    var textarea = this.refs.textarea.getDOMNode();
    this.setState({ text: text }, function() {
      textarea.focus();
    });
  },

  record: function(evt) {
    this.setState({ text: evt.target.value });
    this.props.update(evt);
  },

  finish: function(evt) {
    this.props.view();
  }

});
