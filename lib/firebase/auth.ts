import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  type UserCredential,
} from "firebase/auth"
import { getFirebaseAuth } from "./config"

const googleProvider = new GoogleAuthProvider()
googleProvider.addScope("email")
googleProvider.addScope("profile")

export async function signInWithGoogle(): Promise<UserCredential> {
  const auth = getFirebaseAuth()
  return signInWithPopup(auth, googleProvider)
}

export async function firebaseSignOut(): Promise<void> {
  const auth = getFirebaseAuth()
  return signOut(auth)
}

export async function getIdToken(): Promise<string | null> {
  const auth = getFirebaseAuth()
  const user = auth.currentUser
  if (!user) {
    return null
  }
  return user.getIdToken()
}
