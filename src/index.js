import Scrollbar from 'smooth-scrollbar';
import OverscrollPlugin from 'smooth-scrollbar/plugins/overscroll';
import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import SongsView from './SongsView.js';
import PlaylistsView from './PlaylistsView.js';
import { serverUrl, getQueryVariable, parseName, paramify, getImageColour, shuffleArray } from './utilities.js';
import colorsys from 'colorsys';
const axios = require('axios'); // dont know difference between require and import

Scrollbar.use(OverscrollPlugin);

// to stop creating tones of playlists when testing
const EXPORT_SAFE = true;

class Main extends React.Component{
  constructor(props){
    super(props);

    this.exporting = false
    const hashParams = window.location.hash.slice(1); // spotify redirect uses hash
    const regParams = window.location.search.slice(1);
    if(hashParams || regParams){
      console.log('set exporting')
      this.export(hashParams || regParams);
    }

    this.state = {
      allSongs: {},
      playlists: Array(0),
      exporting:this.exporting,
      sortType: "hue",
      helping:false,
      highlightingHelp:false,
      helpPage:0,
    }

    const needsHelp = ()=>{
      // if the user hasnt added a playlist after some seconds
      // highlight the help button
      console.log("highlighted help");
      if(this.state.playlists.length === 0 && this.state.helping === false){
        this.setState({highlightingHelp:true});
      }
    }
    this.interactTimeout = setTimeout(needsHelp, 5000);

    this.helpPageSelectorX = 0;
    this.helpPageSelectorW = 

    this.addSongs = this.addSongs.bind(this); 
    this.addPlaylist = this.addPlaylist.bind(this);
    this.removePlaylist = this.removePlaylist.bind(this);
    this.export = this.export.bind(this);
    this.authorize = this.authorize.bind(this);
  }

  render(){

    // callback used by SongsView to set the sort type state
    const setSortType = type=>{this.setState({sortType:type})}

    const toggleHelp = ()=>{this.setState({helping:!this.state.helping, highlightingHelp:false})};

    const setHelpPage = (e, num)=>{
      this.helpPageSelectorW=e.target.offsetWidth;
      this.helpPageSelectorX=e.target.offsetLeft;
      this.setState({helpPage:num})
    };

    const helpPagesButtonInfo = [
      {text:"Playlist Link"},
      {text:"Sort Type"},
      {text:"Exporting"},
    ]
    const helpPagesButtons = helpPagesButtonInfo.map((item, idx)=>{
      let classNames = "helpPlatformBarItem noselect "
      if(idx === this.state.helpPage){
        classNames += "helpPlatformBarButtonSelected"
      }
      return <span
        key={idx}
        className={classNames}
        onClick={e=>setHelpPage(e, idx)}>{item.text}
      </span>
    });

    return (
      <div id="main">
        {this.state.exporting &&
          <div id="exportOverlayOuter">
            <div id="darkOverlayBackground"></div>
            <div id="darkOverlay">
              <h2 id="exportingTitle">Exporting {this.state.allSongs.length} song(s) to {this.state.exporting}</h2>
            </div>
          </div>
        }
        <div id="helpOverlayOuter">
          <div
            id="darkOverlayBackground"
            onClick={toggleHelp}
            style={{opacity:this.state.helping?0.4:0, pointerEvents: this.state.helping?"auto":"none"}}>
          </div>
          <div id="darkOverlay" style={{
            transform:this.state.helping?"translate(-50%, -50%)":"translate(-50%, -180%)",
            pointerEvents: this.state.helping?"auto":"none"
          }}>
            <span id="helpPlatformBar">
              {helpPagesButtons}
              {/* <span className="helpPlatformBarItem" onClick={e=>setHelpPage(e, 0)}>Spotify</span>
              <span className="helpPlatformBarItem" onClick={e=>setHelpPage(e, 1)}>Youtube</span>
              <span className="helpPlatformBarItem" onClick={e=>setHelpPage(e, 2)}>Apple Music</span> */}
              {/* first one has a 'underline' */}
              <div id="helpPlatformBarSelector" style={{left:this.helpPageSelectorX+"px", width:this.helpPageSelectorW+"px"}}></div> 
            </span>
            <div id="helpOverlayContent">
              <h1 id="helpingTitle">To get </h1>
            </div>
          </div>
        </div>
        <header></header>
        <div id="content">
          <PlaylistsView
            addPlaylist={this.addPlaylist}
            sendSongs={this.addSongs}
            playlists={this.state.playlists}
            removePlaylist={this.removePlaylist}
            showHelp={toggleHelp}
            highlightHelp={this.state.highlightingHelp}
          />
          <SongsView
            songs={this.sortSongs(this.state.allSongs, this.state.sortType)}
            export={this.authorize}
            changeSortType={setSortType}
          />
          <hr id="midBreak"></hr>
        </div>
      </div>
    );
  }

