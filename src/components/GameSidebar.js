import AlarmIcon from "@material-ui/icons/Alarm";
import AddBox from "@material-ui/icons/AddBox";
import IndeterminateCheckBox from "@material-ui/icons/IndeterminateCheckBox";
import Divider from "@material-ui/core/Divider";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import Paper from "@material-ui/core/Paper";
import Tooltip from "@material-ui/core/Tooltip";
import Typography from "@material-ui/core/Typography";
import { makeStyles } from "@material-ui/core/styles";
import SportsEsportsIcon from "@material-ui/icons/SportsEsports";
import SnoozeIcon from "@material-ui/icons/Snooze";
import { useLocation, Link as RouterLink } from "react-router-dom";
import firebase, { finishGame } from "../firebase";

import User from "./User";
import Subheading from "./Subheading";
import useMoment from "../hooks/useMoment";
import { formatTime } from "../util";
import { useState, useContext, useEffect } from "react";
import { UserContext } from "../context";

const useStyles = makeStyles((theme) => ({
  sidebar: {
    maxHeight: "100%",
    display: "flex",
    flexDirection: "column",
    padding: 8,
  },
  timer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  alarm: {
    color: theme.alarm,
    marginRight: 10,
    marginBottom: 3,
  },
  panel: {
    display: "flex",
    flexDirection: "column",
    overflowY: "hidden",
  },
}));

function GameSidebar({ gameId, game, scores, leaderboard }) {
  const classes = useStyles();
  const { id: currentUserId } = useContext(UserContext);
  const { pathname } = useLocation();
  const time = useMoment(500);
  const [gameScore, setGameScore] = useState(scores);
  const numberOfMatches = game.numberOfMatches;
  const gameTime = game.status === "done" ? game.endedAt : time;
  const handleScore = async (uid, score) => {
    const currentScore = gameScore[uid] + score;
    if (currentScore <= numberOfMatches && currentScore >= 0) {
      firebase
        .database()
        .ref(`games/${gameId}/users/${uid}`)
        .set(currentScore)
        .then(() => {
          setGameScore({ ...gameScore, [uid]: currentScore });
        })
        .catch((reason) => {
          console.warn("Error updating score: ", reason);
        });
    } else {
      console.warn("Score cannot surpass the number of matches");
    }
    if (currentScore === numberOfMatches) {
      await finishGame({
        gameId,
      });
    }
  };
  useEffect(() => {
    const db = firebase.database();

    // Replace with the actual path to the game score in your database
    const gameScoreRef = db.ref(`games/${gameId}/users/`);

    const handleScoreChange = (snapshot) => {
      const gameScore = snapshot.val();
      setGameScore(gameScore);
    };

    gameScoreRef.on("value", handleScoreChange);

    // Clean up the listener when the component unmounts
    return () => gameScoreRef.off("value", handleScoreChange);
  }, [gameId]);

  return (
    <Paper className={classes.sidebar}>
      {/* Timer */}
      <div className={classes.timer} style={{ marginTop: 6 }}>
        <AlarmIcon className={classes.alarm} fontSize="large" />
        <Typography variant="h4" align="center">
          {/* Hide the sub-second time resolution while game is active to
          avoid stressing beginners. */}
          {formatTime(gameTime - game.startedAt, game.status !== "done")}
        </Typography>
      </div>
      <Divider style={{ margin: "8px 0" }} />
      {/* Scoreboard */}
      <div className={classes.panel}>
        <Subheading>Scoreboard</Subheading>
        <List dense disablePadding style={{ overflowY: "auto" }}>
          {leaderboard.map((uid) => (
            <User
              key={uid}
              id={uid}
              showRating={game.mode || "normal"}
              component={Typography}
              variant="body2"
              noWrap
              render={(user, userEl) => (
                <ListItem>
                  {game.status === "ingame" && (
                    <ListItemIcon>
                      {user.connections &&
                      Object.values(user.connections).includes(pathname) ? (
                        <Tooltip title="Active player">
                          <SportsEsportsIcon />
                        </Tooltip>
                      ) : (
                        <Tooltip title="Disconnected player">
                          <SnoozeIcon />
                        </Tooltip>
                      )}
                    </ListItemIcon>
                  )}
                  <ListItemText
                    button
                    component={RouterLink}
                    to={`/profile/${uid}`}
                  >
                    {userEl}
                  </ListItemText>
                  {uid !== currentUserId && <strong>Score:</strong>}
                  {uid === currentUserId && (
                    <IndeterminateCheckBox
                      button
                      onClick={() => handleScore(uid, -1)}
                      htmlColor="dodgerblue"
                    />
                  )}
                  <strong
                    style={{
                      margin: "0 4px",
                    }}
                  >
                    {gameScore[uid] || 0}
                  </strong>
                  {uid === currentUserId && (
                    <AddBox
                      button
                      onClick={() => handleScore(uid, 1)}
                      htmlColor="dodgerblue"
                    />
                  )}
                </ListItem>
              )}
            />
          ))}
        </List>
      </div>
    </Paper>
  );
}

export default GameSidebar;
