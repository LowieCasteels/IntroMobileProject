import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";

const RootLayout = () => {
  const router = useRouter();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}

export default RootLayout;