  async addSongs(prevRes, platform, id){
    // takes the previous respose, adds its songs to the songs lists
    // then requests the next group of songs by calling its self
    // or if no prevRes, request the first group of songs
    console.log(prevRes);

    // add the songs from prevRes
    // adds the playlist id and platform to each track
    if(prevRes){
      console.log("had prev res");
      const newTracks = prevRes.items.map((val, idx) => {
        return Object.assign(val, {playlistId:id, platform:platform})
      })
      await this.addColours(newTracks)
      let key = platform.toString()+id.toString();
      let newSongs = {...this.state.allSongs};
      console.log(this.state.allSongs);
      console.log(newSongs);
      if(key in newSongs){
        newSongs[key] = newSongs[key].concat(newTracks)
      }else{
        newSongs[key] = newTracks;
      }
      this.setState({allSongs:newSongs});
    }

    if(platform === "spotify"){
      const url = `${serverUrl}/spotify/`;
      let endpoint;
      if(prevRes){
        if(prevRes.next != null){ // if you had a prevRes and there is a next
          endpoint = prevRes.next.split("v1/")[1]
        }else{ // if you had a prevRes but there is not next
          console.log("reached end of playlist");
          return;
        }
      }else{ // no prevRes
        endpoint = `playlists/${id}/tracks/?offset=0&limit=100`;
      }
      let res = await axios.get(url, {
        params:{
          endpoint:endpoint
        }
      });
      await this.addSongs(res.data, platform, id);
    }
    return this.state.allSongs;
  }

  addPlaylist(id, platform){
    const newPlaylists = this.state.playlists.concat({id:id, platform:platform});
    this.setState({playlists: newPlaylists, highlightingHelp: false});
  }

  removePlaylist(id, platform){
    // findes the index of the playlist with given id and platform and removes it
    let start_len = this.state.playlists.length
    let newPlaylists = [...this.state.playlists]
    newPlaylists.filter(playlist=>playlist.id!=id||playlist.platform!=platform)
    if(this.state.playlists.length == start_len){
      console.log("invalid id to remove");
      return;
    }
    // const newSongs = this.state.allSongs.filter( s=> !(s.playlistId===id && s.platform===platform) );
    const key = platform.toString()+id.toString()
    let newSongs = {...this.state.allSongs}
    delete newSongs[key]
    console.log(newSongs.length);
    this.setState({playlists:newPlaylists, allSongs:newSongs});
  }

  // first step of exporting, redirects to spotify, gives a url to return to
  // and a state to have as params on return
  authorize(platform){
    console.log(platform);
    const urlParams = new URLSearchParams(window.location.search);
    console.log(urlParams);
    if(platform === "spotify"){
      const paramsObj = {
        client_id:      'e9901c5f654f4f58abb0d07a723dfd30',
        response_type:  'token',
        redirect_uri:   window.location.origin,
        state:          JSON.stringify({exporting:"spotify", playlists:this.state.playlists, sortType:this.state.sortType}),
        scope:          "playlist-modify-private playlist-modify-public",
      }
      const paramsStr = paramify(paramsObj);
      window.location.href = "https://accounts.spotify.com/authorize"+paramsStr;
    }
  }

