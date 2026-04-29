import 'package:device_preview/device_preview.dart';
import 'package:flutter/foundation.dart';
import 'dart:html' as html;
import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_project/auth/login_screen.dart';
import 'package:flutter_project/screens/navbar.dart';
import 'package:flutter_project/screens/map_screen.dart';
import 'package:flutter_project/screens/add_product_screen.dart';
import 'package:go_router/go_router.dart';
import 'firebase_options.dart';
// import 'auth/login_screen.dart';
import 'auth/register_screen.dart';

void _loadGoogleMapsScript() {
  if (kIsWeb) {
    // Haal de API key op die via --dart-define is meegegeven.
    const apiKey = String.fromEnvironment('GOOGLE_MAPS_API_KEY');
    if (apiKey.isEmpty) {
      print(
        'Google Maps API Key is niet gevonden. Zorg dat je de app start met --dart-define=GOOGLE_MAPS_API_KEY=JOUW_KEY',
      );
    }
    html.document.head!.append(
      html.ScriptElement()
        ..src = 'https://maps.googleapis.com/maps/api/js?key=$apiKey',
    );
  }
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  // DevicePreview(
  //   enabled: !kReleaseMode,
  //   builder: (context) => MyApp(), // Wrap your app
  // );
  // runApp(const MyApp());
  _loadGoogleMapsScript();
  runApp(
    DevicePreview(
      builder: (context) {
        return const MyApp();
      },
    ),
  );
}

final GoRouter _router = GoRouter(
  initialLocation: '/login',
  routes: [
    GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
    GoRoute(
      path: '/register',
      builder: (context, state) => const RegisterScreen(),
    ),
    GoRoute(path: '/', builder: (context, state) => const navbar()),
    GoRoute(
      path: '/add-appliance',
      builder: (context, state) => const AddProductScreen(),
    ),
    GoRoute(path: '/map', builder: (context, state) => const MapScreen()),
  ],
);

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      locale: DevicePreview.locale(context),
      builder: DevicePreview.appBuilder,
      title: 'DeelApp',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
        useMaterial3: true,
      ),
      routerConfig: _router,
    );
  }
}

class MyHomePage extends StatefulWidget {
  const MyHomePage({super.key, required this.title});

  final String title;

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  int _counter = 0;

  void _incrementCounter() {
    setState(() {
      _counter++;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        title: Text(widget.title),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: .center,
          children: [
            const Text('You have pushed the button this many times:'),
            Text(
              '$_counter',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _incrementCounter,
        tooltip: 'Increment',
        child: const Icon(Icons.add),
      ),
    );
  }
}
