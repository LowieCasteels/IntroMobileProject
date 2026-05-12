import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest.dart' as tz;
import 'package:timezone/timezone.dart' as tz;
import 'package:cloud_firestore/cloud_firestore.dart';

class NotificationService {
  static final NotificationService _notificationService =
      NotificationService._internal();

  factory NotificationService() {
    return _notificationService;
  }

  NotificationService._internal();

  final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin =
      FlutterLocalNotificationsPlugin();

  Future<void> init() async {
    const AndroidInitializationSettings initializationSettingsAndroid =
        AndroidInitializationSettings('@mipmap/ic_launcher');

    const DarwinInitializationSettings initializationSettingsIOS =
        DarwinInitializationSettings(
          requestSoundPermission: false,
          requestBadgePermission: false,
          requestAlertPermission: false,
        );

    const InitializationSettings initializationSettings =
        InitializationSettings(
          android: initializationSettingsAndroid,
          iOS: initializationSettingsIOS,
        );

    tz.initializeTimeZones();

    await flutterLocalNotificationsPlugin.initialize(initializationSettings);
  }

  Future<void> requestPermissions() async {
    await flutterLocalNotificationsPlugin
        .resolvePlatformSpecificImplementation<
          IOSFlutterLocalNotificationsPlugin
        >()
        ?.requestPermissions(alert: true, badge: true, sound: true);
    await flutterLocalNotificationsPlugin
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >()
        ?.requestNotificationsPermission();
  }

  int _notificationId(String requestId, String type) {
    return (requestId.hashCode + type.hashCode).toSigned(31);
  }

  Future<void> schedulePickupReminder(
    String requestId,
    String itemTitle,
    DateTime pickupDate,
  ) async {
    await flutterLocalNotificationsPlugin.zonedSchedule(
      _notificationId(requestId, 'pickup'),
      'Ophaalherinnering',
      'Vergeet niet om vandaag "$itemTitle" op te halen.',
      tz.TZDateTime.from(pickupDate, tz.local),
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'pickup_channel',
          'Ophaalherinneringen',
          channelDescription: 'Herinneringen voor het ophalen van items',
          importance: Importance.max,
          priority: Priority.high,
        ),
        iOS: DarwinNotificationDetails(),
      ),
      androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
      uiLocalNotificationDateInterpretation:
          UILocalNotificationDateInterpretation.absoluteTime,
    );
  }

  Future<void> scheduleReturnReminder(
    String requestId,
    String itemTitle,
    DateTime returnDate,
  ) async {
    await flutterLocalNotificationsPlugin.zonedSchedule(
      _notificationId(requestId, 'return'),
      'Retourherinnering',
      'Vandaag is de laatste dag voor "$itemTitle". Vergeet het item niet terug te brengen.',
      tz.TZDateTime.from(returnDate, tz.local),
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'return_channel',
          'Retourherinneringen',
          channelDescription: 'Herinneringen voor het terugbrengen van items',
          importance: Importance.max,
          priority: Priority.high,
        ),
        iOS: DarwinNotificationDetails(),
      ),
      androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
      uiLocalNotificationDateInterpretation:
          UILocalNotificationDateInterpretation.absoluteTime,
    );
  }

  Future<void> cancelNotificationsForRequest(String requestId) async {
    await flutterLocalNotificationsPlugin.cancel(
      _notificationId(requestId, 'pickup'),
    );
    await flutterLocalNotificationsPlugin.cancel(
      _notificationId(requestId, 'return'),
    );
  }

  Future<void> createNotification({
    required String userId,
    required String title,
    required String body,
    String? requestId,
  }) async {
    if (userId.isEmpty) return;
    try {
      await FirebaseFirestore.instance
          .collection('flutterUsers')
          .doc(userId)
          .collection('notifications')
          .add({
            'title': title,
            'body': body,
            'createdAt': FieldValue.serverTimestamp(),
            'isRead': false,
            if (requestId != null) 'requestId': requestId,
          });
    } catch (e) {
      // Fails silently.
    }
  }
}
