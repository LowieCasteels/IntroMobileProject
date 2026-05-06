import 'package:cloud_firestore/cloud_firestore.dart';

class Appliance {
  final String id;
  final String ownerId;
  final String title;
  final String description;
  final String category;
  final double price;
  final String transactionType;
  final String base64Image;
  final bool isVisible;
  final String address;
  final double? lat;
  final double? lng;
  final Timestamp createdAt;

  Appliance({
    required this.id,
    required this.ownerId,
    required this.title,
    required this.description,
    required this.category,
    required this.price,
    required this.transactionType,
    required this.base64Image,
    required this.isVisible,
    required this.address,
    this.lat,
    this.lng,
    required this.createdAt,
  });

  factory Appliance.fromFirestore(DocumentSnapshot doc) {
    Map data = doc.data() as Map<String, dynamic>;
    return Appliance(
      id: doc.id,
      ownerId: data['ownerId'] ?? '',
      title: data['title'] ?? 'Geen titel',
      description: data['description'] ?? 'Geen beschrijving',
      category: data['category'] ?? 'Overig',
      price: (data['price'] ?? 0.0).toDouble(),
      transactionType: data['transactionType'] ?? 'leen',
      base64Image: data['base64Image'] ?? '',
      isVisible: data['isVisible'] ?? false,
      address: data['address'] ?? data['city'] ?? 'Onbekend',
      lat: (data['lat'] as num?)?.toDouble(),
      lng: (data['lng'] as num?)?.toDouble(),
      createdAt: data['createdAt'] ?? Timestamp.now(),
    );
  }
}
