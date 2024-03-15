import { useState, useEffect } from "react";
import { Redirect } from "react-router-dom";

import Container from "@material-ui/core/Container";
import Divider from "@material-ui/core/Divider";
import Grid from "@material-ui/core/Grid";
import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";
import EqualizerIcon from "@material-ui/icons/Equalizer";

import ProfileName from "../components/ProfileName";
import UserStatistics from "../components/UserStatistics";
import ProfileGamesTable from "../components/ProfileGamesTable";
import Subheading from "../components/Subheading";
import Loading from "../components/Loading";
import firebase from "../firebase";
import useStats from "../hooks/useStats";
import { modes } from "../util";
import LoadingPage from "./LoadingPage";

const useStyles = makeStyles((theme) => ({
  statsHeading: {
    // Pixel-perfect corrections for icon alignment
    paddingTop: 4,
    [theme.breakpoints.down("xs")]: {
      paddingTop: 3,
    },
  },
  divider: {
    [theme.breakpoints.down("sm")]: {
      display: "none",
    },
  },
  mainGrid: {
    marginBottom: theme.spacing(1),
  },
}));

function ProfilePage({ match }) {
  const userId = match.params.id;
  const classes = useStyles();

  const [games, setGames] = useState(null);
  useEffect(() => {
    const query = firebase
      .database()
      .ref(`/userGames/${userId}`)
      .orderByValue()
      .limitToLast(50);
    const update = (snapshot) => {
      query.off("value", update);
      setGames(snapshot.val() ?? {});
    };
    query.on("value", update);
    return () => {
      query.off("value", update);
    };
  }, [userId]);

  const [stats, loadingStats] = useStats(userId);
  const [redirect, setRedirect] = useState(null);
  const [modeVariant, setModeVariant] = useState("normal");

  const handleClickGame = (gameId) => {
    setRedirect(`/room/${gameId}`);
  };

  if (redirect) {
    return <Redirect push to={redirect} />;
  }
  if (!games) {
    return <LoadingPage />;
  }

  return (
    <Container>
      <Paper style={{ padding: 16 }}>
        <Grid container className={classes.mainGrid}>
          <Grid item xs={12} md={4}>
            <ProfileName userId={userId} />
          </Grid>
          <Divider
            orientation="vertical"
            variant="middle"
            flexItem
            className={classes.divider}
          />
          <Grid item xs={12} style={{ flex: 1 }} p={1}>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <div style={{ display: "flex" }}>
                <Subheading className={classes.statsHeading}>
                  Statistics
                </Subheading>
                <EqualizerIcon />
              </div>
              <div style={{ marginLeft: "auto" }}>
                <Select
                  value={modeVariant}
                  onChange={(event) => setModeVariant(event.target.value)}
                  style={{ marginRight: "1em" }}
                  color="secondary"
                >
                  {Object.entries(modes).map(([key, { name }]) => (
                    <MenuItem key={key} value={key}>
                      <Typography variant="body2">{name}</Typography>
                    </MenuItem>
                  ))}
                </Select>
              </div>
            </div>
            {loadingStats ? (
              <Loading />
            ) : (
              <UserStatistics stats={stats[modeVariant]} />
            )}
          </Grid>
        </Grid>
        <Subheading style={{ textAlign: "left" }}>Finished Games</Subheading>
        <ProfileGamesTable userId={userId} handleClickGame={handleClickGame} />
      </Paper>
    </Container>
  );
}

export default ProfilePage;
