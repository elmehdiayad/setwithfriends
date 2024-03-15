import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";

function Game({ game }) {
  return (
    <Paper
      style={{
        position: "relative",
        overflow: "hidden",
        width: "100%",
        height: "200px",
        transition: "height 0.75s",
      }}
    >
      <Typography
        variant="caption"
        align="center"
        style={{
          width: "100%",
          position: "absolute",
          bottom: 0,
        }}
      >
        <strong>{game.numberOfMatches}</strong> matches remaining
      </Typography>
    </Paper>
  );
}

export default Game;
