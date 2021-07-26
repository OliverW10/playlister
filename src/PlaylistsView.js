import React from 'react';
import { serverUrl, getQueryVariable, scrollOptions, overscrollOptions } from './utilities';
import Scrollbar from 'smooth-scrollbar';
const axios = require('axios'); // dont know difference between require and import


class PlaylistItemExtra extends React.Component{
  render(){
    console.log("rendered extra");
    return (
      <div className="playlistItemExtra">
        <p>penis</p>
      </div>
    )
  }
}

class PlaylistItem extends React.Component{
  constructor(props){
    super(props);
    this.state = {
      name: props.name,
      songsNum: "#",
      img: "loading.svg",
      extra:false,
    }

    this.decorate = this.decorate.bind(this);
    this.toggle = this.toggle.bind(this);

    if( this.props.platform === "spotify"){
      axios.get(`${serverUrl}/spotify/`, {
        params: {endpoint:`playlists/${this.props.id}`}
      })
      .then(this.decorate)
      .catch(function (error) {
        console.log(error);
      })
    }
    if( this.props.platform === "youtube"){
      axios.get(`${serverUrl}/youtube`, {
        params: {
          endpoint:"playlists",
          query: JSON.stringify({
            part:"snippet,contentDetails",
            id:this.props.id
          })
        }
      })
      .then(this.decorate)
      .catch(function (error) {
        console.log(error);
      })
      // playlists?part=snippet&part=contentDetails&part=id&part=status&id=RDCLAK5uy_kbqXHXB9aBQaqThDKOimGGcZEPubq3znc
  
    }
  }
  decorate(response){
    console.log(response);
    if(this.props.platform === "spotify"){
      this.props.sendSongs(response.data.tracks, this.props.platform, this.props.id);
      this.setState({
        name: response.data.name,
        songsNum:response.data.tracks.total,
        img: response.data.images[0].url
      })
    }
    if(this.props.platform === "youtube"){
      this.props.sendSongs(null, this.props.platform, this.props.id);
      this.setState({
        name:response.data.items[0].snippet.title,
        songsNum:response.data.items[0].contentDetails.itemCount,
        img:response.data.items[0].snippet.thumbnails.medium.url,
      });
    }
    if(this.state.name.length > 30){
      this.setState({name:this.state.name.slice(0, 23)+"..."})
    }
  }
  render(){
    let extraInfo = "";
    if(this.state.extra){
      extraInfo = (<PlaylistItemExtra/>);
    }
    return (
      <div className="playlistItemOuter">
        <div className={`playlistItem ${this.props.platform}Border`} onClick={this.toggle}>
          <div className="playlistItemMain">
            <img src={this.state.img} className="playlistItemImage" alt=""></img>
            <div className="playlistItemContent">
              <p className="playlistItemTitle">{this.state.name}</p>
              <p className="playlistItemSongsNum">{`${this.state.songsNum} songs`}</p>
            </div>
          </div>
          <div className="playlistItemCloseDiv">
            <button className="playlistItemRemove" onClick={this.props.remove}>
              <img className="playlistItemCloseImg" src="close.svg"></img>
            </button>
          </div>
        </div>
        {extraInfo}
      </div>
    )
  }
  toggle(){
    console.log("toggled", this);
    console.log(this.state.extra, !this.state.extra);
    const newState = !this.state.extra;
    this.setState({extra: newState});
  }
}

class PlaylistsView extends React.Component{
  constructor(props){
    super(props);
    this.state = {
      textValue:""
    }
    this.handleChange = this.handleChange.bind(this);
    this.addPlaylist = this.addPlaylist.bind(this);
    this.watchEnter = this.watchEnter.bind(this);
  }
  render(){
    const playlistItems = this.props.playlists.map((val, idx) => {
      const remover = ()=>this.props.removePlaylist(val.id, val.platform);
      return <PlaylistItem
        sendSongs={this.props.sendSongs}
        remove={remover}
        key={val.id+val.platform}
        name="Loading..."
        id={val.id}
        platform={val.platform}
      />;
    });

    return (
      <div className="halfDiv" id="playlistViewContainer">
        <div id="playlistSearchContainer" className="">
          <p id="playlistHelp" onClick={this.props.showHelp}>Help</p>
          <input
            id="playlistSearch"
            type="text"
            placeholder="Playlist Link"
            value={this.state.textValue}
            onChange={this.handleChange}
            onKeyPress={this.watchEnter}>
          </input>
          <button id="playlistAdd" type="button" onClick={this.addPlaylist}>+</button> 
          {/* <span className="tooltiptext"><a id="tooltipHelpLink" href="help">Help</a></span> */}
        </div>
        <div id="playlistsContainer">
          <div id="playlistsInnerContainer">
            {playlistItems}
          </div>
        </div>

      </div>
    )
  }
  componentDidUpdate(){
    console.log("added scroll");
    Scrollbar.init(
      document.getElementById('playlistsContainer'), {
      plugins: {
        overscroll: {...overscrollOptions},
      },
      ...scrollOptions
    });
  }
  parsePlaylistId(playlistLink, platform){
    // returns: playlistId, platform
    if(platform === "spotify"){
      let s = playlistLink.split("/");
      return s[s.length-1].split("?")[0];
    }
    if(platform === "youtube"){
      let params = new URL(playlistLink).search.substring(1)
      console.log(params)
      return getQueryVariable(params, "list")
    }
  }
  parsePlatform(playlistLink){
    let s = playlistLink.split("/");
    if( s.includes("open.spotify.com")){
      return "spotify";
    }
    if( s.includes("youtube.com") || s.includes("music.youtube.com")){
      return "youtube";
    }
  }
  addPlaylist(){
    let platform = this.parsePlatform(this.state.textValue);
    let id = this.parsePlaylistId(this.state.textValue, platform);
    this.props.addPlaylist(id, platform);
    this.setState({textValue:""});
  }
  handleChange(event) {
    this.setState({textValue: event.target.value});
  }
  watchEnter(evt){
    if(evt.charCode === 13){
      this.addPlaylist();
    }
  }
}

export default PlaylistsView