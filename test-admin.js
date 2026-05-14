import admin from 'firebase-admin';

admin.initializeApp();

async function test() {
  try {
    const users = await admin.auth().listUsers(1);
    console.log("Success! Users:", users.users.length);
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
