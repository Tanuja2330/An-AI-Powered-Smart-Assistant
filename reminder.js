import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, Button, FlatList, StyleSheet,
  Alert, TouchableOpacity, Platform
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

export default function RemindersScreen() {
  const [reminderText, setReminderText] = useState('');
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [reminders, setReminders] = useState([]);
  const [repeatType, setRepeatType] = useState('none');
  const [editingReminder, setEditingReminder] = useState(null);

  useEffect(() => {
    setupNotifications();
    loadReminders();
  }, []);

  const setupNotifications = async () => {
    await Notifications.requestPermissionsAsync();

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('reminder-channel', {
        name: 'Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],  // Custom vibration pattern
        lightColor: '#FF231F7C',
        sound: true,
      });
    }

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        vibrate: true,  // Enable vibration for notifications
      }),
    });
  };

  const loadReminders = async () => {
    try {
      const data = await AsyncStorage.getItem('reminders');
      if (data) {
        const parsed = JSON.parse(data);
        const filtered = parsed.filter(r => r.notificationId);
        setReminders(filtered);
      }
    } catch (error) {
      console.error('Failed to load reminders', error);
    }
  };

  const saveReminders = async (newReminders) => {
    setReminders(newReminders);
    await AsyncStorage.setItem('reminders', JSON.stringify(newReminders));
  };

  const scheduleNotification = async (text, time, repeat) => {
    try {
      const now = new Date();
      const selected = new Date(time);
      selected.setSeconds(0);
      selected.setMilliseconds(0);
  
      let trigger;
  
      if (repeat === 'none') {
        if (selected <= now) {
          Alert.alert('Time has already passed. Please choose a future time.');
          return null;
        }
        trigger = selected;
      } else if (repeat === 'daily') {
        trigger = {
          hour: selected.getHours(),
          minute: selected.getMinutes(),
          repeats: true,
        };
      } else if (repeat === 'weekly') {
        // Expo: weekday starts from 1 (Sunday) to 7 (Saturday)
        const weekday = selected.getDay() + 1;
        trigger = {
          weekday,
          hour: selected.getHours(),
          minute: selected.getMinutes(),
          repeats: true,
        };
      }
  
      const soundFile = Platform.OS === 'ios' ? require('../assets/Rock.mp3') : 'default';
  
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Reminder',
          body: text,
          sound: soundFile,
          android: {
            channelId: 'reminder-channel',
            sound: soundFile,
            vibrate: true,
          },
        },
        trigger,
      });
  
      return id;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      Alert.alert('Failed to schedule notification');
      return null;
    }
  };
  

  const addReminder = async () => {
    if (!reminderText) return Alert.alert('Enter reminder text!');
    const notificationId = await scheduleNotification(reminderText, selectedTime, repeatType);
    if (!notificationId) return Alert.alert('Failed to schedule notification');

    const newReminder = {
      id: Date.now().toString(),
      text: reminderText,
      time: selectedTime.toString(),
      repeat: repeatType,
      notificationId,
    };

    const updated = [...reminders, newReminder];
    await saveReminders(updated);
    setReminderText('');
    setEditingReminder(null);
    Alert.alert('Reminder set!');
  };

  const editReminder = async () => {
    if (!reminderText) return Alert.alert('Enter reminder text!');
    if (!editingReminder?.notificationId) {
      Alert.alert('Invalid reminder');
      return;
    }

    await Notifications.cancelScheduledNotificationAsync(editingReminder.notificationId);
    const notificationId = await scheduleNotification(reminderText, selectedTime, repeatType);
    if (!notificationId) return Alert.alert('Failed to reschedule notification');

    const updatedReminders = reminders.map((r) =>
      r.id === editingReminder.id
        ? { ...r, text: reminderText, time: selectedTime.toString(), repeat: repeatType, notificationId }
        : r
    );

    await saveReminders(updatedReminders);
    setReminderText('');
    setEditingReminder(null);
    Alert.alert('Reminder updated!');
  };

  const deleteReminder = async (id, notificationId) => {
    if (!notificationId) return Alert.alert('No valid notification ID');

    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }

    const updated = reminders.filter(item => item.id !== id);
    await saveReminders(updated);
  };

  const handleTimeChange = (event, time) => {
    if (time) setSelectedTime(time);
    setShowPicker(false);
  };

  const showTimePicker = () => setShowPicker(true);

  const startEditingReminder = (reminder) => {
    setEditingReminder(reminder);
    setReminderText(reminder.text);
    setSelectedTime(new Date(reminder.time));
    setRepeatType(reminder.repeat);
    setShowPicker(true);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{editingReminder ? 'Edit Reminder' : 'Set Reminder'}</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter reminder"
        value={reminderText}
        onChangeText={setReminderText}
      />

      <Button title="Pick Time" onPress={showTimePicker} />
      {showPicker && (
        <DateTimePicker
          value={selectedTime}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
        />
      )}

      <Text style={styles.timeText}>
        Selected Time: {selectedTime.toLocaleTimeString()}
      </Text>

      <View style={styles.repeatOptions}>
        <Text>Repeat:</Text>
        {['none', 'daily', 'weekly'].map(type => (
          <TouchableOpacity
            key={type}
            style={[styles.repeatButton, repeatType === type && styles.selectedRepeat]}
            onPress={() => setRepeatType(type)}
          >
            <Text>{type}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {editingReminder ? (
        <Button title="Save Changes" onPress={editReminder} />
      ) : (
        <Button title="Add Reminder" onPress={addReminder} />
      )}

      <Text style={styles.subtitle}>Your Reminders:</Text>
      <FlatList
        data={reminders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.reminderItem}>
            <View>
              <Text>{item.text}</Text>
              <Text style={styles.time}>
                {new Date(item.time).toLocaleTimeString()} ({item.repeat})
              </Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => startEditingReminder(item)}>
                <Text style={styles.edit}>✏</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteReminder(item.id, item.notificationId)}>
                <Text style={styles.delete}>🗑</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  input: { borderWidth: 1, borderColor: '#aaa', padding: 10, marginBottom: 10, borderRadius: 5 },
  timeText: { marginVertical: 10, fontSize: 16 },
  repeatOptions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 10 },
  repeatButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#888',
    borderRadius: 5,
  },
  selectedRepeat: { backgroundColor: '#ddd' },
  subtitle: { fontSize: 20, fontWeight: '600', marginTop: 20 },
  reminderItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderColor: '#ccc',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  time: { color: '#666' },
  actions: { flexDirection: 'row', gap: 10 },
  edit: { fontSize: 18 },
  delete: { fontSize: 18 },
});