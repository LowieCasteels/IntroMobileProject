import { Link } from "expo-router";
import { Text, View } from "react-native";

const Index = () => {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Link href="/login" style={{ color: 'blue', fontSize: 18 }}>
        Ga naar Login Scherm
      </Link>
      <Link href="/register" style={{ color: 'blue', fontSize: 18 }}>
        Ga naar Registreer Scherm
      </Link>
    </View>
  );
}

export default Index;