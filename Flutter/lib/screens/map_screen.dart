import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_project/models/appliance.dart';
import 'dart:ui' as ui;
import 'package:flutter/services.dart';

class MapScreen extends StatefulWidget {
  const MapScreen({super.key});

  @override
  State<MapScreen> createState() => MapScreenState();
}

class MapScreenState extends State<MapScreen> {
  final Completer<GoogleMapController> _controller = Completer();
  Set<Marker> _markers = {};
  final TextEditingController _searchController = TextEditingController();
  StreamSubscription<DocumentSnapshot>? _userSubscription;

  BitmapDescriptor? _applianceIcon;
  BitmapDescriptor? _userIcon;

  String _searchQuery = '';
  String? _selectedCategory;

  final List<String> _categories = [
    'Alle',
    'Beeld & Geluid',
    'Gaming & Speelgoed',
    'Dieren & Toebehoren',
    'Verzorging, Welzijn & Baby',
    'Kleding & Kostuums',
    'Klussen & Gereedschap',
    'Koken & Tafelen',
    'Huishouden & Schoonmaak',
    'Vakantie, Sport & Vrije tijd',
    'Vervoer & Transport',
    'Computers, Telefoons & Toebehoren',
    'Overige spullen',
    'Party, Event & Tuinfeest',
  ];

  static const CameraPosition _kInitialPosition = CameraPosition(
    target: LatLng(51.2194, 4.4025), // Default to Antwerp
    zoom: 8.0,
  );

  @override
  void initState() {
    super.initState();
    _initIcons().then((_) {
      _fetchAppliancesAndSetMarkers(moveCamera: true);
      _listenToUserChanges();
    });
  }

  void _listenToUserChanges() {
    final user = FirebaseAuth.instance.currentUser;
    if (user != null) {
      _userSubscription = FirebaseFirestore.instance
          .collection('flutterUsers')
          .doc(user.uid)
          .snapshots()
          .listen((snapshot) {
            if (mounted) {
              _fetchAppliancesAndSetMarkers(moveCamera: true);
            }
          });
    }
  }

  Future<void> _initIcons() async {
    _applianceIcon = await _getCustomMarkerIcon(
      const Color(0xFF2DBA8D),
    ); // Groen voor toestellen
    _userIcon = await _getCustomMarkerIcon(
      Colors.blue,
    ); // Blauw voor eigen locatie
    if (mounted) setState(() {});
  }

  Future<BitmapDescriptor> _getCustomMarkerIcon(Color color) async {
    final ui.PictureRecorder pictureRecorder = ui.PictureRecorder();
    final Canvas canvas = Canvas(pictureRecorder);
    const double size = 36.0; // Verkleind van 60.0 naar 36.0

    canvas.drawCircle(
      const Offset(size / 2, size / 2),
      size / 2,
      Paint()..color = Colors.white,
    );
    canvas.drawCircle(
      const Offset(size / 2, size / 2),
      size / 2.4,
      Paint()..color = color,
    );

    final ui.Image image = await pictureRecorder.endRecording().toImage(
      size.toInt(),
      size.toInt(),
    );
    final ByteData? byteData = await image.toByteData(
      format: ui.ImageByteFormat.png,
    );
    return BitmapDescriptor.fromBytes(
      byteData!.buffer.asUint8List(),
      size: const Size(
        size,
        size,
      ), // Forceert een vaste pixelgrootte voor het web
    );
  }

  @override
  void dispose() {
    _userSubscription?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _fetchAppliancesAndSetMarkers({bool moveCamera = false}) async {
    try {
      final snapshot = await FirebaseFirestore.instance
          .collection('appliances')
          .get();

      final appliances = snapshot.docs
          .map((doc) => Appliance.fromFirestore(doc))
          .where((appliance) {
            if (!appliance.isVisible)
              return false; // Verberg onzichtbare toestellen

            if (_selectedCategory != null && _selectedCategory != 'Alle') {
              if (appliance.category != _selectedCategory) return false;
            }

            if (_searchQuery.isNotEmpty) {
              if (!appliance.title.toLowerCase().contains(
                _searchQuery.toLowerCase(),
              ))
                return false;
            }

            return true;
          })
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
        userLat = (userData?['lat'] as num?)?.toDouble();
        userLng = (userData?['lng'] as num?)?.toDouble();
      }

      for (final appliance in appliances) {
        if (appliance.lat != null && appliance.lng != null) {
          markers.add(
            Marker(
              markerId: MarkerId(appliance.id),
              position: LatLng(appliance.lat!, appliance.lng!),
              icon: _applianceIcon ?? BitmapDescriptor.defaultMarker,
              infoWindow: InfoWindow(
                title: appliance.title,
                snippet: appliance.address,
                onTap: () {
                  // TODO: Navigate to appliance detail screen
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
            icon: _userIcon ?? BitmapDescriptor.defaultMarker,
            infoWindow: const InfoWindow(title: 'Mijn Locatie'),
          ),
        );
        if (moveCamera) {
          final GoogleMapController controller = await _controller.future;
          controller.animateCamera(
            CameraUpdate.newLatLngZoom(LatLng(userLat, userLng), 10.0),
          );
        }
      }

      if (mounted) {
        setState(() {
          _markers = markers;
        });
      }
    } catch (e) {
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
            padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 4.0),
            child: TextField(
              controller: _searchController,
              decoration: const InputDecoration(
                hintText: 'Zoek op titel...',
                prefixIcon: Icon(Icons.search),
                border: OutlineInputBorder(),
                contentPadding: EdgeInsets.symmetric(horizontal: 12),
              ),
              onChanged: (value) {
                setState(() {
                  _searchQuery = value;
                });
                _fetchAppliancesAndSetMarkers(moveCamera: false);
              },
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 4.0),
            child: DropdownButtonFormField<String>(
              value: _selectedCategory ?? 'Alle',
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                contentPadding: EdgeInsets.symmetric(horizontal: 12),
              ),
              items: _categories.map((String category) {
                return DropdownMenuItem<String>(
                  value: category,
                  child: Text(category),
                );
              }).toList(),
              onChanged: (newValue) {
                setState(() {
                  _selectedCategory = newValue == 'Alle' ? null : newValue;
                });
                _fetchAppliancesAndSetMarkers(moveCamera: false);
              },
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
