import Scrollbar from 'smooth-scrollbar';
import OverscrollPlugin from 'smooth-scrollbar/plugins/overscroll';
import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import SongsView from './SongsView.js';
import PlaylistsView from './PlaylistsView.js';
import { serverUrl, getQueryVariable, parseName, paramify } from './utilities.js';
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
      mergeType:"Any",
      helping:false,
    }

    this.addSongs = this.addSongs.bind(this); 
    this.addPlaylist = this.addPlaylist.bind(this);
    this.removePlaylist = this.removePlaylist.bind(this);
    this.export = this.export.bind(this);
    this.authorize = this.authorize.bind(this);
    this.convertPlaylist = this.convertPlaylist.bind(this);
    this.convertSong = this.convertSong.bind(this);
  }

  render(){

    // callback used by SongsView to set the merge type state
    const setMergeType = type=>{this.setState({mergeType:type})}

    const toggleHelp = ()=>{this.setState({helping:!this.state.helping})};

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
          <div id="darkOverlay" style={
            {transform:this.state.helping?"translate(-50%, -50%)":"translate(-50%, -180%)",
            pointerEvents: this.state.helping?"auto":"none"}
          }>
            <h1 id="helpingTitle">To get </h1>
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
          />
          {/* make selectedSongs later */}
          <SongsView
            songs={this.filterSongs(this.state.allSongs, this.state.mergeType)}
            export={this.authorize}
            changeMergeType={setMergeType}
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
      let key = platform.toString()+id.toString();
      let newSongs = {...this.state.allSongs};
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
    if(platform === "youtube"){
      let paramsObj = {
        part:"snippet",
        maxResults:50,
        playlistId:id,
      }

      if(prevRes){ // dont do for first request
        if(prevRes.nextPageToken){
          paramsObj.pageToken = prevRes.nextPageToken;
        }
      }

      // do a request if either there wasnt a previose request (prevRes is null)
      // or there is a nextPageToken from the last request
      if(paramsObj.pageToken || !(prevRes)){
        let res = await axios.get(`${serverUrl}/youtube/`, {
          params: {
            endpoint:"playlistItems",
            query:JSON.stringify(paramsObj)
          }
        })
        await this.addSongs(res.data, platform, id)
      }
    }
    return this.state.allSongs;
  }

  addPlaylist(id, platform){
    const newPLaylists = this.state.playlists.concat({id:id, platform:platform});
    this.setState({playlists: newPLaylists});
  }

  removePlaylist(id, platform){
    // finds the index of the playlist with given id and platform and removes it
    let idx = -1;
    for(let i = 0; i < this.state.playlists.length; i++){
      console.log(this.state.playlists[i], {id, platform})
      if(this.state.playlists[i].id === id && this.state.playlists[i].platform === platform){
        console.log("found match");
        idx = i;
      }
    }
    if(idx === -1){
      console.log("invalid id to remove");
      return;
    }
    const newPLaylists = [...this.state.playlists.slice(0, idx), ...this.state.playlists.slice(idx+1)];
    // const newSongs = this.state.allSongs.filter( s=> !(s.playlistId===id && s.platform===platform) );
    const key = platform.toString()+id.toString()
    const { [key]: _, ...newSongs } = this.state.allSongs;
    console.log(newSongs.length);
    this.setState({playlists:newPLaylists, allSongs:newSongs});
  }

  // first step of exporting, redirects to spotify, gives a url to return to
  // and a state to have as params on return
  authorize(platform){
    console.log(platform);
    const urlParams = new URLSearchParams(window.location.search);
    console.log(urlParams);
    if(platform === "spotify"){
      const paramsObj = {
        client_id:'e9901c5f654f4f58abb0d07a723dfd30',
        response_type:'token',
        redirect_uri:window.location.origin,
        state:JSON.stringify({exporting:"spotify", playlists:this.state.playlists, mergeType:this.state.mergeType}),
        scope:"playlist-modify-private playlist-modify-public",
      }
      const paramsStr = paramify(paramsObj);
      window.location.href = "https://accounts.spotify.com/authorize"+paramsStr;
    }
  }

  // called after the return from spotify auth
  async export(params){

    // called when there are hash or querey parameters to export a playlist
    if(getQueryVariable(params, "access_token")){ // means its spotify
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
      console.log(meRes);
      
      // create the playlist
      let createRes = null;
      if(EXPORT_SAFE){
        try{
          createRes = await axios({
            method: 'post',
            url: `https://api.spotify.com/v1/users/${meRes.data.id}/playlists`,
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
        const playlistSongs = await this.convertPlaylist(state.playlists[i], "spotify");
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
  }

  async convertPlaylist(playlist, toPlatform){
    // takes in a playlist {id, platform} and a desired platform
    // returns ids for all the songs for desired platform

    console.log(`converting ${playlist.id} from ${playlist.platform} to ${toPlatform}`)
    
    // uses addSongs beacuse it fetches all the songs already
    await this.addSongs(null, playlist.platform, playlist.id);
    // filter allSongs to just the playlist songs
    // then call convertSong on each song
    const allSongs = this.state.allSongs;
    console.log(allSongs);
    const theseSongs = allSongs.filter(song=>song.playlistId===playlist.id&&song.platform===playlist.platform);
    console.log(theseSongs);
    const convertedSongsPromises = theseSongs.map(song=>this.convertSong(song, toPlatform).catch(error=>{return error}));
    const convertedSongs = await Promise.all(convertedSongsPromises);
    console.log(convertedSongs);
    // get uris/ids out of song returned song objects
    let songsIds = []
    for(let s=0; s<convertedSongs.length;s++){
      try{
        if(toPlatform === "spotify"){
          songsIds.push(convertedSongs[s].track.uri)
        }
      }catch(error){
        console.log(error);
        console.log(`Could add #${s} ${theseSongs[s]}`)
      }
    }

    return songsIds;
  }

  convertSong(song, toPlatform){
    // takes a song {playlistId, platform + any info from song}
    // finds it on toPlatform, returns a promise to the song on the new platform
    // console.log(song);
    if(toPlatform === "spotify"){
      if(song.platform === toPlatform){
        return new Promise((resolve, reject)=>{resolve(song)});
      }
      // uses the search feature too search for the song title
      if(song.platform === "youtube"){
        let songName = parseName(song.snippet.title)[0].replace(/\s/g, "+");
        return axios.get(`${serverUrl}/spotify/`, {
          params:{
            endpoint:`search?q=${songName}&type=track&limit=1`
          }
        }).then(res=>res.data.tracks.items[0].track);
        // const outSong = res.data?.tracks?.items[0]
      }
    }
    throw new Error("Not implimted");
  }

  // filters song according to merge type
  // takes all the songs as obj with keys per playlist
  filterSongs(allSongs, _filterType){
    let filterType = _filterType.toLowerCase()

    // helper to get id out of a song object (beacuse its different for different platforms)
    const getSongId = (song)=>{
      if(song.platform === "spotify"){
        return song.track.id
      }else if(song.platform === "youtube"){
        return song.etag
      }
    }
    // dosent consider cross platformness (yet)
    if(filterType === "all"){
      // any song that is in all the playlists
      console.log("filtering all")

      // combine all songs into one array
      let songs = [];
      for(let key in allSongs){
        songs = songs.concat(allSongs[key])
      }
      // get ids
      const allSongIds = songs.map(getSongId);
      // removes duplicates
      const singleSongIds = [...new Set(allSongIds)];
      console.log(singleSongIds);
      // finds ids that appear in every playlist
      let songIds = []
      let id;
      for(let i=0; i<singleSongIds.length; i++){
        id = singleSongIds[i];
        if(allSongIds.filter(x => x === id).length >= Object.keys(allSongs).length){
          songIds.push(id);
        }
      }

      console.log(songIds);
      // gets back songs from ids
      let retSongs = []
      // for each id
      for(let i=0; i<songIds.length; i++){
        // go through all the songs
        for(let j=0; j<songs.length; j++){
          let s = songs[j]
          // untill you find one with the same id
          if(getSongId(s) === songIds[i]){
            retSongs.push(s);
            break
          }
        }
      }
      console.log(retSongs);
      return retSongs;
    }
    if(filterType === "only"){
      console.log("filtering only")
      // any song that is in only one of the playlists

    }
    else{ // any
      console.log("filtering any");
      // any song that is in any number of playlists
      let songs = [];
      for(var key in allSongs) {
        songs = songs.concat(allSongs[key]);
      }
      return songs;
    }
  }
}


ReactDOM.render(
    <Main />,
    document.getElementById('root')
  );
