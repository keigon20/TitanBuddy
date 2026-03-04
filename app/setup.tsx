import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { doc, setDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import { Alert, Button, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../src/lib/firebase';
import { supabase } from '../src/lib/supabase';
import { serverTimestamp } from 'firebase/firestore';

const years = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate'];
const sampleInterests = ['Sports', 'Music', 'Tech', 'Art', 'Tutoring', 'Volunteering', 'Gaming'];

export default function Setup() {
    const [name, setName] = useState('');
    const [year, setYear] = useState(years[0]);
    const [interests, setInterests] = useState([] as string[]);
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    const toggleInterest = (i: string) => {
        setInterests(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
    };

    const pickImage = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert('Permission required', 'Please grant photo library permissions.');
            return;
        }
        // Support multiple expo-image-picker API versions:
        const mediaType = (ImagePicker as any).MediaType?.Images ?? (ImagePicker as any).MediaTypeOptions?.Images ?? 'Images';
        const result: any = await ImagePicker.launchImageLibraryAsync({ mediaTypes: mediaType, quality: 0.7 });
        // Newer API returns { canceled, assets: [{ uri, ... }] }
        if (!result.canceled && result.assets && result.assets.length > 0) {
            setImageUri(result.assets[0].uri);
            return;
        }
        // Older API returned { cancelled, uri }
        if (!result.cancelled && result.uri) {
            setImageUri(result.uri);
        }
    };

    const uploadImageAndGetUrl = async (uri: string, uid: string) => {
        setUploading(true);
        try {
            const res = await fetch(uri);
            const arrayBuffer = await res.arrayBuffer();

            const filePath = `${uid}/profile.jpg`; // bucket path

            const { error } = await supabase.storage
                .from('profile-photos')
                .upload(filePath, arrayBuffer, {
                    contentType: 'image/jpeg',
                    upsert: true,
                });

            if (error) throw error;

            const { data } = supabase.storage.from('profile-photos').getPublicUrl(filePath);
            return data.publicUrl;
        } finally {
            setUploading(false);
        }
    };

    const onSave = async () => {
        const user = auth.currentUser;
        if (!user) return Alert.alert('Not signed in', 'You must be signed in to save your profile.');
        if (!name.trim()) return Alert.alert('Missing name', 'Please enter your name.');
        try {
            console.log('Saving profile for uid=', user.uid);
            let photoURL = null;
            if (imageUri) photoURL = await uploadImageAndGetUrl(imageUri, user.uid);
            const profile = { name: name.trim(), year, interests, photoURL, updatedAt: serverTimestamp() } as any;
            await setDoc(doc(db, 'users', user.uid), profile, { merge: true });
            // Navigate to home after successfully saving profile
            // @ts-ignore - router types may not be recognized in this context
            router.replace('/home');
            Alert.alert('Profile saved', 'Your account setup is complete.');
        } catch (e) {
            console.error('Save profile error:', e);
            const code = (e && (e as any).code) || 'unknown';
            const message = (e && (e as any).message) || String(e);
            Alert.alert('Save failed', `${code}: ${message}`);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Set up your profile</Text>

            <TouchableOpacity style={styles.avatarWrap} onPress={pickImage}>
                {imageUri ? (
                    <Image source={{ uri: imageUri }} style={styles.avatar} />
                ) : (
                    <View style={styles.avatarPlaceholder}><Text style={styles.avatarText}>Choose Photo</Text></View>
                )}
            </TouchableOpacity>

            <Text style={styles.label}>Full name</Text>
            <TextInput value={name} onChangeText={setName} placeholder="Your name" style={styles.input} />

            <Text style={styles.label}>Year</Text>
            <View style={styles.row}>
                {years.map(y => (
                    <TouchableOpacity key={y} style={[styles.chip, year === y && styles.chipActive]} onPress={() => setYear(y)}>
                        <Text style={year === y ? styles.chipTextActive : styles.chipText}>{y}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.label}>Interests</Text>
            <View style={styles.row}>
                {sampleInterests.map(i => (
                    <TouchableOpacity key={i} style={[styles.chip, interests.includes(i) && styles.chipActive]} onPress={() => toggleInterest(i)}>
                        <Text style={interests.includes(i) ? styles.chipTextActive : styles.chipText}>{i}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.buttonWrap}>
                <Button title={uploading ? 'Saving...' : 'Save profile'} onPress={onSave} disabled={uploading} />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { padding: 20, alignItems: 'stretch' },
    title: { fontSize: 24, fontWeight: '600', marginBottom: 20, textAlign: 'center' },
    avatarWrap: { alignSelf: 'center', marginBottom: 16 },
    avatar: { width: 120, height: 120, borderRadius: 60 },
    avatarPlaceholder: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: '#666' },
    label: { marginTop: 12, marginBottom: 6, fontWeight: '500' },
    input: { borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 6 },
    row: { flexDirection: 'row', flexWrap: 'wrap' },
    chip: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#f2f2f2', borderRadius: 20, marginRight: 8, marginBottom: 8 },
    chipActive: { backgroundColor: '#007AFF' },
    chipText: { color: '#333' },
    chipTextActive: { color: '#fff' },
    buttonWrap: { marginTop: 20 }
});
