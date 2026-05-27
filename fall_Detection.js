import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Accelerometer } from 'expo-sensors';

export default function FallTest() {
  const [data, setData] = useState({ x: 0, y: 0, z: 0 });
  const [subscription, setSubscription] = useState(null);
  const [fallRisk, setFallRisk] = useState('Low');

  const _subscribe = () => {
    setSubscription(
      Accelerometer.addListener(accelerometerData => {
        setData(accelerometerData);
        const { x, y, z } = accelerometerData;
        const magnitude = Math.sqrt(x * x + y * y + z * z);
        
        if (magnitude > 1.2) {
          setFallRisk('High');
        } else if (magnitude > 1.0) {
          setFallRisk('Medium');
        } else {
          setFallRisk('Low');
        }
      })
    );
    Accelerometer.setUpdateInterval(500);
  };

  const _unsubscribe = () => {
    subscription && subscription.remove();
    setSubscription(null);
  };

  useEffect(() => {
    _subscribe();
    return () => _unsubscribe();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Accelerometer: (for fall detection)</Text>
      <Text style={styles.text}>
        x: {data.x.toFixed(2)}, y: {data.y.toFixed(2)}, z: {data.z.toFixed(2)}
      </Text>
      <Text style={[styles.riskText, 
        fallRisk === 'Low' ? styles.low : 
        fallRisk === 'Medium' ? styles.medium : styles.high]}>
        Fall Risk: {fallRisk}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    margin: 10,
  },
  text: {
    fontSize: 14,
  },
  riskText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 5,
  },
  low: {
    color: 'green',
  },
  medium: {
    color: 'orange',
  },
  high: {
    color: 'red',
  },
});