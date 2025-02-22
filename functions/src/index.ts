import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

import Stripe from "stripe";

import { GameMode } from "./game";
admin.initializeApp();
const stripe = process.env.FUNCTIONS_EMULATOR
  ? (null as any)
  : new Stripe(functions.config().stripe.secret, {
    apiVersion: "2020-08-27",
  });

const MAX_GAME_ID_LENGTH = 64;
const MAX_UNFINISHED_GAMES_PER_HOUR = 4;


type TransactionResult = {
  committed: boolean;
  snapshot: functions.database.DataSnapshot;
};

/** Ends the game with the correct time and updates ratings */
export const finishGame = functions.https.onCall(async (data, context) => {
  const { gameId } = data;
  if (
    !(typeof gameId === "string") ||
    gameId.length === 0 ||
    gameId.length > MAX_GAME_ID_LENGTH
  ) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with " +
      "argument `gameId` to be finished at `/games/:gameId`."
    );
  }
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "The function must be called while authenticated."
    );
  }


  const gameSnap = await admin.database().ref(`games/${gameId}`).once("value");
  if (!gameSnap.exists()) {
    throw new functions.https.HttpsError(
      "not-found",
      `The game with gameId ${gameId} was not found in the database.`
    );
  }

  const gameMode = (gameSnap.child("mode").val() as GameMode) || "normal";

  const scores = gameSnap.child("users").val() || {};
  const finalTime = Date.now();

  // The game has ended, so we attempt to do an atomic update.
  // Safety: Events can only be appended to the game, so the final time must remain the same.
  const { committed, snapshot }: TransactionResult = await admin
    .database()
    .ref(`games/${gameId}`)
    .transaction((game) => {
      if (game) {

        if (game.status !== "ingame") {
          // Someone beat us to the atomic update, so we cancel the transaction.
          return;
        }
        game.status = "done";
        game.endedAt = admin.database.ServerValue.TIMESTAMP;
      }
      return game;
    }).catch((error) => {
      console.error("Transaction failed abnormally:", error);
      return { committed: false, snapshot: null };
    });

  if (!committed) {
    return;
  }

  /**
   * Update statistics and ratings of players involved based on an extension of
   * the Elo system.
   */

  // Retrieve userIds of players in the game.
  const players: string[] = [];
  snapshot.child("users").forEach(function (childSnap) {
    if (childSnap.key !== null) {
      players.push(childSnap.key);
    }
  });

  // Add scores for players without a single set.
  for (const player of players) {
    scores[player] ??= 0;
  }

  // Differentiate between solo and multiplayer games.
  const time = finalTime - gameSnap.child("startedAt").val();
  const topScore = Math.max(...Object.values(scores) as number[]);

  // Update statistics for all users
  const userStats: Record<string, any> = {};
  await Promise.all(
    players.map(async (player) => {
      const result: TransactionResult = await admin
        .database()
        .ref(`userStats/${player}/${gameMode}`)
        .transaction((stats) => {
          stats ??= {}; // tslint:disable-line no-parameter-reassignment
          stats.finishedGames = (stats.finishedGames ?? 0) + 1;
          stats.totalSets = (stats.totalSets ?? 0) + scores[player];
          if (scores[player] === topScore) {
            stats.wonGames = (stats.wonGames ?? 0) + 1;
            stats.fastestTime = Math.min(stats.fastestTime ?? Infinity, time);
          }
          stats.totalTime = (stats.totalTime ?? 0) + time;
          return stats;
        });
      // Save these values for use in rating calculation
      userStats[player] = result.snapshot.val();
    })
  );

});

