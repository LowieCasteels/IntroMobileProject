import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_project/screens/home_screen.dart'; // Import Appliance model

class MapScreen extends StatefulWidget {
  const MapScreen({super.key});

  @override
  State<MapScreen> createState() => MapScreenState();
}

class MapScreenState extends State<MapScreen> {
  final Completer<GoogleMapController> _controller = Completer();
  Set<Marker> _markers = {};

  static const CameraPosition _kInitialPosition = CameraPosition(
    target: LatLng(51.2194, 4.4025), // Default to Antwerp
    zoom: 8.0,
  );

  @override
  void initState() {
    super.initState();
    _fetchAppliancesAndSetMarkers();
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

      for (final appliance in appliances) {
        if (appliance.lat != null && appliance.lng != null) {
          markers.add(
            Marker(
              markerId: MarkerId(appliance.id),
              position: LatLng(appliance.lat!, appliance.lng!),
              infoWindow: InfoWindow(
                title: appliance.title,
                snippet: appliance.city,
                onTap: () {
                  // TODO: Navigate to appliance detail screen
                  print('Tapped on ${appliance.title}');
                },
              ),
            ),
          );
        }
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
      body: GoogleMap(
        mapType: MapType.normal,
        initialCameraPosition: _kInitialPosition,
        onMapCreated: (GoogleMapController controller) {
          _controller.complete(controller);
        },
        markers: _markers,
      ),
    );
  }
}
