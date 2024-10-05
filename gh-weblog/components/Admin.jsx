import React from "../lib/vendor/react/react.0.12.min.js";
import webLogSettings from "../mixins/weblogsettings.js";

export default React.createClass({
  mixins: [webLogSettings],

  getInitialState() {
    return {
      hidden: true,
      user: "",
      repo: "",
      branch: "",
      path: "gh-weblog",
      token: "",
    };
  },

  componentDidMount() {
    var obj = this.getSettings();
    if (obj) {
      obj.hidden = this.props.hidden;
      this.setState(obj);
    }
  },

  render() {
    return (
      <div className="underlay" hidden={this.state.hidden} onClick={this.close}>
        <div className="overlay" onClick={this.stopPropagation}>
          <button className="logout" onClick={this.reset}>
            Log out
          </button>
          <h1>Weblog administration settings</h1>
          <table>
            <tr>
              <td>Your github username:</td>
              <td>
                <input
                  type="text"
                  placeholder="yourname"
                  value={this.state.user}
                  onChange={this.changeUser}
                />
              </td>
            </tr>
            <tr>
              <td>github repository:</td>
              <td>
                <input
                  type="text"
                  placeholder="yourname.github.io"
                  value={this.state.repo}
                  onChange={this.changeRepo}
                />
              </td>
            </tr>
            <tr>
              <td>repository branch:</td>
              <td>
                <input
                  type="text"
                  placeholder="master"
                  value={this.state.branch}
                  onChange={this.changeBranch}
                />
              </td>
            </tr>
            <tr>
              <td>path to weblog:</td>
              <td>
                <input
                  type="text"
                  value={this.state.path}
                  onChange={this.changePath}
                />
              </td>
            </tr>
          </table>
          <h1>
            Github{" "}
            <a href="https://github.com/settings/applications">
              Personal Access Token
            </a>
          </h1>
          <input
            type="text"
            className="token"
            value={this.state.token}
            onChange={this.changeToken}
          />
          <p>
            Don&#39;t give this token more permissions than necessary! gh-weblog
            only needs repo access!
          </p>
        </div>
      </div>
    );
  },

  reset() {
    this.clearSettings();
    this.setState({
      user: "",
      repo: "",
      branch: "",
      path: "gh-weblog",
      token: "",
      hidden: true,
    });
    this.props.onLogout();
  },

  show() {
    this.setState({ hidden: false });
  },

  close() {
    this.setState({ hidden: true });
    this.props.onClose({
      user: this.state.user,
      repo: this.state.repo,
      branch: this.state.branch,
      path: this.state.path,
      token: this.state.token,
    });
  },

  stopPropagation(evt) {
    evt.stopPropagation();
    evt.preventDefault();
  },

  changeUser(evt) {
    this.setState({ user: evt.target.value }, this.update);
  },

  changeRepo(evt) {
    this.setState({ repo: evt.target.value }, this.update);
  },

  changeBranch(evt) {
    this.setState({ branch: evt.target.value }, this.update);
  },

  changePath(evt) {
    this.setState({ path: evt.target.value }, this.update);
  },

  changeToken(evt) {
    this.setState({ token: evt.target.value }, this.update);
  },

  update() {
    this.saveSettings(this.state);
  },
});
