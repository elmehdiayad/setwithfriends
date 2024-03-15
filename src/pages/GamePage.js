import { useState, useContext, useRef } from "react";

import { makeStyles } from "@material-ui/core/styles";
import Grid from "@material-ui/core/Grid";
import Typography from "@material-ui/core/Typography";
import Container from "@material-ui/core/Container";
import Paper from "@material-ui/core/Paper";
import Button from "@material-ui/core/Button";
import Box from "@material-ui/core/Box";
import Snackbar from "@material-ui/core/Snackbar";
import { Redirect } from "react-router-dom";

import SnackContent from "../components/SnackContent";
import firebase, { createGame } from "../firebase";
import useFirebaseRef from "../hooks/useFirebaseRef";
import User from "../components/User";
import Loading from "../components/Loading";
import NotFoundPage from "./NotFoundPage";
import LoadingPage from "./LoadingPage";
import GameSidebar from "../components/GameSidebar";
import Chat from "../components/Chat";
import DonateDialog from "../components/DonateDialog";
import { UserContext } from "../context";

const useStyles = makeStyles((theme) => ({
  sideColumn: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    [theme.breakpoints.up("lg")]: {
      maxHeight: 543,
    },
    [theme.breakpoints.down("md")]: {
      maxHeight: 435,
    },
    [theme.breakpoints.down("xs")]: {
      maxHeight: 400,
    },
  },
  mainColumn: {
    display: "flex",
    alignItems: "center",
  },
  doneOverlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
    background: "rgba(0, 0, 0, 0.5)",
    transition: "opacity 225ms cubic-bezier(0.4, 0, 0.2, 1) 0ms",
    zIndex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  doneModal: {
    padding: theme.spacing(3),
    textAlign: "center",
  },
}));

function GamePage({ match }) {
  const user = useContext(UserContext);
  const gameId = match.params.id;
  const classes = useStyles();

  const [waiting, setWaiting] = useState(false);
  const [redirect, setRedirect] = useState(null);
  const [snack, setSnack] = useState({ open: false });

  const [game, loadingGame] = useFirebaseRef(`games/${gameId}`);

  // Terminate the game if no sets are remaining
  const finishing = useRef(false);
  finishing.current = false;

  if (redirect) return <Redirect push to={redirect} />;

  if (loadingGame) {
    return <LoadingPage />;
  }

  if (!game) {
    return <NotFoundPage />;
  }

  if (game.status === "waiting") {
    return (
      <Container>
        <Box p={4}>
          <Typography variant="h4" align="center">
            Waiting for the game to start...
          </Typography>
        </Box>
      </Container>
    );
  }

  const gameMode = game.mode || "normal";
  const spectating = !game.users || !(user.id in game.users);
  const scores = game.users || {};
  const leaderboard = Object.keys(game.users);
  const numberOfMatches = game.numberOfMatches || 3;

  function handleClose(event, reason) {
    if (reason === "clickaway") return;
    setSnack({ ...snack, open: false });
  }

  async function handlePlayAgain() {
    const idx = gameId.lastIndexOf("-");
    let id = gameId,
      num = 0;
    if (gameId.slice(idx + 1).match(/[0-9]+/)) {
      id = gameId.slice(0, idx);
      num = parseInt(gameId.slice(idx + 1));
    }
    setWaiting(true);
    const newId = `${id}-${num + 1}`;
    const newGame = {
      gameId: newId,
      access: game.access,
      mode: game.mode,
      numberOfMatches: numberOfMatches,
    };
    firebase.analytics().logEvent("play_again", newGame);
    try {
      await createGame(newGame);
    } catch (error) {
      if (error.code !== "functions/already-exists") {
        alert(error.toString());
        setWaiting(false);
        return;
      }
    }
    setRedirect(`/room/${newId}`);
  }

  return (
    <Container>
      <DonateDialog
        active={game.status === "done" && !spectating && !user.patron}
      />
      <Snackbar
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
        open={snack.open}
        autoHideDuration={2000}
        onClose={handleClose}
      >
        <SnackContent
          variant={snack.variant || "info"}
          message={snack.message || ""}
          onClose={handleClose}
        />
      </Snackbar>
      <Grid container spacing={2}>
        <Box clone order={{ xs: 3, sm: 1 }}>
          <Grid item xs={12} sm={4} md={3} className={classes.sideColumn}>
            <Paper style={{ display: "flex", height: "100%", padding: 8 }}>
              <Chat
                title="Game Chat"
                messageLimit={200}
                gameId={gameId}
                startedAt={game.startedAt}
                gameMode={gameMode}
              />
            </Paper>
          </Grid>
        </Box>
        <Box clone order={{ xs: 1, sm: 2 }} position="relative">
          <Grid item xs={12} sm={8} md={5}>
            {/* Backdrop, to be active when the game ends */}

            <GameSidebar
              gameId={gameId}
              game={game}
              scores={scores}
              leaderboard={leaderboard}
            />
          </Grid>
        </Box>
      </Grid>
      <div
        className={classes.doneOverlay}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: game.status === "done" ? 1 : 0,
          visibility: game.status === "done" ? "visible" : "hidden",
        }}
      >
        <Paper elevation={3} className={classes.doneModal}>
          <Typography variant="h5" gutterBottom>
            The game has ended.
          </Typography>
          <Typography variant="body1">
            Winner: <User id={leaderboard[0]} />
          </Typography>
          {leaderboard.length >= 2 && (
            <Typography variant="body2">
              Loser: <User id={leaderboard[1]} />
            </Typography>
          )}

          {!spectating && (
            <Button
              variant="contained"
              color="primary"
              onClick={handlePlayAgain}
              style={{ marginTop: 12 }}
              disabled={waiting}
            >
              {waiting ? <Loading /> : "Play Again"}
            </Button>
          )}
        </Paper>
      </div>
    </Container>
  );
}

export default GamePage;
