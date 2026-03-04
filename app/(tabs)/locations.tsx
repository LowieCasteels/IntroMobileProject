import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function LocationsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Locaties</Text>
      <Text>Hier komt de content voor locaties.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});