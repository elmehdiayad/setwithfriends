import React, { useState, useEffect } from "react";
import firebase from "./firebase";
import "./styles.css";

import {
  Switch,
  Route,
  Link as RouterLink,
  useLocation,
} from "react-router-dom";
import CssBaseline from "@material-ui/core/CssBaseline";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import IconButton from "@material-ui/core/IconButton";
import Link from "@material-ui/core/Link";
import SettingsIcon from "@material-ui/icons/Settings";

import { generateColor, generateName } from "./util";
import { UserContext } from "./context";
import RoomPage from "./pages/RoomPage";
import GamePage from "./pages/GamePage";
import LobbyPage from "./pages/LobbyPage";
import LoadingPage from "./pages/LoadingPage";
import NotFoundPage from "./pages/NotFoundPage";
import HelpPage from "./pages/HelpPage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";

function App() {
  const [uid, setUid] = useState(null);
  const [user, setUser] = useState(null);
  const [connectionRef, setConnectionRef] = useState(null);

  useEffect(() => {
    if (!uid) {
      firebase
        .auth()
        .signInAnonymously()
        .catch((error) => {
          alert("Unable to connect to the server. Please try again later.");
        });
    }
    return firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        // User is signed in.
        setUid(user.uid);
      } else {
        // User is signed out.
        setUid(null);
      }
    });
  }, [uid]);

  useEffect(() => {
    if (!uid) {
      setUser(null);
      return;
    }
    const userRef = firebase.database().ref(`/users/${uid}`);
    function update(snapshot) {
      if (snapshot.child("name").exists()) {
        setUser({ ...snapshot.val(), id: uid });
      } else {
        userRef.update({
          games: {},
          color: generateColor(),
          name: generateName(),
        });
      }
    }
    userRef.on("value", update);
    return () => {
      userRef.off("value", update);
    };
  }, [uid]);

  useEffect(() => {
    if (uid) {
      const connectionsRef = firebase
        .database()
        .ref(`users/${uid}/connections`);
      const lastOnlineRef = firebase.database().ref(`users/${uid}/lastOnline`);
      const connectedRef = firebase.database().ref(".info/connected");

      function onConnectedUpdate(snap) {
        if (snap.val() === true) {
          const con = connectionsRef.push();
          con.onDisconnect().remove();
          setConnectionRef(con);

          lastOnlineRef
            .onDisconnect()
            .set(firebase.database.ServerValue.TIMESTAMP);
        }
      }

      connectedRef.on("value", onConnectedUpdate);
      return () => {
        connectedRef.off("value", onConnectedUpdate);
      };
    }
  }, [uid]);

  const location = useLocation();
  React.useEffect(() => {
    if (connectionRef) {
      connectionRef.set(location.pathname);
    }
  }, [location, connectionRef]);

  return (
    <>
      <CssBaseline />
      {!user ? (
        <LoadingPage />
      ) : (
        <UserContext.Provider value={user}>
          <AppBar position="relative" color="transparent" elevation={0}>
            <Toolbar variant="dense">
              <Typography variant="h6" style={{ flexGrow: 1 }}>
                <Link
                  underline="none"
                  color="inherit"
                  component={RouterLink}
                  to="/"
                >
                  Set with Friends
                </Link>
              </Typography>
              <Typography variant="subtitle1" style={{ marginRight: 8 }}>
                <Link
                  underline="none"
                  color="inherit"
                  component={RouterLink}
                  to={`/profile/${user.id}`}
                >
                  {user.name}
                </Link>
              </Typography>
              <IconButton color="inherit">
                <SettingsIcon />
              </IconButton>
            </Toolbar>
          </AppBar>
          <Switch>
            <Route exact path="/help" component={HelpPage} />
            <Route exact path="/about" component={AboutPage} />
            <Route exact path="/contact" component={ContactPage} />
            <Route exact path="/" component={LobbyPage} />
            <Route exact path="/room/:id" component={RoomPage} />
            <Route exact path="/game/:id" component={GamePage} />
            <Route component={NotFoundPage} />
          </Switch>
        </UserContext.Provider>
      )}
    </>
  );
}

export default App;
