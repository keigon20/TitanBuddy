import { auth } from "@/src/lib/firebase";
import { router } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

export default function Index() {
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in, go to home page
        console.log("User is signed in:", user.email);
        // @ts-ignore - Home route exists but TypeScript doesn't recognize it
        router.replace("/home");
      } else {
        // User is not signed in, go to login page
        console.log("User is not signed in");
        router.replace("/login");
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
});

