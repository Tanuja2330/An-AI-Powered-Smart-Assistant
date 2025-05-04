import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  Vibration, 
  ActivityIndicator,
  Dimensions
} from 'react-native';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';

export default function GetHelpScreen() {
  const [triggered, setTriggered] = useState(false);
  const [sound, setSound] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState(null);
  
  // Emergency contacts
  const emergencyContacts = [
    '+919822115810',  // Primary emergency contact
    '+917972432649'   // Secondary emergency contact
  ];

  // Function to load sound
  const loadSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/Rock.mp3')
      );
      setSound(sound);
    } catch (error) {
      console.error('Error loading sound:', error);
    }
  };

  // Function to play sound
  const playSound = async () => {
    if (sound) {
      try {
        await sound.setPositionAsync(0); // Reset sound position
        await sound.playAsync();
      } catch (error) {
        console.error('Error playing sound:', error);
      }
    }
  };

  // Function to stop sound
  const stopSound = async () => {
    if (sound) {
      try {
        await sound.stopAsync();
      } catch (error) {
        console.error('Error stopping sound:', error);
      }
    }
  };

  // Get current location
  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for emergency services.');
        return null;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      return currentLocation;
    } catch (error) {
      console.error('Error getting location:', error);
      return null;
    }
  };

  // Send SMS with location
  const sendSMSWithLocation = async () => {
    setIsLoading(true);
    const currentLocation = await getCurrentLocation();
    setIsLoading(false);
    
    if (!currentLocation) {
      // If location is not available, send SMS without location info
      sendSMS('Help! I need assistance urgently. Please respond ASAP.');
      return;
    }
    
    const { latitude, longitude } = currentLocation.coords;
    setLocation(currentLocation.coords);
    
    const message = `EMERGENCY! I need help immediately!\nMy location: https://maps.google.com/?q=${latitude},${longitude}\nPlease come ASAP or call emergency services.`;
    sendSMS(message);
  };
  
  // Send SMS to all emergency contacts
  const sendSMS = (message) => {
    try {
      emergencyContacts.forEach(contact => {
        const smsUrl = `sms:${contact}?body=${encodeURIComponent(message)}`;
        Linking.openURL(smsUrl).catch(err => {
          console.error('Error opening SMS app:', err);
        });
      });
    } catch (error) {
      console.error('Error sending SMS:', error);
      Alert.alert('Error', 'Failed to send SMS. Please try calling emergency contacts directly.');
    }
  };

  // Make emergency call
  const makeEmergencyCall = () => {
    try {
      Linking.openURL(`tel:${emergencyContacts[0]}`).catch(err => {
        console.error('Error opening phone app:', err);
        Alert.alert('Error', 'Failed to open the phone app. Please try again.');
      });
    } catch (error) {
      console.error('Error making call:', error);
      Alert.alert('Error', 'Failed to make the call. Please try again.');
    }
  };

  // Handle help button press
  const handleHelpPress = async () => {
    setTriggered(true);
    
    // Vibrate device in SOS pattern (... --- ...)
    const sosPattern = [300, 100, 300, 100, 300, 100, 500, 100, 500, 100, 500, 100, 300, 100, 300, 100, 300];
    Vibration.vibrate(sosPattern, true);
    
    // Play alert sound
    await playSound();
    
    // Speak emergency message for user
    Speech.speak('Emergency help has been triggered. Sending your location and contacting emergency services.', {
      rate: 0.9,
      pitch: 1.0,
    });
    
    // Send SMS with location
    await sendSMSWithLocation();
    
    // Attempt to make emergency call after short delay
    setTimeout(() => {
      makeEmergencyCall();
      
      // Stop vibration after 10 seconds
      setTimeout(() => {
        Vibration.cancel();
        stopSound();
      }, 10000);
    }, 3000);
  };

  // Component initialization
  useEffect(() => {
    loadSound();
    
    // Request permissions on component mount
    (async () => {
      await Location.requestForegroundPermissionsAsync();
    })();
    
    // Cleanup function
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      Vibration.cancel();
    };
  }, []);

  // When component is first rendered, announce instructions
  useEffect(() => {
    const instructions = 'This is the Get Help screen. Press the large red button to trigger emergency assistance.';
    Speech.speak(instructions, { rate: 0.9 });
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Emergency Assistance</Text>
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff4d4d" />
          <Text style={styles.loadingText}>Preparing emergency assistance...</Text>
        </View>
      ) : (
        <>
          <TouchableOpacity 
            style={styles.helpButton} 
            onPress={handleHelpPress}
            accessible={true}
            accessibilityLabel="Emergency Help Button"
            accessibilityHint="Press to contact emergency services and send your location"
          >
            <Text style={styles.helpButtonText}>EMERGENCY HELP</Text>
          </TouchableOpacity>
          
          <Text style={styles.instructionText}>
            Press the button above to send your location to emergency contacts and call for help
          </Text>
          
          {triggered && (
            <View style={styles.alertContainer}>
              <Text style={styles.alertText}>Emergency alert triggered!</Text>
              <Text style={styles.alertSubText}>
                Your location is being sent and emergency contacts will be notified.
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 40,
    color: '#333',
    textAlign: 'center',
  },
  helpButton: {
    backgroundColor: '#ff4d4d',
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    marginBottom: 30,
  },
  helpButtonText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  instructionText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#555',
    paddingHorizontal: 20,
  },
  alertContainer: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    width: '100%',
    alignItems: 'center',
  },
  alertText: {
    color: '#721c24',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  alertSubText: {
    color: '#721c24',
    fontSize: 14,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
});