/** Create a new game in the database */
export const createGame = functions.https.onCall(async (data, context) => {
  const gameId = data.gameId;
  const access = data.access || "public";
  const mode = data.mode || "normal";
  const numberOfMatches = data.numberOfMatches || 3;

  if (
    !(typeof gameId === "string") ||
    gameId.length === 0 ||
    gameId.length > MAX_GAME_ID_LENGTH
  ) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with " +
      "argument `gameId` to be created at `/games/:gameId`."
    );
  }
  if (
    !(typeof access === "string") ||
    (access !== "private" && access !== "public")
  ) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with " +
      'argument `access` given value "public" or "private".'
    );
  }
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "The function must be called while authenticated."
    );
  }

  const userId = context.auth.uid;

  const oneHourAgo = Date.now() - 3600000;
  const recentGameIds = await admin
    .database()
    .ref(`userGames/${userId}`)
    .orderByValue()
    .startAt(oneHourAgo)
    .once("value");

  const recentGames = await Promise.all(
    Object.keys(recentGameIds.val() || {}).map((recentGameId) =>
      admin.database().ref(`games/${recentGameId}`).once("value")
    )
  );

  let unfinishedGames = 0;
  for (const snap of recentGames) {
    if (
      snap.child("host").val() === userId &&
      snap.child("status").val() !== "done" &&
      snap.child("access").val() === "public"
    ) {
      ++unfinishedGames;
    }
  }

  const gameRef = admin.database().ref(`games/${gameId}`);
  const { committed, snapshot } = await gameRef.transaction((currentData) => {
    if (currentData === null) {
      if (
        unfinishedGames >= MAX_UNFINISHED_GAMES_PER_HOUR &&
        access === "public"
      ) {
        throw new functions.https.HttpsError(
          "resource-exhausted",
          "Too many unfinished public games were recently created."
        );
      }
      return {
        host: userId,
        createdAt: admin.database.ServerValue.TIMESTAMP,
        status: "waiting",
        access,
        mode,
        numberOfMatches,
      };
    } else {
      return;
    }
  });
  if (!committed) {
    throw new functions.https.HttpsError(
      "already-exists",
      "The requested `gameId` already exists."
    );
  }

  // After this point, the game has successfully been created.
  // We update the database asynchronously in three different places:
  //   1. /stats/gameCount
  //   2. /publicGames (if access is public)
  const updates: Array<Promise<any>> = [];

  updates.push(
    admin
      .database()
      .ref("stats/gameCount")
      .transaction((count) => (count || 0) + 1)
  );
  if (access === "public") {
    updates.push(
      admin
        .database()
        .ref("publicGames")
        .child(gameId)
        .set(snapshot?.child("createdAt").val())
    );
  }

  await Promise.all(updates);
  return snapshot.val();
});

/** Generate a link to the customer portal. */
export const customerPortal = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "This function must be called while authenticated."
    );
  }

  const user = await admin.auth().getUser(context.auth.uid);
  if (!user.email) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "This function must be called by an authenticated user with email."
    );
  }

  const customerResponse = await stripe.customers.list({ email: user.email });
  if (!customerResponse.data.length) {
    throw new functions.https.HttpsError(
      "not-found",
      `A subscription with email ${user.email} was not found.`
    );
  }

  const portalResponse = await stripe.billingPortal.sessions.create({
    customer: customerResponse.data[0].id,
    return_url: data.returnUrl,
  });
  return portalResponse.url;
});

/** Periodically remove stale user connections */
export const clearConnections = functions.pubsub
  .schedule("every 1 minutes")
  .onRun(async (context) => {
    const onlineUsers = await admin
      .database()
      .ref("users")
      .orderByChild("connections")
      .startAt(false)
      .once("value");
    const actions: Array<Promise<void>> = [];
    let numUsers = 0;
    onlineUsers.forEach((snap) => {
      ++numUsers;
      if (Math.random() < 0.1) {
        console.log(`Clearing connections for ${snap.ref.toString()}`);
        actions.push(snap.ref.child("connections").remove());
      }
    });
    actions.push(admin.database().ref("stats/onlineUsers").set(numUsers));
    await Promise.all(actions);
  });

/** Webhook that handles Stripe customer events. */
export const handleStripe = functions.https.onRequest(async (req, res) => {
  const payload = req.rawBody;
  const sig = req.get("stripe-signature");

  if (!sig) {
    res.status(400).send("Webhook Error: Missing stripe-signature");
    return;
  }

  const { endpoint_secret } = functions.config().stripe;
  let event;
  try {
    event = stripe.webhooks.constructEvent(payload, sig, endpoint_secret);
  } catch (error: any) {
    res.status(400).send(`Webhook Error: ${error.message}`);
    return;
  }

  console.log(`Received ${event.type}: ${JSON.stringify(event.data)}`);
  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.deleted"
  ) {
    const subscription = event.data.object as Stripe.Subscription;
    const { email } = (await stripe.customers.retrieve(
      subscription.customer as string
    )) as Stripe.Response<Stripe.Customer>;

    if (email) {
      const user = await admin
        .auth()
        .getUserByEmail(email)
        .catch(() => null);

      if (user) {
        const newState = event.type === "customer.subscription.created";
        await admin.database().ref(`users/${user.uid}/patron`).set(newState);
        console.log(`Processed ${email} (${user.uid}): newState = ${newState}`);
      } else {
        console.log(`Failed to find user: ${email}`);
      }
    } else {
      console.log("Subscription event received with no email, ignoring");
    }
  }

  res.status(200).end();
});
