import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function BlackjackScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>¡Aquí va la mesa de Blackjack, Pablo!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#5B3281' },
  text: { color: 'white', fontSize: 20 }
});
