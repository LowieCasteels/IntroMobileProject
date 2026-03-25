import React from 'react';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="search" />
      <Stack.Screen name="add-club" />
      <Stack.Screen name="club/[id]" />
      <Stack.Screen name="my-bookings" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}