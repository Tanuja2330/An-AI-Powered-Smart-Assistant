import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { Audio } from 'expo-av';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import FallTest from './components/FallTest';
<script src="fall_Detection.js"></script>
<script src="get_help.js"></script>
<script src="mapscreen.js"></script>
<script src="navoigation.json"></script>


const FALL_DETECTION_TASK = 'fall-detection-task';
import React from 'react';
   import { StatusBar } from 'expo-status-bar';
   import { SafeAreaView, StyleSheet } from 'react-native';
   import NavigationScreen from './screens/NavigationScreen';

   export default function App() {
     return (
       <SafeAreaView style={styles.container}>
         <StatusBar style="auto" />
         <NavigationScreen />
       </SafeAreaView>
     );
   }

   const styles = StyleSheet.create({
     container: {
       flex: 1,
       backgroundColor: '#fff',
     },
   });

// Emergency handling functions
const handleEmergency = async () => {
  try {
    const { sound } = await Audio.Sound.createAsync(
      require('../assets/fall.mp3')
    );
    await sound.playAsync();
    sendSMSWithLocation();
    openDialer();
  } catch (error) {
    console.error('Error during emergency handling:', error);
  }
};

const sendSMSWithLocation = async () => {
  try {
    const loc = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = loc.coords;

    const message = `🚨 Fall detected! I may need help.\nLocation: ${latitude}, ${longitude}\nhttps://maps.google.com/?q=${latitude},${longitude}`;
    const smsUrl = `sms:+919822115810?body=${encodeURIComponent(message)}`;

    Linking.openURL(smsUrl).catch(() => {
      console.error('Failed to open SMS');
    });
  } catch (error) {
    console.error('Error getting location:', error);
  }
};

const openDialer = () => {
  Linking.openURL('tel:+919822115810').catch(() => {
    console.error('Failed to open dialer');
  });
};

// Define background task for fall detection
TaskManager.defineTask(FALL_DETECTION_TASK, async () => {
  try {
    const x = 0, y = 0, z = 0; // Replace with actual sensor data
    const acceleration = Math.sqrt(x * x + y * y + z * z);
    const fallThreshold = 1.2;

    if (acceleration > fallThreshold) {
      handleEmergency();
    }
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Error detecting fall:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export default function App() {
  const router = useRouter();
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  // Function to speak button information
  const speakButtons = () => {
    const message =
      'Welcome to GuideX. The first button is Get Help, the second is Navigation, third is Reminders, and fourth is Emergency Alerts.';
    Speech.speak(message, { rate: 0.9 });
  };

  useEffect(() => {
    const setupApp = async () => {
      // Request necessary permissions
      const locationStatus = await Location.requestForegroundPermissionsAsync();
      const notificationStatus = await Location.requestForegroundPermissionsAsync();
      
      if (locationStatus.status === 'granted' && notificationStatus.status === 'granted') {
        setPermissionsGranted(true);
      }
      
      // Register background task
      try {
        await BackgroundFetch.registerTaskAsync(FALL_DETECTION_TASK, {
          minimumInterval: 15 * 60, // 15 minutes
          stopOnTerminate: false,
          startOnBoot: true,
        });
        console.log('Background task registered');
      } catch (error) {
        console.error('Failed to register background task:', error);
      }
      
      // Speak button information when app loads
      speakButtons();
    };

    setupApp();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <FallTest />

      <Text style={styles.title}>Welcome to GuideX</Text>
      <Text style={styles.subtitle}>Assistance for visually impaired and elderly</Text>

      <TouchableOpacity 
        style={styles.voiceButton} 
        onPress={speakButtons}
        accessible={true}
        accessibilityLabel="Speak button information"
        accessibilityHint="Announces all available buttons">
        <Text style={styles.voiceButtonText}>🔊 Speak Button Info</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.button} 
        onPress={() => router.push('/get-help')}
        accessible={true}
        accessibilityLabel="Get Help"
        accessibilityHint="Emergency assistance button">
        <Text style={styles.buttonText}>Get Help</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.button} 
        onPress={() => router.push('/nav')}
        accessible={true}
        accessibilityLabel="Navigation"
        accessibilityHint="Location and navigation assistance">
        <Text style={styles.buttonText}>Navigation</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.button} 
        onPress={() => router.push('/reminder')}
        accessible={true}
        accessibilityLabel="Reminders"
        accessibilityHint="Set and manage reminders">
        <Text style={styles.buttonText}>Reminders</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.button} 
        onPress={() => router.push('/emergency')}
        accessible={true}
        accessibilityLabel="Emergency Alerts"
        accessibilityHint="Fall detection and emergency alerts">
        <Text style={styles.buttonText}>Emergency Alerts</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F0FE',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1E3A8A',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 30,
    color: '#475569',
    textAlign: 'center',
  },
  voiceButton: {
    backgroundColor: '#34A853',
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 25,
    width: '100%',
    alignItems: 'center',
    elevation: 4,
  },
  voiceButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#1E90FF',
    paddingVertical: 20,
    paddingHorizontal: 30,
    borderRadius: 15,
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
});