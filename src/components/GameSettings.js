import { makeStyles } from "@material-ui/core/styles";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Radio from "@material-ui/core/Radio";
import RadioGroup from "@material-ui/core/RadioGroup";
import Tooltip from "@material-ui/core/Tooltip";
import Slider from "@material-ui/core/Slider";
import firebase from "../firebase";
import { modes, numberOfMatches } from "../util";
import Subheading from "../components/Subheading";

const useStyles = makeStyles(() => ({
  settings: { display: "flex", flexDirection: "column", alignItems: "center" },
}));

function GameSettings({ game, gameId, userId }) {
  const classes = useStyles();

  function handleChangeMode(event) {
    firebase.database().ref(`games/${gameId}/mode`).set(event.target.value);
  }
  function handleChangeNumberOfMatches(event, value) {
    firebase.database().ref(`games/${gameId}/numberOfMatches`).set(value);
  }

  const gameMode = game.mode || "normal";

  return (
    <div className={classes.settings}>
      <RadioGroup row value={gameMode} onChange={handleChangeMode}>
        {["normal", "supreme", "black"].map((mode) => (
          <Tooltip
            key={mode}
            arrow
            placement="left"
            title={modes[mode].description}
          >
            <FormControlLabel
              value={mode}
              control={<Radio />}
              disabled={userId !== game.host}
              label={modes[mode].name}
            />
          </Tooltip>
        ))}
      </RadioGroup>
      <Subheading>Number of matches</Subheading>

      <Tooltip key="number" arrow placement="left" title="Number of matches">
        <Slider
          aria-label="Small steps"
          defaultValue={3}
          value={game.numberOfMatches}
          step={1}
          min={1}
          max={10}
          valueLabelDisplay="auto"
          onChange={handleChangeNumberOfMatches}
          marks={numberOfMatches}
        />
      </Tooltip>
    </div>
  );
}

export default GameSettings;
