/** This file contains all public configuration variables for different environments. */

const config = {
  development: {
    firebase: {
      apiKey: "AIzaSyCqQ8LbQ9CY5ZpBXMof5PrWNXvA_PTSkgs",
      authDomain: "cuema-a3a53.firebaseapp.com",
      projectId: "cuema-a3a53",
      databaseURL: "https://cuema-a3a53-default-rtdb.firebaseio.com",
      storageBucket: "cuema-a3a53.appspot.com",
      messagingSenderId: "1088376207295",
      appId: "1:1088376207295:web:e5ea70a729b2f25d61130a",
      measurementId: "G-2E7JWL7CE5"
    },
    stripe: null, // Stripe not supported in development
  },
  preview: {
    firebase: {
      apiKey: "AIzaSyCqQ8LbQ9CY5ZpBXMof5PrWNXvA_PTSkgs",
      authDomain: "cuema-a3a53.firebaseapp.com",
      projectId: "cuema-a3a53",
      databaseURL: "https://cuema-a3a53-default-rtdb.firebaseio.com",
      storageBucket: "cuema-a3a53.appspot.com",
      messagingSenderId: "1088376207295",
      appId: "1:1088376207295:web:e5ea70a729b2f25d61130a",
      measurementId: "G-2E7JWL7CE5"
    },
    stripe: {
      publishableKey:
        "pk_test_51I0VxyCWK9K42cLJfn9bVu57liV6yS9BP1iS6hKCMvtZ3ObTGcYDxz544z2P9CPkN1a0T3VTYbpUcBO1AUDLwTGz00KDNytNhW",
      priceId: "price_1I2Wi2CWK9K42cLJMyY0yzKT",
    },
  },
  production: {
    firebase: {
      apiKey: "AIzaSyCqQ8LbQ9CY5ZpBXMof5PrWNXvA_PTSkgs",
      authDomain: "cuema-a3a53.firebaseapp.com",
      databaseURL: "https://cuema-a3a53-default-rtdb.firebaseio.com",
      projectId: "cuema-a3a53",
      storageBucket: "cuema-a3a53.appspot.com",
      messagingSenderId: "1088376207295",
      appId: "1:1088376207295:web:e5ea70a729b2f25d61130a",
      measurementId: "G-2E7JWL7CE5"
    },
    stripe: {
      publishableKey:
        "pk_live_51I0VxyCWK9K42cLJX34X6lIqsuZSWQX6I8WuOgmvEGANYlNyCsZDl2MmWGXQhuM5QnVciouCiYZ9lWq5Ope68aSj00bllKdnRr",
      priceId: "price_1I2QWcCWK9K42cLJFp2sUkSh",
    },
  },
};

/** The environment of the application. */
export const env = process.env.REACT_APP_ENV || "development";

/** Indicates whether the app is running in development. */
export const isDev = env === "development";

/** The version number (A.B.C) of the application, set by CI in production builds. */
export const version = process.env.REACT_APP_VERSION ?? null;

export default config[env];