  // called after the return from spotify auth
  async export(params){
    // called when there are hash or querey parameters to export a playlist
    this.exporting = "spotify"
    console.log("sending spotify playlist");
    let state = JSON.parse(getQueryVariable(params, "state"));
    const access_token = getQueryVariable(params, "access_token");
    console.log(state);
    
    // get the user id
    const meRes = await axios.get(
      "https://api.spotify.com/v1/me",
      {
        headers:{
          Authorization:`Bearer ${access_token}`
        }
    });
    const myId = meRes.data.id
    console.log(meRes);
    
    // create the playlist
    let createRes = null;
    if(EXPORT_SAFE){
      try{
        createRes = await axios({
          method: 'post',
          url: `https://api.spotify.com/v1/users/${myId}/playlists`,
          headers: {
            Authorization:`Bearer ${access_token}`,
            "Content-Type":"application/json",
          }, 
          data: {
            name:"New Playlister Playlist",
            description:"An awsome playlist created with playlister"
          }
        });
        console.log(createRes);
      }catch(error){
        console.log(error);
        return;
      }
    }

    // for each playlist convert it from [{id, platform}] to [spotifyUri]
    // then sends them to spotify
    for(let i=0; i<state.playlists.length;i++){
      const playlistSongs = state.playlists[i];
      console.log(playlistSongs);

      // goes through songs 100 at a time
      for(let page=0; page < Math.ceil(playlistSongs.length/100); page++){
        const pageSongs = playlistSongs.slice(page*100, (page+1)*100)
        // adds to final playlist
        if(EXPORT_SAFE){
          try{
            const addRes = await axios({
              method: 'post',
              url: `https://api.spotify.com/v1/playlists/${createRes.data.id}/tracks`,
              headers: {
                Authorization:`Bearer ${access_token}`,
                "Content-Type":"application/json",
              }, 
              data: JSON.stringify({
                uris:pageSongs
              })
            });
            console.log(addRes);
          }catch(error){
            console.log(error);
          }
        }
      }
    }
  }

  // takes list of song objects and adds colour values to each 
  async addColours(songs){
    for(let song of songs){
      if(!("hue" in song)){
        let rgb;
        try{
          rgb = await getImageColour(song.track.album.images[2].url)
        }catch(e){
          rgb = [40, 40, 40];
        }
        const hsl = colorsys.rgb_to_hsv({r: rgb[0], g: rgb[1], b: rgb[2] })
        // console.log(`hsl: ${hsl.h}, ${hsl.s}, ${hsl.v}  r,g,b: ${rgb[0]},${rgb[1]},${rgb[2]}`);
        song["hue"] = hsl.h
        song["sat"] = hsl.s
        song["val"] = hsl.v
        // fixes issues wth black and white images
        if(song.sat < 10 || song.val < 10 || song.val > 90){
            song.hue = Math.round(95-song.val*0.05)
        }
      }
    }
  }

  sortSongs(allSongs, sortType){
    let songs = []
    for(let key of Object.keys(allSongs)){
      songs = songs.concat(allSongs[key])
    }
    // console.log(songs);
    if(sortType.toLowerCase() === "hue"){
      return songs.sort((a, b)=>{
        if(!("hue" in a)){
            return 1
        }
        if(!("hue" in b)){
            return -1
        }
        return a.hue - b.hue
      })
    }
    if(sortType.toLowerCase() === "val"){
        return songs.sort((a, b)=>{
            if(!("val" in a)){
                return 1
            }
            if(!("val" in b)){
                return -1
            }
            return a.val - b.val
        })
    }
    if(sortType.toLowerCase() === "rand"){
        return shuffleArray(songs)
    }
  }
}


ReactDOM.render(
    <Main />,
    document.getElementById('root')
  );
