import 'package:cloud_firestore/cloud_firestore.dart';

class Request {
  final String id;
  final String applianceId;
  final String ownerId;
  final String requesterId;
  final String
  status; // 'pending', 'accepted', 'declined', 'cancelled', 'returned'
  final Timestamp? startDate;
  final Timestamp? endDate;
  final double? ownerRating;
  final String? ownerReview;
  final double? requesterRating;
  final String? requesterReview;
  final Timestamp createdAt;
  final Timestamp? respondedAt;

  Request({
    required this.id,
    required this.applianceId,
    required this.ownerId,
    required this.requesterId,
    required this.status,
    this.startDate,
    this.endDate,
    this.ownerRating,
    this.ownerReview,
    this.requesterRating,
    this.requesterReview,
    required this.createdAt,
    this.respondedAt,
  });

  factory Request.fromFirestore(DocumentSnapshot doc) {
    Map data = doc.data() as Map<String, dynamic>;
    return Request(
      id: doc.id,
      applianceId: data['applianceId'] ?? '',
      ownerId: data['ownerId'] ?? '',
      requesterId: data['requesterId'] ?? '',
      status: data['status'] ?? 'pending',
      startDate: data['startDate'],
      endDate: data['endDate'],
      ownerRating: (data['ownerRating'] as num?)?.toDouble(),
      ownerReview: data['ownerReview'],
      requesterRating: (data['requesterRating'] as num?)?.toDouble(),
      requesterReview: data['requesterReview'],
      createdAt: data['createdAt'] ?? Timestamp.now(),
      respondedAt: data['respondedAt'],
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'applianceId': applianceId,
      'ownerId': ownerId,
      'requesterId': requesterId,
      'status': status,
      'startDate': startDate,
      'endDate': endDate,
      'ownerRating': ownerRating,
      'ownerReview': ownerReview,
      'requesterRating': requesterRating,
      'requesterReview': requesterReview,
      'createdAt': createdAt,
      'respondedAt': respondedAt,
    };
  }
}
