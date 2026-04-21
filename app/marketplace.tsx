import { auth, db } from "@/src/lib/firebase";
import { router } from "expo-router";
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  condition: string;
  category: string;
  sellerId: string;
  sellerEmail: string;
  interestedUsers: string[];
  createdAt: number;
}

export default function Marketplace() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState("");
  const [category, setCategory] = useState("");
  const [showForm, setShowForm] = useState(false);

  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) {
      router.replace("/login");
      return;
    }

    const q = query(collection(db, "listings"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const listingsData: Listing[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Listing[];
      setListings(listingsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handlePostListing = async () => {
    if (!title.trim() || !description.trim() || !price.trim() || !condition.trim() || !category.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    const priceNum = parseFloat(price.trim());
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert("Error", "Please enter a valid price greater than 0");
      return;
    }

    if (!currentUser) {
      Alert.alert("Error", "You must be logged in to post a listing");
      return;
    }

    setCreating(true);
    try {
      await addDoc(collection(db, "listings"), {
        title: title.trim(),
        description: description.trim(),
        price: priceNum,
        condition: condition.trim(),
        category: category.trim(),
        sellerId: currentUser.uid,
        sellerEmail: currentUser.email || "Unknown",
        interestedUsers: [currentUser.uid],
        createdAt: Date.now(),
      });

      setTitle("");
      setDescription("");
      setPrice("");
      setCondition("");
      setCategory("");
      setShowForm(false);
      
      Alert.alert("Success", "Listing posted successfully!");
    } catch (error: any) {
      console.error("Error posting listing:", error);
      Alert.alert("Error", "Failed to post listing. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleInterest = async (listing: Listing) => {
    if (!currentUser) {
      Alert.alert("Error", "You must be logged in");
      return;
    }

    const isInterested = listing.interestedUsers.includes(currentUser.uid);

    try {
      const listingRef = doc(db, "listings", listing.id);
      
      if (isInterested) {
        await updateDoc(listingRef, {
          interestedUsers: arrayRemove(currentUser.uid),
        });
        Alert.alert("Interest Hidden", "Your interest has been removed.");
      } else {
        await updateDoc(listingRef, {
          interestedUsers: arrayUnion(currentUser.uid),
        });
        Alert.alert("Interest Shown!", "Seller can now contact you!");
      }
    } catch (error: any) {
      console.error("Error:", error);
      Alert.alert("Error", "Failed to update interest.");
    }
  };

  const handleLogout = async () => {
    try {
      const { signOut } = await import("firebase/auth");
      await signOut(auth);
      router.replace("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const renderListingCard = (listing: Listing) => {
    const isInterested = currentUser?.uid 
      ? listing.interestedUsers.includes(currentUser.uid)
      : false;
    const isSeller = currentUser?.uid === listing.sellerId;

    return (
      <View key={listing.id} style={styles.eventCard}>
        <View style={styles.eventHeader}>
          <Text style={styles.eventTitle}>{listing.title}</Text>
          {isSeller && (
            <View style={styles.creatorBadge}>
              <Text style={styles.creatorBadgeText}>Your Listing</Text>
            </View>
          )}
        </View>
        
        <Text style={styles.eventDescription}>{listing.description}</Text>
        
        <View style={styles.eventDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>💰 Price:</Text>
            <Text style={styles.detailValue}>${listing.price.toFixed(2)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>🏷️ Category:</Text>
            <Text style={styles.detailValue}>{listing.category}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>🔄 Condition:</Text>
            <Text style={styles.detailValue}>{listing.condition}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>👤 Seller:</Text>
            <Text style={styles.detailValue}>{listing.sellerEmail}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>💬 Interested:</Text>
            <Text style={styles.detailValue}>{listing.interestedUsers.length}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.joinButton,
            isInterested && styles.leaveButton,
          ]}
          onPress={() => handleToggleInterest(listing)}
        >
          <Text style={styles.joinButtonText}>
            {isInterested ? "Hide Interest" : "Show Interest"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>🛒 Campus Marketplace</Text>
          <Text style={styles.subtitle}>Buy & sell student items</Text>
        </View>

        <View style={styles.navButtons}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => router.push("/home")}
          >
            <Text style={styles.navButtonText}>🏠 Home</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navButton, styles.logoutButton]}
            onPress={handleLogout}
          >
            <Text style={styles.navButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowForm(!showForm)}
        >
          <Text style={styles.createButtonText}>
            {showForm ? "✕ Cancel" : "+ Post New Listing"}
          </Text>
        </TouchableOpacity>

        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Post New Listing</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Listing Title</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Used MacBook Pro"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="What are you selling? Add details and condition specifics."
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Price ($)</Text>
              <TextInput
                style={styles.input}
                value={price}
                onChangeText={setPrice}
                placeholder="25.99"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Condition</Text>
              <TextInput
                style={styles.input}
                value={condition}
                onChangeText={setCondition}
                placeholder="New, Like New, Good, Fair, Poor"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Category</Text>
              <TextInput
                style={styles.input}
                value={category}
                onChangeText={setCategory}
                placeholder="Books, Electronics, Clothes, Furniture, Other"
                placeholderTextColor="#999"
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, creating && styles.buttonDisabled]}
              onPress={handlePostListing}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Post Listing</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.eventsSection}>
          <Text style={styles.sectionTitle}>Available Listings</Text>
          {listings.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No listings yet.</Text>
              <Text style={styles.emptyStateSubtext}>
                Be the first to post a listing!
              </Text>
            </View>
          ) : (
            listings.map(renderListingCard)
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
    marginTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
  },
  navButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 12,
  },
  navButton: {
    flex: 1,
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
  },
  logoutButton: {
    backgroundColor: "#FF3B30",
  },
  navButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  createButton: {
    backgroundColor: "#34C759",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
    textAlign: "center",
  },
  inputContainer: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: "#f9f9f9",
    color: "#333",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  submitButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  eventsSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  eventCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  creatorBadge: {
    backgroundColor: "#FF9500",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  creatorBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  eventDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
    lineHeight: 20,
  },
  eventDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 13,
    color: "#666",
    width: 90,
  },
  detailValue: {
    fontSize: 13,
    color: "#333",
    fontWeight: "500",
    flex: 1,
  },
  joinButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  leaveButton: {
    backgroundColor: "#FF3B30",
  },
  joinButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
    backgroundColor: "#fff",
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#999",
  },
});
