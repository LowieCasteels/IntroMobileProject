import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_project/screens/home_screen.dart'; // Import Appliance model
import 'package:http/http.dart' as http;
import 'dart:convert';

class MapScreen extends StatefulWidget {
  const MapScreen({super.key});

  @override
  State<MapScreen> createState() => MapScreenState();
}

class MapScreenState extends State<MapScreen> {
  final Completer<GoogleMapController> _controller = Completer();
  Set<Marker> _markers = {};
  final TextEditingController _addressController = TextEditingController();

  static const CameraPosition _kInitialPosition = CameraPosition(
    target: LatLng(51.2194, 4.4025), // Default to Antwerp
    zoom: 8.0,
  );

  @override
  void initState() {
    super.initState();
    _fetchAppliancesAndSetMarkers();
  }

  @override
  void dispose() {
    _addressController.dispose();
    super.dispose();
  }

  Future<void> _updateUserLocation() async {
    String addressQuery = _addressController.text.trim();
    if (addressQuery.isEmpty) return;

    if (!addressQuery.toLowerCase().contains('belgi') &&
        !addressQuery.toLowerCase().contains('nederland')) {
      addressQuery += ', België';
    }

    try {
      const apiKey = String.fromEnvironment('GOOGLE_MAPS_API_KEY');
      if (apiKey.isEmpty) {
        throw Exception(
          'Geen Google Maps API key gevonden. Start de app met --dart-define=GOOGLE_MAPS_API_KEY=jouw_key',
        );
      }

      final url = Uri.parse(
        'https://maps.googleapis.com/maps/api/geocode/json?address=${Uri.encodeComponent(addressQuery)}&key=$apiKey',
      );

      final response = await http.get(url);
      final data = json.decode(response.body);

      if (data['status'] == 'OK' && data['results'].isNotEmpty) {
        final location = data['results'][0]['geometry']['location'];
        final lat = location['lat'];
        final lng = location['lng'];

        final user = FirebaseAuth.instance.currentUser;
        if (user != null) {
          await FirebaseFirestore.instance
              .collection('flutterUsers')
              .doc(user.uid)
              .update({
                'address': _addressController.text.trim(),
                'lat': lat,
                'lng': lng,
              });

          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Locatie succesvol bijgewerkt!')),
            );
            _fetchAppliancesAndSetMarkers(); // Herlaad de markers op de kaart
          }
        }
      }
    } catch (e) {
      if (mounted) {
        String errorMessage = 'Adres niet gevonden: $e';

        // Specifieke check voor de bekende Web/Emulator bug in de geocoding package
        if (e.toString().contains('Unexpected null value')) {
          errorMessage =
              'Geocoding fout (Web/Emulator). Zorg dat de Geocoding API aan staat in Google Cloud.';

          // Optioneel: Vul dummy coördinaten in zodat je verder kan testen zonder dat de app blokkeert.
          // Bijvoorbeeld de coördinaten van Antwerpen:
          final user = FirebaseAuth.instance.currentUser;
          if (user != null) {
            FirebaseFirestore.instance
                .collection('flutterUsers')
                .doc(user.uid)
                .update({
                  'address':
                      _addressController.text.trim() + ' (Fallback Locatie)',
                  'lat': 51.2194,
                  'lng': 4.4025,
                });
          }
        }

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(errorMessage),
            duration: const Duration(seconds: 4),
          ),
        );
      }
    }
  }

  Future<void> _fetchAppliancesAndSetMarkers() async {
    try {
      final snapshot = await FirebaseFirestore.instance
          .collection('appliances')
          .get();

      final appliances = snapshot.docs
          .map((doc) => Appliance.fromFirestore(doc))
          .toList();

      final Set<Marker> markers = {};

      final user = FirebaseAuth.instance.currentUser;
      double? userLat;
      double? userLng;

      if (user != null) {
        final userDoc = await FirebaseFirestore.instance
            .collection('flutterUsers')
            .doc(user.uid)
            .get();
        final userData = userDoc.data();
        userLat = userData?['lat'];
        userLng = userData?['lng'];
      }

      for (final appliance in appliances) {
        if (appliance.lat != null && appliance.lng != null) {
          markers.add(
            Marker(
              markerId: MarkerId(appliance.id),
              position: LatLng(appliance.lat!, appliance.lng!),
              infoWindow: InfoWindow(
                title: appliance.title,
                snippet: appliance.address,
                onTap: () {
                  // TODO: Navigate to appliance detail screen
                  print('Tapped on ${appliance.title}');
                },
              ),
            ),
          );
        }
      }

      if (userLat != null && userLng != null) {
        markers.add(
          Marker(
            markerId: const MarkerId('current_user'),
            position: LatLng(userLat, userLng),
            icon: BitmapDescriptor.defaultMarkerWithHue(
              BitmapDescriptor.hueBlue,
            ),
            infoWindow: const InfoWindow(title: 'Mijn Locatie'),
          ),
        );
        final GoogleMapController controller = await _controller.future;
        controller.animateCamera(
          CameraUpdate.newLatLngZoom(LatLng(userLat, userLng), 10.0),
        );
      }

      if (mounted) {
        setState(() {
          _markers = markers;
        });
      }
    } catch (e) {
      print("Error fetching appliances for map: $e");
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Kon toestellen niet laden op de kaart: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Toestellen op de kaart')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _addressController,
                    decoration: const InputDecoration(
                      hintText: 'Stel je adres in (tijdelijk hier)',
                      border: OutlineInputBorder(),
                      contentPadding: EdgeInsets.symmetric(horizontal: 12),
                    ),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.save, color: Color(0xFF2DBA8D)),
                  onPressed: _updateUserLocation,
                ),
              ],
            ),
          ),
          Expanded(
            child: GoogleMap(
              mapType: MapType.normal,
              initialCameraPosition: _kInitialPosition,
              onMapCreated: (GoogleMapController controller) {
                _controller.complete(controller);
              },
              markers: _markers,
            ),
          ),
        ],
      ),
    );
  }
}
