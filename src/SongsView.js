import React from 'react';
import './index.css';
import Scrollbar from 'smooth-scrollbar';
import { parseName, scrollOptions, overscrollOptions } from './utilities';


const MergeTypeRadio = (props) => {
  return (
    <span className="mergeTypeOuter" data-tooltip={props.helpText} data-tooltip-persisten>
        <input type="radio" name="mergeType" id={props.text} className="mergeTypeInput" defaultChecked></input>
        <label className="mergeTypeLabel" htmlFor={props.text} onClick={()=>props.onClick(props.type)}>{props.text}</label>
    </span>
  )
}

class ExportButton extends React.Component{
  constructor(props){
    super(props);
    this.logoUrls = {
      "spotify":"logos/spotify.png",
      "download":"logos/download.png", // TODO
      "soundcloud":"logos/soundcloud.png", 
      "youtube":"logos/youtube.png",
      "apple":"logos/apple.svg", // TODO
    }
    this.logoMult = 15;
    this.logoSizes = {
      "spotify":[1, 1],
      "download":[1,1],
      "soundcloud":[1.5, 1],
      "youtube":[1.4, 1],
      "apple":[1, 1]
    }
  }
  render(){
    let logoSize = this.logoSizes[this.props.platform];
    let logoUrl = this.logoUrls[this.props.platform];
    return (
      <button
        onClick={()=>this.props.export(this.props.platform)}
        className={`exportButton noselect ${this.props.platform}Fill ${this.props.disabled ? "disabled":""}`}
      >
        <img alt="" src={logoUrl} width={`${logoSize[0]*this.logoMult}`} height={`${logoSize[1]*this.logoMult}`} className="exportButtonIcon"></img>
        {this.props.text}
        
      </button>
    )
  }
}

class SongItem extends React.Component{
  render(){
    console.log("renderd songItem")
    return (
      <div className="songItem">
        <img alt="" src={this.props.img} className="songItemImg"></img>
        <h3 className="songItemTitle">{parseName(this.props.name)[0]}</h3>
        <p className="songItemArtists">{this.props.artists}</p>    
      </div>
    );
  }
}

class SongsView extends React.Component{
  constructor(props){
    super(props);
    this.state = {
      included: Array(0),
      excluded: Array(0),
    }
  }
  render(){
    // generates song items
    const songsItems = this.props.songs.map((val, idx)=>{
      if(val.platform === "spotify"){
        let imgUrl;
        try{
          imgUrl = val.track.album.images[2].url;
        }catch(e){
          imgUrl = "/spotify-default-thumb.png";
        }
        const songId = val.track.id ?? idx
        return <SongItem 
          key={songId.toString()+val.playlistId}
          name={val.track.name}
          img={imgUrl}
          artists={val.track.artists.map((x)=>x.name).join(", ")}
        />
      }
      if(val.platform === "youtube"){
        return <SongItem
          key={val.etag}
          name={val.snippet.title}
          img={val.snippet.thumbnails.default.url}
          artists={val.snippet.videoOwnerChannelTitle}
        />
      }
      return null; // complains if there isnt an unconditional return
    });

    const mergeHelp = {
      all:"Songs in ALL playlists",
      only:"Songs in ONLY ONE playlist",
      any:"Songs in ANY NUMBER of playlists",
    }

    return (
      <div className="halfDiv" id="songsViewContainer">
        <div id="songsTopBar">
          <div id="songsTopBarInfo">
            <p id="songsNum">{this.props.songs.length} Songs</p>
            {/* <p id="songsIncluded">+{this.state.included.length}</p> */}
            {/* <p id="songsExcluded">-{this.state.excluded.length}</p> */}
          </div>

          <div id="songsTopBarType">
            <MergeTypeRadio text="All"  type="all"  onClick={this.props.changeMergeType} helpText={mergeHelp.all}/>
            <MergeTypeRadio text="Only" type="only" onClick={this.props.changeMergeType} helpText={mergeHelp.only}/>
            <MergeTypeRadio text="Any"  type="any"  onClick={this.props.changeMergeType} helpText={mergeHelp.any}/>
          </div>
        </div>
        <div id="songsContainer">
          <div>{songsItems}</div>
        </div>

        <div id="songsExport">
          <ExportButton export={this.props.export} text="Spotify" platform="spotify" />
          <ExportButton export={this.props.export} text="Youtube" platform="youtube" disabled={true} />
          <ExportButton export={this.props.export} text="Apple Music" platform="apple" disabled={true} />
          <ExportButton export={this.props.export} text="Download" platform="download" disabled={false} />
        </div>

      </div>
    )
  }
  componentDidUpdate(){
    console.log("added scroll")
    Scrollbar.init(
      document.getElementById('songsContainer'), {
      plugins: {
        overscroll: {...overscrollOptions},
      },
      ...scrollOptions
    });
  }
}

export default SongsView