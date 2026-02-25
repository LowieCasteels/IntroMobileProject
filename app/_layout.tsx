import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";

const RootLayout = () => {
  const router = useRouter();

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Index"}}/>
      <Stack.Screen name="login" options={{ title: "Inloggen" }} />
      <Stack.Screen name="register" options={{ title: "Registreren"}}/>
    </Stack>
  );
}

export default RootLayout;