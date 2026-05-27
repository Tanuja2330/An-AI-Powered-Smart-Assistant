import React from 'react';
import Reminder from './app/reminder';
import Emergency from './app/Emergency';
import Nav from './app/navigation';
import { View } from 'react-native';

export default function App() {
  return (
    <View>
      <Reminder />
      <Emergency />
      <Nav />
    </View>
  );
}