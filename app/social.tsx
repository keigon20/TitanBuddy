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

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  creatorId: string;
  creatorEmail: string;
  participants: string[];
  createdAt: number;
}

export default function Social() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [showForm, setShowForm] = useState(false);

  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) {
      router.replace("/login");
      return;
    }

    // Subscribe to events collection
    const q = query(collection(db, "events"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsData: Event[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Event[];
      setEvents(eventsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleCreateEvent = async () => {
    if (!title.trim() || !description.trim() || !date.trim() || !time.trim() || !location.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (!currentUser) {
      Alert.alert("Error", "You must be logged in to create an event");
      return;
    }

    setCreating(true);
    try {
      await addDoc(collection(db, "events"), {
        title: title.trim(),
        description: description.trim(),
        date: date.trim(),
        time: time.trim(),
        location: location.trim(),
        creatorId: currentUser.uid,
        creatorEmail: currentUser.email || "Unknown",
        participants: [currentUser.uid], // Creator automatically joins
        createdAt: Date.now(),
      });

      // Clear form
      setTitle("");
      setDescription("");
      setDate("");
      setTime("");
      setLocation("");
      setShowForm(false);
      
      Alert.alert("Success", "Event created successfully!");
    } catch (error: any) {
      console.error("Error creating event:", error);
      Alert.alert("Error", "Failed to create event. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleJoinEvent = async (event: Event) => {
    if (!currentUser) {
      Alert.alert("Error", "You must be logged in to join an event");
      return;
    }

    const isParticipant = event.participants.includes(currentUser.uid);

    try {
      const eventRef = doc(db, "events", event.id);
      
      if (isParticipant) {
        await updateDoc(eventRef, {
          participants: arrayRemove(currentUser.uid),
        });
        Alert.alert("Left Event", "You have left the event.");
      } else {
        await updateDoc(eventRef, {
          participants: arrayUnion(currentUser.uid),
        });
        Alert.alert("Joined!", "You have joined the event!");
      }
    } catch (error: any) {
      console.error("Error:", error);
      Alert.alert("Error", "Failed to update participation.");
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

  const renderEventCard = (event: Event) => {
    const isParticipant = currentUser?.uid 
      ? event.participants.includes(currentUser.uid)
      : false;
    const isCreator = currentUser?.uid === event.creatorId;

    return (
      <View key={event.id} style={styles.eventCard}>
        <View style={styles.eventHeader}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          {isCreator && (
            <View style={styles.creatorBadge}>
              <Text style={styles.creatorBadgeText}>Your Event</Text>
            </View>
          )}
        </View>
        
        <Text style={styles.eventDescription}>{event.description}</Text>
        
        <View style={styles.eventDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>📅 Date:</Text>
            <Text style={styles.detailValue}>{event.date}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>🕒 Time:</Text>
            <Text style={styles.detailValue}>{event.time}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>📍 Location:</Text>
            <Text style={styles.detailValue}>{event.location}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>👤 Host:</Text>
            <Text style={styles.detailValue}>{event.creatorEmail}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>👥 Participants:</Text>
            <Text style={styles.detailValue}>{event.participants.length}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.joinButton,
            isParticipant && styles.leaveButton,
          ]}
          onPress={() => handleJoinEvent(event)}
        >
          <Text style={styles.joinButtonText}>
            {isParticipant ? "Leave Event" : "Join Event"}
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
          <Text style={styles.title}>Campus Events</Text>
          <Text style={styles.subtitle}>Find and join student events</Text>
        </View>

        {/* Navigation Buttons */}
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

        {/* Create Event Section */}
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowForm(!showForm)}
        >
          <Text style={styles.createButtonText}>
            {showForm ? "✕ Cancel" : "+ Create New Event"}
          </Text>
        </TouchableOpacity>

        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Create New Event</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Event Title</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g., Study Group Meetup"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="What is this event about?"
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputContainer, styles.halfWidth]}>
                <Text style={styles.label}>Date</Text>
                <TextInput
                  style={styles.input}
                  value={date}
                  onChangeText={setDate}
                  placeholder="e.g., March 15, 2024"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={[styles.inputContainer, styles.halfWidth]}>
                <Text style={styles.label}>Time</Text>
                <TextInput
                  style={styles.input}
                  value={time}
                  onChangeText={setTime}
                  placeholder="e.g., 3:00 PM"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Location</Text>
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="e.g., Library Room 201"
                placeholderTextColor="#999"
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, creating && styles.buttonDisabled]}
              onPress={handleCreateEvent}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Create Event</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Events List */}
        <View style={styles.eventsSection}>
          <Text style={styles.sectionTitle}>Available Events</Text>
          {events.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No events yet.</Text>
              <Text style={styles.emptyStateSubtext}>
                Be the first to create an event!
              </Text>
            </View>
          ) : (
            events.map(renderEventCard)
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
  row: {
    flexDirection: "row",
    gap: 12,
  },
  halfWidth: {
    flex: 1,
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

