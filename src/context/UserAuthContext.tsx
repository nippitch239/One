import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import { auth } from "../utils/firebase";

// Define the user type
interface User {
  uid: string;
  email: string;
  displayName?: string;
}

// Create a context for user authentication
const userAuthContext = createContext<{
  user: User | null;
  logIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<User>;
  logOut: () => Promise<void>;
}>({
  user: null,
  logIn: async () => {},
  signUp: async () => ({} as User),
  logOut: async () => {},
});

// Context Provider component

interface UserAuthContextProviderProps {
  children: ReactNode; // Define the type for the 'children' prop
}

export function UserAuthContextProvider({
  children,
}: UserAuthContextProviderProps) {
  const [user, setUser] = useState<User | null>(null);

  async function logIn(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function signUp(
    email: string,
    password: string,
    displayName: string
  ): Promise<User> {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    const db = getFirestore();
    const userRef = doc(db, "users", user.uid);
    const userData = { displayName, email };
    await setDoc(userRef, userData);

    return { ...user, ...userData };
  }

  async function logOut(): Promise<void> {
    await signOut(auth);
    setUser(null);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const db = getFirestore();
        const userRef = doc(db, "users", currentUser.uid);

        try {
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            setUser({ ...currentUser, ...userDoc.data() } as User);
          } else {
            setUser(currentUser as User);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUser(currentUser as User);
        }
      } else {
        setUser(null);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <userAuthContext.Provider value={{ user, logIn, signUp, logOut }}>
      {children}
    </userAuthContext.Provider>
  );
}

// Custom hook for using the user auth context
export function useUserAuth() {
  return useContext(userAuthContext);
}
