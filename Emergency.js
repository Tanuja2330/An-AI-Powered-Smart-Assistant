import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, Linking, Button, ActivityIndicator, Image } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { Audio } from 'expo-av';
import * as SMS from 'expo-sms'; // ✅ CORRECT



export default function FallDetectionScreen() {
  const [fallDetected, setFallDetected] = useState(false);
  const [alertShown, setAlertShown] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationAddress, setLocationAddress] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [healthInfo] = useState({ bloodType: "O+", allergies: "None" });

  const emergencyNumber = "+918010474391";
  const fallThreshold = 1.2;
  const vibrationThreshold = 2.5;
  const cooldownPeriod = 5000;

  const lastFallTimeRef = useRef(0);
  const previousAcceleration = useRef({ x: 0, y: 0, z: 0 });

  

  const getLocation = async () => {
  setIsLoading(true);
  try {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);

      const geocode = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (geocode.length > 0) {
        const place = geocode[0];
        const formatted = `${place.name || ''}, ${place.street || ''}, ${place.city || ''}, ${place.region || ''}, ${place.postalCode || ''}`.replace(/(, )+/g, ", ").trim();
        setLocationAddress(formatted);
      }
    } else {
      Alert.alert("Permission Denied", "We need location access.");
    }
  } catch (error) {
    console.error("Location error:", error);
    Alert.alert("Error", "Failed to fetch location.");
  } finally {
    setIsLoading(false);
  }
};


  const playSound = async () => {
  const { sound } = await Audio.Sound.createAsync(require('../assets/fall.mp3'));
  await sound.playAsync();
  sound.setOnPlaybackStatusUpdate(status => {
    if (status.didJustFinish) {
      sound.unloadAsync();
    }
  });
};


  const openDialer = () => {
    Linking.openURL(`tel:${emergencyNumber}`).catch(() => {
    Alert.alert("Error", "Failed to open dialer.");
});

  };

  
const sendSMSWithLocation = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permission Denied", "Cannot send SMS without location permission.");
      return;
    }

    const loc = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = loc.coords;

    const message = `🚨 Fall detected! I may need help.\nLocation:\nLat: ${latitude}, Lon: ${longitude}\nhttps://maps.google.com/?q=${latitude},${longitude}`;

    const isAvailable = await SMS.isAvailableAsync();
    if (isAvailable) {
      await SMS.sendSMSAsync([emergencyNumber], message);
    } else {
      Alert.alert("SMS not available", "Your device doesn't support SMS.");
    }
  } catch (error) {
    Alert.alert("SMS Error", "Something went wrong while sending SMS.");
    console.error(error);
  }
};





  const handleEmergency = () => {
    playSound();
    openDialer();
    setTimeout(() => {
      sendSMSWithLocation();
    }, 3000);
  };

  const handleFallback = () => {
  Alert.alert("Fallback Alert", "No response detected. Retrying...");
  openDialer();
  sendSMSWithLocation();
};

  const handleHealthInfo = () => {
    Alert.alert("Health Info", `Blood Type: ${healthInfo.bloodType}\nAllergies: ${healthInfo.allergies}`);
  };

  const capturePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permission Denied", "Camera access is required.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
      saveToPhotos: true,
      cameraType: ImagePicker.CameraType.back,
    });

    if (!result.canceled && result.assets?.length > 0) {
      const captured = result.assets[0];
      setCapturedPhoto(captured.uri);
      Alert.alert("Photo Captured", "Photo has been captured successfully.");
    } else {
      Alert.alert("Cancelled", "Camera was closed without capturing.");
    }
  };

  const sharePhoto = async () => {
    if (!capturedPhoto) {
      Alert.alert("No Photo", "Please capture a photo first.");
      return;
    }

    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert("Unavailable", "Sharing is not available on this device.");
      return;
    }

    try {
      await Sharing.shareAsync(capturedPhoto);
    } catch (error) {
      console.error("Share Error:", error);
      Alert.alert("Error", "Failed to share photo.");
    }
  };

  useEffect(() => {
    getLocation();

    const subscription = Accelerometer.addListener(data => {
      const { x, y, z } = data;
      const now = Date.now();

      const acceleration = Math.sqrt(x * x + y * y + z * z);
      const vibration = Math.sqrt(
        (x - previousAcceleration.current.x) ** 2 +
        (y - previousAcceleration.current.y) ** 2 +
        (z - previousAcceleration.current.z) ** 2
      );

      const timeSinceLastFall = now - lastFallTimeRef.current;

      if (
        !alertShown &&
        timeSinceLastFall > cooldownPeriod &&
        (acceleration > fallThreshold || vibration > vibrationThreshold)
      ) {
        lastFallTimeRef.current = now;
        setFallDetected(true);
        setAlertShown(true);

        Alert.alert("Fall Detected!", "Emergency contact will be alerted.");
        handleEmergency();

        setTimeout(() => {
          setAlertShown(false);
          setFallDetected(false);
        }, cooldownPeriod);
      }

      previousAcceleration.current = { x, y, z };
    });

    Accelerometer.setUpdateInterval(800);
    return () => subscription.remove();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fall Detection</Text>

      {fallDetected ? (
        <View style={styles.alertBox}>
          <Text style={styles.alertText}>🚨 Fall Detected!</Text>
        </View>
      ) : (
        <>
          <Text style={styles.normalText}>Monitoring... Keep moving to test.</Text>
          {locationAddress && (
            <Text style={styles.normalText}>📍 Location: {locationAddress}</Text>
          )}
        </>
      )}

      {isLoading && <ActivityIndicator size="large" color="blue" style={styles.loading} />}

      {capturedPhoto && <Image source={{ uri: capturedPhoto }} style={styles.image} />}

      <Button title="Retry Emergency Call" onPress={handleFallback} />
      <Button title="View Health Info" onPress={handleHealthInfo} />
      <Button title="Capture Photo" onPress={capturePhoto} />
      <Button title="Share Photo" onPress={sharePhoto} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  alertBox: { backgroundColor: 'red', padding: 20, borderRadius: 10, marginBottom: 15 },
  alertText: { color: 'white', fontSize: 18 },
  normalText: { fontSize: 16, marginBottom: 10, textAlign: 'center' },
  loading: { marginVertical: 15 },
  image: { width: 200, height: 200, marginTop: 15, borderRadius: 10 },
});
