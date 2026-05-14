import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import * as admin from "firebase-admin";

// Use Firebase Client SDK for the backend since we don't have Admin SDK credentials.
import { initializeApp, getApps } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, updateProfile, signOut } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import fs from "fs";

let firebaseConfig;
try {
  firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
} catch (error) {
  console.error("Failed to read firebase config", error);
}

// We use a secondary app so we don't interfere with anything
const adminApp = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const adminAuth = getAuth(adminApp);
const adminDb = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);

const initializeAdminSdk = () => {
  if (admin.apps.length > 0) return true;
  
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
      console.log("Firebase Admin SDK initialized successfully.");
      return true;
    } catch (e) {
      console.error("Firebase Admin initialization error:", e);
      return false;
    }
  }
  return false;
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Backend endpoint to manually create users
  app.post("/api/admin/users", async (req, res) => {
    const { username, password, name, role, projects, status } = req.body;

    if (!username || !password || !name || !role) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      // Create user using Email/Password auth 
      // Mapping username to a fake system email
      const email = `${username}@system.local`;
      
      const userCredential = await createUserWithEmailAndPassword(adminAuth, email, password);
      
      // Update display name
      await updateProfile(userCredential.user, { displayName: name });

      // Create the user profile document in Firestore
      await setDoc(doc(adminDb, "users", userCredential.user.uid), {
        uid: userCredential.user.uid,
        name: name,
        email: email,
        username: username,
        role: role,
        assignedProjects: projects || [],
        status: status || 'active',
        createdAt: new Date().toISOString()
      });
      
      // Sign out immediately to clear state
      await signOut(adminAuth);

      return res.json({ 
        message: "User created successfully", 
        uid: userCredential.user.uid,
        email
      });
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        // Suppress massive stack trace for known error
        console.warn("Manual user creation skipped: Username already exists.");
        return res.status(400).json({ error: "Username already exists. Please choose a different username." });
      }
      console.error("Error creating manual user:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/users/:uid/reset-password", async (req, res) => {
    const isAdminReady = initializeAdminSdk();
    
    if (isAdminReady) {
      try {
        const { password } = req.body;
        if (!password) return res.status(400).json({ error: "Password is required" });
        
        await admin.auth().updateUser(req.params.uid, { password });
        return res.status(200).json({ message: "Password updated successfully via Admin SDK." });
      } catch (err: any) {
        console.error("Failed to update user password with Admin SDK:", err);
        return res.status(500).json({ error: err.message });
      }
    } else {
      // Mock success for the UI since we cannot actually change Firebase Auth passwords 
      // without the Admin SDK and a Service Account.
      return res.status(200).json({ message: "Password reset simulated successfully. Add Firebase Service Account keys to '.env' making it a full version." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
